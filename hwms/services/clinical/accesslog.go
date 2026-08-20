package main

import (
	"context"
	"fmt"

	"github.com/kiiramotors/hwms/platform/auth"
)

// accessLoggedStore is the only route to clinical data in this service.
//
// Every retrieval of an individual record writes to clinical_access_log
// *before* the record is returned, per ADR-11 and FR-SEC-04. The undecorated
// store is not reachable from the handlers, which is what makes this a
// property of the code rather than a habit that survives until someone is in a
// hurry.
//
// The ordering matters and is not an implementation detail. A log written
// after the response has been sent is a log that is missing exactly when the
// process dies mid-request, which is exactly when someone will ask what was
// read.
type accessLoggedStore struct{ raw *store }

// logFailureIsReadFailure states the policy that the code below implements: if
// the access log cannot be written, the read does not happen.
//
// The alternative — serve the record and carry on — means the system quietly
// stops being able to answer "who read this patient's record", which is the
// one question the Data Protection and Privacy Act makes it answerable for.
// Refusing the read is the conservative failure and it is the correct one.
const logFailureIsReadFailure = true

func (s *accessLoggedStore) record(ctx context.Context, subject auth.Subject, route string, patientID, visitID *string, count int) error {
	_, err := s.raw.pool.Exec(ctx, `
		insert into clinical_access_log (
			acting_user_id, acting_username, patient_id, visit_id, access_route, result_count
		) values ($1,$2,$3,$4,$5,$6)`,
		subject.ID, subject.Username, patientID, visitID, route, count)
	if err != nil {
		return fmt.Errorf("write clinical access log: %w", err)
	}
	return nil
}

func (s *accessLoggedStore) ListPatients(ctx context.Context, subject auth.Subject, query string, limit int) ([]Patient, error) {
	patients, err := s.raw.listPatients(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	route := "list"
	if query != "" {
		route = "search"
	}
	// A list is a retrieval too. Searching a registry by name reveals who
	// attends the Infirmary just as surely as opening one record does, so it
	// is logged with the number of records the search returned.
	if err := s.record(ctx, subject, route, nil, nil, len(patients)); err != nil {
		return nil, err
	}
	return patients, nil
}

func (s *accessLoggedStore) GetPatient(ctx context.Context, subject auth.Subject, id string) (Patient, error) {
	patient, err := s.raw.getPatient(ctx, id)
	if err != nil {
		return Patient{}, err
	}
	if err := s.record(ctx, subject, "detail", &id, nil, 1); err != nil {
		return Patient{}, err
	}
	return patient, nil
}

func (s *accessLoggedStore) CreatePatient(ctx context.Context, subject auth.Subject, p Patient) (Patient, error) {
	return s.raw.createPatient(ctx, p, subject.Username)
}

func (s *accessLoggedStore) ListVisits(ctx context.Context, subject auth.Subject, patientID string, limit int) ([]Visit, error) {
	visits, err := s.raw.listVisits(ctx, patientID, limit)
	if err != nil {
		return nil, err
	}
	var patientRef *string
	if patientID != "" {
		patientRef = &patientID
	}
	if err := s.record(ctx, subject, "list", patientRef, nil, len(visits)); err != nil {
		return nil, err
	}
	return visits, nil
}

func (s *accessLoggedStore) GetVisit(ctx context.Context, subject auth.Subject, id string) (Visit, error) {
	visit, err := s.raw.getVisit(ctx, id)
	if err != nil {
		return Visit{}, err
	}
	if err := s.record(ctx, subject, "detail", &visit.PatientID, &id, 1); err != nil {
		return Visit{}, err
	}
	return visit, nil
}

func (s *accessLoggedStore) CreateVisit(ctx context.Context, subject auth.Subject, v Visit) (Visit, error) {
	return s.raw.createVisit(ctx, v, subject.Username)
}

func (s *accessLoggedStore) SaveSection(ctx context.Context, subject auth.Subject, visitID, code string, section VisitSection) error {
	return s.raw.saveSection(ctx, visitID, code, section, subject.Username)
}

func (s *accessLoggedStore) SignVisit(ctx context.Context, subject auth.Subject, visitID string) error {
	return s.raw.signVisit(ctx, visitID, subject.Username)
}

func (s *accessLoggedStore) VisitState(ctx context.Context, visitID string) (string, error) {
	return s.raw.visitState(ctx, visitID)
}
