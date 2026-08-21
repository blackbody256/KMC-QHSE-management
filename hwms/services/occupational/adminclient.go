package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// The reference data client.
//
// This service never holds its own copy of an exposure limit. Before a reading
// is stored it asks the admin service which limit was in force on the date of
// the reading, then copies the answer onto the row. That is one network call
// per reading, and it buys the property that matters: there is exactly one
// place a limit can be changed, and a reading's evaluation is fixed at the
// moment it is recorded.
//
// The caller's own bearer token is forwarded rather than a service credential.
// A user who cannot read reference data cannot cause this service to read it on
// their behalf, and the admin service's access log names the person rather than
// a machine.

var errLimitNotFound = errors.New("no reference limit in force")

type adminClient struct {
	baseURL string
	http    *http.Client
}

func newAdminClient(baseURL string) *adminClient {
	return &adminClient{
		baseURL: baseURL,
		// Short. A reading is being saved with someone standing at a
		// workstation; a reference lookup that hangs for thirty seconds is a
		// failure whatever it eventually returns.
		http: &http.Client{Timeout: 8 * time.Second},
	}
}

// ReferenceLimit is the admin service's answer, copied verbatim onto a reading.
type ReferenceLimit struct {
	ID              string  `json:"id"`
	Parameter       string  `json:"parameter"`
	Limit           float64 `json:"limit"`
	Unit            string  `json:"unit"`
	AveragingPeriod string  `json:"averagingPeriod"`
	Context         string  `json:"context"`
	StandardFamily  string  `json:"standardFamily"`
	StandardVersion string  `json:"standardVersion"`
	EffectiveFrom   string  `json:"effectiveFrom"`
	ApprovalState   string  `json:"approvalState"`
}

// resolveLimit asks which limit governed a reading of this parameter, in this
// context, on this date.
//
// The date is the reading's, never today's. Passing today's date would evaluate
// a backdated reading against a limit that did not exist when it was taken.
func (c *adminClient) resolveLimit(ctx context.Context, bearer, parameter, monitoringContext, on string) (ReferenceLimit, error) {
	query := url.Values{}
	query.Set("parameter", parameter)
	query.Set("context", monitoringContext)
	query.Set("on", on)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/api/admin/hygiene-limits/resolve?"+query.Encode(), nil)
	if err != nil {
		return ReferenceLimit{}, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", bearer)

	response, err := c.http.Do(req)
	if err != nil {
		return ReferenceLimit{}, fmt.Errorf("reach the reference data service: %w", err)
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode == http.StatusNotFound {
		return ReferenceLimit{}, errLimitNotFound
	}
	if response.StatusCode != http.StatusOK {
		return ReferenceLimit{}, fmt.Errorf(
			"reference data service returned %d resolving %s", response.StatusCode, parameter)
	}

	var limit ReferenceLimit
	if err := json.NewDecoder(response.Body).Decode(&limit); err != nil {
		return ReferenceLimit{}, fmt.Errorf("decode reference limit: %w", err)
	}
	return limit, nil
}

// parameters lists the parameters that have a limit in force, so the interface
// offers only what a reading can actually be evaluated against.
func (c *adminClient) parameters(ctx context.Context, bearer, on string) ([]ReferenceLimit, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/api/admin/hygiene-limits?on="+url.QueryEscape(on), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", bearer)

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("reach the reference data service: %w", err)
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("reference data service returned %d", response.StatusCode)
	}

	var body struct {
		Limits []ReferenceLimit `json:"limits"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode reference limits: %w", err)
	}
	return body.Limits, nil
}
