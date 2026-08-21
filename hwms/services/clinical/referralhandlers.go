package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

// --- access-logged wrappers ------------------------------------------------
//
// A referral carries the patient's name, employer details, provisional
// diagnosis, HIV status and mental health condition. It is the most sensitive
// single document this system holds, and it is the only one that leaves the
// building. Reads go through the access log like every other retrieval here.

func (s *accessLoggedStore) ListReferrals(ctx context.Context, subject auth.Subject, patientID, visitID, status string, limit int) ([]Referral, error) {
	referrals, err := s.raw.listReferrals(ctx, patientID, visitID, status, limit)
	if err != nil {
		return nil, err
	}
	var patientRef *string
	if patientID != "" {
		patientRef = &patientID
	}
	if err := s.record(ctx, subject, "list", patientRef, nil, len(referrals)); err != nil {
		return nil, err
	}
	return referrals, nil
}

func (s *accessLoggedStore) GetReferral(ctx context.Context, subject auth.Subject, id string) (Referral, error) {
	referral, err := s.raw.getReferral(ctx, id)
	if err != nil {
		return Referral{}, err
	}
	if err := s.record(ctx, subject, "detail", &referral.PatientID, &referral.VisitID, 1); err != nil {
		return Referral{}, err
	}
	return referral, nil
}

func (s *accessLoggedStore) CreateReferral(ctx context.Context, subject auth.Subject, r Referral) (Referral, error) {
	return s.raw.createReferral(ctx, r, subject.Username)
}

func (s *accessLoggedStore) RecordAuthorisation(ctx context.Context, subject auth.Subject, id string, a ReferralAuthorisation) (Referral, error) {
	referral, err := s.raw.recordAuthorisation(ctx, id, a, subject.Username)
	if err != nil {
		return Referral{}, err
	}
	if err := s.record(ctx, subject, "detail", &referral.PatientID, &referral.VisitID, 1); err != nil {
		return Referral{}, err
	}
	return referral, nil
}

func (s *accessLoggedStore) IssueReferral(ctx context.Context, subject auth.Subject, id string) (Referral, error) {
	referral, err := s.raw.issueReferral(ctx, id)
	if err != nil {
		return Referral{}, err
	}
	if err := s.record(ctx, subject, "detail", &referral.PatientID, &referral.VisitID, 1); err != nil {
		return Referral{}, err
	}
	return referral, nil
}

func (s *accessLoggedStore) RecordFeedback(ctx context.Context, subject auth.Subject, id string, feedback ReferralFeedback) (Referral, error) {
	referral, err := s.raw.recordFeedback(ctx, id, feedback)
	if err != nil {
		return Referral{}, err
	}
	if err := s.record(ctx, subject, "detail", &referral.PatientID, &referral.VisitID, 1); err != nil {
		return Referral{}, err
	}
	return referral, nil
}

func (s *accessLoggedStore) RecordReview(ctx context.Context, subject auth.Subject, id string, review ReferralReview) (Referral, error) {
	referral, err := s.raw.recordReview(ctx, id, review)
	if err != nil {
		return Referral{}, err
	}
	if err := s.record(ctx, subject, "detail", &referral.PatientID, &referral.VisitID, 1); err != nil {
		return Referral{}, err
	}
	return referral, nil
}

func (s *accessLoggedStore) ReferralStatus(ctx context.Context, id string) (string, error) {
	return s.raw.referralStatus(ctx, id)
}

// --- routes -----------------------------------------------------------------

func (s *service) referralRoutes(r chi.Router) {
	r.Get("/referrals/form", s.handleReferralForm)
	r.Get("/referrals", s.handleListReferrals)
	r.Post("/referrals", s.handleCreateReferral)
	r.Get("/referrals/{id}", s.handleGetReferral)
	r.Get("/referrals/{id}/authorisation-summary", s.handleAuthorisationSummary)
	r.Post("/referrals/{id}/authorisation", s.handleRecordAuthorisation)
	r.Post("/referrals/{id}/issue", s.handleIssueReferral)
	r.Put("/referrals/{id}/feedback", s.handleRecordFeedback)
	r.Put("/referrals/{id}/review", s.handleRecordReview)
}

// handleReferralForm publishes the form's own structure and option lists, so
// the interface does not carry a second copy of them.
func (s *service) handleReferralForm(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r); !ok {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"formNumber":                ReferralFormNumber,
		"sections":                  ReferralSections,
		"statuses":                  ReferralStatusOrder,
		"generalExamination":        GeneralExaminationOptions,
		"pastMedicalHistory":        PastMedicalHistoryOptions,
		"referralReasons":           ReferralReasonOptions,
		"workRelatedOptions":        WorkRelatedOptions,
		"clearancePrintedPosition":  ClearancePrintedPosition,
		"clearancePositionNote":     "The printed form names this role KMC Infirmary Officer. KMC has renamed it Health and Wellness Officer; the printed wording stands until the form is reissued (DEC-026).",
		"authorisationDecisionNote": "DEC-024 is open. No management role has a route to a referral. Record the authorisation obtained outside this system from the minimum-disclosure summary.",
	})
}

func (s *service) handleListReferrals(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status != "" && !validReferralOption(status, ReferralStatusOrder) {
		httpx.Problem(w, http.StatusBadRequest,
			"Filter by one of drafted, authorised, issued, returned or reviewed.")
		return
	}

	referrals, err := s.store.ListReferrals(r.Context(), subject,
		strings.TrimSpace(r.URL.Query().Get("patientId")),
		strings.TrimSpace(r.URL.Query().Get("visitId")),
		status,
		limitFrom(r, 100))
	if err != nil {
		s.fail(w, r, err, "list referrals failed")
		return
	}
	if referrals == nil {
		referrals = []Referral{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"referrals": referrals})
}

func (s *service) handleGetReferral(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	referral, err := s.store.GetReferral(r.Context(), subject, chi.URLParam(r, "id"))
	if err != nil {
		s.fail(w, r, err, "get referral failed")
		return
	}
	httpx.JSON(w, http.StatusOK, referral)
}

// handleAuthorisationSummary returns the minimum-disclosure document.
//
// Patient, destination, reason and cost implication. No diagnosis, no history,
// no vital signs, no free clinical text. It is assembled here rather than in
// the browser so that the narrow field set is a property of the service: if
// DEC-024 is ever resolved in favour of authoriser access, this route is the
// one that opens, and opening it cannot leak the referral by accident.
//
// It is officer-only today, like everything else in this service, because
// there is no management route to a referral at all while DEC-024 is open.
func (s *service) handleAuthorisationSummary(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	referral, err := s.store.GetReferral(r.Context(), subject, chi.URLParam(r, "id"))
	if err != nil {
		s.fail(w, r, err, "get referral failed")
		return
	}

	reasons := referral.ReferralReasons
	if referral.ReferralReasonOther != "" {
		reasons = append(append([]string{}, reasons...), referral.ReferralReasonOther)
	}

	costImplication := ""
	if referral.Authorisation != nil {
		costImplication = referral.Authorisation.CostImplication
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"referralId":      referral.ID,
		"formNumber":      referral.FormNumber,
		"patientName":     referral.Patient.Name,
		"department":      referral.Patient.Department,
		"destination":     referral.ReferredTo,
		"referralDate":    referral.ReferralDate,
		"referralReasons": reasons,
		"costImplication": costImplication,
		"disclosureNote": "This summary is the whole of what an authoriser is shown. " +
			"The clinical content of the referral stays between the Health and Wellness Officer " +
			"and the receiving facility, per ADR-03 and the proposed handling at DEC-024.",
	})
}

type createReferralRequest struct {
	VisitID    string                  `json:"visitId"`
	PatientID  string                  `json:"patientId"`
	ReferredTo string                  `json:"referredTo"`
	Patient    ReferralPatientSnapshot `json:"patientSnapshot"`

	ReferralDate string `json:"referralDate"`
	ReferralTime string `json:"referralTime"`

	ClinicalFeatures string     `json:"clinicalFeatures"`
	Vitals           VitalSigns `json:"vitals"`

	GeneralExamination      []string `json:"generalExamination"`
	GeneralExaminationOther string   `json:"generalExaminationOther"`
	PastMedicalHistory      []string `json:"pastMedicalHistory"`
	PastMedicalHistoryOther string   `json:"pastMedicalHistoryOther"`

	WorkRelated          string   `json:"workRelated"`
	SuspectedExposure    string   `json:"suspectedExposure"`
	InvestigationsDone   string   `json:"investigationsDone"`
	ProvisionalDiagnosis string   `json:"provisionalDiagnosis"`
	TreatmentGiven       string   `json:"treatmentGiven"`
	ReferralReasons      []string `json:"referralReasons"`
	ReferralReasonOther  string   `json:"referralReasonOther"`

	ClearanceContact            string `json:"clearanceContact"`
	ClearanceDate               string `json:"clearanceDate"`
	ClearanceTime               string `json:"clearanceTime"`
	ClearanceSignatureConfirmed bool   `json:"clearanceSignatureConfirmed"`
}

func (s *service) handleCreateReferral(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}

	var req createReferralRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the visit, the patient, the destination facility and the date of the referral.")
		return
	}

	// Raised from a visit, never standalone. That is what lets the identity
	// and the vital signs be copied rather than re-keyed, per FR-CLIN-04.
	if strings.TrimSpace(req.VisitID) == "" || strings.TrimSpace(req.PatientID) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Raise the referral from a patient visit.")
		return
	}
	if strings.TrimSpace(req.ReferredTo) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Enter the facility the patient is being referred to.")
		return
	}
	if strings.TrimSpace(req.ReferralDate) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Enter the date of the referral.")
		return
	}
	// Nothing is checked here about the patient's name, age or sex, because
	// none of them arrive from the browser any more. The store reads them from
	// the registry through a join that also proves the visit belongs to the
	// patient, see createReferral.
	if req.WorkRelated == "" {
		req.WorkRelated = "No"
	}
	if !ValidWorkRelated(req.WorkRelated) {
		httpx.Problem(w, http.StatusBadRequest,
			"Record the occupational consideration as Yes, No or Suspected, as the form prints it.")
		return
	}

	generalExamination, err := cleanOptions(req.GeneralExamination, ValidGeneralExamination)
	if err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"One of the general examination findings sent is not on the referral form.")
		return
	}
	pastMedical, err := cleanOptions(req.PastMedicalHistory, ValidPastMedicalHistory)
	if err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"One of the past medical history entries sent is not on the referral form.")
		return
	}
	reasons, err := cleanOptions(req.ReferralReasons, ValidReferralReason)
	if err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"One of the reasons for referral sent is not on the referral form.")
		return
	}
	if len(reasons) == 0 {
		httpx.Problem(w, http.StatusBadRequest, "Give at least one reason for the referral.")
		return
	}

	// Section B carries the officer's signature block. A referral without it
	// is not a completed form, and it is the clinic's half of the document.
	if !req.ClearanceSignatureConfirmed {
		httpx.Problem(w, http.StatusBadRequest,
			"Confirm the officer's signature in the infirmary clearance section, as the printed form requires.")
		return
	}

	created, err := s.store.CreateReferral(r.Context(), subject, Referral{
		VisitID:    strings.TrimSpace(req.VisitID),
		PatientID:  strings.TrimSpace(req.PatientID),
		ReferredTo: strings.TrimSpace(req.ReferredTo),
		// Only the two fields an officer may legitimately override travel from
		// the request. Everything else on the snapshot is read from the
		// records; anything set here that the store derives is discarded.
		Patient: ReferralPatientSnapshot{
			Position:       req.Patient.Position,
			ContactNumber:  req.Patient.ContactNumber,
			SupervisorName: req.Patient.SupervisorName,
		},
		ReferralDate:            req.ReferralDate,
		ReferralTime:            req.ReferralTime,
		ClinicalFeatures:        req.ClinicalFeatures,
		GeneralExamination:      generalExamination,
		GeneralExaminationOther: req.GeneralExaminationOther,
		PastMedicalHistory:      pastMedical,
		PastMedicalHistoryOther: req.PastMedicalHistoryOther,
		WorkRelated:             req.WorkRelated,
		SuspectedExposure:       req.SuspectedExposure,
		InvestigationsDone:      req.InvestigationsDone,
		ProvisionalDiagnosis:    req.ProvisionalDiagnosis,
		TreatmentGiven:          req.TreatmentGiven,
		ReferralReasons:         reasons,
		ReferralReasonOther:     req.ReferralReasonOther,
		Clearance: ReferralClearance{
			SignatureConfirmed: true,
			Contact:            req.ClearanceContact,
			Date:               req.ClearanceDate,
			Time:               req.ClearanceTime,
		},
	})
	if err != nil {
		if errors.Is(err, errVisitPatientMismatch) || isForeignKeyViolation(err) {
			httpx.Problem(w, http.StatusBadRequest,
				"That visit does not belong to that patient, or one of them no longer exists. Open the patient's visit again and raise the referral from there.")
			return
		}
		s.fail(w, r, err, "create referral failed")
		return
	}

	// The log line records that a referral was raised and by whom, and nothing
	// about who it concerns or where they were sent.
	//
	// Service logs are not access-controlled as a clinical record, so nothing
	// belongs in them that would identify a patient or their care. Even the
	// destination facility is a clinical fact. A referral to an oncology unit
	// says something about a diagnosis. The record identifier lives in the
	// clinical access ledger, which is the log that is controlled.
	s.log.Info("referral raised", slog.String("actor", subject.Username))
	httpx.JSON(w, http.StatusCreated, created)
}

// requireTransition checks the lifecycle before a stage is recorded.
//
// The interface offers only valid next stages, but that is a courtesy to the
// user rather than the control. A referral moved out of order, by a stale tab
// or a retried request. Would leave a document whose history did not happen.
func (s *service) requireTransition(w http.ResponseWriter, r *http.Request, id, to string) bool {
	from, err := s.store.ReferralStatus(r.Context(), id)
	if err != nil {
		s.fail(w, r, err, "read referral status failed")
		return false
	}
	if from == to {
		httpx.Problem(w, http.StatusConflict, "That stage has already been recorded on this referral.")
		return false
	}
	if !ValidTransition(from, to) {
		httpx.Problem(w, http.StatusConflict,
			"This referral is "+from+". A referral moves forward one stage at a time: drafted, authorised, issued, returned, then reviewed.")
		return false
	}
	return true
}

type recordAuthorisationRequest struct {
	CostImplication string          `json:"costImplication"`
	HeadOfDivision  ReferralSignOff `json:"headOfDivision"`
	ChiefOfStaff    ReferralSignOff `json:"chiefOfStaff"`
}

// handleRecordAuthorisation records Section C.
//
// It records that an authorisation was obtained; it does not grant one. No
// management role can reach this route, or any other route in this service,
// while DEC-024 is open. The officer shows the authoriser the
// minimum-disclosure summary, obtains the decision outside the system, and
// records it here.
func (s *service) handleRecordAuthorisation(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")

	var req recordAuthorisationRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the authorising names, the dates and the cost implication.")
		return
	}
	if strings.TrimSpace(req.HeadOfDivision.Name) == "" || strings.TrimSpace(req.ChiefOfStaff.Name) == "" {
		httpx.Problem(w, http.StatusBadRequest,
			"Name both the Head of Division and the Chief of Staff, as Section C of the form requires.")
		return
	}
	if !req.HeadOfDivision.SignatureConfirmed || !req.ChiefOfStaff.SignatureConfirmed {
		httpx.Problem(w, http.StatusBadRequest,
			"Confirm both signatures. Record the authorisation only once it has actually been given.")
		return
	}

	if !s.requireTransition(w, r, id, ReferralAuthorised) {
		return
	}

	updated, err := s.store.RecordAuthorisation(r.Context(), subject, id, ReferralAuthorisation{
		CostImplication: req.CostImplication,
		HeadOfDivision:  req.HeadOfDivision,
		ChiefOfStaff:    req.ChiefOfStaff,
	})
	if err != nil {
		s.failReferral(w, r, err, "record authorisation failed")
		return
	}
	s.log.Info("referral authorisation recorded", slog.String("actor", subject.Username))
	httpx.JSON(w, http.StatusOK, updated)
}

func (s *service) handleIssueReferral(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !s.requireTransition(w, r, id, ReferralIssued) {
		return
	}
	updated, err := s.store.IssueReferral(r.Context(), subject, id)
	if err != nil {
		s.failReferral(w, r, err, "issue referral failed")
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

func (s *service) handleRecordFeedback(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")

	var feedback ReferralFeedback
	if err := httpx.DecodeJSON(w, r, &feedback); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the facility, the practitioner and what they reported.")
		return
	}
	if strings.TrimSpace(feedback.Facility) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Name the facility that saw the patient.")
		return
	}
	if feedback.SickLeaveDays < 0 {
		httpx.Problem(w, http.StatusBadRequest, "Recommended sick leave cannot be a negative number of days.")
		return
	}
	if feedback.SickLeaveFrom != "" && feedback.SickLeaveTo != "" &&
		feedback.SickLeaveTo < feedback.SickLeaveFrom {
		httpx.Problem(w, http.StatusBadRequest,
			"The sick leave end date is before its start date. Check the dates on the returned form.")
		return
	}

	// Feedback may be corrected on a referral that has already been reviewed -
	// an amended letter from the facility arrives after the clinic has closed
	// its own review more often than anyone would like. A correction keeps the
	// current state rather than moving it backwards; a first feedback moves
	// issued to returned.
	from, err := s.store.ReferralStatus(r.Context(), id)
	if err != nil {
		s.fail(w, r, err, "read referral status failed")
		return
	}
	if from == ReferralDrafted || from == ReferralAuthorised {
		httpx.Problem(w, http.StatusConflict,
			"This referral is "+from+". Record the facility's feedback once the referral has been issued.")
		return
	}

	updated, err := s.store.RecordFeedback(r.Context(), subject, id, feedback)
	if err != nil {
		s.failReferral(w, r, err, "record feedback failed")
		return
	}

	s.log.Info("referral feedback recorded",
		slog.String("actor", subject.Username),
		slog.Int("feedback_version", updated.Feedback.Version),
	)
	httpx.JSON(w, http.StatusOK, updated)
}

func (s *service) handleRecordReview(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")

	var review ReferralReview
	if err := httpx.DecodeJSON(w, r, &review); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send the review comments and who reviewed it.")
		return
	}
	if strings.TrimSpace(review.ReviewedBy) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Name who carried out the follow-up review.")
		return
	}

	if !s.requireTransition(w, r, id, ReferralReviewed) {
		return
	}

	updated, err := s.store.RecordReview(r.Context(), subject, id, review)
	if err != nil {
		s.failReferral(w, r, err, "record review failed")
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

// cleanOptions removes duplicates and rejects anything not printed on the form.
// A value outside the list is refused rather than dropped: a tick that vanishes
// silently is worse than one that is questioned.
func cleanOptions(values []string, valid func(string) bool) ([]string, error) {
	seen := map[string]bool{}
	cleaned := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if !valid(value) {
			return nil, errors.New("value not on the form: " + value)
		}
		if seen[value] {
			continue
		}
		seen[value] = true
		cleaned = append(cleaned, value)
	}
	return cleaned, nil
}

// failReferral adds the stale-transition case to the shared failure handling.
//
// A referral that moved on between the check and the write is a conflict the
// reader can resolve by reloading. Somebody else recorded the next stage while
// this page was open. It is not a fault to report to ICT, and telling the user
// it is would send them chasing a support ticket for a race they can see.
func (s *service) failReferral(w http.ResponseWriter, r *http.Request, err error, action string) {
	if errors.Is(err, errStaleTransition) {
		httpx.Problem(w, http.StatusConflict,
			"This referral changed while the page was open. Somebody else may have moved it on. Reload it and check where it has got to before recording this again.")
		return
	}
	s.fail(w, r, err, action)
}
