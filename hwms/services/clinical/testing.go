package main

import (
	"io"
	"log/slog"
)

// discardLogger is used by tests so that a failing assertion is not buried in
// service log output.
func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}
