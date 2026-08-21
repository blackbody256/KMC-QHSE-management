package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// The two services this one reads from.
//
// It reads and never writes, and it holds no clinical credential of any kind.
// What reaches it is a target, a count and a number of days, never a name, a
// diagnosis or a location. That boundary is the reason the dashboard can be
// shown to a director whose account cannot open a patient record.
//
// The caller's own bearer token is forwarded rather than a service credential,
// so a user who cannot read reference data cannot cause this service to read it
// for them, and the upstream logs name the person rather than a machine.

type upstream struct {
	adminURL        string
	occupationalURL string
	http            *http.Client
}

func newUpstream(adminURL, occupationalURL string) *upstream {
	return &upstream{
		adminURL:        adminURL,
		occupationalURL: occupationalURL,
		http:            &http.Client{Timeout: 10 * time.Second},
	}
}

// KpiDefinition is the target in force, as the admin service holds it.
type KpiDefinition struct {
	ID                  string   `json:"id"`
	MetricID            string   `json:"metricId"`
	Name                string   `json:"name"`
	Group               string   `json:"group"`
	TargetLabel         string   `json:"targetLabel"`
	TargetValue         float64  `json:"targetValue"`
	Comparison          string   `json:"comparison"`
	Direction           string   `json:"direction"`
	ApproachingBoundary *float64 `json:"approachingBoundary,omitempty"`
	Format              string   `json:"format"`
	Provenance          string   `json:"provenance"`
	Note                string   `json:"note"`
	EffectiveFrom       string   `json:"effectiveFrom"`
	SourceNote          string   `json:"sourceNote"`
	ApprovalState       string   `json:"approvalState"`
}

// OccupationalAggregate is the month's counts from the occupational service.
type OccupationalAggregate struct {
	Period                        string `json:"period"`
	HygieneReadingsEligible       int    `json:"hygieneReadingsEligible"`
	HygieneReadingsWithin         int    `json:"hygieneReadingsWithin"`
	ActionsDue                    int    `json:"actionsDue"`
	ActionsClosedOnTime           int    `json:"actionsClosedOnTime"`
	HygieneEventsPlanned          int    `json:"hygieneEventsPlanned"`
	HygieneEventsPerformed        int    `json:"hygieneEventsPerformed"`
	ErgonomicAssessmentsPlanned   int    `json:"ergonomicAssessmentsPlanned"`
	ErgonomicAssessmentsDone      int    `json:"ergonomicAssessmentsDone"`
	ConfirmedOccupationalDiseases int    `json:"confirmedOccupationalDiseases"`
	// False where no plan was recorded for the month. Without it, a month
	// nobody entered would report nought confirmed diseases and score On
	// target against a target of zero.
	PlanRecorded bool `json:"planRecorded"`
}

func (u *upstream) get(ctx context.Context, endpoint, bearer string, into any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", bearer)

	response, err := u.http.Do(req)
	if err != nil {
		return fmt.Errorf("reach %s: %w", endpoint, err)
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%s returned %d", endpoint, response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(into)
}

// kpiDefinitions returns the targets in force on the first of the month.
//
// The first of the month, not today. A dashboard rendered for June must use
// June's target: recomputing last year's months against this year's target
// makes a trend line that never happened.
func (u *upstream) kpiDefinitions(ctx context.Context, bearer, period string) (map[string]KpiDefinition, error) {
	var body struct {
		Definitions []KpiDefinition `json:"definitions"`
	}
	endpoint := u.adminURL + "/api/admin/kpi-definitions?on=" + url.QueryEscape(period+"-01")
	if err := u.get(ctx, endpoint, bearer, &body); err != nil {
		return nil, err
	}

	byMetric := make(map[string]KpiDefinition, len(body.Definitions))
	for _, definition := range body.Definitions {
		byMetric[definition.MetricID] = definition
	}
	return byMetric, nil
}

func (u *upstream) occupational(ctx context.Context, bearer, period string) (OccupationalAggregate, error) {
	var aggregate OccupationalAggregate
	endpoint := u.occupationalURL + "/api/occupational/aggregate/" + url.PathEscape(period)
	if err := u.get(ctx, endpoint, bearer, &aggregate); err != nil {
		return OccupationalAggregate{}, err
	}
	return aggregate, nil
}
