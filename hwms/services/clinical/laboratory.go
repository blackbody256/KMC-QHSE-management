package main

import "time"

// The investigations printed on KMC.DQHSE.05/26-FM008, exactly as the form
// lists them.
//
// This is the whole catalogue. The clinic offers seven investigations in four
// groups; an earlier draft of this system carried a generic occupational
// health panel — liver function, lipids, audiometry and the rest — and none of
// it appears on the form. Digitise the form, do not improve it.
//
// The catalogue is published by the API so the interface does not keep its own
// copy. Two lists of investigations would eventually disagree, and the one
// that disagreed silently would be the one a clinician ticked.

type LabTestGroup string

const (
	GroupMalaria      LabTestGroup = "Malaria & Parasitology"
	GroupGastro       LabTestGroup = "Gastrointestinal & Serology"
	GroupHematology   LabTestGroup = "Hematology"
	GroupBloodGlucose LabTestGroup = "Blood Glucose Monitoring"
)

// LabTestGroupOrder is the order the groups are numbered on the form.
var LabTestGroupOrder = []LabTestGroup{
	GroupMalaria, GroupGastro, GroupHematology, GroupBloodGlucose,
}

type LabTestDefinition struct {
	Code string `json:"code"`
	// The abbreviation as printed on the form.
	ShortName string `json:"shortName"`
	// The expansion as printed on the form.
	FullName string       `json:"fullName"`
	Group    LabTestGroup `json:"group"`
	// Printed against FBS. A patient instruction, not a footnote.
	PreparationNote string `json:"preparationNote,omitempty"`
}

var LabTestCatalogue = []LabTestDefinition{
	{Code: "BS", ShortName: "B/S", FullName: "Blood Smear for Malaria Parasites", Group: GroupMalaria},
	{Code: "MRDT", ShortName: "mRDT", FullName: "Malaria Rapid Diagnostic Test", Group: GroupMalaria},
	{Code: "TYPHOID_AG", ShortName: "Typhoid Ag", FullName: "Typhoid Antigen Test", Group: GroupGastro},
	{Code: "HPYLORI_AG", ShortName: "Stool Ag H.pylori", FullName: "Helicobacter pylori Stool Antigen", Group: GroupGastro},
	{Code: "CBC", ShortName: "CBC", FullName: "Complete Blood Count", Group: GroupHematology},
	{Code: "RBS", ShortName: "RBS", FullName: "Random Blood Sugar", Group: GroupBloodGlucose},
	{
		Code: "FBS", ShortName: "FBS", FullName: "Fasting Blood Sugar", Group: GroupBloodGlucose,
		PreparationNote: "Requires 8–12 hours of fasting.",
	},
}

// LabSpecimenTypes are the options in the For Laboratory Use Only block.
var LabSpecimenTypes = []string{"Whole Blood", "Serum/Plasma", "Stool"}

func ValidLabTestCode(code string) bool {
	for _, test := range LabTestCatalogue {
		if test.Code == code {
			return true
		}
	}
	return false
}

func ValidSpecimenType(value string) bool {
	for _, specimen := range LabSpecimenTypes {
		if specimen == value {
			return true
		}
	}
	return false
}

// PatientSnapshot is the Patient Information block as printed on the form.
type PatientSnapshot struct {
	FullName      string `json:"fullName"`
	StaffIDNumber string `json:"staffIdNumber"`
	Department    string `json:"department"`
	Gender        string `json:"gender"`
	AgeOrDOB      string `json:"ageOrDob"`
}

// RequestedTest is one requested investigation and the result written against
// it. The result is free text because the form is free text.
type RequestedTest struct {
	Code       string     `json:"code"`
	Result     string     `json:"result"`
	ResultedAt *time.Time `json:"resultedAt,omitempty"`
}

// LabRequisition is one completed form.
//
// Status follows how the paper is handled: the officer authorises it
// (requested), the laboratory records the specimen (collected), then writes
// the results (resulted).
type LabRequisition struct {
	ID                           string          `json:"id"`
	FormNumber                   string          `json:"formNumber"`
	VisitID                      string          `json:"visitId"`
	PatientID                    string          `json:"patientId"`
	Status                       string          `json:"status"`
	Patient                      PatientSnapshot `json:"patientSnapshot"`
	RequestDate                  string          `json:"requestDate"`
	Tests                        []RequestedTest `json:"tests"`
	ClinicalSummary              string          `json:"clinicalSummary"`
	AuthorisedBy                 string          `json:"authorisedBy"`
	AuthorisedSignatureConfirmed bool            `json:"authorisedSignatureConfirmed"`
	SpecimenCollected            []string        `json:"specimenCollected"`
	CollectedBy                  string          `json:"collectedBy,omitempty"`
	TimeOfCollection             string          `json:"timeOfCollection,omitempty"`
	CreatedAt                    time.Time       `json:"createdAt"`
	UpdatedAt                    time.Time       `json:"updatedAt"`
}

// DeriveStatus reports the status implied by what has been recorded, so that
// the lifecycle cannot disagree with the content of the form.
func DeriveStatus(tests []RequestedTest, specimen []string) string {
	for _, test := range tests {
		if test.Result != "" {
			return "resulted"
		}
	}
	if len(specimen) > 0 {
		return "collected"
	}
	return "requested"
}
