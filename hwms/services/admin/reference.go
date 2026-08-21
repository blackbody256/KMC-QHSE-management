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

// KpiDefinition is one indicator's target, as agreed by its owner and dated.
type KpiDefinition struct {
	ID          string  `json:"id"`
	MetricID    string  `json:"metricId"`
	Name        string  `json:"name"`
	Group       string  `json:"group"`
	TargetLabel string  `json:"targetLabel"`
	TargetValue float64 `json:"targetValue"`
	Comparison  string  `json:"comparison"`
	Direction   string  `json:"direction"`
	// Nil where the owner has set no band. There is then no Approaching state
	// for this indicator, rather than one this system invented.
	ApproachingBoundary *float64 `json:"approachingBoundary,omitempty"`
	Format              string   `json:"format"`
	Provenance          string   `json:"provenance"`
	Note                string   `json:"note"`

	EffectiveFrom string `json:"effectiveFrom"`
	EffectiveTo   string `json:"effectiveTo,omitempty"`
	SourceNote    string `json:"sourceNote"`
	ApprovalState string `json:"approvalState"`
}

// HygieneLimit is one exposure limit in one monitoring context, dated.
type HygieneLimit struct {
	ID              string  `json:"id"`
	Parameter       string  `json:"parameter"`
	Limit           float64 `json:"limit"`
	Unit            string  `json:"unit"`
	AveragingPeriod string  `json:"averagingPeriod"`
	Context         string  `json:"context"`
	StandardFamily  string  `json:"standardFamily"`
	StandardVersion string  `json:"standardVersion"`

	EffectiveFrom string `json:"effectiveFrom"`
	EffectiveTo   string `json:"effectiveTo,omitempty"`
	SourceNote    string `json:"sourceNote"`
	ApprovalState string `json:"approvalState"`
}

// MonitoringContexts are the three contexts a reading can be judged in.
//
// The same parameter carries different limits in each. 85 dB(A) over a shift is
// an occupational exposure limit; an ambient night-time limit is far lower. A
// reading evaluated against the wrong context is worse than an unevaluated one,
// which is why the context is required rather than defaulted.
var MonitoringContexts = []string{"occupational-exposure", "indoor-workplace", "ambient"}

func ValidMonitoringContext(value string) bool {
	for _, context := range MonitoringContexts {
		if context == value {
			return true
		}
	}
	return false
}

const kpiColumns = `
	kpi_definition_id, metric_id, name, kpi_group, target_label, target_value,
	comparison, direction, approaching_boundary, format, provenance, note,
	effective_from, effective_to, source_note, approval_state`

// kpiDefinitionsOn returns the definitions in force on a given date.
//
// "In force on" rather than "current". A dashboard rendered for June must use
// June's target: recomputing last year's months against this year's target
// makes a trend line that never happened.
func (s *store) kpiDefinitionsOn(ctx context.Context, on string) ([]KpiDefinition, error) {
	rows, err := s.pool.Query(ctx, `
		select `+kpiColumns+`
		from kpi_definition
		where effective_from <= $1::date
		  and (effective_to is null or effective_to > $1::date)
		order by kpi_group, metric_id`, on)
	if err != nil {
		return nil, fmt.Errorf("query kpi definitions: %w", err)
	}
	defer rows.Close()

	definitions := []KpiDefinition{}
	for rows.Next() {
		definition, err := scanKpi(rows)
		if err != nil {
			return nil, err
		}
		definitions = append(definitions, definition)
	}
	return definitions, rows.Err()
}

// allKpiDefinitions returns every version, superseded ones included, for the
// reference data screen. The history is the audit trail of who changed a target
// and when, and it is not hidden behind the current value.
func (s *store) allKpiDefinitions(ctx context.Context) ([]KpiDefinition, error) {
	rows, err := s.pool.Query(ctx, `
		select `+kpiColumns+` from kpi_definition
		order by metric_id, effective_from desc`)
	if err != nil {
		return nil, fmt.Errorf("query kpi definitions: %w", err)
	}
	defer rows.Close()

	definitions := []KpiDefinition{}
	for rows.Next() {
		definition, err := scanKpi(rows)
		if err != nil {
			return nil, err
		}
		definitions = append(definitions, definition)
	}
	return definitions, rows.Err()
}

// supersedeKpiDefinition closes the current row and opens a new one.
//
// A target is never updated in place. Doing so would rewrite every historical
// evaluation that used it, and the report someone printed last quarter would
// stop reproducing. Closing the old row and opening a new one from a date keeps
// both answers true, each for its own period.
func (s *store) supersedeKpiDefinition(ctx context.Context, metricID string, next KpiDefinition) (KpiDefinition, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return KpiDefinition{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var current KpiDefinition
	row := tx.QueryRow(ctx, `
		select `+kpiColumns+` from kpi_definition
		where metric_id = $1 and effective_to is null`, metricID)
	current, err = scanKpi(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return KpiDefinition{}, errNotFound
	}
	if err != nil {
		return KpiDefinition{}, err
	}

	if next.EffectiveFrom <= current.EffectiveFrom {
		return KpiDefinition{}, fmt.Errorf(
			"a new target must start after the one it replaces, which runs from %s", current.EffectiveFrom)
	}

	if _, err := tx.Exec(ctx, `
		update kpi_definition set effective_to = $2::date, updated_at = now()
		where kpi_definition_id = $1`, current.ID, next.EffectiveFrom); err != nil {
		return KpiDefinition{}, fmt.Errorf("close the current definition: %w", err)
	}

	next.ID = uuid.NewString()
	next.MetricID = metricID
	// Carried from the row being replaced. Changing a target is a decision;
	// changing what the indicator is called or which way it points is a
	// different decision and does not travel with it.
	next.Name = current.Name
	next.Group = current.Group
	next.Direction = current.Direction
	next.Format = current.Format
	next.Provenance = current.Provenance

	if _, err := tx.Exec(ctx, `
		insert into kpi_definition (
			kpi_definition_id, metric_id, name, kpi_group, target_label, target_value,
			comparison, direction, approaching_boundary, format, provenance, note,
			effective_from, source_note, approval_state
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14,$15)`,
		next.ID, next.MetricID, next.Name, next.Group, next.TargetLabel, next.TargetValue,
		next.Comparison, next.Direction, next.ApproachingBoundary, next.Format,
		next.Provenance, next.Note, next.EffectiveFrom, next.SourceNote, next.ApprovalState,
	); err != nil {
		return KpiDefinition{}, fmt.Errorf("insert the new definition: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return KpiDefinition{}, err
	}
	return next, nil
}

const limitColumns = `
	hygiene_limit_id, parameter, limit_value, unit, averaging_period,
	monitoring_context, standard_family, standard_version,
	effective_from, effective_to, source_note, approval_state`

// hygieneLimitOn resolves the single limit that governs a reading.
//
// The caller supplies the date of the reading, not today's date. This is the
// whole contract of this service: ask what the rule was when the thing
// happened, snapshot the answer, and never ask again.
func (s *store) hygieneLimitOn(ctx context.Context, parameter, monitoringContext, on string) (HygieneLimit, error) {
	row := s.pool.QueryRow(ctx, `
		select `+limitColumns+`
		from hygiene_reference_limit
		where parameter = $1 and monitoring_context = $2
		  and effective_from <= $3::date
		  and (effective_to is null or effective_to > $3::date)`,
		parameter, monitoringContext, on)

	limit, err := scanLimit(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return HygieneLimit{}, errNotFound
	}
	return limit, err
}

func (s *store) hygieneLimits(ctx context.Context, on string) ([]HygieneLimit, error) {
	query := `select ` + limitColumns + ` from hygiene_reference_limit`
	args := []any{}
	if on != "" {
		query += ` where effective_from <= $1::date and (effective_to is null or effective_to > $1::date)`
		args = append(args, on)
	}
	query += ` order by parameter, monitoring_context, effective_from desc`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query hygiene limits: %w", err)
	}
	defer rows.Close()

	limits := []HygieneLimit{}
	for rows.Next() {
		limit, err := scanLimit(rows)
		if err != nil {
			return nil, err
		}
		limits = append(limits, limit)
	}
	return limits, rows.Err()
}

// supersedeHygieneLimit closes the current limit and opens a new one, for the
// same reason a KPI target is superseded rather than updated.
func (s *store) supersedeHygieneLimit(ctx context.Context, parameter, monitoringContext string, next HygieneLimit) (HygieneLimit, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return HygieneLimit{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	row := tx.QueryRow(ctx, `
		select `+limitColumns+` from hygiene_reference_limit
		where parameter = $1 and monitoring_context = $2 and effective_to is null`,
		parameter, monitoringContext)
	current, err := scanLimit(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return HygieneLimit{}, errNotFound
	}
	if err != nil {
		return HygieneLimit{}, err
	}

	if next.EffectiveFrom <= current.EffectiveFrom {
		return HygieneLimit{}, fmt.Errorf(
			"a new limit must start after the one it replaces, which runs from %s", current.EffectiveFrom)
	}

	if _, err := tx.Exec(ctx, `
		update hygiene_reference_limit set effective_to = $2::date, updated_at = now()
		where hygiene_limit_id = $1`, current.ID, next.EffectiveFrom); err != nil {
		return HygieneLimit{}, fmt.Errorf("close the current limit: %w", err)
	}

	next.ID = uuid.NewString()
	next.Parameter = parameter
	next.Context = monitoringContext

	if _, err := tx.Exec(ctx, `
		insert into hygiene_reference_limit (
			hygiene_limit_id, parameter, limit_value, unit, averaging_period,
			monitoring_context, standard_family, standard_version,
			effective_from, source_note, approval_state
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11)`,
		next.ID, next.Parameter, next.Limit, next.Unit, next.AveragingPeriod,
		next.Context, next.StandardFamily, next.StandardVersion,
		next.EffectiveFrom, next.SourceNote, next.ApprovalState,
	); err != nil {
		return HygieneLimit{}, fmt.Errorf("insert the new limit: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return HygieneLimit{}, err
	}
	return next, nil
}

// --- scanning ---------------------------------------------------------------

type scannable interface {
	Scan(dest ...any) error
}

func scanKpi(row scannable) (KpiDefinition, error) {
	var d KpiDefinition
	var from time.Time
	var to *time.Time
	if err := row.Scan(
		&d.ID, &d.MetricID, &d.Name, &d.Group, &d.TargetLabel, &d.TargetValue,
		&d.Comparison, &d.Direction, &d.ApproachingBoundary, &d.Format, &d.Provenance, &d.Note,
		&from, &to, &d.SourceNote, &d.ApprovalState,
	); err != nil {
		return KpiDefinition{}, err
	}
	d.EffectiveFrom = from.Format("2006-01-02")
	if to != nil {
		d.EffectiveTo = to.Format("2006-01-02")
	}
	return d, nil
}

func scanLimit(row scannable) (HygieneLimit, error) {
	var l HygieneLimit
	var from time.Time
	var to *time.Time
	if err := row.Scan(
		&l.ID, &l.Parameter, &l.Limit, &l.Unit, &l.AveragingPeriod,
		&l.Context, &l.StandardFamily, &l.StandardVersion,
		&from, &to, &l.SourceNote, &l.ApprovalState,
	); err != nil {
		return HygieneLimit{}, err
	}
	l.EffectiveFrom = from.Format("2006-01-02")
	if to != nil {
		l.EffectiveTo = to.Format("2006-01-02")
	}
	return l, nil
}
