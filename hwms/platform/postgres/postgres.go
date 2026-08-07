// Package postgres opens the connection pool a service uses for its own
// database.
//
// Each service owns exactly one database and reaches no other, per DR-01. The
// clinical service additionally runs against a separate instance with separate
// credentials and a separate encryption key, per DR-03, and that separation is
// the enforcement mechanism for ADR-03 rather than a deployment preference.
package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pool and waits for the database to accept queries. On a
// composed stack the application frequently starts before the database is
// ready, and failing immediately turns an ordinary race into a crash loop.
func Connect(ctx context.Context, dsn string, wait time.Duration) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database configuration: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MaxConnLifetime = time.Hour
	cfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	deadline := time.Now().Add(wait)
	for {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		err = pool.Ping(pingCtx)
		cancel()
		if err == nil {
			return pool, nil
		}
		if time.Now().After(deadline) {
			pool.Close()
			return nil, fmt.Errorf("database not reachable within %s: %w", wait, err)
		}
		select {
		case <-ctx.Done():
			pool.Close()
			return nil, ctx.Err()
		case <-time.After(time.Second):
		}
	}
}
