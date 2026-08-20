package main

import "time"

// Patient is anyone eligible to attend, whether or not they are an employee.
//
// The registry is keyed on a patient identifier and not on an employee number,
// per ADR-04. Interns, contractors and visitors are treated alongside
// employees, and a registry that demanded a staff number would force clinical
// staff to turn a patient away or invent one under time pressure.
type Patient struct {
	ID             string    `json:"id"`
	FullName       string    `json:"fullName"`
	Age            int       `json:"age"`
	Sex            string    `json:"sex"`
	Phone          string    `json:"phone,omitempty"`
	Category       string    `json:"category"`
	CategoryDetail string    `json:"categoryDetail,omitempty"`
	EmployeeNumber string    `json:"employeeNumber,omitempty"`
	Department     string    `json:"department,omitempty"`
	Division       string    `json:"division,omitempty"`
	UnitSection    string    `json:"unit,omitempty"`
	JobTitle       string    `json:"jobTitle,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// VitalSigns as measured. Every field is optional: a minor complaint records
// none of them, and that is a clinical judgement rather than an omission.
type VitalSigns struct {
	BloodPressure   string   `json:"bloodPressure,omitempty"`
	Pulse           *float64 `json:"pulse,omitempty"`
	RespiratoryRate *float64 `json:"respiratoryRate,omitempty"`
	Temperature     *float64 `json:"temperature,omitempty"`
	SpO2            *float64 `json:"spo2,omitempty"`
	WeightKg        *float64 `json:"weightKg,omitempty"`
	HeightCm        *float64 `json:"heightCm,omitempty"`
	PainScore       *int     `json:"painScore,omitempty"`
}

// BodyMassIndex is derived, never entered. Returns nil where either input is
// absent or implausible, rather than producing a figure nobody should trust.
func (v VitalSigns) BodyMassIndex() *float64 {
	if v.WeightKg == nil || v.HeightCm == nil || *v.HeightCm <= 0 || *v.WeightKg <= 0 {
		return nil
	}
	metres := *v.HeightCm / 100
	bmi := *v.WeightKg / (metres * metres)
	rounded := float64(int(bmi*10+0.5)) / 10
	return &rounded
}

// VisitSection carries the state of one section of the visit record, per
// ADR-09. The state is as much a clinical record as the notes are.
type VisitSection struct {
	Status     string   `json:"status"`
	Notes      string   `json:"notes"`
	Selections []string `json:"selections"`
}

// Visit is a single attendance by one patient.
type Visit struct {
	ID          string                  `json:"id"`
	PatientID   string                  `json:"patientId"`
	VisitDate   string                  `json:"visitDate"`
	TimeIn      string                  `json:"timeIn"`
	VisitType   string                  `json:"visitType"`
	State       string                  `json:"state"`
	WorkRelated string                  `json:"workRelated"`
	Vitals      VitalSigns              `json:"vitals"`
	BMI         *float64                `json:"bodyMassIndex,omitempty"`
	Sections    map[string]VisitSection `json:"sections"`
	RecordedBy  string                  `json:"recordedBy"`
	SignedAt    *time.Time              `json:"signedAt,omitempty"`
	SignedBy    string                  `json:"signedBy,omitempty"`
	CreatedAt   time.Time               `json:"createdAt"`
	UpdatedAt   time.Time               `json:"updatedAt"`
}

// SectionCodes are the sections of the visit record, in the order of the paper
// form. Staff have muscle memory for that sequence, and reordering it for
// interface convenience costs more than it saves.
var SectionCodes = []string{
	"presenting-complaint",
	"history-of-present-illness",
	"past-medical-history",
	"past-surgical-history",
	"medication-history",
	"occupational-history",
	"vital-signs",
	"general-examination",
	"systemic-examination",
	"investigations",
	"impression",
	"treatment",
}

// ValidSectionCode reports whether code names a section of the record.
func ValidSectionCode(code string) bool {
	for _, c := range SectionCodes {
		if c == code {
			return true
		}
	}
	return false
}

// Completeness counts sections that carry a clinical decision — completed or
// explicitly not indicated — against the total. A section marked not indicated
// counts as decided, because deciding a section does not apply is a clinical
// act and recording it is the point of ADR-09.
func (v Visit) Completeness() (decided int, total int) {
	total = len(SectionCodes)
	for _, code := range SectionCodes {
		section, ok := v.Sections[code]
		if !ok {
			continue
		}
		if section.Status == "complete" || section.Status == "not-indicated" {
			decided++
		}
	}
	return decided, total
}
