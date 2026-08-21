package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var errNotFound = errors.New("record not found")

type store struct{ pool *pgxpool.Pool }

type scannable interface {
	Scan(dest ...any) error
}

// --- industrial hygiene -----------------------------------------------------

func (s *store) createEvent(ctx context.Context, event MonitoringEvent, actor string) (MonitoringEvent, error) {
	event.ID = uuid.NewString()
	event.RecordedBy = actor

	err := s.pool.QueryRow(ctx, `
		insert into hygiene_monitoring_event (
			event_id, period, event_date, location, instrument,
			performed, not_performed_reason, notes, recorded_by
		) values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9)
		returning created_at`,
		event.ID, event.Period, event.EventDate, event.Location, event.Instrument,
		event.Performed, event.NotPerformedReason, event.Notes, actor,
	).Scan(&event.CreatedAt)
	if err != nil {
		return MonitoringEvent{}, fmt.Errorf("insert monitoring event: %w", err)
	}
	event.Readings = []Reading{}
	return event, nil
}

func (s *store) listEvents(ctx context.Context, period string, limit int) ([]MonitoringEvent, error) {
	rows, err := s.pool.Query(ctx, `
		select event_id, period, event_date, location, instrument,
		       performed, not_performed_reason, notes, recorded_by, created_at
		from hygiene_monitoring_event
		where ($1 = '' or period = $1)
		order by event_date desc, created_at desc
		limit $2`, period, limit)
	if err != nil {
		return nil, fmt.Errorf("query monitoring events: %w", err)
	}
	defer rows.Close()

	events := []MonitoringEvent{}
	ids := []string{}
	for rows.Next() {
		var e MonitoringEvent
		var eventDate time.Time
		if err := rows.Scan(
			&e.ID, &e.Period, &eventDate, &e.Location, &e.Instrument,
			&e.Performed, &e.NotPerformedReason, &e.Notes, &e.RecordedBy, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		e.EventDate = eventDate.Format("2006-01-02")
		e.Readings = []Reading{}
		events = append(events, e)
		ids = append(ids, e.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	byEvent, err := s.readingsForEvents(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range events {
		if readings, ok := byEvent[events[i].ID]; ok {
			events[i].Readings = readings
		}
	}
	return events, nil
}

const readingColumns = `
	reading_id, event_id, period, reading_date, location, instrument, parameter, value,
	limit_reference_id, limit_applied, unit, averaging_period, monitoring_context,
	standard_family, standard_version, compliance, kpi_eligible, recorded_by, created_at`

func (s *store) readingsForEvents(ctx context.Context, ids []string) (map[string][]Reading, error) {
	byEvent := map[string][]Reading{}
	if len(ids) == 0 {
		return byEvent, nil
	}
	rows, err := s.pool.Query(ctx, `
		select `+readingColumns+` from hygiene_reading
		where event_id = any($1) order by reading_date, created_at`, ids)
	if err != nil {
		return nil, fmt.Errorf("query readings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		reading, err := scanReading(rows)
		if err != nil {
			return nil, err
		}
		byEvent[reading.EventID] = append(byEvent[reading.EventID], reading)
	}
	return byEvent, rows.Err()
}

// createReading stores a measurement together with the evaluation made of it.
//
// The caller has already resolved the limit in force on the reading date and
// decided compliance. Both arrive here fully formed and are written once; the
// trigger on this table refuses any later change to either.
func (s *store) createReading(ctx context.Context, reading Reading, actor string) (Reading, error) {
	reading.ID = uuid.NewString()
	reading.RecordedBy = actor

	err := s.pool.QueryRow(ctx, `
		insert into hygiene_reading (
			reading_id, event_id, period, reading_date, location, instrument, parameter, value,
			limit_reference_id, limit_applied, unit, averaging_period, monitoring_context,
			standard_family, standard_version, compliance, kpi_eligible, recorded_by
		) values ($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		returning created_at`,
		reading.ID, reading.EventID, reading.Period, reading.ReadingDate,
		reading.Location, reading.Instrument, reading.Parameter, reading.Value,
		reading.LimitReferenceID, reading.LimitApplied, reading.Unit, reading.AveragingPeriod,
		reading.Context, reading.StandardFamily, reading.StandardVersion,
		reading.Compliance, reading.KpiEligible, actor,
	).Scan(&reading.CreatedAt)
	if err != nil {
		return Reading{}, fmt.Errorf("insert reading: %w", err)
	}
	return reading, nil
}

// eventContext returns the period, date and location a reading inherits from
// its event, so a reading cannot be filed under a different month from the
// monitoring occasion it belongs to.
func (s *store) eventContext(ctx context.Context, eventID string) (period, eventDate, location, instrument string, performed bool, err error) {
	var date time.Time
	err = s.pool.QueryRow(ctx, `
		select period, event_date, location, instrument, performed
		from hygiene_monitoring_event where event_id = $1`, eventID,
	).Scan(&period, &date, &location, &instrument, &performed)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", "", "", false, errNotFound
	}
	if err != nil {
		return "", "", "", "", false, err
	}
	return period, date.Format("2006-01-02"), location, instrument, performed, nil
}

func scanReading(row scannable) (Reading, error) {
	var r Reading
	var readingDate time.Time
	if err := row.Scan(
		&r.ID, &r.EventID, &r.Period, &readingDate, &r.Location, &r.Instrument,
		&r.Parameter, &r.Value,
		&r.LimitReferenceID, &r.LimitApplied, &r.Unit, &r.AveragingPeriod, &r.Context,
		&r.StandardFamily, &r.StandardVersion, &r.Compliance, &r.KpiEligible,
		&r.RecordedBy, &r.CreatedAt,
	); err != nil {
		return Reading{}, err
	}
	r.ReadingDate = readingDate.Format("2006-01-02")
	return r, nil
}

// --- ergonomics -------------------------------------------------------------

func (s *store) createAssessment(ctx context.Context, a ErgonomicAssessment, actor string) (ErgonomicAssessment, error) {
	a.ID = uuid.NewString()
	a.RecordedBy = actor

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ErgonomicAssessment{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := tx.QueryRow(ctx, `
		insert into ergonomic_assessment (
			assessment_id, period, assessed_on, workstation, work_type, assessor,
			outcome, findings, recorded_by
		) values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9)
		returning created_at`,
		a.ID, a.Period, a.AssessedOn, a.Workstation, a.WorkType, a.Assessor,
		a.Outcome, a.Findings, actor,
	).Scan(&a.CreatedAt); err != nil {
		return ErgonomicAssessment{}, fmt.Errorf("insert assessment: %w", err)
	}

	for i := range a.Actions {
		a.Actions[i].ID = uuid.NewString()
		a.Actions[i].AssessmentID = a.ID
		if _, err := tx.Exec(ctx, `
			insert into corrective_action (
				action_id, assessment_id, description, owner, due_date, status, closed_on, evidence
			) values ($1,$2,$3,$4,$5::date,$6,$7,$8)`,
			a.Actions[i].ID, a.ID, a.Actions[i].Description, a.Actions[i].Owner,
			a.Actions[i].DueDate, a.Actions[i].Status,
			nullableDate(a.Actions[i].ClosedOn), a.Actions[i].Evidence,
		); err != nil {
			return ErgonomicAssessment{}, fmt.Errorf("insert corrective action: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return ErgonomicAssessment{}, err
	}
	return s.getAssessment(ctx, a.ID)
}

func (s *store) getAssessment(ctx context.Context, id string) (ErgonomicAssessment, error) {
	row := s.pool.QueryRow(ctx, `
		select assessment_id, period, assessed_on, workstation, work_type, assessor,
		       outcome, findings, recorded_by, created_at
		from ergonomic_assessment where assessment_id = $1`, id)

	a, err := scanAssessment(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErgonomicAssessment{}, errNotFound
	}
	if err != nil {
		return ErgonomicAssessment{}, err
	}

	actions, err := s.actionsFor(ctx, []string{id})
	if err != nil {
		return ErgonomicAssessment{}, err
	}
	a.Actions = actions[id]
	if a.Actions == nil {
		a.Actions = []CorrectiveAction{}
	}
	return a, nil
}

func (s *store) listAssessments(ctx context.Context, period string, limit int) ([]ErgonomicAssessment, error) {
	rows, err := s.pool.Query(ctx, `
		select assessment_id, period, assessed_on, workstation, work_type, assessor,
		       outcome, findings, recorded_by, created_at
		from ergonomic_assessment
		where ($1 = '' or period = $1)
		order by assessed_on desc, created_at desc
		limit $2`, period, limit)
	if err != nil {
		return nil, fmt.Errorf("query assessments: %w", err)
	}
	defer rows.Close()

	assessments := []ErgonomicAssessment{}
	ids := []string{}
	for rows.Next() {
		a, err := scanAssessment(rows)
		if err != nil {
			return nil, err
		}
		a.Actions = []CorrectiveAction{}
		assessments = append(assessments, a)
		ids = append(ids, a.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	actions, err := s.actionsFor(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range assessments {
		if found, ok := actions[assessments[i].ID]; ok {
			assessments[i].Actions = found
		}
	}
	return assessments, nil
}

func (s *store) actionsFor(ctx context.Context, ids []string) (map[string][]CorrectiveAction, error) {
	byAssessment := map[string][]CorrectiveAction{}
	if len(ids) == 0 {
		return byAssessment, nil
	}
	rows, err := s.pool.Query(ctx, `
		select action_id, assessment_id, description, owner, due_date, status,
		       closed_on, evidence, created_at
		from corrective_action where assessment_id = any($1) order by due_date`, ids)
	if err != nil {
		return nil, fmt.Errorf("query corrective actions: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var a CorrectiveAction
		var due time.Time
		var closed *time.Time
		if err := rows.Scan(
			&a.ID, &a.AssessmentID, &a.Description, &a.Owner, &due, &a.Status,
			&closed, &a.Evidence, &a.CreatedAt,
		); err != nil {
			return nil, err
		}
		a.DueDate = due.Format("2006-01-02")
		if closed != nil {
			a.ClosedOn = closed.Format("2006-01-02")
		}
		byAssessment[a.AssessmentID] = append(byAssessment[a.AssessmentID], a)
	}
	return byAssessment, rows.Err()
}

func (s *store) updateAction(ctx context.Context, id, status, closedOn, evidence string) (CorrectiveAction, error) {
	tag, err := s.pool.Exec(ctx, `
		update corrective_action
		set status = $2, closed_on = $3::date, evidence = $4, updated_at = now()
		where action_id = $1`, id, status, nullableDate(closedOn), evidence)
	if err != nil {
		return CorrectiveAction{}, fmt.Errorf("update corrective action: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return CorrectiveAction{}, errNotFound
	}

	row := s.pool.QueryRow(ctx, `
		select action_id, assessment_id, description, owner, due_date, status,
		       closed_on, evidence, created_at
		from corrective_action where action_id = $1`, id)

	var a CorrectiveAction
	var due time.Time
	var closed *time.Time
	if err := row.Scan(
		&a.ID, &a.AssessmentID, &a.Description, &a.Owner, &due, &a.Status,
		&closed, &a.Evidence, &a.CreatedAt,
	); err != nil {
		return CorrectiveAction{}, err
	}
	a.DueDate = due.Format("2006-01-02")
	if closed != nil {
		a.ClosedOn = closed.Format("2006-01-02")
	}
	return a, nil
}

func scanAssessment(row scannable) (ErgonomicAssessment, error) {
	var a ErgonomicAssessment
	var assessedOn time.Time
	if err := row.Scan(
		&a.ID, &a.Period, &assessedOn, &a.Workstation, &a.WorkType, &a.Assessor,
		&a.Outcome, &a.Findings, &a.RecordedBy, &a.CreatedAt,
	); err != nil {
		return ErgonomicAssessment{}, err
	}
	a.AssessedOn = assessedOn.Format("2006-01-02")
	return a, nil
}

// --- the plan ---------------------------------------------------------------

// A plan correction keeps the former row and the reason in the same
// transaction. This matters most for the disease count because changing it is
// a revised clinical and legal judgement, not routine data entry.
func (s *store) savePlan(ctx context.Context, plan Plan, actor, reason string) (Plan, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var previous []byte
	err = tx.QueryRow(ctx,
		`select to_jsonb(health_wellness_plan) from health_wellness_plan where period = $1`,
		plan.Period).Scan(&previous)
	existing := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, fmt.Errorf("read the existing plan: %w", err)
	}
	if existing {
		if reason == "" {
			return Plan{}, errPlanReasonRequired
		}
		if _, err := tx.Exec(ctx, `
			insert into health_wellness_plan_revision (
				period, previous, reason, corrected_by
			) values ($1,$2,$3,$4)`, plan.Period, previous, reason, actor); err != nil {
			return Plan{}, fmt.Errorf("record the plan correction: %w", err)
		}
	}

	_, err = tx.Exec(ctx, `
		insert into health_wellness_plan (
			period, hygiene_events_planned, ergonomic_assessments_planned,
			confirmed_occupational_diseases, recorded_by
		) values ($1,$2,$3,$4,$5)
		on conflict (period) do update set
			hygiene_events_planned = excluded.hygiene_events_planned,
			ergonomic_assessments_planned = excluded.ergonomic_assessments_planned,
			confirmed_occupational_diseases = excluded.confirmed_occupational_diseases,
			recorded_by = excluded.recorded_by,
			updated_at = now()`,
		plan.Period, plan.HygieneEventsPlanned, plan.ErgonomicAssessmentsPlanned,
		plan.ConfirmedOccupationalDiseases, actor)
	if err != nil {
		return Plan{}, fmt.Errorf("save plan: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	return s.plan(ctx, plan.Period)
}

var errPlanReasonRequired = errors.New("a plan correction needs a reason")

func (s *store) plan(ctx context.Context, period string) (Plan, error) {
	row := s.pool.QueryRow(ctx, `
		select period, hygiene_events_planned, ergonomic_assessments_planned,
		       confirmed_occupational_diseases, recorded_by
		from health_wellness_plan where period = $1`, period)

	var p Plan
	err := row.Scan(&p.Period, &p.HygieneEventsPlanned, &p.ErgonomicAssessmentsPlanned,
		&p.ConfirmedOccupationalDiseases, &p.RecordedBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, errNotFound
	}
	return p, err
}

func (s *store) planRevisions(ctx context.Context, period string) ([]PlanRevision, error) {
	rows, err := s.pool.Query(ctx, `
		select period, previous, reason, corrected_by, corrected_at
		from health_wellness_plan_revision
		where period = $1 order by corrected_at desc`, period)
	if err != nil {
		return nil, fmt.Errorf("query plan revisions: %w", err)
	}
	defer rows.Close()

	revisions := []PlanRevision{}
	for rows.Next() {
		var revision PlanRevision
		if err := rows.Scan(
			&revision.Period, &revision.Previous, &revision.Reason,
			&revision.CorrectedBy, &revision.CorrectedAt,
		); err != nil {
			return nil, err
		}
		revisions = append(revisions, revision)
	}
	return revisions, rows.Err()
}

// --- the monthly aggregate --------------------------------------------------

// monthlyAggregate is the only thing the metrics service reads from here.
//
// Counts only. No location, no workstation, no assessor, no finding. A
// dashboard reports how the department performed, not which bench failed, and
// keeping that boundary in the query rather than in the caller means a change
// to the dashboard cannot widen it.
func (s *store) monthlyAggregate(ctx context.Context, period string) (MonthlyAggregate, error) {
	aggregate := MonthlyAggregate{Period: period}

	if err := s.pool.QueryRow(ctx, `
		select
			count(*) filter (where kpi_eligible),
			count(*) filter (where kpi_eligible and compliance = 'within')
		from hygiene_reading where period = $1`, period,
	).Scan(&aggregate.HygieneReadingsEligible, &aggregate.HygieneReadingsWithin); err != nil {
		return MonthlyAggregate{}, fmt.Errorf("aggregate readings: %w", err)
	}

	// Actions are counted against the month they fell due, not the month they
	// were raised. "Closed on time" is a statement about a deadline, and the
	// deadline is what dates it.
	if err := s.pool.QueryRow(ctx, `
		select
			count(*),
			count(*) filter (where status = 'Closed' and closed_on is not null and closed_on <= due_date)
		from corrective_action
		where to_char(due_date, 'YYYY-MM') = $1`, period,
	).Scan(&aggregate.ActionsDue, &aggregate.ActionsClosedOnTime); err != nil {
		return MonthlyAggregate{}, fmt.Errorf("aggregate corrective actions: %w", err)
	}

	if err := s.pool.QueryRow(ctx, `
		select
			count(*) filter (where performed),
			(select count(*) from ergonomic_assessment where period = $1)
		from hygiene_monitoring_event where period = $1`, period,
	).Scan(&aggregate.HygieneEventsPerformed, &aggregate.ErgonomicAssessmentsDone); err != nil {
		return MonthlyAggregate{}, fmt.Errorf("aggregate completeness: %w", err)
	}

	plan, err := s.plan(ctx, period)
	if err != nil && !errors.Is(err, errNotFound) {
		return MonthlyAggregate{}, err
	}
	// A month with no plan reports zeros planned, which the metrics service
	// reads as no denominator and therefore no data, not as a completeness
	// figure of zero per cent.
	//
	// PlanRecorded carries the difference for the confirmed-disease count,
	// which has no denominator to give it away. Nought confirmed diseases
	// because none occurred and nought because nobody has done the entry are
	// different facts, and against a target of zero the second one would
	// otherwise earn a green tick.
	aggregate.PlanRecorded = err == nil
	aggregate.HygieneEventsPlanned = plan.HygieneEventsPlanned
	aggregate.ErgonomicAssessmentsPlanned = plan.ErgonomicAssessmentsPlanned
	aggregate.ConfirmedOccupationalDiseases = plan.ConfirmedOccupationalDiseases

	return aggregate, nil
}

func nullableDate(value string) any {
	if value == "" {
		return nil
	}
	return value
}
