package main

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

type service struct {
	log   *slog.Logger
	store *store
}

func (s *service) routes(r chi.Router) {
	// Reference data is not clinical. Every signed-in role may read a target
	// or a limit, a director looking at the dashboard should be able to see
	// what the figure is being judged against, and hiding it would make the
	// dashboard less answerable rather than more secure.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAnyRole(auth.RoleOfficer, auth.RoleManager, auth.RoleDirector))

		r.Get("/kpi-definitions", s.handleListKpiDefinitions)
		r.Get("/hygiene-limits", s.handleListHygieneLimits)
		// The single limit governing one reading on one date. This is the call
		// the occupational service makes before it stores an evaluation.
		r.Get("/hygiene-limits/resolve", s.handleResolveHygieneLimit)
		r.Get("/monitoring-contexts", s.handleMonitoringContexts)
	})

	// Changing a target changes what the executive dashboard reports as
	// success. That is the manager's decision, and it is recorded as one.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireRoleWithMessage(auth.RoleManager,
			"Targets and exposure limits are changed by the Health and Wellness manager. Every change is dated and the previous value is kept."))

		r.Post("/kpi-definitions/{metricId}", s.handleSupersedeKpiDefinition)
		r.Post("/hygiene-limits/{parameter}", s.handleSupersedeHygieneLimit)
	})
}

// authorise is the service-layer half of the double check. It is not redundant
// with the middleware above: it protects a code path reached from a scheduled
// job or an internal caller that never passes through a handler.
func (s *service) authorise(w http.ResponseWriter, r *http.Request, roles ...string) (auth.Subject, bool) {
	if err := auth.RequireAnyRoleCtx(r.Context(), roles...); err != nil {
		httpx.Problem(w, http.StatusForbidden, "This account does not have access to that function.")
		return auth.Subject{}, false
	}
	subject, _ := auth.SubjectFrom(r.Context())
	return subject, true
}

func (s *service) fail(w http.ResponseWriter, r *http.Request, err error, action string) {
	if errors.Is(err, errNotFound) {
		httpx.Problem(w, http.StatusNotFound, "There is no reference data for that.")
		return
	}
	s.log.Error(action,
		slog.String("request_id", httpx.RequestIDFrom(r.Context())),
		slog.String("error", err.Error()),
	)
	httpx.Problem(w, http.StatusInternalServerError,
		"The reference data could not be read. Try again, and report the request identifier if it recurs.")
}

// dateFrom reads the "on" parameter, which is the date the caller is asking
// about rather than today.
//
// Defaulting to today is right for a screen and wrong for an evaluation, so
// the callers that must not default, the occupational service resolving a
// limit. Send it explicitly and are refused if they do not.
func dateFrom(r *http.Request, fallbackToToday bool) (string, bool) {
	raw := strings.TrimSpace(r.URL.Query().Get("on"))
	if raw == "" {
		if !fallbackToToday {
			return "", false
		}
		return time.Now().Format("2006-01-02"), true
	}
	if _, err := time.Parse("2006-01-02", raw); err != nil {
		return "", false
	}
	return raw, true
}

func (s *service) handleListKpiDefinitions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager, auth.RoleDirector); !ok {
		return
	}

	// history=true returns every version, which is the audit trail of who
	// changed a target and when.
	if r.URL.Query().Get("history") == "true" {
		definitions, err := s.store.allKpiDefinitions(r.Context())
		if err != nil {
			s.fail(w, r, err, "list kpi definitions failed")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"definitions": definitions})
		return
	}

	on, ok := dateFrom(r, true)
	if !ok {
		httpx.Problem(w, http.StatusBadRequest, "Send the date as on=YYYY-MM-DD.")
		return
	}
	definitions, err := s.store.kpiDefinitionsOn(r.Context(), on)
	if err != nil {
		s.fail(w, r, err, "list kpi definitions failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"on": on, "definitions": definitions})
}

func (s *service) handleListHygieneLimits(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager, auth.RoleDirector); !ok {
		return
	}

	on := ""
	if r.URL.Query().Get("history") != "true" {
		resolved, ok := dateFrom(r, true)
		if !ok {
			httpx.Problem(w, http.StatusBadRequest, "Send the date as on=YYYY-MM-DD.")
			return
		}
		on = resolved
	}

	limits, err := s.store.hygieneLimits(r.Context(), on)
	if err != nil {
		s.fail(w, r, err, "list hygiene limits failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"on": on, "limits": limits})
}

// handleResolveHygieneLimit answers "which limit governed this reading".
//
// The date is required rather than defaulted. A caller that forgot to send one
// is asking the wrong question, and answering it with today's limit would
// produce an evaluation that is wrong in a way nobody can see afterwards.
func (s *service) handleResolveHygieneLimit(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager, auth.RoleDirector); !ok {
		return
	}

	parameter := strings.TrimSpace(r.URL.Query().Get("parameter"))
	monitoringContext := strings.TrimSpace(r.URL.Query().Get("context"))
	on, ok := dateFrom(r, false)

	if parameter == "" || monitoringContext == "" || !ok {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the parameter, the monitoring context and the date of the reading as on=YYYY-MM-DD. The date is not optional: a reading is judged against the limit in force when it was taken.")
		return
	}
	if !ValidMonitoringContext(monitoringContext) {
		httpx.Problem(w, http.StatusBadRequest,
			"The monitoring context must be occupational-exposure, indoor-workplace or ambient.")
		return
	}

	limit, err := s.store.hygieneLimitOn(r.Context(), parameter, monitoringContext, on)
	if err != nil {
		if errors.Is(err, errNotFound) {
			httpx.Problem(w, http.StatusNotFound,
				"No limit for "+parameter+" in the "+monitoringContext+" context was in force on "+on+". Add one in reference data before recording readings against it.")
			return
		}
		s.fail(w, r, err, "resolve hygiene limit failed")
		return
	}
	httpx.JSON(w, http.StatusOK, limit)
}

func (s *service) handleMonitoringContexts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager, auth.RoleDirector); !ok {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"contexts": MonitoringContexts})
}

type supersedeKpiRequest struct {
	TargetLabel         string   `json:"targetLabel"`
	TargetValue         float64  `json:"targetValue"`
	Comparison          string   `json:"comparison"`
	ApproachingBoundary *float64 `json:"approachingBoundary"`
	Note                string   `json:"note"`
	EffectiveFrom       string   `json:"effectiveFrom"`
	SourceNote          string   `json:"sourceNote"`
	ApprovalState       string   `json:"approvalState"`
}

func (s *service) handleSupersedeKpiDefinition(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleManager)
	if !ok {
		return
	}
	metricID := chi.URLParam(r, "metricId")

	var req supersedeKpiRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the new target, the date it takes effect and where it came from.")
		return
	}
	if _, err := time.Parse("2006-01-02", req.EffectiveFrom); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Give the date the new target takes effect, as YYYY-MM-DD. Figures before that date keep the target they were judged against.")
		return
	}
	switch req.Comparison {
	case "gte", "lt", "eq":
	default:
		httpx.Problem(w, http.StatusBadRequest, "The comparison must be gte, lt or eq.")
		return
	}
	if strings.TrimSpace(req.SourceNote) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"State where the new target came from. A target with no stated source cannot be defended when it is questioned.")
		return
	}
	if req.ApprovalState == "" {
		req.ApprovalState = "proposal"
	}
	switch req.ApprovalState {
	case "approved", "proposal", "confirmation-pending":
	default:
		httpx.Problem(w, http.StatusBadRequest,
			"The approval state must be approved, proposal or confirmation-pending.")
		return
	}

	created, err := s.store.supersedeKpiDefinition(r.Context(), metricID, KpiDefinition{
		TargetLabel:         req.TargetLabel,
		TargetValue:         req.TargetValue,
		Comparison:          req.Comparison,
		ApproachingBoundary: req.ApproachingBoundary,
		Note:                req.Note,
		EffectiveFrom:       req.EffectiveFrom,
		SourceNote:          req.SourceNote,
		ApprovalState:       req.ApprovalState,
	})
	if err != nil {
		if errors.Is(err, errNotFound) {
			httpx.Problem(w, http.StatusNotFound, "There is no indicator with that identifier.")
			return
		}
		httpx.Problem(w, http.StatusConflict, err.Error())
		return
	}

	s.log.Info("kpi target superseded",
		slog.String("actor", subject.Username),
		slog.String("metric_id", metricID),
		slog.String("effective_from", created.EffectiveFrom),
		slog.Float64("target_value", created.TargetValue),
	)
	httpx.JSON(w, http.StatusCreated, created)
}

type supersedeLimitRequest struct {
	Context         string  `json:"context"`
	Limit           float64 `json:"limit"`
	Unit            string  `json:"unit"`
	AveragingPeriod string  `json:"averagingPeriod"`
	StandardFamily  string  `json:"standardFamily"`
	StandardVersion string  `json:"standardVersion"`
	EffectiveFrom   string  `json:"effectiveFrom"`
	SourceNote      string  `json:"sourceNote"`
	ApprovalState   string  `json:"approvalState"`
}

func (s *service) handleSupersedeHygieneLimit(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleManager)
	if !ok {
		return
	}
	parameter := chi.URLParam(r, "parameter")

	var req supersedeLimitRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the new limit, its context, the date it takes effect and the standard it comes from.")
		return
	}
	if !ValidMonitoringContext(req.Context) {
		httpx.Problem(w, http.StatusBadRequest,
			"The monitoring context must be occupational-exposure, indoor-workplace or ambient.")
		return
	}
	if _, err := time.Parse("2006-01-02", req.EffectiveFrom); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Give the date the new limit takes effect, as YYYY-MM-DD. Readings before that date keep the limit they were judged against.")
		return
	}
	if strings.TrimSpace(req.StandardFamily) == "" || strings.TrimSpace(req.SourceNote) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"Name the standard the limit comes from and state its source. An exposure limit with no attributable standard cannot be defended to a regulator.")
		return
	}
	if req.ApprovalState == "" {
		req.ApprovalState = "proposal"
	}

	created, err := s.store.supersedeHygieneLimit(r.Context(), parameter, req.Context, HygieneLimit{
		Limit:           req.Limit,
		Unit:            req.Unit,
		AveragingPeriod: req.AveragingPeriod,
		StandardFamily:  req.StandardFamily,
		StandardVersion: req.StandardVersion,
		EffectiveFrom:   req.EffectiveFrom,
		SourceNote:      req.SourceNote,
		ApprovalState:   req.ApprovalState,
	})
	if err != nil {
		if errors.Is(err, errNotFound) {
			httpx.Problem(w, http.StatusNotFound,
				"There is no current limit for that parameter and context to supersede.")
			return
		}
		httpx.Problem(w, http.StatusConflict, err.Error())
		return
	}

	s.log.Info("hygiene limit superseded",
		slog.String("actor", subject.Username),
		slog.String("parameter", parameter),
		slog.String("context", req.Context),
		slog.String("effective_from", created.EffectiveFrom),
	)
	httpx.JSON(w, http.StatusCreated, created)
}
