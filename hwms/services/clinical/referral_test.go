package main

import (
	"regexp"
	"sort"
	"strings"
	"testing"
)

// TestTheLifecycleMovesForwardOneStageAtATime pins FR-REF-06.
//
// The referral's states are not labels on a record; they are the position of a
// piece of paper. Authorised means two people signed it. Issued means it left
// the clinic. A transition that skipped a stage would assert something about
// the physical world that did not happen.
func TestTheLifecycleMovesForwardOneStageAtATime(t *testing.T) {
	allowed := [][2]string{
		{ReferralDrafted, ReferralAuthorised},
		{ReferralAuthorised, ReferralIssued},
		{ReferralIssued, ReferralReturned},
		{ReferralReturned, ReferralReviewed},
	}
	for _, pair := range allowed {
		if !ValidTransition(pair[0], pair[1]) {
			t.Errorf("%s must be able to become %s", pair[0], pair[1])
		}
	}
}

func TestTheLifecycleRefusesToSkipOrReverse(t *testing.T) {
	refused := [][2]string{
		// Skipping. Issuing a referral nobody authorised, or recording a
		// facility's feedback on one that was never sent.
		{ReferralDrafted, ReferralIssued},
		{ReferralDrafted, ReferralReturned},
		{ReferralAuthorised, ReferralReturned},
		{ReferralIssued, ReferralReviewed},

		// Reversing. Once the letter has gone to the facility, amending the
		// copy held here would leave the two disagreeing with no record that
		// they ever did. A referral raised in error is superseded, not rewound.
		{ReferralIssued, ReferralAuthorised},
		{ReferralAuthorised, ReferralDrafted},
		{ReferralReviewed, ReferralReturned},

		// The end of the lifecycle is the end of it.
		{ReferralReviewed, ReferralIssued},
	}
	for _, pair := range refused {
		if ValidTransition(pair[0], pair[1]) {
			t.Errorf("%s must not be able to become %s", pair[0], pair[1])
		}
	}
}

func TestAReviewedReferralOffersNoFurtherStage(t *testing.T) {
	if next := NextStates(ReferralReviewed); len(next) != 0 {
		t.Fatalf("a reviewed referral is closed, but it offers %v", next)
	}
	// Non-nil, so the interface renders an empty list of actions rather than
	// receiving a JSON null and having to guard against it.
	if NextStates("something-else") == nil {
		t.Fatal("NextStates must return an empty slice rather than nil")
	}
}

// TestLeaveIsAttributedToTheMonthItBeganIn pins the rule in LeavePeriod.
//
// Leave that straddles a month end belongs whole to the month it started. The
// alternative, attributing it to the month the letter arrived, moves the same
// absence between reporting months depending on the post, which is the kind of
// figure nobody can reconcile afterwards.
func TestLeaveIsAttributedToTheMonthItBeganIn(t *testing.T) {
	cases := []struct {
		name         string
		feedback     ReferralFeedback
		referralDate string
		want         string
	}{
		{
			"the first day of leave decides the month",
			ReferralFeedback{SickLeaveFrom: "2026-07-30", SickLeaveTo: "2026-08-04", Date: "2026-08-05"},
			"2026-07-29",
			"2026-07",
		},
		{
			"no leave range falls back to the date of the feedback",
			ReferralFeedback{Date: "2026-08-05"},
			"2026-07-29",
			"2026-08",
		},
		{
			"neither falls back to the date of the referral",
			ReferralFeedback{},
			"2026-07-29",
			"2026-07",
		},
		{
			"nothing at all yields no period rather than a guess",
			ReferralFeedback{},
			"",
			"",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := LeavePeriod(tc.feedback, tc.referralDate); got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

// TestTheLeaveOutboxCarriesNothingClinical is the contract test for the
// clinical event boundary in Section 2.1 of the build plan.
//
// referral_leave_outbox is read by the metrics service, which holds no clinical
// credentials and must never receive clinical content. The guarantee is only
// worth anything if it survives the next person adding "just the patient name,
// to make the figure easier to check". This test fails the build if a column
// outside the agreed set appears.
func TestTheLeaveOutboxCarriesNothingClinical(t *testing.T) {
	permitted := []string{
		"outbox_id",
		"referral_id",
		"feedback_version",
		"period",
		"days",
		"superseded",
		"published_at",
		"created_at",
	}

	got := columnsOf(t, "referral_leave_outbox")
	sort.Strings(got)
	want := append([]string{}, permitted...)
	sort.Strings(want)

	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf(
			"the leave outbox column set has changed.\n  expected: %v\n  found:    %v\n\n"+
				"This table is read by the metrics service, which has no clinical database\n"+
				"credentials and must never receive clinical content. If a column is genuinely\n"+
				"needed, it must be a non-clinical fact and this list must be updated with it\n"+
				"deliberately.",
			want, got,
		)
	}
}

// columnsOf reads a table's column names out of the embedded migrations.
//
// Reading the migration rather than a live database keeps this test in the
// ordinary build, with no infrastructure. It is a coarse parse and it only has
// to hold for the tables written by this project.
func columnsOf(t *testing.T, table string) []string {
	t.Helper()

	entries, err := migrations.ReadDir("migrations")
	if err != nil {
		t.Fatalf("reading migrations: %v", err)
	}

	constraintOrIndex := regexp.MustCompile(`^(constraint|primary|unique|check|foreign|create|comment)\b`)

	for _, entry := range entries {
		body, err := migrations.ReadFile("migrations/" + entry.Name())
		if err != nil {
			t.Fatalf("reading %s: %v", entry.Name(), err)
		}
		text := string(body)

		marker := "create table if not exists " + table + " ("
		start := strings.Index(text, marker)
		if start < 0 {
			continue
		}
		body = body[start+len(marker):]

		end := strings.Index(string(body), "\n);")
		if end < 0 {
			t.Fatalf("could not find the end of the %s definition", table)
		}

		var columns []string
		for _, line := range strings.Split(string(body[:end]), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "--") {
				continue
			}
			if constraintOrIndex.MatchString(strings.ToLower(line)) {
				continue
			}
			name := strings.Fields(line)[0]
			columns = append(columns, strings.TrimSuffix(name, ","))
		}
		return columns
	}

	t.Fatalf("no migration defines a table called %s", table)
	return nil
}

// TestTheFormsPrintedDefectsAreReproduced pins FR-REF-09 and DEC-025.
//
// The client's form labels two sections "E" and has no Section D. Renumbering
// them here would put this system out of step with the controlled document, so
// a clinician comparing screen against paper would find the sections do not
// correspond. The defect is reproduced and flagged until Document Control
// authorises a corrected form.
func TestTheFormsPrintedDefectsAreReproduced(t *testing.T) {
	labels := map[string]int{}
	for _, section := range ReferralSections {
		labels[section.Label]++
	}

	if labels["Section E"] != 2 {
		t.Errorf("the printed form has two sections labelled E; found %d", labels["Section E"])
	}
	if labels["Section D"] != 0 {
		t.Error("the printed form has no Section D, and this system must not invent one")
	}

	// Reproducing a defect silently is no better than correcting it silently.
	// Each duplicate must say so on the screen.
	for _, section := range ReferralSections {
		if section.Label == "Section E" && section.Defect == "" {
			t.Errorf("the duplicate label on %q must be flagged, not just reproduced", section.Title)
		}
	}
}

// TestThePrintedRoleWordingIsRetained pins DEC-026. KMC renamed this role, but
// the form is the client's controlled document and not this project's to edit.
func TestThePrintedRoleWordingIsRetained(t *testing.T) {
	if ClearancePrintedPosition != "KMC Infirmary Officer" {
		t.Fatalf(
			"Section B prints %q. It was changed to %q, but the form is KMC's controlled\n"+
				"document, and DEC-026 is open. Change the form first, then this constant.",
			"KMC Infirmary Officer", ClearancePrintedPosition,
		)
	}
}

// TestOnlyOptionsPrintedOnTheFormAreAccepted guards the three catalogues.
func TestOnlyOptionsPrintedOnTheFormAreAccepted(t *testing.T) {
	if !ValidPastMedicalHistory("HIV") || !ValidPastMedicalHistory("Mental health condition") {
		t.Error("HIV and mental health condition are printed on the form and must be accepted")
	}
	for _, invalid := range []string{"Cancer", "", "hiv"} {
		if ValidPastMedicalHistory(invalid) {
			t.Errorf("%q is not on the form and must be refused", invalid)
		}
	}

	// The visit record says Unsure; this form says Suspected. They are not
	// merged, because each follows its own printed form.
	if !ValidWorkRelated("Suspected") {
		t.Error("this form prints Suspected and must accept it")
	}
	if ValidWorkRelated("Unsure") {
		t.Error("Unsure belongs to the visit record, not to this form")
	}
}
