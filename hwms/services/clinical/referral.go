package main

import "time"

// The medical referral, KMC.DQHSE.02/26-FM004.
//
// The catalogues below are the options the printed form offers, in the order it
// prints them. They are published by the API so the interface keeps no copy of
// them, two lists of past medical history would eventually disagree, and the
// one that disagreed silently would be the one a clinician ticked.

// ReferralFormNumber as printed on the client's controlled form.
const ReferralFormNumber = "KMC.DQHSE.02/26-FM004"

// ReferralStatus values, in lifecycle order.
const (
	ReferralDrafted    = "drafted"
	ReferralAuthorised = "authorised"
	ReferralIssued     = "issued"
	ReferralReturned   = "returned"
	ReferralReviewed   = "reviewed"
)

// ReferralStatusOrder is the order the states occur in, which is also the order
// the interface presents them.
var ReferralStatusOrder = []string{
	ReferralDrafted, ReferralAuthorised, ReferralIssued, ReferralReturned, ReferralReviewed,
}

// referralTransitions is the whole lifecycle.
//
// Strictly forward, one step at a time. There is no route back from issued to
// drafted: once the letter has gone to the facility, amending the copy held
// here would leave the two disagreeing with no record that they ever did. A
// referral raised in error is superseded by a new one.
var referralTransitions = map[string][]string{
	ReferralDrafted:    {ReferralAuthorised},
	ReferralAuthorised: {ReferralIssued},
	ReferralIssued:     {ReferralReturned},
	ReferralReturned:   {ReferralReviewed},
	ReferralReviewed:   {},
}

// ValidTransition reports whether the referral may move from one state to the
// next. The interface offers only valid next stages; this is the check behind
// that courtesy, per FR-REF-06.
func ValidTransition(from, to string) bool {
	for _, allowed := range referralTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

// NextStates returns the states this referral may move to. Empty at the end of
// the lifecycle, which is how the interface knows to offer nothing.
func NextStates(from string) []string {
	next := referralTransitions[from]
	if next == nil {
		return []string{}
	}
	return next
}

// --- the form's catalogues --------------------------------------------------

// GeneralExaminationOptions as printed under Clinical Findings.
var GeneralExaminationOptions = []string{
	"Stable", "Sick-looking", "Pale", "Jaundiced", "Dehydrated", "Other",
}

// PastMedicalHistoryOptions as printed.
//
// HIV and mental health condition are on this list because they are on the
// form. Their presence is precisely why Section C authorisation is a
// confidentiality problem rather than a workflow one, see DEC-024 and the
// comment on referral_authorisation in the migration.
var PastMedicalHistoryOptions = []string{
	"Hypertension", "Diabetes", "Asthma", "Epilepsy", "Peptic ulcer disease",
	"Tuberculosis", "HIV", "Mental health condition", "None", "Other",
}

// ReferralReasonOptions as printed under Reason for Referral.
var ReferralReasonOptions = []string{
	"Further evaluation",
	"Specialist management",
	"Diagnostic imaging or laboratory investigations",
	"Emergency care",
	"Other",
}

// WorkRelatedOptions for the occupational consideration block.
//
// Note the third value. The visit record offers Unsure; this form prints
// Suspected. They are not merged, because each follows its own printed form and
// a clinician reading either should see the words in front of them.
var WorkRelatedOptions = []string{"Yes", "No", "Suspected"}

// ReferralSection is one labelled section of the printed form.
type ReferralSection struct {
	Label string `json:"label"`
	Title string `json:"title"`
	// Set where the printed label is wrong, so the interface can show the
	// defect rather than quietly correcting it.
	Defect string `json:"defect,omitempty"`
}

// ReferralSections reproduces the form's own section labels, defects included.
//
// The client's form labels two different sections "E" and has no Section D.
// Renumbering them here would put this system out of step with the controlled
// document, and a clinician comparing the screen against the paper would find
// the sections do not correspond. The correction is Document Control's to
// authorise, at DEC-025. Until then the defect is reproduced and flagged.
var ReferralSections = []ReferralSection{
	{Label: "Section A", Title: "Preliminary information"},
	{Label: "Section B", Title: "Infirmary clearance"},
	{Label: "Section C", Title: "Official authorisation"},
	{
		Label:  "Section E",
		Title:  "External medical facility feedback",
		Defect: "The printed form labels this Section E and has no Section D. Reproduced as printed pending DEC-025.",
	},
	{
		Label:  "Section E",
		Title:  "KMC infirmary follow-up review",
		Defect: "The printed form labels this Section E as well, duplicating the label above. Reproduced as printed pending DEC-025.",
	},
}

// ClearancePrintedPosition is the role title as the form prints it.
//
// KMC renamed this role to Health and Wellness Officer. The form is the
// client's controlled document, not this project's, so the printed wording
// stands until the form is reissued, DEC-026.
const ClearancePrintedPosition = "KMC Infirmary Officer"

func validReferralOption(value string, options []string) bool {
	for _, option := range options {
		if option == value {
			return true
		}
	}
	return false
}

// ValidGeneralExamination reports whether value is on the printed form.
func ValidGeneralExamination(value string) bool {
	return validReferralOption(value, GeneralExaminationOptions)
}

// ValidPastMedicalHistory reports whether value is on the printed form.
func ValidPastMedicalHistory(value string) bool {
	return validReferralOption(value, PastMedicalHistoryOptions)
}

// ValidReferralReason reports whether value is on the printed form.
func ValidReferralReason(value string) bool {
	return validReferralOption(value, ReferralReasonOptions)
}

// ValidWorkRelated reports whether value is one this form offers.
func ValidWorkRelated(value string) bool {
	return validReferralOption(value, WorkRelatedOptions)
}

// --- the record -------------------------------------------------------------

// ReferralPatientSnapshot is the Section A identity block, taken at the time
// the referral is raised rather than read live from the registry.
type ReferralPatientSnapshot struct {
	Name           string `json:"name"`
	Position       string `json:"position"`
	Age            int    `json:"age"`
	Sex            string `json:"sex"`
	Department     string `json:"department"`
	Division       string `json:"division"`
	UnitSection    string `json:"unit"`
	ContactNumber  string `json:"contactNumber"`
	SupervisorName string `json:"supervisorName"`
}

// ReferralClearance is Section B.
type ReferralClearance struct {
	Officer            string `json:"officer"`
	PrintedPosition    string `json:"printedPosition"`
	SignatureConfirmed bool   `json:"signatureConfirmed"`
	Contact            string `json:"contact"`
	Date               string `json:"date,omitempty"`
	Time               string `json:"time,omitempty"`
}

// ReferralSignOff is one signatory's block within Section C.
type ReferralSignOff struct {
	Name               string `json:"name"`
	SignatureConfirmed bool   `json:"signatureConfirmed"`
	Date               string `json:"date,omitempty"`
	Remarks            string `json:"remarks"`
}

// ReferralAuthorisation is Section C as recorded by the officer.
//
// Recorded, not granted. No management role has a route to this or to the
// referral it belongs to while DEC-024 is open. The officer obtains the
// decision outside the system from a minimum-disclosure summary and records
// that it was obtained.
type ReferralAuthorisation struct {
	CostImplication string          `json:"costImplication"`
	HeadOfDivision  ReferralSignOff `json:"headOfDivision"`
	ChiefOfStaff    ReferralSignOff `json:"chiefOfStaff"`
	RecordedBy      string          `json:"recordedBy"`
	RecordedAt      time.Time       `json:"recordedAt"`
}

// ReferralFeedback is the first Section E, completed from what the external
// facility returns.
type ReferralFeedback struct {
	// Increments on every correction. The idempotency key for the sick-leave
	// contribution, so an amended letter replaces rather than adds.
	Version                 int     `json:"version"`
	Facility                string  `json:"facility"`
	Practitioner            string  `json:"practitioner"`
	Diagnosis               string  `json:"diagnosis"`
	TreatmentProvided       string  `json:"treatmentProvided"`
	RecommendedFollowUp     string  `json:"recommendedFollowUp"`
	SickLeaveDays           float64 `json:"sickLeaveDays"`
	SickLeaveFrom           string  `json:"sickLeaveFrom,omitempty"`
	SickLeaveTo             string  `json:"sickLeaveTo,omitempty"`
	SignatureStampConfirmed bool    `json:"signatureAndStampConfirmed"`
	Date                    string  `json:"date,omitempty"`
}

// ReferralReview is the second Section E, closing the loop at the clinic.
type ReferralReview struct {
	Comments           string `json:"comments"`
	ReviewedBy         string `json:"reviewedBy"`
	Position           string `json:"position"`
	SignatureConfirmed bool   `json:"signatureConfirmed"`
	Date               string `json:"date,omitempty"`
}

// Referral is one completed form.
type Referral struct {
	ID         string `json:"id"`
	FormNumber string `json:"formNumber"`
	VisitID    string `json:"visitId"`
	PatientID  string `json:"patientId"`
	Status     string `json:"status"`

	ReferredTo   string                  `json:"referredTo"`
	Patient      ReferralPatientSnapshot `json:"patientSnapshot"`
	ReferralDate string                  `json:"referralDate"`
	ReferralTime string                  `json:"referralTime"`

	ClinicalFeatures string     `json:"clinicalFeatures"`
	Vitals           VitalSigns `json:"vitals"`
	// Derived from the copied height and weight, never entered and never
	// stored. Computed on read so it cannot drift from its own inputs.
	BMI *float64 `json:"bodyMassIndex,omitempty"`

	GeneralExamination      []string `json:"generalExamination"`
	GeneralExaminationOther string   `json:"generalExaminationOther,omitempty"`
	PastMedicalHistory      []string `json:"pastMedicalHistory"`
	PastMedicalHistoryOther string   `json:"pastMedicalHistoryOther,omitempty"`

	WorkRelated          string   `json:"workRelated"`
	SuspectedExposure    string   `json:"suspectedExposure,omitempty"`
	InvestigationsDone   string   `json:"investigationsDone"`
	ProvisionalDiagnosis string   `json:"provisionalDiagnosis"`
	TreatmentGiven       string   `json:"treatmentGiven"`
	ReferralReasons      []string `json:"referralReasons"`
	ReferralReasonOther  string   `json:"referralReasonOther,omitempty"`

	Clearance     ReferralClearance      `json:"clearance"`
	Authorisation *ReferralAuthorisation `json:"authorisation,omitempty"`
	IssuedAt      *time.Time             `json:"issuedAt,omitempty"`
	Feedback      *ReferralFeedback      `json:"externalFeedback,omitempty"`
	Review        *ReferralReview        `json:"followUpReview,omitempty"`

	// The states this referral may move to next, so the interface offers only
	// what the lifecycle allows rather than deriving the rule a second time.
	NextStates []string `json:"nextStates"`

	CreatedBy string    `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// LeavePeriod is the reporting month the recommended sick leave falls in.
//
// Taken from the first day of leave where the facility gave a date range, and
// from the date of the feedback otherwise. Leave that straddles a month end is
// attributed whole to the month it began in: splitting it would need a daily
// calendar the form does not supply, and attributing it to the month the letter
// happened to arrive would move the same absence between months depending on
// the post.
func LeavePeriod(feedback ReferralFeedback, referralDate string) string {
	for _, candidate := range []string{feedback.SickLeaveFrom, feedback.Date, referralDate} {
		if len(candidate) >= 7 {
			return candidate[:7]
		}
	}
	return ""
}
