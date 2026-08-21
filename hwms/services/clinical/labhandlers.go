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
// A laboratory requisition carries the patient's name, staff number, clinical
// summary and results. It is a clinical record and is treated as one: reads go
// through the access log like every other retrieval in this context.

func (s *accessLoggedStore) ListRequisitions(ctx context.Context, subject auth.Subject, patientID, visitID string, limit int) ([]LabRequisition, error) {
	requisitions, err := s.raw.listRequisitions(ctx, patientID, visitID, limit)
	if err != nil {
		return nil, err
	}
	var patientRef *string
	if patientID != "" {
		patientRef = &patientID
	}
	if err := s.record(ctx, subject, "list", patientRef, nil, len(requisitions)); err != nil {
		return nil, err
	}
	return requisitions, nil
}

func (s *accessLoggedStore) GetRequisition(ctx context.Context, subject auth.Subject, id string) (LabRequisition, error) {
	requisition, err := s.raw.getRequisition(ctx, id)
	if err != nil {
		return LabRequisition{}, err
	}
	if err := s.record(ctx, subject, "detail", &requisition.PatientID, &requisition.VisitID, 1); err != nil {
		return LabRequisition{}, err
	}
	return requisition, nil
}

func (s *accessLoggedStore) CreateRequisition(ctx context.Context, subject auth.Subject, r LabRequisition) (LabRequisition, error) {
	return s.raw.createRequisition(ctx, r, subject.Username)
}

func (s *accessLoggedStore) RecordResults(ctx context.Context, subject auth.Subject, id string, results map[string]string, specimen []string, collectedBy, timeOfCollection string) (LabRequisition, error) {
	requisition, err := s.raw.recordResults(ctx, id, results, specimen, collectedBy, timeOfCollection)
	if err != nil {
		return LabRequisition{}, err
	}
	if err := s.record(ctx, subject, "detail", &requisition.PatientID, &requisition.VisitID, 1); err != nil {
		return LabRequisition{}, err
	}
	return requisition, nil
}

// --- handlers --------------------------------------------------------------

func (s *service) labRoutes(r chi.Router) {
	r.Get("/lab/catalogue", s.handleLabCatalogue)
	r.Get("/lab/requisitions", s.handleListRequisitions)
	r.Post("/lab/requisitions", s.handleCreateRequisition)
	r.Get("/lab/requisitions/{id}", s.handleGetRequisition)
	r.Put("/lab/requisitions/{id}/results", s.handleRecordResults)
}

// handleLabCatalogue publishes the investigations the form offers, so the
// interface does not carry its own copy of the list.
func (s *service) handleLabCatalogue(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.authorise(w, r); !ok {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"formNumber":    "KMC.DQHSE.05/26-FM008",
		"groups":        LabTestGroupOrder,
		"tests":         LabTestCatalogue,
		"specimenTypes": LabSpecimenTypes,
	})
}

func (s *service) handleListRequisitions(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	requisitions, err := s.store.ListRequisitions(r.Context(), subject,
		strings.TrimSpace(r.URL.Query().Get("patientId")),
		strings.TrimSpace(r.URL.Query().Get("visitId")),
		limitFrom(r, 100))
	if err != nil {
		s.fail(w, r, err, "list requisitions failed")
		return
	}
	if requisitions == nil {
		requisitions = []LabRequisition{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"requisitions": requisitions})
}

func (s *service) handleGetRequisition(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	requisition, err := s.store.GetRequisition(r.Context(), subject, chi.URLParam(r, "id"))
	if err != nil {
		s.fail(w, r, err, "get requisition failed")
		return
	}
	httpx.JSON(w, http.StatusOK, requisition)
}

type createRequisitionRequest struct {
	VisitID            string          `json:"visitId"`
	PatientID          string          `json:"patientId"`
	Patient            PatientSnapshot `json:"patientSnapshot"`
	RequestDate        string          `json:"requestDate"`
	TestCodes          []string        `json:"testCodes"`
	ClinicalSummary    string          `json:"clinicalSummary"`
	SignatureConfirmed bool            `json:"authorisedSignatureConfirmed"`
}

func (s *service) handleCreateRequisition(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}

	var req createRequisitionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest,
			"Send the visit, the patient, the request date and at least one investigation.")
		return
	}

	if strings.TrimSpace(req.VisitID) == "" || strings.TrimSpace(req.PatientID) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Raise the requisition from a patient visit.")
		return
	}
	if strings.TrimSpace(req.RequestDate) == "" {
		httpx.Problem(w, http.StatusBadRequest, "Enter the date of the request.")
		return
	}
	if len(req.TestCodes) == 0 {
		httpx.Problem(w, http.StatusBadRequest, "Tick at least one investigation.")
		return
	}
	seen := map[string]bool{}
	tests := make([]RequestedTest, 0, len(req.TestCodes))
	for _, code := range req.TestCodes {
		if !ValidLabTestCode(code) {
			httpx.Problem(w, http.StatusBadRequest,
				"One of the investigations sent is not on the requisition form.")
			return
		}
		if seen[code] {
			continue
		}
		seen[code] = true
		tests = append(tests, RequestedTest{Code: code})
	}
	if req.Patient.Gender != "Female" && req.Patient.Gender != "Male" {
		httpx.Problem(w, http.StatusBadRequest, "The patient record must carry a sex for this form.")
		return
	}
	// The printed form has a signature block against the authorising officer.
	// A requisition without it is not a completed form.
	if !req.SignatureConfirmed {
		httpx.Problem(w, http.StatusBadRequest,
			"Confirm the authorising officer's signature, as the printed form requires.")
		return
	}

	created, err := s.store.CreateRequisition(r.Context(), subject, LabRequisition{
		VisitID:                      req.VisitID,
		PatientID:                    req.PatientID,
		Patient:                      req.Patient,
		RequestDate:                  req.RequestDate,
		Tests:                        tests,
		ClinicalSummary:              req.ClinicalSummary,
		AuthorisedSignatureConfirmed: true,
	})
	if err != nil {
		s.fail(w, r, err, "create requisition failed")
		return
	}

	s.log.Info("laboratory requisition raised",
		slog.String("actor", subject.Username),
		slog.Int("investigations", len(created.Tests)),
	)
	httpx.JSON(w, http.StatusCreated, created)
}

type recordResultsRequest struct {
	// Keyed by test code. A code not on the requisition is rejected rather
	// than quietly ignored.
	Results           map[string]string `json:"results"`
	SpecimenCollected []string          `json:"specimenCollected"`
	CollectedBy       string            `json:"collectedBy"`
	TimeOfCollection  string            `json:"timeOfCollection"`
}

func (s *service) handleRecordResults(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")

	var req recordResultsRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send the results and the specimen details.")
		return
	}

	existing, err := s.store.GetRequisition(r.Context(), subject, id)
	if err != nil {
		s.fail(w, r, err, "read requisition failed")
		return
	}

	requested := map[string]bool{}
	for _, test := range existing.Tests {
		requested[test.Code] = true
	}
	for code := range req.Results {
		if !requested[code] {
			httpx.Problem(w, http.StatusBadRequest,
				"A result was sent for an investigation this requisition did not request.")
			return
		}
	}

	specimen := make([]string, 0, len(req.SpecimenCollected))
	for _, value := range req.SpecimenCollected {
		if !ValidSpecimenType(value) {
			httpx.Problem(w, http.StatusBadRequest,
				"Specimen must be Whole Blood, Serum/Plasma or Stool.")
			return
		}
		specimen = append(specimen, value)
	}

	// Results are stored as the laboratory reported them. Nothing here decides
	// whether a value is abnormal: the form defines no reference ranges, and
	// inventing one would put a clinical judgement in the software's mouth.
	updated, err := s.store.RecordResults(r.Context(), subject, id, req.Results, specimen,
		strings.TrimSpace(req.CollectedBy), strings.TrimSpace(req.TimeOfCollection))
	if err != nil {
		if errors.Is(err, errNotFound) {
			httpx.Problem(w, http.StatusNotFound, "That requisition does not exist.")
			return
		}
		s.fail(w, r, err, "record results failed")
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}
