package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var errNotFound = errors.New("record not found")

type store struct{ pool *pgxpool.Pool }

// MonthlyReturn is one month of figures sourced outside this system.
//
// The four safety figures are pointers, and that is the whole design. A month
// where nobody supplied a near-miss count is not a month with no near misses,
// and a dashboard that cannot tell those apart reports the opposite of the
// truth for the indicator where it matters most.
type MonthlyReturn struct {
	Period string `json:"period"`

	HealthRelatedLostDays float64 `json:"healthRelatedLostDays"`
	Headcount             int     `json:"headcount"`
	SurveillanceScheduled int     `json:"surveillanceScheduled"`
	SurveillanceCompleted int     `json:"surveillanceCompleted"`
	HealthSourceNote      string  `json:"healthSourceNote"`

	Fatalities               *int   `json:"fatalities,omitempty"`
	TotalRecordableIncidents *int   `json:"totalRecordableIncidents,omitempty"`
	TotalRecordableInjuries  *int   `json:"totalRecordableInjuries,omitempty"`
	ReportableNearMisses     *int   `json:"reportableNearMisses,omitempty"`
	SafetySourceNote         string `json:"safetySourceNote"`

	EnteredBy string    `json:"enteredBy"`
	EnteredAt time.Time `json:"enteredAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Revision is a superseded return, kept so a changed figure can be explained.
type Revision struct {
	Period      string          `json:"period"`
	Previous    json.RawMessage `json:"previous"`
	Reason      string          `json:"reason"`
	CorrectedBy string          `json:"correctedBy"`
	CorrectedAt time.Time       `json:"correctedAt"`
}

const returnColumns = `
	period, health_related_lost_days, headcount,
	surveillance_scheduled, surveillance_completed, health_source_note,
	fatalities, total_recordable_incidents, total_recordable_injuries,
	reportable_near_misses, safety_source_note,
	entered_by, entered_at, updated_at`

func (s *store) getReturn(ctx context.Context, period string) (MonthlyReturn, error) {
	row := s.pool.QueryRow(ctx,
		`select `+returnColumns+` from monthly_return where period = $1`, period)
	r, err := scanReturn(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return MonthlyReturn{}, errNotFound
	}
	return r, err
}

func (s *store) listReturns(ctx context.Context, from, to string) ([]MonthlyReturn, error) {
	rows, err := s.pool.Query(ctx, `
		select `+returnColumns+` from monthly_return
		where ($1 = '' or period >= $1) and ($2 = '' or period <= $2)
		order by period desc`, from, to)
	if err != nil {
		return nil, fmt.Errorf("query monthly returns: %w", err)
	}
	defer rows.Close()

	returns := []MonthlyReturn{}
	for rows.Next() {
		r, err := scanReturn(rows)
		if err != nil {
			return nil, err
		}
		returns = append(returns, r)
	}
	return returns, rows.Err()
}

// saveReturn writes a month's figures, keeping any prior version.
//
// A correction is not an edit. The row as it stood is copied into the revision
// table with the reason, in the same transaction, before the new values land.
// A dashboard figure that changes without an explanation is exactly the failure
// this system exists to remove, and the explanation has to be captured at the
// moment the change is made or it is never captured at all.
func (s *store) saveReturn(ctx context.Context, r MonthlyReturn, actor, reason string) (MonthlyReturn, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MonthlyReturn{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var previous []byte
	err = tx.QueryRow(ctx,
		`select to_jsonb(monthly_return) from monthly_return where period = $1`, r.Period).Scan(&previous)
	existing := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return MonthlyReturn{}, fmt.Errorf("read the existing return: %w", err)
	}

	if existing {
		if reason == "" {
			return MonthlyReturn{}, errReasonRequired
		}
		if _, err := tx.Exec(ctx, `
			insert into monthly_return_revision (period, previous, reason, corrected_by)
			values ($1,$2,$3,$4)`, r.Period, previous, reason, actor); err != nil {
			return MonthlyReturn{}, fmt.Errorf("record the correction: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `
		insert into monthly_return (
			period, health_related_lost_days, headcount,
			surveillance_scheduled, surveillance_completed, health_source_note,
			fatalities, total_recordable_incidents, total_recordable_injuries,
			reportable_near_misses, safety_source_note, entered_by
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		on conflict (period) do update set
			health_related_lost_days = excluded.health_related_lost_days,
			headcount = excluded.headcount,
			surveillance_scheduled = excluded.surveillance_scheduled,
			surveillance_completed = excluded.surveillance_completed,
			health_source_note = excluded.health_source_note,
			fatalities = excluded.fatalities,
			total_recordable_incidents = excluded.total_recordable_incidents,
			total_recordable_injuries = excluded.total_recordable_injuries,
			reportable_near_misses = excluded.reportable_near_misses,
			safety_source_note = excluded.safety_source_note,
			entered_by = excluded.entered_by,
			updated_at = now()`,
		r.Period, r.HealthRelatedLostDays, r.Headcount,
		r.SurveillanceScheduled, r.SurveillanceCompleted, r.HealthSourceNote,
		r.Fatalities, r.TotalRecordableIncidents, r.TotalRecordableInjuries,
		r.ReportableNearMisses, r.SafetySourceNote, actor,
	); err != nil {
		return MonthlyReturn{}, fmt.Errorf("save the return: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return MonthlyReturn{}, err
	}
	return s.getReturn(ctx, r.Period)
}

var errReasonRequired = errors.New("a correction needs a reason")

func (s *store) revisions(ctx context.Context, period string) ([]Revision, error) {
	rows, err := s.pool.Query(ctx, `
		select period, previous, reason, corrected_by, corrected_at
		from monthly_return_revision where period = $1 order by corrected_at desc`, period)
	if err != nil {
		return nil, fmt.Errorf("query revisions: %w", err)
	}
	defer rows.Close()

	revisions := []Revision{}
	for rows.Next() {
		var rev Revision
		if err := rows.Scan(&rev.Period, &rev.Previous, &rev.Reason, &rev.CorrectedBy, &rev.CorrectedAt); err != nil {
			return nil, err
		}
		revisions = append(revisions, rev)
	}
	return revisions, rows.Err()
}

func scanReturn(row interface{ Scan(...any) error }) (MonthlyReturn, error) {
	var r MonthlyReturn
	if err := row.Scan(
		&r.Period, &r.HealthRelatedLostDays, &r.Headcount,
		&r.SurveillanceScheduled, &r.SurveillanceCompleted, &r.HealthSourceNote,
		&r.Fatalities, &r.TotalRecordableIncidents, &r.TotalRecordableInjuries,
		&r.ReportableNearMisses, &r.SafetySourceNote,
		&r.EnteredBy, &r.EnteredAt, &r.UpdatedAt,
	); err != nil {
		return MonthlyReturn{}, err
	}
	return r, nil
}

// --- referral leave ---------------------------------------------------------

// recordLeaveContribution accepts one non-clinical fact from the clinical
// service.
//
// Idempotent on (referral_id, feedback_version), so a redelivered message
// changes nothing. A later version supersedes every earlier one for the same
// referral, which is what makes an amended letter from a facility a correction
// rather than a second period of leave.
func (s *store) recordLeaveContribution(ctx context.Context, referralID string, version int, period string, days float64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Serialise everything for this referral. Delivery is at least once and
	// production runs more than one clinical replica, so two versions of the
	// same referral can arrive concurrently and out of order.
	//
	// pg_advisory_xact_lock is keyed on the referral and released at commit.
	// Without it, two transactions can each read a state in which their own
	// version is the highest and both leave a row active.
	if _, err := tx.Exec(ctx,
		`select pg_advisory_xact_lock(hashtext($1))`, referralID); err != nil {
		return fmt.Errorf("lock the referral: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into referral_leave_contribution (referral_id, feedback_version, period, days)
		values ($1,$2,$3,$4)
		on conflict (referral_id, feedback_version) do nothing`,
		referralID, version, period, days); err != nil {
		return fmt.Errorf("record leave contribution: %w", err)
	}

	// Everything but the highest version this referral has ever sent is
	// superseded, including the row just inserted, if a later correction
	// arrived first.
	//
	// The earlier form of this superseded only versions below the arriving
	// one, which is correct when messages arrive in order and wrong when they
	// do not: version 2 landing before version 1 left both active, and the
	// month's absenteeism counted the leave twice. Deriving from the maximum
	// makes the outcome the same whichever order they land in.
	if _, err := tx.Exec(ctx, `
		update referral_leave_contribution c
		set superseded = (c.feedback_version <> m.highest)
		from (
			select max(feedback_version) as highest
			from referral_leave_contribution
			where referral_id = $1
		) m
		where c.referral_id = $1`, referralID); err != nil {
		return fmt.Errorf("supersede prior contributions: %w", err)
	}

	return tx.Commit(ctx)
}

// leaveDays totals the surviving contributions for a month.
func (s *store) leaveDays(ctx context.Context, period string) (float64, error) {
	var days float64
	err := s.pool.QueryRow(ctx, `
		select coalesce(sum(days), 0) from referral_leave_contribution
		where period = $1 and not superseded`, period).Scan(&days)
	if err != nil {
		return 0, fmt.Errorf("total referral leave: %w", err)
	}
	return days, nil
}
