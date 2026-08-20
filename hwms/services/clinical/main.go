// Command clinical holds the patient registry and the visit record.
//
// It is the only service issued credentials for the clinical database, and the
// only one granted the clinical role. That is not a deployment preference: it
// is the enforcement mechanism for the rule that no role other than the Health
// and Wellness Officer may retrieve an individual clinical record. A defect in
// another service cannot read a patient record because it holds no credential
// with which to try.
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

const serviceName = "clinical"

//go:embed migrations/*.sql
var migrations embed.FS

func main() {
	cfg := config.New()
	var (
		addr         = cfg.Optional("CLINICAL_ADDR", ":8083")
		logLevel     = cfg.Optional("LOG_LEVEL", "info")
		issuer       = cfg.Required("OIDC_ISSUER")
		discoveryURL = cfg.Optional("OIDC_DISCOVERY_URL", "")
		audience     = cfg.Optional("OIDC_AUDIENCE", "account")
		databaseURL  = cfg.Required("CLINICAL_DATABASE_URL")
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
		log.Error("clinical database unavailable", slog.String("error", err.Error()))
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

	// The raw store is constructed here and immediately wrapped. Nothing else
	// in this service holds a reference to it, so there is no path to a
	// clinical record that skips the access log.
	svc := &service{log: log, store: &accessLoggedStore{raw: &store{pool: pool}}}

	metrics := telemetry.New(serviceName)
	checks := health.NewSet()
	checks.Register("database", func(ctx context.Context) error { return pool.Ping(ctx) })

	r := chi.NewRouter()
	r.Use(httpx.RequestID)
	r.Use(httpx.Recoverer(log))
	r.Use(httpx.RequestLogger(log))
	r.Use(metrics.Middleware)

	r.Get("/livez", checks.Live)
	r.Get("/readyz", checks.Ready)
	r.Method("GET", "/metrics", metrics.Handler())

	r.Route("/api/clinical", func(r chi.Router) {
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
