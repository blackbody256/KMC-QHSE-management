package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *store) createRequisition(ctx context.Context, r LabRequisition, actor string) (LabRequisition, error) {
	r.ID = uuid.NewString()
	r.FormNumber = "KMC.DQHSE.05/26-FM008"
	r.AuthorisedBy = actor
	r.Status = "requested"
	r.SpecimenCollected = []string{}

	specimen, err := json.Marshal(r.SpecimenCollected)
	if err != nil {
		return LabRequisition{}, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return LabRequisition{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	err = tx.QueryRow(ctx, `
		insert into lab_requisition (
			requisition_id, visit_id, patient_id, status,
			snapshot_full_name, snapshot_staff_id_number, snapshot_department,
			snapshot_gender, snapshot_age_or_dob,
			request_date, clinical_summary, authorised_by, authorised_signature_confirmed,
			specimen_collected
		) values ($1,$2,$3,'requested',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		returning created_at, updated_at`,
		r.ID, r.VisitID, r.PatientID,
		r.Patient.FullName, r.Patient.StaffIDNumber, r.Patient.Department,
		r.Patient.Gender, r.Patient.AgeOrDOB,
		r.RequestDate, r.ClinicalSummary, r.AuthorisedBy, r.AuthorisedSignatureConfirmed,
		specimen,
	).Scan(&r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return LabRequisition{}, fmt.Errorf("insert requisition: %w", err)
	}

	for _, test := range r.Tests {
		if _, err := tx.Exec(ctx, `
			insert into lab_requisition_test (requisition_id, test_code, result)
			values ($1,$2,'')`, r.ID, test.Code); err != nil {
			return LabRequisition{}, fmt.Errorf("insert requested test %s: %w", test.Code, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return LabRequisition{}, err
	}
	return r, nil
}

func (s *store) listRequisitions(ctx context.Context, patientID, visitID string, limit int) ([]LabRequisition, error) {
	rows, err := s.pool.Query(ctx, `
		select requisition_id, form_number, visit_id, patient_id, status,
		       snapshot_full_name, snapshot_staff_id_number, snapshot_department,
		       snapshot_gender, snapshot_age_or_dob,
		       request_date, clinical_summary, authorised_by, authorised_signature_confirmed,
		       specimen_collected, collected_by, time_of_collection, created_at, updated_at
		from lab_requisition
		where ($1 = '' or patient_id = nullif($1,'')::uuid)
		  and ($2 = '' or visit_id = nullif($2,'')::uuid)
		order by request_date desc, created_at desc
		limit $3`, patientID, visitID, limit)
	if err != nil {
		return nil, fmt.Errorf("query requisitions: %w", err)
	}
	defer rows.Close()

	var requisitions []LabRequisition
	ids := make([]string, 0)
	for rows.Next() {
		r, err := scanRequisition(rows)
		if err != nil {
			return nil, err
		}
		requisitions = append(requisitions, r)
		ids = append(ids, r.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	tests, err := s.loadRequisitionTests(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range requisitions {
		requisitions[i].Tests = tests[requisitions[i].ID]
	}
	return requisitions, nil
}

func (s *store) getRequisition(ctx context.Context, id string) (LabRequisition, error) {
	row := s.pool.QueryRow(ctx, `
		select requisition_id, form_number, visit_id, patient_id, status,
		       snapshot_full_name, snapshot_staff_id_number, snapshot_department,
		       snapshot_gender, snapshot_age_or_dob,
		       request_date, clinical_summary, authorised_by, authorised_signature_confirmed,
		       specimen_collected, collected_by, time_of_collection, created_at, updated_at
		from lab_requisition where requisition_id = $1`, id)

	r, err := scanRequisitionRow(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return LabRequisition{}, errNotFound
	}
	if err != nil {
		return LabRequisition{}, err
	}

	tests, err := s.loadRequisitionTests(ctx, []string{id})
	if err != nil {
		return LabRequisition{}, err
	}
	r.Tests = tests[id]
	return r, nil
}

func (s *store) loadRequisitionTests(ctx context.Context, ids []string) (map[string][]RequestedTest, error) {
	byRequisition := map[string][]RequestedTest{}
	if len(ids) == 0 {
		return byRequisition, nil
	}

	rows, err := s.pool.Query(ctx, `
		select requisition_id, test_code, result, resulted_at
		from lab_requisition_test
		where requisition_id = any($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("query requested tests: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var requisitionID string
		var test RequestedTest
		if err := rows.Scan(&requisitionID, &test.Code, &test.Result, &test.ResultedAt); err != nil {
			return nil, err
		}
		byRequisition[requisitionID] = append(byRequisition[requisitionID], test)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Ordered as the form prints them, not as the database returned them.
	for id, tests := range byRequisition {
		byRequisition[id] = orderByCatalogue(tests)
	}
	return byRequisition, nil
}

func orderByCatalogue(tests []RequestedTest) []RequestedTest {
	ordered := make([]RequestedTest, 0, len(tests))
	for _, definition := range LabTestCatalogue {
		for _, test := range tests {
			if test.Code == definition.Code {
				ordered = append(ordered, test)
			}
		}
	}
	return ordered
}

// recordResults writes the laboratory's half of the form: the results, and the
// For Laboratory Use Only block.
func (s *store) recordResults(ctx context.Context, id string, results map[string]string, specimen []string, collectedBy, timeOfCollection string) (LabRequisition, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return LabRequisition{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	now := time.Now().UTC()
	for code, value := range results {
		if _, err := tx.Exec(ctx, `
			update lab_requisition_test
			set result = $3,
			    -- Stamped when a result is first written and left alone
			    -- afterwards, so a correction does not look like a new result.
			    resulted_at = case
			        when $3 = '' then null
			        when resulted_at is null then $4
			        else resulted_at
			    end
			where requisition_id = $1 and test_code = $2`, id, code, value, now); err != nil {
			return LabRequisition{}, fmt.Errorf("update result %s: %w", code, err)
		}
	}

	specimenJSON, err := json.Marshal(specimen)
	if err != nil {
		return LabRequisition{}, err
	}

	var tests []RequestedTest
	rows, err := tx.Query(ctx, `select test_code, result from lab_requisition_test where requisition_id = $1`, id)
	if err != nil {
		return LabRequisition{}, err
	}
	for rows.Next() {
		var test RequestedTest
		if err := rows.Scan(&test.Code, &test.Result); err != nil {
			rows.Close()
			return LabRequisition{}, err
		}
		tests = append(tests, test)
	}
	rows.Close()

	status := DeriveStatus(tests, specimen)

	tag, err := tx.Exec(ctx, `
		update lab_requisition
		set specimen_collected = $2, collected_by = $3, time_of_collection = $4,
		    status = $5, updated_at = now()
		where requisition_id = $1`, id, specimenJSON, collectedBy, timeOfCollection, status)
	if err != nil {
		return LabRequisition{}, fmt.Errorf("update requisition: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return LabRequisition{}, errNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return LabRequisition{}, err
	}
	return s.getRequisition(ctx, id)
}

func scanRequisitionRow(row scannable) (LabRequisition, error) {
	var r LabRequisition
	var specimen []byte
	var requestDate time.Time
	if err := row.Scan(
		&r.ID, &r.FormNumber, &r.VisitID, &r.PatientID, &r.Status,
		&r.Patient.FullName, &r.Patient.StaffIDNumber, &r.Patient.Department,
		&r.Patient.Gender, &r.Patient.AgeOrDOB,
		&requestDate, &r.ClinicalSummary, &r.AuthorisedBy, &r.AuthorisedSignatureConfirmed,
		&specimen, &r.CollectedBy, &r.TimeOfCollection, &r.CreatedAt, &r.UpdatedAt,
	); err != nil {
		return LabRequisition{}, err
	}
	r.RequestDate = requestDate.Format("2006-01-02")
	if err := json.Unmarshal(specimen, &r.SpecimenCollected); err != nil {
		r.SpecimenCollected = []string{}
	}
	if r.SpecimenCollected == nil {
		r.SpecimenCollected = []string{}
	}
	return r, nil
}

func scanRequisition(rows pgx.Rows) (LabRequisition, error) { return scanRequisitionRow(rows) }
