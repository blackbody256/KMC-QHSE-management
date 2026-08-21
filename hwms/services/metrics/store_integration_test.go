package main

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kiiramotors/hwms/platform/migrate"
)

// TestOutOfOrderLeaveContributionsKeepOnlyTheHighestVersion covers the case
// where the correction arrives before the original delivery. The final total
// must follow version order, not delivery order.
func TestOutOfOrderLeaveContributionsKeepOnlyTheHighestVersion(t *testing.T) {
	ctx, s := metricsIntegrationStore(t)
	referralID := uuid.NewString()
	const period = "2098-08"
	before, err := s.leaveDays(ctx, period)
	if err != nil {
		t.Fatalf("reading the total before the deliveries: %v", err)
	}
	t.Cleanup(func() {
		if _, err := s.pool.Exec(context.Background(),
			`delete from referral_leave_contribution where referral_id = $1`, referralID); err != nil {
			t.Errorf("cleaning up the leave contributions: %v", err)
		}
	})

	// Version 1 originally stated four days. Version 2 corrected that to two,
	// but delivery retries can make version 2 reach metrics first.
	if err := s.recordLeaveContribution(ctx, referralID, 2, period, 2); err != nil {
		t.Fatalf("recording version 2 first: %v", err)
	}
	if err := s.recordLeaveContribution(ctx, referralID, 1, period, 4); err != nil {
		t.Fatalf("recording version 1 after version 2: %v", err)
	}

	days, err := s.leaveDays(ctx, period)
	if err != nil {
		t.Fatalf("totalling the surviving contribution: %v", err)
	}
	if days != before+2 {
		t.Fatalf("out-of-order versions added %.1f days, expected only the corrected 2 days", days-before)
	}

	var activeVersions int
	if err := s.pool.QueryRow(ctx, `
		select count(*) from referral_leave_contribution
		where referral_id = $1 and not superseded`, referralID).Scan(&activeVersions); err != nil {
		t.Fatalf("counting active versions: %v", err)
	}
	if activeVersions != 1 {
		t.Fatalf("expected one active contribution, found %d", activeVersions)
	}
}

func metricsIntegrationStore(t *testing.T) (context.Context, *store) {
	t.Helper()

	databaseURL := os.Getenv("METRICS_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("METRICS_TEST_DATABASE_URL is not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("opening the metrics integration database: %v", err)
	}
	t.Cleanup(pool.Close)
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("reaching the metrics integration database: %v", err)
	}
	if _, err := migrate.Apply(ctx, pool, migrations, "migrations"); err != nil {
		t.Fatalf("applying metrics migrations: %v", err)
	}

	return ctx, &store{pool: pool}
}
