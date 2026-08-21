// Command gateway is the edge of the KMC QHSE Management System.
//
// It terminates the OpenID Connect flow against Keycloak, holds the resulting
// tokens server side, gives the browser an opaque HttpOnly session cookie, and
// proxies API calls to the internal services with a bearer token attached.
//
// It holds no business logic and no data. If a rule about the domain appears
// in this service, it is in the wrong place.
package main

import (
	"context"
	"log/slog"
	"net/url"
	"os"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/go-chi/chi/v5"
	"golang.org/x/oauth2"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/config"
	"github.com/kiiramotors/hwms/platform/health"
	"github.com/kiiramotors/hwms/platform/httpx"
	"github.com/kiiramotors/hwms/platform/logging"
	"github.com/kiiramotors/hwms/platform/serve"
	"github.com/kiiramotors/hwms/platform/telemetry"
)

const serviceName = "gateway"

type gateway struct {
	log      *slog.Logger
	oauth    *oauth2.Config
	provider *oidc.Provider
	verifier *oidc.IDTokenVerifier
	// Verifies access tokens for their roles. The audience check is skipped
	// because an access token is addressed to the resource server, not here.
	accessVerifier *oidc.IDTokenVerifier
	sessions       *sessionStore

	appBaseURL      string
	identityURL     *url.URL
	clinicalURL     *url.URL
	adminURL        *url.URL
	occupationalURL *url.URL
	metricsURL      *url.URL
	cookieSecure    bool
	idleTimeout     time.Duration
}

func main() {
	cfg := config.New()
	var (
		addr         = cfg.Optional("GATEWAY_ADDR", ":8081")
		logLevel     = cfg.Optional("LOG_LEVEL", "info")
		issuer       = cfg.Required("OIDC_ISSUER")
		discoveryURL = cfg.Optional("OIDC_DISCOVERY_URL", "")
		clientID     = cfg.Required("OIDC_CLIENT_ID")
		clientSecret = cfg.Required("OIDC_CLIENT_SECRET")
		redirectURL  = cfg.Required("OIDC_REDIRECT_URL")
		appBaseURL   = cfg.Required("APP_BASE_URL")
		identityRaw  = cfg.Required("IDENTITY_SERVICE_URL")
		clinicalRaw  = cfg.Required("CLINICAL_SERVICE_URL")
		adminRaw     = cfg.Required("ADMIN_SERVICE_URL")
		occupatRaw   = cfg.Required("OCCUPATIONAL_SERVICE_URL")
		metricsRaw   = cfg.Required("METRICS_SERVICE_URL")
		cookieSecure = cfg.Bool("COOKIE_SECURE", true)
		idleTimeout  = cfg.Duration("SESSION_IDLE_TIMEOUT", 30*time.Minute)
		startupWait  = cfg.Duration("OIDC_STARTUP_WAIT", 2*time.Minute)
	)

	log := logging.New(serviceName, logLevel)

	if err := cfg.Err(); err != nil {
		log.Error("configuration incomplete", slog.String("error", err.Error()))
		os.Exit(1)
	}

	identityURL, err := url.Parse(identityRaw)
	if err != nil {
		log.Error("IDENTITY_SERVICE_URL is not a URL", slog.String("error", err.Error()))
		os.Exit(1)
	}
	clinicalURL, err := url.Parse(clinicalRaw)
	if err != nil {
		log.Error("CLINICAL_SERVICE_URL is not a URL", slog.String("error", err.Error()))
		os.Exit(1)
	}
	adminURL, err := url.Parse(adminRaw)
	if err != nil {
		log.Error("ADMIN_SERVICE_URL is not a URL", slog.String("error", err.Error()))
		os.Exit(1)
	}
	occupationalURL, err := url.Parse(occupatRaw)
	if err != nil {
		log.Error("OCCUPATIONAL_SERVICE_URL is not a URL", slog.String("error", err.Error()))
		os.Exit(1)
	}
	metricsURL, err := url.Parse(metricsRaw)
	if err != nil {
		log.Error("METRICS_SERVICE_URL is not a URL", slog.String("error", err.Error()))
		os.Exit(1)
	}

	ctx := context.Background()

	// Keycloak is frequently still importing its realm when the gateway
	// starts. Retry discovery rather than crash-looping the container.
	provider, err := discover(ctx, log, issuer, discoveryURL, startupWait)
	if err != nil {
		log.Error("could not discover the identity provider",
			slog.String("issuer", issuer), slog.String("error", err.Error()))
		os.Exit(1)
	}

	g := &gateway{
		log:            log,
		provider:       provider,
		verifier:       provider.Verifier(&oidc.Config{ClientID: clientID}),
		accessVerifier: provider.Verifier(&oidc.Config{SkipClientIDCheck: true}),
		oauth: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			Endpoint:     provider.Endpoint(),
			RedirectURL:  redirectURL,
			Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		},
		sessions:        newSessionStore(idleTimeout),
		appBaseURL:      appBaseURL,
		identityURL:     identityURL,
		clinicalURL:     clinicalURL,
		adminURL:        adminURL,
		occupationalURL: occupationalURL,
		metricsURL:      metricsURL,
		cookieSecure:    cookieSecure,
		idleTimeout:     idleTimeout,
	}

	metrics := telemetry.New(serviceName)
	checks := health.NewSet()
	checks.Register("identity_provider", func(ctx context.Context) error {
		_, err := auth.DiscoverProvider(ctx, issuer, discoveryURL)
		return err
	})

	r := chi.NewRouter()
	r.Use(httpx.RequestID)
	r.Use(httpx.Recoverer(log))
	r.Use(httpx.RequestLogger(log))
	r.Use(metrics.Middleware)

	r.Get("/livez", checks.Live)
	r.Get("/readyz", checks.Ready)
	r.Method("GET", "/metrics", metrics.Handler())

	r.Route("/auth", func(r chi.Router) {
		r.Get("/login", g.handleLogin)
		r.Get("/callback", g.handleCallback)
		r.Get("/session", g.handleSession)
		r.Post("/logout", g.handleLogout)
	})

	r.Handle("/api/identity/*", g.proxyTo(g.identityURL, "/api/identity"))
	r.Handle("/api/clinical/*", g.proxyTo(g.clinicalURL, "/api/clinical"))
	r.Handle("/api/admin/*", g.proxyTo(g.adminURL, "/api/admin"))
	r.Handle("/api/occupational/*", g.proxyTo(g.occupationalURL, "/api/occupational"))
	r.Handle("/api/metrics/*", g.proxyTo(g.metricsURL, "/api/metrics"))

	// Note what is absent. The metrics service's /internal routes are not
	// proxied here and never should be: they carry a shared service secret and
	// no browser has any business reaching them.

	if err := serve.Run(ctx, addr, r, log); err != nil {
		log.Error("server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func discover(ctx context.Context, log *slog.Logger, issuer, discoveryURL string, wait time.Duration) (*oidc.Provider, error) {
	deadline := time.Now().Add(wait)
	for {
		provider, err := auth.DiscoverProvider(ctx, issuer, discoveryURL)
		if err == nil {
			return provider, nil
		}
		if time.Now().After(deadline) {
			return nil, err
		}
		log.Info("identity provider not ready, retrying", slog.String("issuer", issuer))
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(3 * time.Second):
		}
	}
}
