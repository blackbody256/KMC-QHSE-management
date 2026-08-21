package main

import (
	"encoding/json"
	"time"
)

// Industrial hygiene and ergonomics.
//
// Neither holds clinical content. A noise reading at a workstation and a
// workstation assessment are facts about a place, not about a person, which is
// why they live outside the clinical service and why the manager may read them.

// --- industrial hygiene -----------------------------------------------------

// MonitoringEvent is one occasion of monitoring, performed or not.
type MonitoringEvent struct {
	ID         string `json:"id"`
	Period     string `json:"period"`
	EventDate  string `json:"eventDate"`
	Location   string `json:"location"`
	Instrument string `json:"instrument"`
	// An event that did not happen is still recorded. A month with no readings
	// because monitoring was skipped is a different fact from a month with
	// none scheduled, and only one of them is a problem.
	Performed          bool      `json:"performed"`
	NotPerformedReason string    `json:"notPerformedReason,omitempty"`
	Notes              string    `json:"notes"`
	RecordedBy         string    `json:"recordedBy"`
	CreatedAt          time.Time `json:"createdAt"`

	Readings []Reading `json:"readings"`
}

// Reading is one measurement and the evaluation made of it at the time.
//
// Everything from LimitReferenceID to Compliance is a snapshot of the reference
// data as it stood on ReadingDate. It is copied rather than looked up so that
// revising a limit next year cannot change what this reading meant this year -
// NFR-DATA-02, enforced by a trigger in the migration rather than by habit.
type Reading struct {
	ID          string  `json:"id"`
	EventID     string  `json:"eventId"`
	Period      string  `json:"period"`
	ReadingDate string  `json:"readingDate"`
	Location    string  `json:"location"`
	Instrument  string  `json:"instrument"`
	Parameter   string  `json:"parameter"`
	Value       float64 `json:"value"`

	LimitReferenceID string  `json:"limitReferenceId"`
	LimitApplied     float64 `json:"limitApplied"`
	Unit             string  `json:"unit"`
	AveragingPeriod  string  `json:"averagingPeriod"`
	Context          string  `json:"context"`
	StandardFamily   string  `json:"standardFamily"`
	StandardVersion  string  `json:"standardVersion"`

	Compliance string `json:"compliance"`
	// False for a reading taken outside the monitoring plan. It stays in the
	// register and out of the compliance percentage, an ad-hoc reading is
	// usually taken because somebody already suspects a problem, and counting
	// it would make the indicator measure how often people went looking.
	KpiEligible bool      `json:"kpiEligible"`
	RecordedBy  string    `json:"recordedBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

// EvaluateReading decides compliance against the limit in force.
//
// Every parameter this system carries is an upper bound: a value at or below
// the limit is within it. If KMC ever adopts a parameter with a floor, a
// minimum illuminance, say. This function is where that belongs, as data
// carried on the limit rather than as a special case written here.
func EvaluateReading(value, limit float64) string {
	if value <= limit {
		return "within"
	}
	return "outside"
}

// --- ergonomics -------------------------------------------------------------

// ErgonomicOutcomes are the three outcomes an assessment can reach.
//
// Three, not two. "Partially compliant" is the common real result, and
// collapsing it into either neighbour throws away the distinction the assessor
// actually drew.
var ErgonomicOutcomes = []string{"Compliant", "Partially compliant", "Non-compliant"}

// WorkTypes as the register distinguishes them.
var WorkTypes = []string{"Office", "Industrial"}

// ActionStatuses in lifecycle order.
var ActionStatuses = []string{"Open", "Implemented", "Closed"}

func validOption(value string, options []string) bool {
	for _, option := range options {
		if option == value {
			return true
		}
	}
	return false
}

func ValidErgonomicOutcome(value string) bool { return validOption(value, ErgonomicOutcomes) }
func ValidWorkType(value string) bool         { return validOption(value, WorkTypes) }
func ValidActionStatus(value string) bool     { return validOption(value, ActionStatuses) }

// CorrectiveAction is one action raised from an assessment.
type CorrectiveAction struct {
	ID           string    `json:"id"`
	AssessmentID string    `json:"assessmentId"`
	Description  string    `json:"description"`
	Owner        string    `json:"owner"`
	DueDate      string    `json:"dueDate"`
	Status       string    `json:"status"`
	ClosedOn     string    `json:"closedOn,omitempty"`
	Evidence     string    `json:"evidence"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Overdue reports whether an open action has passed its due date.
//
// Derived on read rather than stored. A stored overdue flag is wrong from the
// moment the clock passes midnight until something happens to rewrite it.
func (a CorrectiveAction) Overdue(today string) bool {
	return a.Status != "Closed" && a.DueDate < today
}

// ClosedOnTime reports whether the action was closed on or before its due date.
// This is the numerator of OH4.
func (a CorrectiveAction) ClosedOnTime() bool {
	return a.Status == "Closed" && a.ClosedOn != "" && a.ClosedOn <= a.DueDate
}

// ErgonomicAssessment is one workstation assessed on one date.
type ErgonomicAssessment struct {
	ID          string             `json:"id"`
	Period      string             `json:"period"`
	AssessedOn  string             `json:"assessedOn"`
	Workstation string             `json:"workstation"`
	WorkType    string             `json:"workType"`
	Assessor    string             `json:"assessor"`
	Outcome     string             `json:"outcome"`
	Findings    string             `json:"findings"`
	Actions     []CorrectiveAction `json:"actions"`
	RecordedBy  string             `json:"recordedBy"`
	CreatedAt   time.Time          `json:"createdAt"`
}

// Plan is what was scheduled for a month, against which what was done is
// measured. Completeness and compliance are separate figures, per ADR-06.
type Plan struct {
	Period                        string `json:"period"`
	HygieneEventsPlanned          int    `json:"hygieneEventsPlanned"`
	ErgonomicAssessmentsPlanned   int    `json:"ergonomicAssessmentsPlanned"`
	ConfirmedOccupationalDiseases int    `json:"confirmedOccupationalDiseases"`
	RecordedBy                    string `json:"recordedBy"`
}

// PlanRevision is the complete prior plan kept when an officer corrects it.
// The whole row is retained because the two planned counts and the confirmed
// disease judgement can all change the dashboard result.
type PlanRevision struct {
	Period      string          `json:"period"`
	Previous    json.RawMessage `json:"previous"`
	Reason      string          `json:"reason"`
	CorrectedBy string          `json:"correctedBy"`
	CorrectedAt time.Time       `json:"correctedAt"`
}

// --- what the metrics service reads -----------------------------------------

// MonthlyAggregate is the non-clinical summary of one month.
//
// This is the whole of what leaves this service for the metrics service. It
// carries counts, never a location, a workstation, an assessor or a finding -
// a dashboard reports how the department performed, not which bench failed.
type MonthlyAggregate struct {
	Period string `json:"period"`

	// OH3: readings within the limit that governed them, over eligible
	// readings. Both numbers travel, because a percentage with no denominator
	// cannot be told apart from a percentage of three.
	HygieneReadingsEligible int `json:"hygieneReadingsEligible"`
	HygieneReadingsWithin   int `json:"hygieneReadingsWithin"`

	// OH4: corrective actions closed on or before their due date, over actions
	// that fell due in the month.
	ActionsDue          int `json:"actionsDue"`
	ActionsClosedOnTime int `json:"actionsClosedOnTime"`

	// Completeness, reported separately from compliance so that a unit cannot
	// look better by doing less.
	HygieneEventsPlanned        int `json:"hygieneEventsPlanned"`
	HygieneEventsPerformed      int `json:"hygieneEventsPerformed"`
	ErgonomicAssessmentsPlanned int `json:"ergonomicAssessmentsPlanned"`
	ErgonomicAssessmentsDone    int `json:"ergonomicAssessmentsDone"`

	// OH2, as confirmed by an officer. Deciding a case is occupational in
	// origin is a clinical and legal judgement, not something derived here.
	ConfirmedOccupationalDiseases int `json:"confirmedOccupationalDiseases"`

	// Whether a plan was recorded for the month at all.
	//
	// Without this, a month nobody has entered reports nought confirmed
	// diseases, which evaluates against a target of zero as On target, a
	// green tick earned by nobody having done the entry. That is precisely
	// the failure ADR-06 exists to prevent, and the counts above cannot
	// distinguish it on their own.
	PlanRecorded bool `json:"planRecorded"`
}
