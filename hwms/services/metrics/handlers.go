package main

import (
	"crypto/subtle"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

type service struct {
	log      *slog.Logger
	store    *store
	upstream *upstream
	// The shared secret the clinical service presents when it delivers a
	// sick-leave contribution. See handleLeaveContribution for why this is not
	// an OIDC token and what should replace it.
	ingestToken string
}

var periodPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

func (s *service) routes(r chi.Router) {
	// The dashboard is what the director's account exists to open. It carries
	// counts and rates and nothing individual, which is what makes it safe to
	// show to a role that cannot open a patient record.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAnyRole(auth.RoleOfficer, auth.RoleManager, auth.RoleDirector))
		r.Get("/dashboard", s.handleDashboard)
	})

	// The officer enters the monthly return; the manager reviews it.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAnyRole(auth.RoleOfficer, auth.RoleManager))
		r.Get("/returns", s.handleListReturns)
		r.Get("/returns/{period}", s.handleGetReturn)
		r.Get("/returns/{period}/revisions", s.handleRevisions)
	})

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireRoleWithMessage(auth.RoleOfficer,
			"Monthly returns are entered by the Health and Wellness Officer. The manager's view of them is read-only."))
		r.Put("/returns/{period}", s.handleSaveReturn)
	})
}

// ingestRoutes are the service-to-service routes, mounted outside the OIDC
// middleware because the caller is a service rather than a person.
func (s *service) ingestRoutes(r chi.Router) {
	r.Post("/leave-contributions", s.handleLeaveContribution)
}

func (s *service) authorise(w http.ResponseWriter, r *http.Request, roles ...string) (auth.Subject, bool) {
	if err := auth.RequireAnyRoleCtx(r.Context(), roles...); err != nil {
		httpx.Problem(w, http.StatusForbidden, "This account does not have access to that function.")
		return auth.Subject{}, false
	}
	subject, _ := auth.SubjectFrom(r.Context())
	return subject, true
}

func (s *service) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager, auth.RoleDirector); !ok {
		return
	}

	period := strings.TrimSpace(r.URL.Query().Get("period"))
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	snapshot, err := s.Compose(r.Context(), r.Header.Get("Authorization"), period)
	if err != nil {
		s.log.Error("compose dashboard failed",
			slog.String("request_id", httpx.RequestIDFrom(r.Context())),
			slog.String("period", period),
			slog.String("error", err.Error()),
		)
		// Refused rather than served with the parts that did answer. A
		// dashboard missing three indicators because a service was down, with
		// nothing saying so, reads as three indicators with no data, which is
		// a different and much more alarming statement.
		httpx.Problem(w, http.StatusBadGateway,
			"The dashboard could not be assembled because one of the services it reads is not responding. No partial figures are shown. Try again shortly.")
		return
	}
	httpx.JSON(w, http.StatusOK, snapshot)
}

func (s *service) handleListReturns(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	returns, err := s.store.listReturns(r.Context(),
		strings.TrimSpace(r.URL.Query().Get("from")),
		strings.TrimSpace(r.URL.Query().Get("to")))
	if err != nil {
		s.fail(w, r, err, "list returns failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"returns": returns})
}

func (s *service) handleGetReturn(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	period := chi.URLParam(r, "period")
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	// The referral leave is read first, because it is reported whether or not
	// a return exists. A month nobody has entered yet is exactly when the
	// officer needs to see the leave already coming across from referrals -
	// it is what stops them adding those days to the lost-days box by hand.
	days, err := s.store.leaveDays(r.Context(), period)
	if err != nil {
		s.fail(w, r, err, "read referral leave failed")
		return
	}

	ret, err := s.store.getReturn(r.Context(), period)
	if errors.Is(err, errNotFound) {
		// Not an error. A month nobody has entered yet is the normal state of
		// next month, and the entry screen opens on it.
		httpx.JSON(w, http.StatusOK, map[string]any{
			"period": period, "return": nil, "referralLeaveDays": days,
		})
		return
	}
	if err != nil {
		s.fail(w, r, err, "read return failed")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"period": period,
		"return": ret,
		// Shown beside the entered figure so the officer can see what the
		// absenteeism rate is actually being computed from. It is not part of
		// the return and must not be re-keyed into it.
		"referralLeaveDays": days,
	})
}

type saveReturnRequest struct {
	HealthRelatedLostDays float64 `json:"healthRelatedLostDays"`
	Headcount             int     `json:"headcount"`
	SurveillanceScheduled int     `json:"surveillanceScheduled"`
	SurveillanceCompleted int     `json:"surveillanceCompleted"`
	HealthSourceNote      string  `json:"healthSourceNote"`

	Fatalities               *int   `json:"fatalities"`
	TotalRecordableIncidents *int   `json:"totalRecordableIncidents"`
	TotalRecordableInjuries  *int   `json:"totalRecordableInjuries"`
	ReportableNearMisses     *int   `json:"reportableNearMisses"`
	SafetySourceNote         string `json:"safetySourceNote"`

	// Required when correcting a month already entered. The prior values are
	// kept with it, so a changed dashboard figure can always be explained.
	Reason string `json:"reason"`
}

func (s *service) handleSaveReturn(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r, auth.RoleOfficer)
	if !ok {
		return
	}
	period := chi.URLParam(r, "period")
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}

	var req saveReturnRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the month's figures and where they came from.")
		return
	}

	if req.Headcount <= 0 {
		httpx.Problem(w, http.StatusBadRequest,
			"Give the month-end headcount. Absenteeism is lost days divided by headcount, and without it there is nothing to divide by.")
		return
	}
	if req.HealthRelatedLostDays < 0 {
		httpx.Problem(w, http.StatusBadRequest, "Lost days cannot be a negative number.")
		return
	}
	if req.SurveillanceCompleted > req.SurveillanceScheduled {
		httpx.Problem(w, http.StatusBadRequest,
			"More people were assessed than were scheduled. Check both figures. Surveillance compliance would read above 100%.")
		return
	}
	if strings.TrimSpace(req.HealthSourceNote) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"State where the health figures came from. A figure with no stated source cannot be defended when it is questioned.")
		return
	}

	anySafety := req.Fatalities != nil || req.TotalRecordableIncidents != nil ||
		req.TotalRecordableInjuries != nil || req.ReportableNearMisses != nil
	if anySafety && strings.TrimSpace(req.SafetySourceNote) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"State who supplied the safety figures. They belong to Workplace Safety, and a figure attributed to nobody cannot be reconciled with their own records.")
		return
	}

	saved, err := s.store.saveReturn(r.Context(), MonthlyReturn{
		Period:                   period,
		HealthRelatedLostDays:    req.HealthRelatedLostDays,
		Headcount:                req.Headcount,
		SurveillanceScheduled:    req.SurveillanceScheduled,
		SurveillanceCompleted:    req.SurveillanceCompleted,
		HealthSourceNote:         req.HealthSourceNote,
		Fatalities:               req.Fatalities,
		TotalRecordableIncidents: req.TotalRecordableIncidents,
		TotalRecordableInjuries:  req.TotalRecordableInjuries,
		ReportableNearMisses:     req.ReportableNearMisses,
		SafetySourceNote:         req.SafetySourceNote,
	}, subject.Username, strings.TrimSpace(req.Reason))

	if errors.Is(err, errReasonRequired) {
		httpx.Problem(w, http.StatusBadRequest,
			"This month has already been entered. Say why it is being corrected, the previous figures are kept with the reason, so a dashboard figure that changes can always be explained.")
		return
	}
	if err != nil {
		s.fail(w, r, err, "save return failed")
		return
	}

	s.log.Info("monthly return saved",
		slog.String("actor", subject.Username),
		slog.String("period", period),
		slog.Bool("correction", req.Reason != ""),
	)
	httpx.JSON(w, http.StatusOK, saved)
}

func (s *service) handleRevisions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r, auth.RoleOfficer, auth.RoleManager); !ok {
		return
	}
	period := chi.URLParam(r, "period")
	if !periodPattern.MatchString(period) {
		httpx.Problem(w, http.StatusBadRequest, "Give the reporting month as YYYY-MM.")
		return
	}
	revisions, err := s.store.revisions(r.Context(), period)
	if err != nil {
		s.fail(w, r, err, "read revisions failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"revisions": revisions})
}

type leaveContributionRequest struct {
	ReferralID      string  `json:"referralId"`
	FeedbackVersion int     `json:"feedbackVersion"`
	Period          string  `json:"period"`
	Days            float64 `json:"days"`
}

// handleLeaveContribution accepts one sick-leave fact from the clinical service.
//
// The payload is four fields and could not be widened without changing both
// sides: a referral identifier, a version, a month and a number of days. There
// is no name here and no diagnosis, which is what lets this service compute
// absenteeism while holding no clinical credential.
//
// Authentication is a shared secret rather than an OIDC token, because the
// caller is a service and this realm has no client registered for it. That is a
// development-grade mechanism and it is the weakest link in this file: it should
// be replaced by a Keycloak service account with its own client credentials
// before production, and the route is kept off the public gateway meanwhile.
func (s *service) handleLeaveContribution(w http.ResponseWriter, r *http.Request) {
	presented := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if s.ingestToken == "" ||
		subtle.ConstantTimeCompare([]byte(presented), []byte(s.ingestToken)) != 1 {
		httpx.Problem(w, http.StatusUnauthorized, "Not authorised.")
		return
	}

	var req leaveContributionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Malformed contribution.")
		return
	}
	if req.ReferralID == "" || !periodPattern.MatchString(req.Period) ||
		req.Days < 0 || req.FeedbackVersion < 1 {
		httpx.Problem(w, http.StatusBadRequest, "Malformed contribution.")
		return
	}

	if err := s.store.recordLeaveContribution(
		r.Context(), req.ReferralID, req.FeedbackVersion, req.Period, req.Days,
	); err != nil {
		s.log.Error("record leave contribution failed", slog.String("error", err.Error()))
		// 500 rather than 200: the clinical service retries from its outbox,
		// and swallowing the failure would lose the contribution silently.
		httpx.Problem(w, http.StatusInternalServerError, "Could not record the contribution.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *service) fail(w http.ResponseWriter, r *http.Request, err error, action string) {
	if errors.Is(err, errNotFound) {
		httpx.Problem(w, http.StatusNotFound, "There is no return for that month.")
		return
	}
	s.log.Error(action,
		slog.String("request_id", httpx.RequestIDFrom(r.Context())),
		slog.String("error", err.Error()),
	)
	httpx.Problem(w, http.StatusInternalServerError,
		"That could not be read. Try again, and report the request identifier if it recurs.")
}
