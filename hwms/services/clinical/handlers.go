package main

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

type service struct {
	log   *slog.Logger
	store *accessLoggedStore
}

func (s *service) routes(r chi.Router) {
	// Handler-layer check. Every method below checks again in the service
	// layer — see the note in platform/auth about why that is not redundant.
	//
	// The refusal names the rule rather than merely reporting denial. Someone
	// who reaches it should understand that this is a designed boundary, not
	// a permission an administrator forgot to grant.
	r.Use(auth.RequireRoleWithMessage(auth.RoleOfficer,
		"Individual clinical records are open to the Health and Wellness Officer only. No other role can retrieve them, and every retrieval is logged."))

	r.Get("/sections", s.handleSections)

	r.Get("/patients", s.handleListPatients)
	r.Post("/patients", s.handleCreatePatient)
	r.Get("/patients/{id}", s.handleGetPatient)
	r.Get("/patients/{id}/record", s.handlePatientRecord)

	r.Get("/visits", s.handleListVisits)
	r.Post("/visits", s.handleCreateVisit)
	r.Get("/visits/{id}", s.handleGetVisit)
	r.Put("/visits/{id}/sections/{code}", s.handleSaveSection)
	r.Post("/visits/{id}/sign", s.handleSignVisit)

	s.labRoutes(r)
}

// authorise is the service-layer half of the double check. It returns the
// subject so that the caller's identity reaches the access log — a read that
// cannot name who performed it is not much of a record.
func (s *service) authorise(w http.ResponseWriter, r *http.Request) (auth.Subject, bool) {
	if err := auth.RequireRoleCtx(r.Context(), auth.RoleOfficer); err != nil {
		httpx.Problem(w, http.StatusForbidden,
			"Individual clinical records are open to the Health and Wellness Officer only.")
		return auth.Subject{}, false
	}
	subject, _ := auth.SubjectFrom(r.Context())
	return subject, true
}

// fail turns a store error into a response. A failure to write the access log
// surfaces here as a refusal, not as a record served without a log entry.
func (s *service) fail(w http.ResponseWriter, r *http.Request, err error, action string) {
	if errors.Is(err, errNotFound) {
		httpx.Problem(w, http.StatusNotFound, "That record does not exist, or it has been removed.")
		return
	}
	s.log.Error(action,
		slog.String("request_id", httpx.RequestIDFrom(r.Context())),
		slog.String("error", err.Error()),
	)
	httpx.Problem(w, http.StatusInternalServerError,
		"The record could not be read. Try again, and report the request identifier if it recurs.")
}

type sectionDescriptor struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

var sectionLabels = map[string]string{
	"presenting-complaint":       "Presenting complaint",
	"history-of-present-illness": "History of present illness",
	"past-medical-history":       "Past medical history",
	"past-surgical-history":      "Past surgical history",
	"medication-history":         "Medication history",
	"occupational-history":       "Occupational health history",
	"vital-signs":                "Vital signs",
	"general-examination":        "General examination",
	"systemic-examination":       "Systemic examination",
	"investigations":             "Investigations",
	"impression":                 "Impression",
	"treatment":                  "Treatment",
}

// handleSections publishes the record's structure so the interface does not
// carry its own copy. Two lists of sections would eventually disagree.
func (s *service) handleSections(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r); !ok {
		return
	}
	descriptors := make([]sectionDescriptor, 0, len(SectionCodes))
	for _, code := range SectionCodes {
		descriptors = append(descriptors, sectionDescriptor{Code: code, Label: sectionLabels[code]})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"sections": descriptors})
}

func (s *service) handleListPatients(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	patients, err := s.store.ListPatients(r.Context(), subject,
		r.URL.Query().Get("q"), limitFrom(r, 100))
	if err != nil {
		s.fail(w, r, err, "list patients failed")
		return
	}
	if patients == nil {
		patients = []Patient{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"patients": patients})
}

func (s *service) handleGetPatient(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	patient, err := s.store.GetPatient(r.Context(), subject, chi.URLParam(r, "id"))
	if err != nil {
		s.fail(w, r, err, "get patient failed")
		return
	}
	httpx.JSON(w, http.StatusOK, patient)
}

func (s *service) handleCreatePatient(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	var p Patient
	if err := httpx.DecodeJSON(w, r, &p); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send at least a full name, an age, a sex and a patient category.")
		return
	}
	if err := validatePatient(&p); err != nil {
		httpx.Problem(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := s.store.CreatePatient(r.Context(), subject, p)
	if err != nil {
		s.fail(w, r, err, "create patient failed")
		return
	}
	s.log.Info("patient registered",
		slog.String("actor", subject.Username),
		slog.String("patient_id", created.ID),
		slog.String("category", created.Category),
	)
	httpx.JSON(w, http.StatusCreated, created)
}

func (s *service) handleListVisits(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	visits, err := s.store.ListVisits(r.Context(), subject,
		strings.TrimSpace(r.URL.Query().Get("patientId")), limitFrom(r, 100))
	if err != nil {
		s.fail(w, r, err, "list visits failed")
		return
	}
	if visits == nil {
		visits = []Visit{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"visits": visits})
}

func (s *service) handleGetVisit(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	visit, err := s.store.GetVisit(r.Context(), subject, chi.URLParam(r, "id"))
	if err != nil {
		s.fail(w, r, err, "get visit failed")
		return
	}
	decided, total := visit.Completeness()
	httpx.JSON(w, http.StatusOK, map[string]any{
		"visit":        visit,
		"completeness": map[string]int{"decided": decided, "total": total},
	})
}

func (s *service) handleCreateVisit(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	var v Visit
	if err := httpx.DecodeJSON(w, r, &v); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send a patient, a visit date and a visit type.")
		return
	}
	if err := validateVisit(&v); err != nil {
		httpx.Problem(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := s.store.CreateVisit(r.Context(), subject, v)
	if err != nil {
		s.fail(w, r, err, "create visit failed")
		return
	}
	httpx.JSON(w, http.StatusCreated, created)
}

func (s *service) handleSaveSection(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	visitID := chi.URLParam(r, "id")
	code := chi.URLParam(r, "code")
	if !ValidSectionCode(code) {
		httpx.Problem(w, http.StatusBadRequest, "That is not a section of the visit record.")
		return
	}

	// A signed record is closed. Correction is by appended amendment, which
	// preserves the original — per FR-ENC-14. Silently accepting an edit to a
	// signed record would make the signature meaningless.
	state, err := s.store.VisitState(r.Context(), visitID)
	if err != nil {
		s.fail(w, r, err, "read visit state failed")
		return
	}
	if state == "signed" {
		httpx.Problem(w, http.StatusConflict,
			"This visit is signed and cannot be edited. Add an amendment instead, which keeps the original record intact.")
		return
	}

	var section VisitSection
	if err := httpx.DecodeJSON(w, r, &section); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send a section status and its notes.")
		return
	}
	if !validSectionStatus(section.Status) {
		httpx.Problem(w, http.StatusBadRequest,
			"Set the section to not recorded, partial, complete, or not clinically indicated.")
		return
	}

	if err := s.store.SaveSection(r.Context(), subject, visitID, code, section); err != nil {
		s.fail(w, r, err, "save section failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (s *service) handleSignVisit(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	visitID := chi.URLParam(r, "id")
	if err := s.store.SignVisit(r.Context(), subject, visitID); err != nil {
		if errors.Is(err, errNotFound) {
			httpx.Problem(w, http.StatusConflict,
				"That visit is already signed, or it does not exist.")
			return
		}
		s.fail(w, r, err, "sign visit failed")
		return
	}
	s.log.Info("visit signed",
		slog.String("actor", subject.Username),
		slog.String("visit_id", visitID),
	)
	httpx.JSON(w, http.StatusOK, map[string]string{"state": "signed"})
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

func validSectionStatus(status string) bool {
	switch status {
	case "not-recorded", "partial", "complete", "not-indicated":
		return true
	}
	return false
}

// validatePatient checks what must be present for the record to mean anything.
//
// It deliberately does not require organisational details or an employee
// number. Emergency presentation must never be blocked by data entry, per
// FR-PAT-04, and a patient who cannot be registered is a patient who is
// treated with no record at all.
func validatePatient(p *Patient) error {
	p.FullName = strings.TrimSpace(p.FullName)
	if p.FullName == "" {
		return errors.New("Enter the patient's full name.")
	}
	if p.Age < 0 || p.Age > 149 {
		return errors.New("Enter an age between 0 and 149.")
	}
	if p.Sex != "Female" && p.Sex != "Male" {
		return errors.New("Select the patient's sex.")
	}
	switch p.Category {
	case "Employee", "Intern", "Other":
	default:
		return errors.New("Select a patient category of Employee, Intern or Other.")
	}
	if p.Category != "Employee" {
		// An employee number on a non-employee is a contradiction that would
		// later be read as an employee for denominator purposes.
		p.EmployeeNumber = ""
	}
	return nil
}

func validateVisit(v *Visit) error {
	if strings.TrimSpace(v.PatientID) == "" {
		return errors.New("Select the patient this visit belongs to.")
	}
	if strings.TrimSpace(v.VisitDate) == "" {
		return errors.New("Enter the date of the visit.")
	}
	switch v.VisitType {
	case "Walk-in", "Referred by supervisor", "Emergency", "Follow-up":
	default:
		return errors.New("Select a visit type of Walk-in, Referred by supervisor, Emergency or Follow-up.")
	}
	switch v.WorkRelated {
	case "Yes", "No", "Unsure":
	case "":
		v.WorkRelated = "Unsure"
	default:
		return errors.New("Record whether the condition is work related as Yes, No or Unsure.")
	}
	if v.Sections == nil {
		v.Sections = map[string]VisitSection{}
	}
	for code, section := range v.Sections {
		if !ValidSectionCode(code) {
			return errors.New("One of the sections sent is not part of the visit record.")
		}
		if !validSectionStatus(section.Status) {
			return errors.New("Each section must be not recorded, partial, complete, or not clinically indicated.")
		}
	}
	// Vital signs are deliberately not range-checked here. A genuinely
	// abnormal reading is exactly the reading that matters, and a system that
	// refuses to record it is worse than paper. The interface warns; the
	// service accepts.
	return nil
}
