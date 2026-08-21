package main

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// The indicator arithmetic.
//
// Every rule here was settled with the client on the prototype and is carried
// over unchanged. Three of them are worth stating, because each is a place
// where the obvious implementation gives the wrong answer:
//
// A missing figure is not zero. A month nobody supplied a near-miss count for
// is not a month with no near misses, and a dashboard that shows nought and a
// green tick has said the opposite of the truth (ADR-06).
//
// An incomplete year is not averaged. Averaging January to April and calling it
// the year to date makes a figure that changes every month for reasons that
// have nothing to do with performance.
//
// Reportable near misses are higher-is-better. More reports mean a stronger
// reporting culture, not a less safe factory. It is the indicator most often
// got backwards and it carries its own test.
//
// No target or threshold appears in this file. They are read from the admin
// service, effective-dated, per NFR-DATA-01.

// Status is the four-state evaluation shown against a figure.
type Status string

const (
	StatusWithin      Status = "within"
	StatusApproaching Status = "approaching"
	StatusOutside     Status = "outside"
	StatusNoData      Status = "no-data"
)

// Value is one figure and everything needed to defend it.
type Value struct {
	// The formatted figure, or an empty string where there is none.
	Display string `json:"displayValue"`
	// Nil where there is no figure. Distinct from a figure of zero.
	Numeric      *float64 `json:"numericValue,omitempty"`
	Status       Status   `json:"status"`
	Completeness string   `json:"completeness"`
	// How the figure was arrived at, in words: "196 lost days ÷ 505 employees".
	// Shown beside it, because a number whose derivation is invisible is a
	// number nobody can challenge.
	Calculation string `json:"calculation,omitempty"`
	Note        string `json:"note,omitempty"`
}

// NoData is the absent figure. It is never styled as a failure.
func NoData(note string) Value {
	return Value{Display: "", Status: StatusNoData, Completeness: "no-data", Note: note}
}

// Evaluate decides a figure's status against the target in force.
//
// A nil value is No data, whatever the target says. Where the owner has set no
// approaching band there is no Approaching state for that indicator, rather
// than a band this system invented.
func Evaluate(value *float64, comparison string, target float64, approaching *float64) Status {
	if value == nil {
		return StatusNoData
	}
	v := *value

	switch comparison {
	case "eq":
		if v == target {
			return StatusWithin
		}
		return StatusOutside

	case "gte":
		// Higher is better. Reportable near misses live here: a month below
		// the target is a reporting shortfall, not a safety achievement.
		if v >= target {
			return StatusWithin
		}
		if approaching != nil && v >= *approaching {
			return StatusApproaching
		}
		return StatusOutside

	case "lt":
		if v >= target {
			return StatusOutside
		}
		if approaching != nil && v >= *approaching {
			return StatusApproaching
		}
		return StatusWithin
	}
	return StatusNoData
}

// SafePercent returns a percentage, or nil where there is no denominator.
//
// Nil rather than zero. No eligible readings is not nought per cent compliance;
// it is a month with nothing to report, and the difference is frequently the
// whole finding.
func SafePercent(numerator, denominator int) *float64 {
	if denominator <= 0 {
		return nil
	}
	value := (float64(numerator) / float64(denominator)) * 100
	value = math.Max(0, math.Min(100, value))
	return &value
}

// Rate returns lost days per person, or nil where there is no headcount.
func Rate(numerator float64, denominator int) *float64 {
	if denominator <= 0 || numerator < 0 {
		return nil
	}
	value := numerator / float64(denominator)
	return &value
}

// Format renders a figure the way its indicator is read.
func Format(value float64, format string) string {
	switch format {
	case "integer":
		if value == math.Trunc(value) {
			return strconv.FormatFloat(value, 'f', 0, 64)
		}
		return strconv.FormatFloat(value, 'f', 1, 64)
	case "decimal-1":
		return strconv.FormatFloat(value, 'f', 1, 64)
	case "decimal-2":
		return strconv.FormatFloat(value, 'f', 2, 64)
	case "percent-1":
		return strconv.FormatFloat(value, 'f', 1, 64) + "%"
	}
	return strconv.FormatFloat(value, 'f', 1, 64)
}

// PeriodsToDate lists January through the reporting month.
func PeriodsToDate(period string) []string {
	parts := strings.SplitN(period, "-", 2)
	if len(parts) != 2 {
		return nil
	}
	month, err := strconv.Atoi(parts[1])
	if err != nil || month < 1 || month > 12 {
		return nil
	}
	periods := make([]string, 0, month)
	for i := 1; i <= month; i++ {
		periods = append(periods, fmt.Sprintf("%s-%02d", parts[0], i))
	}
	return periods
}

// cumulativeMetrics are counted across the year rather than averaged.
//
// Four fatalities in a year is four fatalities; it is not "0.33 per month". A
// count of events accumulates and a rate does not, and treating them alike
// produces a year-to-date figure that means nothing for either.
var cumulativeMetrics = map[string]bool{
	"OH2": true, "S1": true, "S2": true, "S3": true, "S4": true,
}

// IsCumulative reports whether an indicator totals across the year.
func IsCumulative(metricID string) bool { return cumulativeMetrics[metricID] }

// IncompleteHistory is the year-to-date cell when a month is missing.
//
// It states how many months are available rather than only that the figure is
// unavailable, so the reader knows whether one month is outstanding or nine.
func IncompleteHistory(available, expected int) Value {
	return Value{
		Display:      "",
		Status:       StatusNoData,
		Completeness: "incomplete",
		Note: fmt.Sprintf(
			"Incomplete history (%d of %d months available). A part-year average would change every month for reasons unrelated to performance, so none is shown.",
			available, expected),
	}
}
