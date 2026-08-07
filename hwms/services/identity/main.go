// Command identity administers user accounts on behalf of the manager.
//
// The manager creates Health and Wellness Officer and Director accounts. The
// manager account itself is seeded outside this service, deliberately: the
// first account with administrative rights should not be creatable from within
// the application.
package main

import (
	"context"
	"embed"
	"log/slog"
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/config"
	"github.com/kiiramotors/hwms/platform/health"
	"github.com/kiiramotors/hwms/platform/httpx"
	"github.com/kiiramotors/hwms/platform/logging"
	"github.com/kiiramotors/hwms/platform/migrate"
	"github.com/kiiramotors/hwms/platform/postgres"
	"github.com/kiiramotors/hwms/platform/serve"
	"github.com/kiiramotors/hwms/platform/telemetry"
)

const serviceName = "identity"

//go:embed migrations/*.sql
var migrations embed.FS

func main() {
	cfg := config.New()
	var (
		addr         = cfg.Optional("IDENTITY_ADDR", ":8082")
		logLevel     = cfg.Optional("LOG_LEVEL", "info")
		issuer       = cfg.Required("OIDC_ISSUER")
		discoveryURL = cfg.Optional("OIDC_DISCOVERY_URL", "")
		audience     = cfg.Optional("OIDC_AUDIENCE", "account")
		keycloakURL  = cfg.Required("KEYCLOAK_URL")
		realm        = cfg.Required("KEYCLOAK_REALM")
		clientID     = cfg.Required("KEYCLOAK_ADMIN_CLIENT_ID")
		clientSecret = cfg.Required("KEYCLOAK_ADMIN_CLIENT_SECRET")
		databaseURL  = cfg.Required("DATABASE_URL")
		startupWait  = cfg.Duration("STARTUP_WAIT", 2*time.Minute)
	)

	log := logging.New(serviceName, logLevel)

	if err := cfg.Err(); err != nil {
		log.Error("configuration incomplete", slog.String("error", err.Error()))
		os.Exit(1)
	}

	ctx := context.Background()

	pool, err := postgres.Connect(ctx, databaseURL, startupWait)
	if err != nil {
		log.Error("database unavailable", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()

	applied, err := migrate.Apply(ctx, pool, migrations, "migrations")
	if err != nil {
		log.Error("migrations failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
	if len(applied) > 0 {
		log.Info("migrations applied", slog.Any("versions", applied))
	}

	verifier, err := newVerifierWithRetry(ctx, log, issuer, discoveryURL, audience, startupWait)
	if err != nil {
		log.Error("could not reach the identity provider", slog.String("error", err.Error()))
		os.Exit(1)
	}

	keycloak := newKeycloakClient(keycloakURL, realm, clientID, clientSecret)
	svc := &service{log: log, keycloak: keycloak, audit: &auditStore{pool: pool}}

	metrics := telemetry.New(serviceName)
	checks := health.NewSet()
	checks.Register("database", func(ctx context.Context) error { return pool.Ping(ctx) })
	checks.Register("keycloak", keycloak.ping)

	r := chi.NewRouter()
	r.Use(httpx.RequestID)
	r.Use(httpx.Recoverer(log))
	r.Use(httpx.RequestLogger(log))
	r.Use(metrics.Middleware)

	r.Get("/livez", checks.Live)
	r.Get("/readyz", checks.Ready)
	r.Method("GET", "/metrics", metrics.Handler())

	r.Route("/api/identity", func(r chi.Router) {
		r.Use(verifier.Authenticate)
		svc.routes(r)
	})

	if err := serve.Run(ctx, addr, r, log); err != nil {
		log.Error("server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func newVerifierWithRetry(ctx context.Context, log *slog.Logger, issuer, discoveryURL, audience string, wait time.Duration) (*auth.Verifier, error) {
	deadline := time.Now().Add(wait)
	for {
		v, err := auth.NewVerifier(ctx, issuer, discoveryURL, audience)
		if err == nil {
			return v, nil
		}
		if time.Now().After(deadline) {
			return nil, err
		}
		log.Info("identity provider not ready, retrying")
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(3 * time.Second):
		}
	}
}
