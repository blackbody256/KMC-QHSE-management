package main

import (
	"context"
	"errors"
	"fmt"
)

// Composing the dashboard.
//
// Nine indicators, each with the reporting month's figure and the year to date,
// each stating its target, its direction, where it came from and how it was
// worked out. The last of those is not decoration: a figure whose derivation is
// invisible is a figure nobody can challenge, and unchallengeable figures are
// what this system was commissioned to replace.

// Metric is one row of the dashboard.
type Metric struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Group string `json:"group"`

	Target      string  `json:"target"`
	TargetValue float64 `json:"targetValue"`
	// "higher" or "lower". Rendered as a phrase beside the target, because the
	// direction of an indicator is not guessable from its name, more near-miss
	// reports are better and more injuries are worse.
	Direction  string `json:"direction"`
	Format     string `json:"format"`
	Provenance string `json:"provenance"`
	SourceNote string `json:"sourceNote"`
	Note       string `json:"note"`
	// True where the target has not been agreed by its owner. Shown, so nobody
	// takes a proposal for a decision.
	Proposed bool `json:"proposed"`

	AggregationLabel string `json:"aggregationLabel"`
	Month            Value  `json:"month"`
	YearToDate       Value  `json:"yearToDate"`

	// January through the reporting month, for the sparkline on the card.
	//
	// It costs nothing to publish: every one of these months is already read
	// and evaluated to decide whether the year to date is complete. Sending
	// them turns a single figure into a direction of travel, which is the
	// question a reader actually has. 92% means little until you can see
	// whether it was 97% in March.
	Trend []TrendPoint `json:"trend"`
}

// TrendPoint is one month of one indicator.
//
// Value is nil for a month with no figure, and the interface draws a gap rather
// than joining the line across it. A line that closes over a missing month
// asserts a value nobody recorded.
type TrendPoint struct {
	Period string   `json:"period"`
	Value  *float64 `json:"value,omitempty"`
	Status Status   `json:"status"`
}

// Snapshot is the whole dashboard for one month.
type Snapshot struct {
	Period      string   `json:"period"`
	PeriodLabel string   `json:"periodLabel"`
	Metrics     []Metric `json:"metrics"`
	OnTarget    int      `json:"onTarget"`
	Total       int      `json:"totalMetrics"`
	NoData      int      `json:"noData"`
	// Named so the reader knows which months the year-to-date column covers.
	MonthsInYearToDate int `json:"monthsInYearToDate"`
}

// monthInputs is everything one month contributes to every indicator.
type monthInputs struct {
	period     string
	ret        *MonthlyReturn
	aggregate  OccupationalAggregate
	leaveDays  float64
	haveReturn bool
}

// rawValue is the reporting-month figure for one indicator, or nil.
//
// Nil means the inputs were not supplied. It never means zero, and the two are
// never merged: a month with no near-miss count is not a month with no near
// misses (ADR-06).
func rawValue(metricID string, in monthInputs) (*float64, string) {
	switch metricID {
	case "OH1":
		if !in.haveReturn {
			return nil, ""
		}
		return SafePercent(in.ret.SurveillanceCompleted, in.ret.SurveillanceScheduled),
			fmt.Sprintf("%d assessed ÷ %d scheduled × 100",
				in.ret.SurveillanceCompleted, in.ret.SurveillanceScheduled)

	case "OH2":
		// Confirmed by an officer, not derived. Deciding a case is
		// occupational in origin is a clinical and legal judgement.
		//
		// A month with no plan recorded has no figure, rather than a figure of
		// zero. The two look identical in the count and are opposite in
		// meaning: nought cases because none occurred is the best possible
		// month, and nought because nobody has entered anything is a month
		// nobody has looked at. Against a target of zero the second would
		// score On target, which is the exact failure ADR-06 describes.
		if !in.aggregate.PlanRecorded {
			return nil, ""
		}
		value := float64(in.aggregate.ConfirmedOccupationalDiseases)
		return &value, "confirmed cases recorded for the month"

	case "OH3":
		return SafePercent(in.aggregate.HygieneReadingsWithin, in.aggregate.HygieneReadingsEligible),
			fmt.Sprintf("%d readings within the limit in force ÷ %d eligible readings × 100",
				in.aggregate.HygieneReadingsWithin, in.aggregate.HygieneReadingsEligible)

	case "OH4":
		return SafePercent(in.aggregate.ActionsClosedOnTime, in.aggregate.ActionsDue),
			fmt.Sprintf("%d actions closed on time ÷ %d actions due × 100",
				in.aggregate.ActionsClosedOnTime, in.aggregate.ActionsDue)

	case "S1":
		return intValue(in, func(r *MonthlyReturn) *int { return r.Fatalities }), "attributed monthly return"
	case "S2":
		return intValue(in, func(r *MonthlyReturn) *int { return r.TotalRecordableIncidents }), "attributed monthly return"
	case "S3":
		return intValue(in, func(r *MonthlyReturn) *int { return r.TotalRecordableInjuries }), "attributed monthly return"
	case "S4":
		return intValue(in, func(r *MonthlyReturn) *int { return r.ReportableNearMisses }), "attributed monthly return"

	case "S5":
		if !in.haveReturn {
			return nil, ""
		}
		// The referral link. Sick leave recommended by an external facility
		// reaches absenteeism without being re-keyed into the return, which is
		// what makes the referral part of the system rather than a document
		// store, FR-REF-07.
		lostDays := in.ret.HealthRelatedLostDays + in.leaveDays
		calculation := fmt.Sprintf("%.1f lost days ÷ %d employees", lostDays, in.ret.Headcount)
		if in.leaveDays > 0 {
			calculation = fmt.Sprintf("(%.1f from the return + %.1f from referrals) ÷ %d employees",
				in.ret.HealthRelatedLostDays, in.leaveDays, in.ret.Headcount)
		}
		return Rate(lostDays, in.ret.Headcount), calculation
	}
	return nil, ""
}

func intValue(in monthInputs, pick func(*MonthlyReturn) *int) *float64 {
	if !in.haveReturn {
		return nil
	}
	raw := pick(in.ret)
	if raw == nil {
		return nil
	}
	value := float64(*raw)
	return &value
}

// Compose builds the whole dashboard for one month.
func (s *service) Compose(ctx context.Context, bearer, period string) (Snapshot, error) {
	definitions, err := s.upstream.kpiDefinitions(ctx, bearer, period)
	if err != nil {
		return Snapshot{}, fmt.Errorf("read kpi definitions: %w", err)
	}

	periods := PeriodsToDate(period)
	if len(periods) == 0 {
		return Snapshot{}, fmt.Errorf("%q is not a reporting month", period)
	}

	// Every month of the year to date is gathered up front. The year-to-date
	// column needs all of them, and gathering them per indicator would repeat
	// the same reads nine times.
	inputs := make(map[string]monthInputs, len(periods))
	for _, month := range periods {
		in := monthInputs{period: month}

		// Only a genuinely absent return becomes No data. A database failure
		// must not arrive on the dashboard dressed as a month nobody entered:
		// the first is an outage and the second is a task, and showing one as
		// the other sends somebody to chase paperwork that already exists.
		ret, err := s.store.getReturn(ctx, month)
		switch {
		case err == nil:
			in.ret = &ret
			in.haveReturn = true
		case errors.Is(err, errNotFound):
			// Genuinely not entered yet.
		default:
			return Snapshot{}, fmt.Errorf("read monthly return for %s: %w", month, err)
		}

		aggregate, err := s.upstream.occupational(ctx, bearer, month)
		if err != nil {
			return Snapshot{}, fmt.Errorf("read occupational aggregate for %s: %w", month, err)
		}
		in.aggregate = aggregate

		days, err := s.store.leaveDays(ctx, month)
		if err != nil {
			return Snapshot{}, err
		}
		in.leaveDays = days

		inputs[month] = in
	}

	order := []string{"OH1", "OH2", "OH3", "OH4", "S1", "S2", "S3", "S4", "S5"}
	snapshot := Snapshot{
		Period:             period,
		PeriodLabel:        periodLabel(period),
		Metrics:            make([]Metric, 0, len(order)),
		MonthsInYearToDate: len(periods),
	}

	for _, metricID := range order {
		definition, ok := definitions[metricID]
		if !ok {
			// An indicator with no target in force is shown with no data
			// rather than dropped. A row that vanishes is a row nobody asks
			// about, and a missing target is exactly the thing to ask about.
			snapshot.Metrics = append(snapshot.Metrics, Metric{
				ID:               metricID,
				Name:             metricID,
				Group:            "Occupational health",
				Target:           "no target set",
				AggregationLabel: "Year-to-date",
				Month:            NoData("No target is in force for this indicator on " + period + "."),
				YearToDate:       NoData("No target is in force for this indicator."),
				Trend:            []TrendPoint{},
			})
			continue
		}

		metric := Metric{
			ID:          metricID,
			Name:        definition.Name,
			Group:       definition.Group,
			Target:      definition.TargetLabel,
			TargetValue: definition.TargetValue,
			Direction:   definition.Direction,
			Format:      definition.Format,
			Provenance:  definition.Provenance,
			SourceNote:  definition.SourceNote,
			Note:        definition.Note,
			Proposed:    definition.ApprovalState != "approved",
		}

		metric.Month = monthValue(metricID, definition, inputs[period])
		metric.YearToDate, metric.AggregationLabel = yearToDateValue(metricID, definition, periods, inputs)

		metric.Trend = make([]TrendPoint, 0, len(periods))
		for _, month := range periods {
			value, _ := rawValue(metricID, inputs[month])
			metric.Trend = append(metric.Trend, TrendPoint{
				Period: month,
				Value:  value,
				Status: Evaluate(value, definition.Comparison, definition.TargetValue, definition.ApproachingBoundary),
			})
		}

		snapshot.Metrics = append(snapshot.Metrics, metric)
	}

	snapshot.Total = len(snapshot.Metrics)
	for _, metric := range snapshot.Metrics {
		switch metric.Month.Status {
		case StatusWithin:
			snapshot.OnTarget++
		case StatusNoData:
			snapshot.NoData++
		}
	}
	return snapshot, nil
}

func monthValue(metricID string, definition KpiDefinition, in monthInputs) Value {
	raw, calculation := rawValue(metricID, in)
	if raw == nil {
		return NoData("No figure has been recorded for this indicator in " + in.period + ".")
	}
	return Value{
		Display:      Format(*raw, definition.Format),
		Numeric:      raw,
		Status:       Evaluate(raw, definition.Comparison, definition.TargetValue, definition.ApproachingBoundary),
		Completeness: "complete",
		Calculation:  calculation,
	}
}

// yearToDateValue aggregates January through the reporting month.
//
// It refuses to produce a figure unless every month is present. A part-year
// average changes every month for reasons that have nothing to do with
// performance, and a reader comparing two such figures is comparing nothing.
//
// Rates are re-derived from the summed numerators and denominators rather than
// averaged from the monthly percentages. Averaging percentages weights a month
// with four readings the same as a month with four hundred.
func yearToDateValue(metricID string, definition KpiDefinition, periods []string, inputs map[string]monthInputs) (Value, string) {
	label := "Year-to-date weighted rate"
	if IsCumulative(metricID) {
		label = "Year-to-date total"
	}

	available := 0
	for _, month := range periods {
		if value, _ := rawValue(metricID, inputs[month]); value != nil {
			available++
		}
	}
	if available != len(periods) {
		return IncompleteHistory(available, len(periods)), label
	}

	if IsCumulative(metricID) {
		total := 0.0
		for _, month := range periods {
			value, _ := rawValue(metricID, inputs[month])
			total += *value
		}
		// A cumulative target scales with the months elapsed: 200 near misses
		// a month is 1,400 by July. Comparing a year-to-date total against a
		// monthly target would mark every indicator off target by February.
		target := definition.TargetValue
		if definition.Comparison == "gte" {
			target = definition.TargetValue * float64(len(periods))
		}
		return Value{
			Display:      Format(total, definition.Format),
			Numeric:      &total,
			Status:       Evaluate(&total, definition.Comparison, target, nil),
			Completeness: "complete",
			Calculation:  fmt.Sprintf("%d complete monthly values summed", len(periods)),
		}, label
	}

	var numerator, denominator float64
	var calculation string

	switch metricID {
	case "OH1":
		var completed, scheduled int
		for _, month := range periods {
			completed += inputs[month].ret.SurveillanceCompleted
			scheduled += inputs[month].ret.SurveillanceScheduled
		}
		numerator, denominator = float64(completed), float64(scheduled)
		calculation = fmt.Sprintf("%d assessed ÷ %d scheduled × 100", completed, scheduled)

	case "OH3":
		var within, eligible int
		for _, month := range periods {
			within += inputs[month].aggregate.HygieneReadingsWithin
			eligible += inputs[month].aggregate.HygieneReadingsEligible
		}
		numerator, denominator = float64(within), float64(eligible)
		calculation = fmt.Sprintf("%d readings within limit ÷ %d eligible readings × 100", within, eligible)

	case "OH4":
		var closed, due int
		for _, month := range periods {
			closed += inputs[month].aggregate.ActionsClosedOnTime
			due += inputs[month].aggregate.ActionsDue
		}
		numerator, denominator = float64(closed), float64(due)
		calculation = fmt.Sprintf("%d actions closed on time ÷ %d actions due × 100", closed, due)

	case "S5":
		var lostDays float64
		var employeeMonths int
		for _, month := range periods {
			lostDays += inputs[month].ret.HealthRelatedLostDays + inputs[month].leaveDays
			employeeMonths += inputs[month].ret.Headcount
		}
		value := Rate(lostDays, employeeMonths)
		if value == nil {
			return NoData("There is no headcount to divide by."), label
		}
		return Value{
			Display:      Format(*value, definition.Format),
			Numeric:      value,
			Status:       Evaluate(value, definition.Comparison, definition.TargetValue, definition.ApproachingBoundary),
			Completeness: "complete",
			Calculation:  fmt.Sprintf("%.1f lost days ÷ %d employee-months", lostDays, employeeMonths),
		}, label
	}

	value := SafePercent(int(numerator), int(denominator))
	if value == nil {
		return NoData("There is nothing to compute this from across the year to date."), label
	}
	return Value{
		Display:      Format(*value, definition.Format),
		Numeric:      value,
		Status:       Evaluate(value, definition.Comparison, definition.TargetValue, definition.ApproachingBoundary),
		Completeness: "complete",
		Calculation:  calculation,
	}, label
}

var monthNames = []string{
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
}

func periodLabel(period string) string {
	if len(period) != 7 {
		return period
	}
	month := 0
	if _, err := fmt.Sscanf(period[5:], "%d", &month); err != nil || month < 1 || month > 12 {
		return period
	}
	return monthNames[month-1] + " " + period[:4]
}
