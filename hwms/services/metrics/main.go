// Command metrics computes the executive dashboard.
//
// It holds the monthly returns entered by hand and the sick-leave facts sent by
// the clinical service, and it reads targets from admin and counts from
// occupational. What it does not hold is any credential for the clinical
// database, and nothing it stores names a patient, which is the property that
// lets a director open the dashboard with an account that cannot open a
// clinical record.
//
// Every figure it publishes states how it was worked out. A number whose
// derivation is invisible is a number nobody can challenge, and unchallengeable
// numbers are what this system was commissioned to replace.

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

const serviceName = "metrics"

//go:embed migrations/*.sql
var migrations embed.FS

func main() {
	cfg := config.New()
	var (
		addr         = cfg.Optional("METRICS_ADDR", ":8086")
		logLevel     = cfg.Optional("LOG_LEVEL", "info")
		issuer       = cfg.Required("OIDC_ISSUER")
		discoveryURL = cfg.Optional("OIDC_DISCOVERY_URL", "")
		audience     = cfg.Optional("OIDC_AUDIENCE", "account")
		databaseURL  = cfg.Required("METRICS_DATABASE_URL")
		adminURL     = cfg.Required("ADMIN_SERVICE_URL")
		occupational = cfg.Required("OCCUPATIONAL_SERVICE_URL")
		ingestToken  = cfg.Required("METRICS_INGEST_TOKEN")
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
		log.Error("metrics database unavailable", slog.String("error", err.Error()))
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

	svc := &service{
		log:         log,
		store:       &store{pool: pool},
		upstream:    newUpstream(adminURL, occupational),
		ingestToken: ingestToken,
	}

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

	r.Route("/api/metrics", func(r chi.Router) {
		r.Use(verifier.Authenticate)
		svc.routes(r)
	})

	// Service-to-service delivery from the clinical service's outbox. Mounted
	// outside the OIDC middleware because the caller is a service rather than
	// a person, and deliberately not routed through the gateway: no browser
	// has any business reaching it.
	r.Route("/internal", func(r chi.Router) {
		svc.ingestRoutes(r)
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
