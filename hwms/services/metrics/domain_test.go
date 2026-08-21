package main

import "testing"

func ptr(v float64) *float64 { return &v }

// TestNearMissesAreHigherIsBetter is the test this file exists for.
//
// Reportable near misses are the one indicator on this dashboard where a lower
// number is worse. More reports mean people are reporting, which is what a
// safety culture looks like; fewer mean they have stopped, which is what the
// month before an accident looks like.
//
// It is also the indicator most likely to be got backwards by someone adding a
// feature in a hurry, and getting it backwards would show a green tick against
// exactly the month that needed attention.
func TestNearMissesAreHigherIsBetter(t *testing.T) {
	// The target as the client's KPI graphic states it: at least 200.
	const target = 200
	approaching := ptr(180.0)

	cases := []struct {
		name  string
		value float64
		want  Status
	}{
		{"at the target is on target", 200, StatusWithin},
		{"above the target is on target", 214, StatusWithin},
		{"just below is approaching, not a breach", 185, StatusApproaching},
		{"well below is off target", 40, StatusOutside},
		// The assertion that catches a reversed comparison. Under a
		// lower-is-better reading this would be the best month of the year.
		{"none reported at all is the worst case, not the best", 0, StatusOutside},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Evaluate(&tc.value, "gte", target, approaching)
			if got != tc.want {
				t.Fatalf("%d near misses against a target of %d: expected %s, got %s",
					int(tc.value), target, tc.want, got)
			}
		})
	}
}

func TestLowerIsBetterIndicators(t *testing.T) {
	// Health-related absenteeism: under 0.5 days per person.
	approaching := ptr(0.45)
	cases := []struct {
		value float64
		want  Status
	}{
		{0.32, StatusWithin},
		{0.47, StatusApproaching},
		{0.50, StatusOutside},
		{0.88, StatusOutside},
	}
	for _, tc := range cases {
		if got := Evaluate(&tc.value, "lt", 0.5, approaching); got != tc.want {
			t.Errorf("%.2f days per person: expected %s, got %s", tc.value, tc.want, got)
		}
	}

	// Fatalities: exactly zero, with no approaching band. There is no
	// "nearly no fatalities".
	zero, one := 0.0, 1.0
	if got := Evaluate(&zero, "eq", 0, nil); got != StatusWithin {
		t.Errorf("no fatalities must be on target, got %s", got)
	}
	if got := Evaluate(&one, "eq", 0, nil); got != StatusOutside {
		t.Errorf("one fatality must be off target, got %s", got)
	}
}

// TestAMissingFigureIsNeverZero pins ADR-06.
//
// A month nobody supplied a near-miss count for is not a month with no near
// misses. Merging the two produces exactly the wrong management response: a
// green tick against a month where nothing was reported at all.
func TestAMissingFigureIsNeverZero(t *testing.T) {
	if got := Evaluate(nil, "eq", 0, nil); got != StatusNoData {
		t.Fatalf("a missing figure must be No data even against a target of zero, got %s", got)
	}
	if got := Evaluate(nil, "gte", 200, ptr(180)); got != StatusNoData {
		t.Fatalf("a missing figure must be No data, got %s", got)
	}

	value := NoData("nothing recorded")
	if value.Display != "" {
		t.Errorf("No data renders as an em dash in the interface, not as a value: got %q", value.Display)
	}
	if value.Numeric != nil {
		t.Error("No data must carry no numeric value, or something will sum it")
	}
}

// TestNoApproachingBandMeansNoApproachingState.
//
// Where an owner has set no band, the indicator has two states and not three.
// Inventing a band would put a judgement in the software's mouth that nobody
// at KMC has made.
func TestNoApproachingBandMeansNoApproachingState(t *testing.T) {
	value := 150.0
	if got := Evaluate(&value, "gte", 200, nil); got != StatusOutside {
		t.Fatalf("with no band set the only states are on and off target, got %s", got)
	}
}

// TestNoDenominatorIsNoDataRatherThanZeroPerCent.
//
// A month with no eligible readings has not achieved nought per cent
// compliance; it has nothing to report. Returning zero would put a red cross
// against a month in which nothing went wrong.
func TestNoDenominatorIsNoDataRatherThanZeroPerCent(t *testing.T) {
	if got := SafePercent(0, 0); got != nil {
		t.Fatalf("no eligible readings must yield no figure, got %v", *got)
	}
	if got := SafePercent(3, 0); got != nil {
		t.Fatalf("a numerator with no denominator must yield no figure, got %v", *got)
	}
	if got := Rate(196, 0); got != nil {
		t.Fatalf("lost days with no headcount must yield no figure, got %v", *got)
	}

	got := SafePercent(37, 40)
	if got == nil || Format(*got, "percent-1") != "92.5%" {
		t.Fatalf("37 of 40 should read 92.5%%, got %v", got)
	}
}

func TestPeriodsToDateCoversJanuaryToTheReportingMonth(t *testing.T) {
	periods := PeriodsToDate("2026-07")
	if len(periods) != 7 {
		t.Fatalf("July is the seventh month, so seven periods are expected; got %d", len(periods))
	}
	if periods[0] != "2026-01" || periods[6] != "2026-07" {
		t.Fatalf("expected 2026-01 through 2026-07, got %v", periods)
	}
	if PeriodsToDate("not-a-month") != nil {
		t.Error("an unparseable period must yield nothing rather than a guess")
	}
}

// TestIncompleteHistoryIsNeverAveraged pins the second half of ADR-06.
//
// A part-year average changes every month for reasons that have nothing to do
// with performance, and a reader comparing two such figures is comparing
// nothing. The cell says how many months are available so the reader knows
// whether one month is outstanding or nine.
func TestIncompleteHistoryIsNeverAveraged(t *testing.T) {
	value := IncompleteHistory(4, 7)
	if value.Numeric != nil || value.Display != "" {
		t.Fatal("an incomplete year must produce no figure at all")
	}
	if value.Completeness != "incomplete" {
		t.Errorf("expected completeness 'incomplete', got %q", value.Completeness)
	}
	if value.Status != StatusNoData {
		t.Errorf("an incomplete history is No data, not a failure: got %s", value.Status)
	}
	// The count is in the note, so the reader can tell one missing month from
	// six without opening anything else.
	if !contains(value.Note, "4 of 7") {
		t.Errorf("the note must say how many months are available; got %q", value.Note)
	}
}

// TestCountsAccumulateAndRatesDoNot.
//
// Four fatalities in a year is four fatalities, not "0.33 per month". A count
// of events accumulates across the year and a rate does not, and treating them
// alike produces a year-to-date figure that means nothing for either.
func TestCountsAccumulateAndRatesDoNot(t *testing.T) {
	for _, metricID := range []string{"OH2", "S1", "S2", "S3", "S4"} {
		if !IsCumulative(metricID) {
			t.Errorf("%s counts events and must total across the year", metricID)
		}
	}
	for _, metricID := range []string{"OH1", "OH3", "OH4", "S5"} {
		if IsCumulative(metricID) {
			t.Errorf("%s is a rate and must not be totalled across the year", metricID)
		}
	}
}

func TestFormatting(t *testing.T) {
	cases := []struct {
		value  float64
		format string
		want   string
	}{
		{214, "integer", "214"},
		{0, "integer", "0"},
		{92.5, "percent-1", "92.5%"},
		{0.39, "decimal-2", "0.39"},
		{0.4, "decimal-1", "0.4"},
	}
	for _, tc := range cases {
		if got := Format(tc.value, tc.format); got != tc.want {
			t.Errorf("Format(%v, %q) = %q, want %q", tc.value, tc.format, got, tc.want)
		}
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0
}

func indexOf(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}
