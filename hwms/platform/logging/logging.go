// Package logging provides the structured logger every service uses.
//
// One rule governs this package and it is not stylistic. No clinical content
// may reach a log line: no patient identifier, no name, no diagnosis, no free
// text from a clinical field, and no request or response body from a clinical
// route. See OPS-14 and Section 4.2 of the production build plan.
//
// The logger therefore takes named fields only. Passing a domain struct and
// letting the handler serialise it is the failure mode this package exists to
// prevent, so do not add a convenience that accepts one.
package logging

import (
	"log/slog"
	"os"
	"strings"
)

// New returns a JSON logger at the given level, tagged with the service name.
func New(service, level string) *slog.Logger {
	var lv slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lv = slog.LevelDebug
	case "warn":
		lv = slog.LevelWarn
	case "error":
		lv = slog.LevelError
	default:
		lv = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lv})
	return slog.New(handler).With(slog.String("service", service))
}

// Redacted is the value substituted for anything that must never be logged.
// Use it when a field has to appear structurally but its content must not.
const Redacted = "[redacted]"
