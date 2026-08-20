package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var errNotFound = errors.New("record not found")

// store is the raw data access for the clinical context.
//
// It is deliberately unexported and deliberately not reachable from the
// handlers. Everything outside this file goes through accessLoggedStore, which
// cannot return an individual record without first writing to the access log.
// Making the undecorated store unreachable is what turns "we log reads" from a
// convention into a property of the code.
type store struct{ pool *pgxpool.Pool }

func (s *store) createPatient(ctx context.Context, p Patient, actor string) (Patient, error) {
	p.ID = uuid.NewString()
	p.CreatedAt = time.Now().UTC()

	_, err := s.pool.Exec(ctx, `
		insert into patient (
			patient_id, full_name, age, sex, phone, category, category_detail,
			employee_number, department, division, unit_section, job_title, created_by
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		p.ID, p.FullName, p.Age, p.Sex, p.Phone, p.Category, p.CategoryDetail,
		p.EmployeeNumber, p.Department, p.Division, p.UnitSection, p.JobTitle, actor,
	)
	if err != nil {
		return Patient{}, fmt.Errorf("insert patient: %w", err)
	}
	return p, nil
}

func (s *store) listPatients(ctx context.Context, query string, limit int) ([]Patient, error) {
	rows, err := s.pool.Query(ctx, `
		select patient_id, full_name, age, sex, phone, category, category_detail,
		       employee_number, department, division, unit_section, job_title, created_at
		from patient
		where not is_deleted
		  and ($1 = '' or lower(full_name) like '%' || lower($1) || '%'
		       or lower(employee_number) like '%' || lower($1) || '%'
		       or lower(department) like '%' || lower($1) || '%')
		order by created_at desc
		limit $2`, strings.TrimSpace(query), limit)
	if err != nil {
		return nil, fmt.Errorf("query patients: %w", err)
	}
	defer rows.Close()

	var patients []Patient
	for rows.Next() {
		var p Patient
		if err := rows.Scan(&p.ID, &p.FullName, &p.Age, &p.Sex, &p.Phone, &p.Category,
			&p.CategoryDetail, &p.EmployeeNumber, &p.Department, &p.Division,
			&p.UnitSection, &p.JobTitle, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan patient: %w", err)
		}
		patients = append(patients, p)
	}
	return patients, rows.Err()
}

func (s *store) getPatient(ctx context.Context, id string) (Patient, error) {
	var p Patient
	err := s.pool.QueryRow(ctx, `
		select patient_id, full_name, age, sex, phone, category, category_detail,
		       employee_number, department, division, unit_section, job_title, created_at
		from patient where patient_id = $1 and not is_deleted`, id,
	).Scan(&p.ID, &p.FullName, &p.Age, &p.Sex, &p.Phone, &p.Category, &p.CategoryDetail,
		&p.EmployeeNumber, &p.Department, &p.Division, &p.UnitSection, &p.JobTitle, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Patient{}, errNotFound
	}
	if err != nil {
		return Patient{}, fmt.Errorf("get patient: %w", err)
	}
	return p, nil
}

func (s *store) createVisit(ctx context.Context, v Visit, actor string) (Visit, error) {
	v.ID = uuid.NewString()
	v.State = "draft"
	v.RecordedBy = actor

	vitals, err := json.Marshal(v.Vitals)
	if err != nil {
		return Visit{}, fmt.Errorf("encode vitals: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Visit{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	err = tx.QueryRow(ctx, `
		insert into patient_visit (
			visit_id, patient_id, visit_date, time_in, visit_type, state, work_related, vitals, recorded_by
		) values ($1,$2,$3,$4,$5,'draft',$6,$7,$8)
		returning created_at, updated_at`,
		v.ID, v.PatientID, v.VisitDate, v.TimeIn, v.VisitType, v.WorkRelated, vitals, actor,
	).Scan(&v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return Visit{}, fmt.Errorf("insert visit: %w", err)
	}

	for code, section := range v.Sections {
		if !ValidSectionCode(code) {
			return Visit{}, fmt.Errorf("unknown section %q", code)
		}
		selections, err := json.Marshal(section.Selections)
		if err != nil {
			return Visit{}, err
		}
		if _, err := tx.Exec(ctx, `
			insert into visit_section (visit_id, section_code, status, notes, selections, updated_by)
			values ($1,$2,$3,$4,$5,$6)`,
			v.ID, code, section.Status, section.Notes, selections, actor,
		); err != nil {
			return Visit{}, fmt.Errorf("insert section %s: %w", code, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Visit{}, err
	}
	v.BMI = v.Vitals.BodyMassIndex()
	return v, nil
}

func (s *store) listVisits(ctx context.Context, patientID string, limit int) ([]Visit, error) {
	rows, err := s.pool.Query(ctx, `
		select visit_id, patient_id, visit_date, time_in, visit_type, state, work_related,
		       vitals, recorded_by, signed_at, coalesce(signed_by, ''), created_at, updated_at
		from patient_visit
		where ($1 = '' or patient_id = nullif($1,'')::uuid)
		order by visit_date desc, created_at desc
		limit $2`, patientID, limit)
	if err != nil {
		return nil, fmt.Errorf("query visits: %w", err)
	}
	defer rows.Close()

	var visits []Visit
	for rows.Next() {
		v, err := scanVisit(rows)
		if err != nil {
			return nil, err
		}
		visits = append(visits, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Sections are loaded for the detail view, not the list. A list of thirty
	// visits does not need three hundred and sixty section rows.
	for i := range visits {
		visits[i].Sections = map[string]VisitSection{}
	}
	return visits, nil
}

func (s *store) getVisit(ctx context.Context, id string) (Visit, error) {
	row := s.pool.QueryRow(ctx, `
		select visit_id, patient_id, visit_date, time_in, visit_type, state, work_related,
		       vitals, recorded_by, signed_at, coalesce(signed_by, ''), created_at, updated_at
		from patient_visit where visit_id = $1`, id)

	v, err := scanVisitRow(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Visit{}, errNotFound
	}
	if err != nil {
		return Visit{}, err
	}

	sections, err := s.loadSections(ctx, id)
	if err != nil {
		return Visit{}, err
	}
	v.Sections = sections
	return v, nil
}

func (s *store) loadSections(ctx context.Context, visitID string) (map[string]VisitSection, error) {
	rows, err := s.pool.Query(ctx, `
		select section_code, status, notes, selections
		from visit_section where visit_id = $1`, visitID)
	if err != nil {
		return nil, fmt.Errorf("query sections: %w", err)
	}
	defer rows.Close()

	sections := map[string]VisitSection{}
	for rows.Next() {
		var code string
		var section VisitSection
		var selections []byte
		if err := rows.Scan(&code, &section.Status, &section.Notes, &selections); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(selections, &section.Selections); err != nil {
			section.Selections = nil
		}
		sections[code] = section
	}
	return sections, rows.Err()
}

// saveSection writes one section of a draft visit.
func (s *store) saveSection(ctx context.Context, visitID, code string, section VisitSection, actor string) error {
	selections, err := json.Marshal(section.Selections)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		insert into visit_section (visit_id, section_code, status, notes, selections, updated_by, updated_at)
		values ($1,$2,$3,$4,$5,$6, now())
		on conflict (visit_id, section_code) do update
		set status = excluded.status,
		    notes = excluded.notes,
		    selections = excluded.selections,
		    updated_by = excluded.updated_by,
		    updated_at = now()`,
		visitID, code, section.Status, section.Notes, selections, actor)
	if err != nil {
		return fmt.Errorf("save section: %w", err)
	}
	_, err = s.pool.Exec(ctx, `update patient_visit set updated_at = now() where visit_id = $1`, visitID)
	return err
}

func (s *store) signVisit(ctx context.Context, visitID, actor string) error {
	tag, err := s.pool.Exec(ctx, `
		update patient_visit
		set state = 'signed', signed_at = now(), signed_by = $2, updated_at = now()
		where visit_id = $1 and state = 'draft'`, visitID, actor)
	if err != nil {
		return fmt.Errorf("sign visit: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return errNotFound
	}
	return nil
}

func (s *store) visitState(ctx context.Context, visitID string) (string, error) {
	var state string
	err := s.pool.QueryRow(ctx, `select state from patient_visit where visit_id = $1`, visitID).Scan(&state)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errNotFound
	}
	return state, err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanVisitRow(row scannable) (Visit, error) {
	var v Visit
	var vitals []byte
	var visitDate time.Time
	if err := row.Scan(&v.ID, &v.PatientID, &visitDate, &v.TimeIn, &v.VisitType, &v.State,
		&v.WorkRelated, &vitals, &v.RecordedBy, &v.SignedAt, &v.SignedBy,
		&v.CreatedAt, &v.UpdatedAt); err != nil {
		return Visit{}, err
	}
	v.VisitDate = visitDate.Format("2006-01-02")
	if err := json.Unmarshal(vitals, &v.Vitals); err != nil {
		return Visit{}, fmt.Errorf("decode vitals: %w", err)
	}
	v.BMI = v.Vitals.BodyMassIndex()
	return v, nil
}

func scanVisit(rows pgx.Rows) (Visit, error) { return scanVisitRow(rows) }
