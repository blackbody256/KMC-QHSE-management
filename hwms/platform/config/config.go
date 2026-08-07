// Package config loads service configuration from the environment.
//
// Configuration is externalised from the application image, per OPS-03. A
// service reads its configuration once at startup and fails immediately if a
// required value is absent, rather than discovering the gap on first request.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Missing collects absent required keys so that startup can report all of them
// at once. Reporting them one per restart wastes a great deal of time.
type Missing []string

func (m Missing) Err() error {
	if len(m) == 0 {
		return nil
	}
	return fmt.Errorf("required configuration missing: %s", strings.Join(m, ", "))
}

// Loader accumulates missing keys as values are read.
type Loader struct{ missing Missing }

func New() *Loader { return &Loader{} }

// Required returns the value of key, recording it as missing when unset.
func (l *Loader) Required(key string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		l.missing = append(l.missing, key)
	}
	return v
}

// Optional returns the value of key, or fallback when unset.
func (l *Loader) Optional(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

// Duration returns the value of key parsed as a duration, or fallback.
func (l *Loader) Duration(key string, fallback time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		l.missing = append(l.missing, key+" (not a duration, for example 30m)")
		return fallback
	}
	return d
}

// Bool returns the value of key parsed as a boolean, or fallback.
func (l *Loader) Bool(key string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		l.missing = append(l.missing, key+" (not a boolean)")
		return fallback
	}
	return b
}

// Err reports every required key that was absent.
func (l *Loader) Err() error { return l.missing.Err() }
