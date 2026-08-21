package main

import (
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

type service struct {
	log   *slog.Logger
	store *store
	admin *adminClient
}

var periodPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

func (s *service) routes(r chi.Router) {
	// The officer records; the manager reads. The director does not open
	// these screens at all, a monitoring register is operational detail, and
	// the director's view of it is the dashboard figure it produces.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAnyRole(auth.RoleOfficer, auth.RoleManager))

		r.Get("/parameters", s.handleParameters)
		r.Get("/options", s.handleOptions)

		r.Get("/hygiene/events", s.handleListEvents)
		r.Get("/ergonomics/assessments", s.handleListAssessments)
		r.Get("/plan", s.handlePlan)
		r.Get("/plan/{period}/revisions", s.handlePlanRevisions)
	})

	// Writes belong to the officer. A manager reaching one of these is
	// refused, which is what makes readOnlyFor in the navigation a statement
	// about the system rather than about the interface.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireRoleWithMessage(auth.RoleOfficer,
			"Readings and assessments are recorded by the Health and Wellness Officer. The manager's view of this register is read-only."))

		r.Post("/hygiene/events", s.handleCreateEvent)
		r.Post("/hygiene/events/{id}/readings", s.handleCreateReading)
		r.Post("/ergonomics/assessments", s.handleCreateAssessment)
		r.Put("/ergonomics/actions/{id}", s.handleUpdateAction)
		r.Put("/plan/{period}", s.handleSavePlan)
	})

	// The monthly aggregate, read by the metrics service. Open to the same
	// roles that can read the register, it contains strictly less.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAnyRole(auth.RoleOfficer, auth.RoleManager, auth.RoleDirector))
		r.Get("/aggregate/{period}", s.handleAggregate)
	})
}

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
		httpx.Problem(w, http.StatusNotFound, "That record does not exist.")
		return
	}
	s.log.Error(action,
		slog.String("request_id", httpx.RequestIDFrom(r.Context())),
		slog.String("error", err.Error()),
	)
	httpx.Problem(w, http.StatusInternalServerError,
		"The record could not be saved. Try again, and report the request identifier if it recurs.")
}

func limitFrom(r *http.Request, fallback int) int {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 || n > 500 {
		return fallback
	}
	return n
}

// handleOptions publishes the register's own vocabulary, so the interface does
// not carry a second copy of it.
func (s *service) handleOptions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ergonomicOutcomes": ErgonomicOutcomes,
		"workTypes":         WorkTypes,
		"actionStatuses":    ActionStatuses,
	})
}

// handleParameters lists what can be measured, taken from the reference data
// rather than from a list held here. A parameter with no limit in force cannot
// be evaluated, so it is not offered.
func (s *service) handleParameters(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	on := strings.TrimSpace(r.URL.Query().Get("on"))
	if on == "" {
		on = time.Now().Format("2006-01-02")
	}

	limits, err := s.admin.parameters(r.Context(), r.Header.Get("Authorization"), on)
	if err != nil {
		s.log.Error("read reference limits failed", slog.String("error", err.Error()))
		httpx.Problem(w, http.StatusBadGateway,
			"The reference data service is not responding, so no reading can be evaluated. Try again shortly.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"on": on, "limits": limits})
}

// --- industrial hygiene -----------------------------------------------------

type createEventRequest struct {
	EventDate          string `json:"eventDate"`
	Location           string `json:"location"`
	Instrument         string `json:"instrument"`
	Performed          *bool  `json:"performed"`
	NotPerformedReason string `json:"notPerformedReason"`
	Notes              string `json:"notes"`
}

func (s *service) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleOfficer)
	if !ok {
		return
	}

	var req createEventRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send the date and the location of the monitoring.")
		return
	}
	if _, err := time.Parse("2006-01-02", req.EventDate); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Give the date of the monitoring, as YYYY-MM-DD.")
		return
	}
	if strings.TrimSpace(req.Location) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Name the location that was monitored.")
		return
	}

	performed := true
	if req.Performed != nil {
		performed = *req.Performed
	}
	// A skipped round of monitoring is a record, not an absence of one, but
	// only if it says why. "Not performed" with no reason is indistinguishable
	// from nobody having got round to entering it.
	if !performed && strings.TrimSpace(req.NotPerformedReason) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"Say why the monitoring was not performed. A skipped round with no reason cannot be told apart from one nobody recorded.")
		return
	}

	created, err := s.store.createEvent(r.Context(), MonitoringEvent{
		Period:             req.EventDate[:7],
		EventDate:          req.EventDate,
		Location:           strings.TrimSpace(req.Location),
		Instrument:         req.Instrument,
		Performed:          performed,
		NotPerformedReason: req.NotPerformedReason,
		Notes:              req.Notes,
	}, subject.Username)
	if err != nil {
		s.fail(w, r, err, "create monitoring event failed")
		return
	}
	httpx.JSON(w, http.StatusCreated, created)
}

func (s *service) handleListEvents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	period := strings.TrimSpace(r.URL.Query().Get("period"))
	if period != "" && !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}
	events, err := s.store.listEvents(r.Context(), period, limitFrom(r, 100))
	if err != nil {
		s.fail(w, r, err, "list monitoring events failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"events": events})
}

type createReadingRequest struct {
	Parameter   string  `json:"parameter"`
	Value       float64 `json:"value"`
	Context     string  `json:"context"`
	KpiEligible *bool   `json:"kpiEligible"`
	ReadingDate string  `json:"readingDate"`
}

// handleCreateReading records a measurement and the evaluation made of it.
//
// The order matters and is the whole point of this handler. The limit in force
// on the reading date is resolved first, copied onto the row, and the
// compliance decided from the copy. Nothing later re-reads the reference data
// for this reading, so revising a limit in 2027 cannot change what a 2026
// reading meant.
func (s *service) handleCreateReading(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleOfficer)
	if !ok {
		return
	}
	eventID := chi.URLParam(r, "id")

	var req createReadingRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the parameter, the value and the monitoring context.")
		return
	}
	if strings.TrimSpace(req.Parameter) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Name the parameter that was measured.")
		return
	}
	if strings.TrimSpace(req.Context) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"Give the monitoring context. The same parameter carries different limits for occupational exposure, indoor workplace and ambient air, and a reading judged against the wrong one is worse than one not judged at all.")
		return
	}

	period, eventDate, location, instrument, performed, err := s.store.eventContext(r.Context(), eventID)
	if err != nil {
		s.fail(w, r, err, "read monitoring event failed")
		return
	}
	// Monitoring recorded as not performed has no readings by definition. A
	// reading against one would make the register contradict itself, and the
	// completeness figure would count an occasion that did not happen.
	if !performed {
		httpx.Problem(w, http.StatusConflict,
			"That monitoring was recorded as not performed, so it has no readings. Record a new monitoring occasion for the readings that were actually taken.")
		return
	}

	// A reading is stored under its event's reporting month, so a date outside
	// that month is refused rather than quietly filed under the wrong one.
	//
	// It matters twice over. The reading would be counted in one month's
	// compliance while being judged against the limit in force in another, so
	// both the figure and the evaluation would be wrong, and neither in a way
	// anybody could see afterwards.
	readingDate := eventDate
	if req.ReadingDate != "" {
		if _, err := time.Parse("2006-01-02", req.ReadingDate); err != nil {
			httpx.Problem(w, http.StatusBadRequest, "Give the date of the reading as YYYY-MM-DD.")
			return
		}
		if req.ReadingDate[:7] != period {
			httpx.Problem(w, http.StatusBadRequest,
				"That reading is dated outside "+period+", the month of the monitoring it belongs to. Record it against a monitoring occasion in its own month, so it is counted and judged in the same period.")
			return
		}
		readingDate = req.ReadingDate
	}

	limit, err := s.admin.resolveLimit(r.Context(), r.Header.Get("Authorization"),
		strings.TrimSpace(req.Parameter), strings.TrimSpace(req.Context), readingDate)
	if err != nil {
		if errors.Is(err, errLimitNotFound) {
			httpx.Problem(w, http.StatusBadRequest,
				"No limit for "+req.Parameter+" in the "+req.Context+" context was in force on "+readingDate+
					". Add it in reference data first, a reading recorded with nothing to judge it against cannot be evaluated later without inventing history.")
			return
		}
		s.log.Error("resolve reference limit failed", slog.String("error", err.Error()))
		httpx.Problem(w, http.StatusBadGateway,
			"The reference data service is not responding, so this reading cannot be evaluated. Try again shortly.")
		return
	}

	eligible := true
	if req.KpiEligible != nil {
		eligible = *req.KpiEligible
	}

	created, err := s.store.createReading(r.Context(), Reading{
		EventID:          eventID,
		Period:           period,
		ReadingDate:      readingDate,
		Location:         location,
		Instrument:       instrument,
		Parameter:        strings.TrimSpace(req.Parameter),
		Value:            req.Value,
		LimitReferenceID: limit.ID,
		LimitApplied:     limit.Limit,
		Unit:             limit.Unit,
		AveragingPeriod:  limit.AveragingPeriod,
		Context:          limit.Context,
		StandardFamily:   limit.StandardFamily,
		StandardVersion:  limit.StandardVersion,
		Compliance:       EvaluateReading(req.Value, limit.Limit),
		KpiEligible:      eligible,
	}, subject.Username)
	if err != nil {
		s.fail(w, r, err, "create reading failed")
		return
	}

	s.log.Info("hygiene reading recorded",
		slog.String("actor", subject.Username),
		slog.String("parameter", created.Parameter),
		slog.String("compliance", created.Compliance),
		slog.String("limit_reference_id", created.LimitReferenceID),
	)
	httpx.JSON(w, http.StatusCreated, created)
}

// --- ergonomics -------------------------------------------------------------

type createAssessmentRequest struct {
	AssessedOn  string `json:"assessedOn"`
	Workstation string `json:"workstation"`
	WorkType    string `json:"workType"`
	Assessor    string `json:"assessor"`
	Outcome     string `json:"outcome"`
	Findings    string `json:"findings"`
	Actions     []struct {
		Description string `json:"description"`
		Owner       string `json:"owner"`
		DueDate     string `json:"dueDate"`
	} `json:"actions"`
}

func (s *service) handleCreateAssessment(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleOfficer)
	if !ok {
		return
	}

	var req createAssessmentRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the workstation, the date, the assessor and the outcome.")
		return
	}
	if _, err := time.Parse("2006-01-02", req.AssessedOn); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Give the date of the assessment, as YYYY-MM-DD.")
		return
	}
	if strings.TrimSpace(req.Workstation) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Name the workstation assessed.")
		return
	}
	if !ValidWorkType(req.WorkType) {
		httpx.Problem(w, http.StatusBadRequest, "The work type must be Office or Industrial.")
		return
	}
	if !ValidErgonomicOutcome(req.Outcome) {
		httpx.Problem(w, http.StatusBadRequest,
			"The outcome must be Compliant, Partially compliant or Non-compliant.")
		return
	}
	if strings.TrimSpace(req.Assessor) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Name who carried out the assessment.")
		return
	}

	actions := make([]CorrectiveAction, 0, len(req.Actions))
	for _, action := range req.Actions {
		if strings.TrimSpace(action.Description) == "" {
			continue
		}
		if _, err := time.Parse("2006-01-02", action.DueDate); err != nil {
			httpx.Problem(w, http.StatusBadRequest,
				"Every corrective action needs a due date. Ergonomic risk control counts actions closed on time, and an action with no deadline cannot be counted either way.")
			return
		}
		if strings.TrimSpace(action.Owner) == "" {
			httpx.Problem(w, http.StatusBadRequest,
				"Every corrective action needs a named owner. An action owned by nobody is a note.")
			return
		}
		actions = append(actions, CorrectiveAction{
			Description: action.Description,
			Owner:       action.Owner,
			DueDate:     action.DueDate,
			Status:      "Open",
		})
	}

	// A non-compliant outcome with nothing to do about it is an observation,
	// not an assessment. Warned rather than refused: the officer may be
	// recording an assessment whose actions are still being agreed.
	if req.Outcome == "Non-compliant" && len(actions) == 0 {
		s.log.Warn("non-compliant assessment recorded with no corrective action",
			slog.String("actor", subject.Username),
			slog.String("workstation", req.Workstation),
		)
	}

	created, err := s.store.createAssessment(r.Context(), ErgonomicAssessment{
		Period:      req.AssessedOn[:7],
		AssessedOn:  req.AssessedOn,
		Workstation: strings.TrimSpace(req.Workstation),
		WorkType:    req.WorkType,
		Assessor:    req.Assessor,
		Outcome:     req.Outcome,
		Findings:    req.Findings,
		Actions:     actions,
	}, subject.Username)
	if err != nil {
		s.fail(w, r, err, "create assessment failed")
		return
	}
	httpx.JSON(w, http.StatusCreated, created)
}

func (s *service) handleListAssessments(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	period := strings.TrimSpace(r.URL.Query().Get("period"))
	if period != "" && !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}
	assessments, err := s.store.listAssessments(r.Context(), period, limitFrom(r, 100))
	if err != nil {
		s.fail(w, r, err, "list assessments failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"assessments": assessments})
}

type updateActionRequest struct {
	Status   string `json:"status"`
	ClosedOn string `json:"closedOn"`
	Evidence string `json:"evidence"`
}

func (s *service) handleUpdateAction(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer); !ok {
		return
	}

	var req updateActionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send the new status of the action.")
		return
	}
	if !ValidActionStatus(req.Status) {
		httpx.Problem(w, http.StatusBadRequest, "The status must be Open, Implemented or Closed.")
		return
	}
	// Closing without a date would leave the action uncountable: ergonomic
	// risk control asks whether it closed on time, and that needs a date.
	if req.Status == "Closed" {
		if _, err := time.Parse("2006-01-02", req.ClosedOn); err != nil {
			httpx.Problem(w, http.StatusBadRequest,
				"Give the date the action was closed. Ergonomic risk control counts actions closed on or before their due date, so a closure with no date cannot be counted.")
			return
		}
	} else {
		req.ClosedOn = ""
	}

	updated, err := s.store.updateAction(r.Context(), chi.URLParam(r, "id"),
		req.Status, req.ClosedOn, req.Evidence)
	if err != nil {
		s.fail(w, r, err, "update corrective action failed")
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

// --- the plan ---------------------------------------------------------------

func (s *service) handlePlan(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	period := strings.TrimSpace(r.URL.Query().Get("period"))
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	plan, err := s.store.plan(r.Context(), period)
	if errors.Is(err, errNotFound) {
		// No plan is not zero planned. It is a month for which nobody has said
		// what was intended, and completeness for it is No data rather than
		// nought per cent.
		httpx.JSON(w, http.StatusOK, map[string]any{"period": period, "plan": nil})
		return
	}
	if err != nil {
		s.fail(w, r, err, "read plan failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"period": period, "plan": plan})
}

type savePlanRequest struct {
	HygieneEventsPlanned          int    `json:"hygieneEventsPlanned"`
	ErgonomicAssessmentsPlanned   int    `json:"ergonomicAssessmentsPlanned"`
	ConfirmedOccupationalDiseases int    `json:"confirmedOccupationalDiseases"`
	Reason                        string `json:"reason"`
}

func (s *service) handleSavePlan(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleOfficer)
	if !ok {
		return
	}
	period := chi.URLParam(r, "period")
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	var req savePlanRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send what was planned for the month.")
		return
	}
	if req.HygieneEventsPlanned < 0 || req.ErgonomicAssessmentsPlanned < 0 ||
		req.ConfirmedOccupationalDiseases < 0 {
		httpx.Problem(w, http.StatusBadRequest, "A planned or confirmed count cannot be negative.")
		return
	}

	saved, err := s.store.savePlan(r.Context(), Plan{
		Period:                        period,
		HygieneEventsPlanned:          req.HygieneEventsPlanned,
		ErgonomicAssessmentsPlanned:   req.ErgonomicAssessmentsPlanned,
		ConfirmedOccupationalDiseases: req.ConfirmedOccupationalDiseases,
	}, subject.Username, strings.TrimSpace(req.Reason))
	if errors.Is(err, errPlanReasonRequired) {
		httpx.Problem(w, http.StatusBadRequest,
			"This month already has a plan. Say why it is being corrected, because the prior counts and confirmed disease judgement are kept with the reason.")
		return
	}
	if err != nil {
		s.fail(w, r, err, "save plan failed")
		return
	}
	httpx.JSON(w, http.StatusOK, saved)
}

func (s *service) handlePlanRevisions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	period := chi.URLParam(r, "period")
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	revisions, err := s.store.planRevisions(r.Context(), period)
	if err != nil {
		s.fail(w, r, err, "read plan revisions failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"revisions": revisions})
}

// handleAggregate returns the month's counts for the metrics service.
func (s *service) handleAggregate(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager, auth.RoleDirector); !ok {
		return
	}
	period := chi.URLParam(r, "period")
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	aggregate, err := s.store.monthlyAggregate(r.Context(), period)
	if err != nil {
		s.fail(w, r, err, "aggregate month failed")
		return
	}
	httpx.JSON(w, http.StatusOK, aggregate)
}
