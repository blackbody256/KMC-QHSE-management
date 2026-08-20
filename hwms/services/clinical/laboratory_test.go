package main

import "testing"

// These assert that the catalogue matches KMC.DQHSE.05/26-FM008.
//
// If one fails, either the clinic reissued the form or somebody has added an
// investigation it does not offer. Both are worth stopping a build for: a
// requisition offering a test the laboratory cannot run wastes a patient's
// journey, and one missing a test the clinic does run sends them away with the
// wrong sheet.

func TestCatalogueMatchesTheForm(t *testing.T) {
	want := []string{"BS", "MRDT", "TYPHOID_AG", "HPYLORI_AG", "CBC", "RBS", "FBS"}
	if len(LabTestCatalogue) != len(want) {
		t.Fatalf("the form lists %d investigations, the catalogue has %d", len(want), len(LabTestCatalogue))
	}
	for i, code := range want {
		if LabTestCatalogue[i].Code != code {
			t.Errorf("position %d: expected %s, got %s", i, code, LabTestCatalogue[i].Code)
		}
	}
}

func TestEveryTestBelongsToAPrintedGroup(t *testing.T) {
	known := map[LabTestGroup]bool{}
	for _, group := range LabTestGroupOrder {
		known[group] = true
	}
	for _, test := range LabTestCatalogue {
		if !known[test.Group] {
			t.Errorf("%s is in group %q, which the form does not print", test.Code, test.Group)
		}
	}
}

func TestFastingInstructionSurvives(t *testing.T) {
	// The form prints this against FBS. It is a patient instruction: losing it
	// means somebody fasts unnecessarily, or does not fast when they should.
	for _, test := range LabTestCatalogue {
		if test.Code == "FBS" {
			if test.PreparationNote == "" {
				t.Fatal("FBS must carry the fasting instruction printed on the form")
			}
			return
		}
	}
	t.Fatal("FBS is not in the catalogue")
}

func TestStatusFollowsWhatHasBeenRecorded(t *testing.T) {
	cases := []struct {
		name     string
		tests    []RequestedTest
		specimen []string
		want     string
	}{
		{"nothing recorded", []RequestedTest{{Code: "BS"}}, nil, "requested"},
		{"specimen only", []RequestedTest{{Code: "BS"}}, []string{"Whole Blood"}, "collected"},
		{"a result written", []RequestedTest{{Code: "BS", Result: "No parasites seen"}}, []string{"Whole Blood"}, "resulted"},
		{
			"a result without a recorded specimen still counts as resulted",
			[]RequestedTest{{Code: "BS", Result: "No parasites seen"}}, nil, "resulted",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := DeriveStatus(tc.tests, tc.specimen); got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}

func TestOnlyThePrintedSpecimenTypesAreAccepted(t *testing.T) {
	for _, valid := range []string{"Whole Blood", "Serum/Plasma", "Stool"} {
		if !ValidSpecimenType(valid) {
			t.Errorf("%q is printed on the form and must be accepted", valid)
		}
	}
	for _, invalid := range []string{"Urine", "Swab", "", "whole blood"} {
		if ValidSpecimenType(invalid) {
			t.Errorf("%q is not on the form and must be refused", invalid)
		}
	}
}
