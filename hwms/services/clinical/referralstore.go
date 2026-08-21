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
	"github.com/jackc/pgx/v5/pgconn"
)

// referralColumns is written once and reused by the list and detail reads, so
// the two cannot select different columns in a different order and scan into
// the same function.
const referralColumns = `
	referral_id, form_number, visit_id, patient_id, status,
	referred_to, snapshot_name, snapshot_position, snapshot_age, snapshot_sex,
	snapshot_department, snapshot_division, snapshot_unit,
	snapshot_contact_number, snapshot_supervisor_name,
	referral_date, referral_time,
	clinical_features, vitals,
	general_examination, general_examination_other,
	past_medical_history, past_medical_history_other,
	work_related, suspected_exposure, investigations_done,
	provisional_diagnosis, treatment_given,
	referral_reasons, referral_reason_other,
	clearance_officer, clearance_printed_position, clearance_signature_confirmed,
	clearance_contact, clearance_date, clearance_time,
	issued_at,
	feedback_version, feedback_recorded_at, feedback_facility, feedback_practitioner,
	feedback_diagnosis, feedback_treatment_provided, feedback_recommended_followup,
	feedback_sick_leave_days, feedback_sick_leave_from, feedback_sick_leave_to,
	feedback_signature_confirmed, feedback_date,
	review_recorded_at, review_comments, review_reviewed_by, review_position,
	review_signature_confirmed, review_date,
	created_by, created_at, updated_at`

// errVisitPatientMismatch means the visit named does not belong to the patient
// named. It is returned rather than silently trusted, because the pair arrives
// from the browser and a stale tab is enough to get it wrong.
var errVisitPatientMismatch = errors.New("the visit does not belong to that patient")

func (s *store) createReferral(ctx context.Context, r Referral, actor string) (Referral, error) {
	r.ID = uuid.NewString()
	r.FormNumber = ReferralFormNumber
	r.Status = ReferralDrafted
	r.CreatedBy = actor
	r.Clearance.Officer = actor
	r.Clearance.PrintedPosition = ClearancePrintedPosition

	// Identity and vital signs are read from the records here, not taken from
	// the request.
	//
	// The browser sends identifiers and the clinician's own words; everything
	// that is already recorded elsewhere is looked up. Two reasons, and the
	// second is the important one.
	//
	// The join proves the visit belongs to the patient. Without it a stale tab
	//. The officer opened patient A, then navigated to patient B in another
	// window. Files one person's name against another person's attendance,
	// and the resulting letter is wrong in the worst possible way.
	//
	// And a snapshot copied from a request is not a snapshot of anything. The
	// point of copying identity and vitals onto the referral is that they are
	// what the record said at that moment; a value the client supplied is only
	// what the client said.
	var (
		registryName, registryPosition                string
		age                                           int
		sex, department, division, unitSection, phone string
		visitVitals                                   []byte
	)
	err := s.pool.QueryRow(ctx, `
		select p.full_name, coalesce(p.job_title,''), p.age, p.sex,
		       coalesce(p.department,''), coalesce(p.division,''), coalesce(p.unit_section,''),
		       coalesce(p.phone,''), v.vitals
		from patient_visit v
		join patient p on p.patient_id = v.patient_id
		where v.visit_id = $1 and v.patient_id = $2`,
		r.VisitID, r.PatientID,
	).Scan(&registryName, &registryPosition, &age, &sex,
		&department, &division, &unitSection, &phone, &visitVitals)
	if errors.Is(err, pgx.ErrNoRows) {
		return Referral{}, errVisitPatientMismatch
	}
	if err != nil {
		return Referral{}, fmt.Errorf("read the source visit: %w", err)
	}

	// Facts about the person and the attendance: taken from the records.
	r.Patient.Name = registryName
	r.Patient.Age = age
	r.Patient.Sex = sex
	r.Patient.Department = department
	r.Patient.Division = division
	r.Patient.UnitSection = unitSection

	// Details the officer may legitimately correct on the day, someone
	// covering a different post, or a contact number the registry has stale.
	// Defaulted from the registry where the officer left them empty.
	// Trimmed before the test, so a field containing only spaces falls back to
	// the registry rather than being stored as blank-looking but non-empty.
	r.Patient.Position = strings.TrimSpace(r.Patient.Position)
	r.Patient.ContactNumber = strings.TrimSpace(r.Patient.ContactNumber)
	r.Patient.SupervisorName = strings.TrimSpace(r.Patient.SupervisorName)
	if r.Patient.Position == "" {
		r.Patient.Position = registryPosition
	}
	if r.Patient.ContactNumber == "" {
		r.Patient.ContactNumber = phone
	}

	// Vital signs are the visit's, never the request's. A second editable copy
	// is a second version of the truth, and the one an external clinician
	// reads is this one.
	vitals := visitVitals
	if len(vitals) == 0 {
		vitals = []byte("{}")
	}
	if err := json.Unmarshal(vitals, &r.Vitals); err != nil {
		return Referral{}, fmt.Errorf("decode the visit's vitals: %w", err)
	}
	generalExamination, err := json.Marshal(nonNil(r.GeneralExamination))
	if err != nil {
		return Referral{}, err
	}
	pastMedical, err := json.Marshal(nonNil(r.PastMedicalHistory))
	if err != nil {
		return Referral{}, err
	}
	reasons, err := json.Marshal(nonNil(r.ReferralReasons))
	if err != nil {
		return Referral{}, err
	}

	_, err = s.pool.Exec(ctx, `
		insert into referral (
			referral_id, visit_id, patient_id, status,
			referred_to, snapshot_name, snapshot_position, snapshot_age, snapshot_sex,
			snapshot_department, snapshot_division, snapshot_unit,
			snapshot_contact_number, snapshot_supervisor_name,
			referral_date, referral_time,
			clinical_features, vitals,
			general_examination, general_examination_other,
			past_medical_history, past_medical_history_other,
			work_related, suspected_exposure, investigations_done,
			provisional_diagnosis, treatment_given,
			referral_reasons, referral_reason_other,
			clearance_officer, clearance_printed_position, clearance_signature_confirmed,
			clearance_contact, clearance_date, clearance_time,
			created_by
		) values (
			$1,$2,$3,'drafted',
			$4,$5,$6,$7,$8,
			$9,$10,$11,
			$12,$13,
			$14,$15,
			$16,$17,
			$18,$19,
			$20,$21,
			$22,$23,$24,
			$25,$26,
			$27,$28,
			$29,$30,$31,
			$32,$33,$34,
			$35
		)`,
		r.ID, r.VisitID, r.PatientID,
		r.ReferredTo, r.Patient.Name, r.Patient.Position, r.Patient.Age, r.Patient.Sex,
		r.Patient.Department, r.Patient.Division, r.Patient.UnitSection,
		r.Patient.ContactNumber, r.Patient.SupervisorName,
		r.ReferralDate, r.ReferralTime,
		r.ClinicalFeatures, vitals,
		generalExamination, r.GeneralExaminationOther,
		pastMedical, r.PastMedicalHistoryOther,
		r.WorkRelated, r.SuspectedExposure, r.InvestigationsDone,
		r.ProvisionalDiagnosis, r.TreatmentGiven,
		reasons, r.ReferralReasonOther,
		r.Clearance.Officer, r.Clearance.PrintedPosition, r.Clearance.SignatureConfirmed,
		r.Clearance.Contact, nullableDate(r.Clearance.Date), r.Clearance.Time,
		actor,
	)
	if err != nil {
		return Referral{}, fmt.Errorf("insert referral: %w", err)
	}
	return s.getReferral(ctx, r.ID)
}

func (s *store) listReferrals(ctx context.Context, patientID, visitID, status string, limit int) ([]Referral, error) {
	rows, err := s.pool.Query(ctx, `
		select `+referralColumns+`
		from referral
		where ($1 = '' or patient_id = nullif($1,'')::uuid)
		  and ($2 = '' or visit_id = nullif($2,'')::uuid)
		  and ($3 = '' or status = $3)
		order by referral_date desc, created_at desc
		limit $4`, patientID, visitID, status, limit)
	if err != nil {
		return nil, fmt.Errorf("query referrals: %w", err)
	}
	defer rows.Close()

	var referrals []Referral
	ids := make([]string, 0)
	for rows.Next() {
		r, err := scanReferralRow(rows)
		if err != nil {
			return nil, err
		}
		referrals = append(referrals, r)
		ids = append(ids, r.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	authorisations, err := s.loadAuthorisations(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range referrals {
		if authorisation, ok := authorisations[referrals[i].ID]; ok {
			referrals[i].Authorisation = &authorisation
		}
	}
	return referrals, nil
}

func (s *store) getReferral(ctx context.Context, id string) (Referral, error) {
	row := s.pool.QueryRow(ctx, `select `+referralColumns+` from referral where referral_id = $1`, id)

	r, err := scanReferralRow(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Referral{}, errNotFound
	}
	if err != nil {
		return Referral{}, err
	}

	authorisations, err := s.loadAuthorisations(ctx, []string{id})
	if err != nil {
		return Referral{}, err
	}
	if authorisation, ok := authorisations[id]; ok {
		r.Authorisation = &authorisation
	}
	return r, nil
}

func (s *store) loadAuthorisations(ctx context.Context, ids []string) (map[string]ReferralAuthorisation, error) {
	byReferral := map[string]ReferralAuthorisation{}
	if len(ids) == 0 {
		return byReferral, nil
	}

	rows, err := s.pool.Query(ctx, `
		select referral_id, cost_implication,
		       head_of_division_name, head_of_division_signature_confirmed,
		       head_of_division_date, head_of_division_remarks,
		       chief_of_staff_name, chief_of_staff_signature_confirmed,
		       chief_of_staff_date, chief_of_staff_remarks,
		       recorded_by, recorded_at
		from referral_authorisation
		where referral_id = any($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("query authorisations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var referralID string
		var a ReferralAuthorisation
		var headDate, chiefDate *time.Time
		if err := rows.Scan(
			&referralID, &a.CostImplication,
			&a.HeadOfDivision.Name, &a.HeadOfDivision.SignatureConfirmed,
			&headDate, &a.HeadOfDivision.Remarks,
			&a.ChiefOfStaff.Name, &a.ChiefOfStaff.SignatureConfirmed,
			&chiefDate, &a.ChiefOfStaff.Remarks,
			&a.RecordedBy, &a.RecordedAt,
		); err != nil {
			return nil, err
		}
		a.HeadOfDivision.Date = formatDate(headDate)
		a.ChiefOfStaff.Date = formatDate(chiefDate)
		byReferral[referralID] = a
	}
	return byReferral, rows.Err()
}

// recordAuthorisation writes Section C and moves the referral to authorised.
//
// Both happen in one transaction. A referral that reads as authorised with no
// record of who authorised it is worse than one that is still drafted.
func (s *store) recordAuthorisation(ctx context.Context, id string, a ReferralAuthorisation, actor string) (Referral, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Referral{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		insert into referral_authorisation (
			referral_id, cost_implication,
			head_of_division_name, head_of_division_signature_confirmed,
			head_of_division_date, head_of_division_remarks,
			chief_of_staff_name, chief_of_staff_signature_confirmed,
			chief_of_staff_date, chief_of_staff_remarks,
			recorded_by
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		on conflict (referral_id) do update set
			cost_implication = excluded.cost_implication,
			head_of_division_name = excluded.head_of_division_name,
			head_of_division_signature_confirmed = excluded.head_of_division_signature_confirmed,
			head_of_division_date = excluded.head_of_division_date,
			head_of_division_remarks = excluded.head_of_division_remarks,
			chief_of_staff_name = excluded.chief_of_staff_name,
			chief_of_staff_signature_confirmed = excluded.chief_of_staff_signature_confirmed,
			chief_of_staff_date = excluded.chief_of_staff_date,
			chief_of_staff_remarks = excluded.chief_of_staff_remarks,
			recorded_by = excluded.recorded_by,
			recorded_at = now()`,
		id, a.CostImplication,
		a.HeadOfDivision.Name, a.HeadOfDivision.SignatureConfirmed,
		nullableDate(a.HeadOfDivision.Date), a.HeadOfDivision.Remarks,
		a.ChiefOfStaff.Name, a.ChiefOfStaff.SignatureConfirmed,
		nullableDate(a.ChiefOfStaff.Date), a.ChiefOfStaff.Remarks,
		actor,
	); err != nil {
		return Referral{}, fmt.Errorf("write authorisation: %w", err)
	}

	if err := setStatus(ctx, tx, id, ReferralDrafted, ReferralAuthorised); err != nil {
		return Referral{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Referral{}, err
	}
	return s.getReferral(ctx, id)
}

// issueReferral records that the letter has left the clinic.
func (s *store) issueReferral(ctx context.Context, id string) (Referral, error) {
	tag, err := s.pool.Exec(ctx, `
		update referral
		set status = 'issued', issued_at = coalesce(issued_at, now()), updated_at = now()
		where referral_id = $1 and status = 'authorised'`, id)
	if err != nil {
		return Referral{}, fmt.Errorf("issue referral: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Referral{}, errStaleTransition
	}
	return s.getReferral(ctx, id)
}

// recordFeedback writes the first Section E and, in the same transaction, the
// sick-leave fact the metrics service consumes.
//
// One transaction is the whole design. If the outbox row were written
// afterwards, a process that died in between would leave a referral whose
// recommended leave never reaches absenteeism, and nothing would ever notice -
// the referral would look complete.
//
// A correction supersedes the previous row rather than updating it, so the
// history of what was reported stays readable and a correction can never be
// mistaken for a second period of leave.
func (s *store) recordFeedback(ctx context.Context, id string, feedback ReferralFeedback) (Referral, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Referral{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var version int
	var referralDate time.Time
	err = tx.QueryRow(ctx, `
		update referral
		set feedback_version = feedback_version + 1,
		    feedback_recorded_at = now(),
		    feedback_facility = $2,
		    feedback_practitioner = $3,
		    feedback_diagnosis = $4,
		    feedback_treatment_provided = $5,
		    feedback_recommended_followup = $6,
		    feedback_sick_leave_days = $7,
		    feedback_sick_leave_from = $8,
		    feedback_sick_leave_to = $9,
		    feedback_signature_confirmed = $10,
		    feedback_date = $11,
		    -- Issued becomes returned. A referral the clinic has already
		    -- reviewed stays reviewed: an amended letter from the facility
		    -- arrives after the review more often than anyone would like, and
		    -- recording it must not reopen a closed referral or the register
		    -- would show work outstanding that is not.
		    status = case when status = 'issued' then 'returned' else status end,
		    updated_at = now()
		where referral_id = $1
		  and status in ('issued', 'returned', 'reviewed')
		returning feedback_version, referral_date`,
		id, feedback.Facility, feedback.Practitioner, feedback.Diagnosis,
		feedback.TreatmentProvided, feedback.RecommendedFollowUp,
		feedback.SickLeaveDays, nullableDate(feedback.SickLeaveFrom), nullableDate(feedback.SickLeaveTo),
		feedback.SignatureStampConfirmed, nullableDate(feedback.Date),
	).Scan(&version, &referralDate)
	if errors.Is(err, pgx.ErrNoRows) {
		// Either the referral does not exist, or it has not been issued yet.
		// The handler has already distinguished the two for the message.
		return Referral{}, errStaleTransition
	}
	if err != nil {
		return Referral{}, fmt.Errorf("record feedback: %w", err)
	}

	// Everything already published for this referral is now history.
	if _, err := tx.Exec(ctx, `
		update referral_leave_outbox set superseded = true
		where referral_id = $1 and feedback_version < $2`, id, version); err != nil {
		return Referral{}, fmt.Errorf("supersede prior leave: %w", err)
	}

	feedback.Version = version
	period := LeavePeriod(feedback, referralDate.Format("2006-01-02"))

	// Zero days still writes a row. A correction from three days to none has
	// to reach the metrics service as a fact, or the original three stand.
	if period != "" {
		if _, err := tx.Exec(ctx, `
			insert into referral_leave_outbox (referral_id, feedback_version, period, days)
			values ($1,$2,$3,$4)
			on conflict (referral_id, feedback_version) do nothing`,
			id, version, period, feedback.SickLeaveDays,
		); err != nil {
			return Referral{}, fmt.Errorf("queue leave contribution: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Referral{}, err
	}
	return s.getReferral(ctx, id)
}

// recordReview writes the second Section E and closes the referral.
func (s *store) recordReview(ctx context.Context, id string, review ReferralReview) (Referral, error) {
	tag, err := s.pool.Exec(ctx, `
		update referral
		set review_recorded_at = now(),
		    review_comments = $2,
		    review_reviewed_by = $3,
		    review_position = $4,
		    review_signature_confirmed = $5,
		    review_date = $6,
		    status = 'reviewed',
		    updated_at = now()
		where referral_id = $1 and status = 'returned'`,
		id, review.Comments, review.ReviewedBy, review.Position,
		review.SignatureConfirmed, nullableDate(review.Date))
	if err != nil {
		return Referral{}, fmt.Errorf("record review: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Referral{}, errStaleTransition
	}
	return s.getReferral(ctx, id)
}

// referralStatus reads the current state so a transition can be checked before
// it is attempted.
func (s *store) referralStatus(ctx context.Context, id string) (string, error) {
	var status string
	err := s.pool.QueryRow(ctx, `select status from referral where referral_id = $1`, id).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errNotFound
	}
	return status, err
}

// errStaleTransition means the referral was not in the state the caller
// believed it was in. It is the compare half of compare-and-set.
var errStaleTransition = errors.New("the referral has moved on since this was read")

// setStatus moves a referral forward only if it is still where the caller
// thought it was.
//
// The handler checks the state first for the sake of a useful message, but that
// check and this write are separate moments. Two officers on the same referral,
// or one officer and a retried request, can both pass the check; without the
// condition here the second write would silently overwrite the first.
func setStatus(ctx context.Context, tx pgx.Tx, id, from, to string) error {
	tag, err := tx.Exec(ctx, `
		update referral set status = $3, updated_at = now()
		where referral_id = $1 and status = $2`, id, from, to)
	if err != nil {
		return fmt.Errorf("set referral status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return errStaleTransition
	}
	return nil
}

// --- scanning ---------------------------------------------------------------

func scanReferralRow(row scannable) (Referral, error) {
	var r Referral
	var vitals, generalExamination, pastMedical, reasons []byte
	var referralDate time.Time
	var clearanceDate, sickLeaveFrom, sickLeaveTo, feedbackDate, reviewDate *time.Time
	var feedbackRecordedAt, reviewRecordedAt *time.Time
	var feedback ReferralFeedback
	var review ReferralReview

	if err := row.Scan(
		&r.ID, &r.FormNumber, &r.VisitID, &r.PatientID, &r.Status,
		&r.ReferredTo, &r.Patient.Name, &r.Patient.Position, &r.Patient.Age, &r.Patient.Sex,
		&r.Patient.Department, &r.Patient.Division, &r.Patient.UnitSection,
		&r.Patient.ContactNumber, &r.Patient.SupervisorName,
		&referralDate, &r.ReferralTime,
		&r.ClinicalFeatures, &vitals,
		&generalExamination, &r.GeneralExaminationOther,
		&pastMedical, &r.PastMedicalHistoryOther,
		&r.WorkRelated, &r.SuspectedExposure, &r.InvestigationsDone,
		&r.ProvisionalDiagnosis, &r.TreatmentGiven,
		&reasons, &r.ReferralReasonOther,
		&r.Clearance.Officer, &r.Clearance.PrintedPosition, &r.Clearance.SignatureConfirmed,
		&r.Clearance.Contact, &clearanceDate, &r.Clearance.Time,
		&r.IssuedAt,
		&feedback.Version, &feedbackRecordedAt, &feedback.Facility, &feedback.Practitioner,
		&feedback.Diagnosis, &feedback.TreatmentProvided, &feedback.RecommendedFollowUp,
		&feedback.SickLeaveDays, &sickLeaveFrom, &sickLeaveTo,
		&feedback.SignatureStampConfirmed, &feedbackDate,
		&reviewRecordedAt, &review.Comments, &review.ReviewedBy, &review.Position,
		&review.SignatureConfirmed, &reviewDate,
		&r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
	); err != nil {
		return Referral{}, err
	}

	r.ReferralDate = referralDate.Format("2006-01-02")
	r.Clearance.Date = formatDate(clearanceDate)

	if err := json.Unmarshal(vitals, &r.Vitals); err != nil {
		return Referral{}, fmt.Errorf("decode vitals: %w", err)
	}
	// Derived on read rather than stored, so it can never disagree with the
	// height and weight sitting beside it.
	r.BMI = r.Vitals.BodyMassIndex()

	r.GeneralExamination = decodeStrings(generalExamination)
	r.PastMedicalHistory = decodeStrings(pastMedical)
	r.ReferralReasons = decodeStrings(reasons)

	// The two Section E blocks are absent until they are filled in, rather
	// than present and empty. A referral that has not come back yet should not
	// render as one that came back with nothing written on it.
	if feedbackRecordedAt != nil {
		feedback.SickLeaveFrom = formatDate(sickLeaveFrom)
		feedback.SickLeaveTo = formatDate(sickLeaveTo)
		feedback.Date = formatDate(feedbackDate)
		r.Feedback = &feedback
	}
	if reviewRecordedAt != nil {
		review.Date = formatDate(reviewDate)
		r.Review = &review
	}

	r.NextStates = NextStates(r.Status)
	return r, nil
}

// --- small helpers ----------------------------------------------------------

func decodeStrings(raw []byte) []string {
	values := []string{}
	if len(raw) == 0 {
		return values
	}
	if err := json.Unmarshal(raw, &values); err != nil || values == nil {
		return []string{}
	}
	return values
}

func nonNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}

// nullableDate keeps an empty date out of a date column. Postgres rejects ”,
// and storing a sentinel date would be a value nobody entered.
func nullableDate(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func formatDate(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.Format("2006-01-02")
}

// isForeignKeyViolation reports whether the error is a reference to a visit or
// patient that does not exist, so the caller can say which rather than
// returning a generic failure.
func isForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}
