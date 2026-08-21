package main

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kiiramotors/hwms/platform/migrate"
)

// TestAStaleReferralTransitionIsAConflict exercises the condition on the SQL
// update itself. A read before the update cannot protect against another
// officer moving the referral between those two statements.
func TestAStaleReferralTransitionIsAConflict(t *testing.T) {
	ctx, s := clinicalIntegrationStore(t)
	id := insertIntegrationReferral(t, ctx, s.pool, ReferralIssued, 0)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		t.Fatalf("beginning the stale transition: %v", err)
	}
	transitionErr := setStatus(ctx, tx, id, ReferralReturned, ReferralReviewed)
	if err := tx.Commit(ctx); err != nil {
		t.Fatalf("committing the stale transition check: %v", err)
	}

	if !errors.Is(transitionErr, errStaleTransition) {
		t.Fatalf("a stale transition must surface as a conflict, got %v", transitionErr)
	}

	var status string
	if err := s.pool.QueryRow(ctx,
		`select status from referral where referral_id = $1`, id).Scan(&status); err != nil {
		t.Fatalf("reading the referral after the stale transition: %v", err)
	}
	if status != ReferralIssued {
		t.Fatalf("a stale transition changed the referral to %q, expected it to remain %q", status, ReferralIssued)
	}
}

// TestCorrectedFeedbackDoesNotReopenAReviewedReferral protects the closed
// lifecycle state while still allowing an amended facility letter to replace
// the contribution already sent to metrics.
func TestCorrectedFeedbackDoesNotReopenAReviewedReferral(t *testing.T) {
	ctx, s := clinicalIntegrationStore(t)
	id := insertIntegrationReferral(t, ctx, s.pool, ReferralReviewed, 1)

	updated, err := s.recordFeedback(ctx, id, ReferralFeedback{
		Facility:                "Integration facility",
		Practitioner:            "Integration practitioner",
		Diagnosis:               "Integration diagnosis",
		TreatmentProvided:       "Integration treatment",
		RecommendedFollowUp:     "Integration follow-up",
		SickLeaveDays:           2,
		SickLeaveFrom:           "2098-07-10",
		SickLeaveTo:             "2098-07-11",
		SignatureStampConfirmed: true,
		Date:                    "2098-07-12",
	})
	if err != nil {
		t.Fatalf("correcting feedback on a reviewed referral: %v", err)
	}

	if updated.Status != ReferralReviewed {
		t.Fatalf("corrected feedback reopened a reviewed referral as %q", updated.Status)
	}
	if updated.Feedback == nil || updated.Feedback.Version != 2 {
		t.Fatalf("corrected feedback must increment the version to 2, got %#v", updated.Feedback)
	}
}

func clinicalIntegrationStore(t *testing.T) (context.Context, *store) {
	t.Helper()

	databaseURL := os.Getenv("CLINICAL_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("CLINICAL_TEST_DATABASE_URL is not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("opening the clinical integration database: %v", err)
	}
	t.Cleanup(pool.Close)
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("reaching the clinical integration database: %v", err)
	}
	if _, err := migrate.Apply(ctx, pool, migrations, "migrations"); err != nil {
		t.Fatalf("applying clinical migrations: %v", err)
	}

	return ctx, &store{pool: pool}
}

func insertIntegrationReferral(
	t *testing.T,
	ctx context.Context,
	pool *pgxpool.Pool,
	status string,
	feedbackVersion int,
) string {
	t.Helper()

	patientID := uuid.NewString()
	visitID := uuid.NewString()
	referralID := uuid.NewString()
	if _, err := pool.Exec(ctx, `
		insert into patient (
			patient_id, full_name, age, sex, category, created_by
		) values ($1, 'Integration patient', 30, 'Female', 'Employee', 'integration-test')`,
		patientID); err != nil {
		t.Fatalf("inserting the integration patient: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		insert into patient_visit (
			visit_id, patient_id, visit_date, visit_type, recorded_by
		) values ($1, $2, '2098-07-01', 'Walk-in', 'integration-test')`,
		visitID, patientID); err != nil {
		t.Fatalf("inserting the integration visit: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		insert into referral (
			referral_id, visit_id, patient_id, status, referred_to,
			snapshot_name, snapshot_age, snapshot_sex, referral_date,
			work_related, clearance_officer, feedback_version, created_by
		) values (
			$1, $2, $3, $4, 'Integration facility',
			'Integration patient', 30, 'Female', '2098-07-01',
			'No', 'integration-test', $5, 'integration-test'
		)`, referralID, visitID, patientID, status, feedbackVersion); err != nil {
		t.Fatalf("inserting the integration referral: %v", err)
	}

	t.Cleanup(func() {
		if _, err := pool.Exec(context.Background(),
			`delete from referral where referral_id = $1`, referralID); err != nil {
			t.Errorf("cleaning up the integration referral: %v", err)
		}
		if _, err := pool.Exec(context.Background(),
			`delete from patient_visit where visit_id = $1`, visitID); err != nil {
			t.Errorf("cleaning up the integration visit: %v", err)
		}
		if _, err := pool.Exec(context.Background(),
			`delete from patient where patient_id = $1`, patientID); err != nil {
			t.Errorf("cleaning up the integration patient: %v", err)
		}
	})

	return referralID
}
