package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

// The patient record: everything that has happened to one person, assembled
// once.
//
// Before this existed, an officer reconstructing a patient's history had to
// open the visit register, filter it, then open the laboratory register,
// filter that, and hold the join in their head. The records are related —
// a requisition is raised *from* a visit — and displaying them as three
// unrelated lists threw that relationship away at exactly the moment it
// mattered.
//
// It is assembled server side for a second reason. Three separate calls would
// write three entries to the clinical access log for one act of opening one
// patient's record, which makes the log harder to read and no more truthful.
// One purposeful read, one entry.

// VisitSummary is the little of a visit needed to recognise it in a list.
//
// Deliberately three fields. A timeline that reproduced the whole record would
// be the record, and the officer would scroll past what they came to find.
type VisitSummary struct {
	PresentingComplaint string `json:"presentingComplaint,omitempty"`
	Impression          string `json:"impression,omitempty"`
	Treatment           string `json:"treatment,omitempty"`
}

// Completeness is the count of sections carrying a clinical decision.
type Completeness struct {
	Decided int `json:"decided"`
	Total   int `json:"total"`
}

// TimelineEntry is one visit and everything raised from it.
type TimelineEntry struct {
	Visit        Visit            `json:"visit"`
	Summary      VisitSummary     `json:"summary"`
	Completeness Completeness     `json:"completeness"`
	Requisitions []LabRequisition `json:"requisitions"`
}

// RecordSummary answers the questions asked before reading any detail: how
// often has this person attended, when were they last here, and is anything
// still outstanding.
type RecordSummary struct {
	VisitCount       int    `json:"visitCount"`
	FirstVisit       string `json:"firstVisit,omitempty"`
	LastVisit        string `json:"lastVisit,omitempty"`
	WorkRelatedCount int    `json:"workRelatedCount"`
	DraftVisits      int    `json:"draftVisits"`
	AwaitingResults  int    `json:"awaitingResults"`
}

type PatientRecord struct {
	Patient  Patient         `json:"patient"`
	Summary  RecordSummary   `json:"summary"`
	Timeline []TimelineEntry `json:"timeline"`
	// Requisitions whose visit is not in the returned window. Shown separately
	// rather than dropped: a result nobody can find is worse than an untidy
	// list.
	Unlinked []LabRequisition `json:"unlinked"`
}

// summaryFields are the sections a timeline entry quotes from.
var summaryFields = map[string]func(*VisitSummary, string){
	"presenting-complaint": func(s *VisitSummary, v string) { s.PresentingComplaint = v },
	"impression":           func(s *VisitSummary, v string) { s.Impression = v },
	"treatment":            func(s *VisitSummary, v string) { s.Treatment = v },
}

// loadSummaries reads only the sections a timeline quotes, for many visits at
// once. Loading every section of every visit to show three lines of each would
// be a great deal of clinical text moved for no purpose.
func (s *store) loadSummaries(ctx context.Context, visitIDs []string) (map[string]VisitSummary, error) {
	summaries := map[string]VisitSummary{}
	if len(visitIDs) == 0 {
		return summaries, nil
	}

	codes := make([]string, 0, len(summaryFields))
	for code := range summaryFields {
		codes = append(codes, code)
	}

	rows, err := s.pool.Query(ctx, `
		select visit_id, section_code, notes, selections
		from visit_section
		where visit_id = any($1) and section_code = any($2)`, visitIDs, codes)
	if err != nil {
		return nil, fmt.Errorf("query visit summaries: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var visitID, code, notes string
		var selections []byte
		if err := rows.Scan(&visitID, &code, &notes, &selections); err != nil {
			return nil, err
		}

		text := strings.TrimSpace(notes)
		// Where a section was recorded by ticking rather than typing, the
		// selections are the record. Showing "—" because the notes box was
		// empty would misrepresent a properly completed section.
		if text == "" {
			var chosen []string
			if err := json.Unmarshal(selections, &chosen); err == nil && len(chosen) > 0 {
				text = strings.Join(chosen, ", ")
			}
		}
		if text == "" {
			continue
		}

		summary := summaries[visitID]
		if set, ok := summaryFields[code]; ok {
			set(&summary, text)
		}
		summaries[visitID] = summary
	}
	return summaries, rows.Err()
}

// patientRecord assembles the whole record in one pass.
func (s *store) patientRecord(ctx context.Context, patientID string, limit int) (PatientRecord, error) {
	patient, err := s.getPatient(ctx, patientID)
	if err != nil {
		return PatientRecord{}, err
	}

	visits, err := s.listVisits(ctx, patientID, limit)
	if err != nil {
		return PatientRecord{}, err
	}

	requisitions, err := s.listRequisitions(ctx, patientID, "", limit)
	if err != nil {
		return PatientRecord{}, err
	}

	visitIDs := make([]string, 0, len(visits))
	for _, visit := range visits {
		visitIDs = append(visitIDs, visit.ID)
	}

	summaries, err := s.loadSummaries(ctx, visitIDs)
	if err != nil {
		return PatientRecord{}, err
	}

	sections, err := s.sectionStates(ctx, visitIDs)
	if err != nil {
		return PatientRecord{}, err
	}

	byVisit := map[string][]LabRequisition{}
	for _, requisition := range requisitions {
		byVisit[requisition.VisitID] = append(byVisit[requisition.VisitID], requisition)
	}

	record := PatientRecord{Patient: patient, Timeline: []TimelineEntry{}, Unlinked: []LabRequisition{}}
	known := map[string]bool{}

	for _, visit := range visits {
		known[visit.ID] = true
		decided := 0
		for _, status := range sections[visit.ID] {
			if status == "complete" || status == "not-indicated" {
				decided++
			}
		}

		entry := TimelineEntry{
			Visit:        visit,
			Summary:      summaries[visit.ID],
			Completeness: Completeness{Decided: decided, Total: len(SectionCodes)},
			Requisitions: byVisit[visit.ID],
		}
		if entry.Requisitions == nil {
			entry.Requisitions = []LabRequisition{}
		}
		record.Timeline = append(record.Timeline, entry)

		record.Summary.VisitCount++
		if visit.WorkRelated == "Yes" {
			record.Summary.WorkRelatedCount++
		}
		if visit.State == "draft" {
			record.Summary.DraftVisits++
		}
		if record.Summary.LastVisit == "" || visit.VisitDate > record.Summary.LastVisit {
			record.Summary.LastVisit = visit.VisitDate
		}
		if record.Summary.FirstVisit == "" || visit.VisitDate < record.Summary.FirstVisit {
			record.Summary.FirstVisit = visit.VisitDate
		}
	}

	for _, requisition := range requisitions {
		if !known[requisition.VisitID] {
			record.Unlinked = append(record.Unlinked, requisition)
		}
		if requisition.Status != "resulted" {
			record.Summary.AwaitingResults++
		}
	}

	return record, nil
}

// sectionStates returns the status of every section of the given visits.
func (s *store) sectionStates(ctx context.Context, visitIDs []string) (map[string]map[string]string, error) {
	states := map[string]map[string]string{}
	if len(visitIDs) == 0 {
		return states, nil
	}

	rows, err := s.pool.Query(ctx, `
		select visit_id, section_code, status from visit_section where visit_id = any($1)`, visitIDs)
	if err != nil {
		return nil, fmt.Errorf("query section states: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var visitID, code, status string
		if err := rows.Scan(&visitID, &code, &status); err != nil {
			return nil, err
		}
		if states[visitID] == nil {
			states[visitID] = map[string]string{}
		}
		states[visitID][code] = status
	}
	return states, rows.Err()
}

// PatientRecord is a retrieval of an individual clinical record and is logged
// as one, before it is returned.
func (s *accessLoggedStore) PatientRecord(ctx context.Context, subject auth.Subject, patientID string, limit int) (PatientRecord, error) {
	record, err := s.raw.patientRecord(ctx, patientID, limit)
	if err != nil {
		return PatientRecord{}, err
	}
	if err := s.record(ctx, subject, "detail", &patientID, nil, 1); err != nil {
		return PatientRecord{}, err
	}
	return record, nil
}

func (s *service) handlePatientRecord(w http.ResponseWriter, r *http.Request) {
	subject, ok := s.authorise(w, r)
	if !ok {
		return
	}
	record, err := s.store.PatientRecord(r.Context(), subject, chi.URLParam(r, "id"), limitFrom(r, 200))
	if err != nil {
		s.fail(w, r, err, "read patient record failed")
		return
	}
	httpx.JSON(w, http.StatusOK, record)
}
