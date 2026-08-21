package main

import (
	"regexp"
	"sort"
	"strings"
	"testing"
)

// TestTheLeaveContributionCarriesNothingClinical mirrors the sending-side
// contract in the clinical service. Both schemas must reject an accidental
// widening of the boundary during an ordinary test run.
func TestTheLeaveContributionCarriesNothingClinical(t *testing.T) {
	permitted := []string{
		"referral_id",
		"feedback_version",
		"period",
		"days",
		"superseded",
		"received_at",
	}

	got := migrationColumnsOf(t, "referral_leave_contribution")
	sort.Strings(got)
	want := append([]string{}, permitted...)
	sort.Strings(want)

	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf(
			"the metrics leave contribution column set has changed.\n  expected: %v\n  found:    %v\n\n"+
				"This table is the receiving side of a deliberately non-clinical boundary.\n"+
				"Metrics has no clinical database credential, and this table must never gain\n"+
				"a patient identity, diagnosis or free clinical text. A genuinely needed\n"+
				"non-clinical fact must be agreed on both sides and added deliberately.",
			want, got,
		)
	}
}

// migrationColumnsOf parses the embedded migration so the boundary is checked
// without granting the ordinary test suite access to a database.
func migrationColumnsOf(t *testing.T, table string) []string {
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
