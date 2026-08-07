// Package health exposes liveness and readiness endpoints, per OPS-13.
//
// Liveness answers "is this process running". Readiness answers "can it serve
// traffic", which is a different question and depends on whether its
// dependencies are reachable. Conflating them causes an orchestrator to
// restart a healthy service because its database was briefly slow.
package health

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/kiiramotors/hwms/platform/httpx"
)

// Check reports whether a dependency is usable.
type Check func(context.Context) error

// Set holds the readiness checks for a service.
type Set struct {
	mu     sync.RWMutex
	checks map[string]Check
}

func NewSet() *Set { return &Set{checks: map[string]Check{}} }

// Register adds a named readiness check.
func (s *Set) Register(name string, c Check) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.checks[name] = c
}

// Live reports that the process is running.
func (s *Set) Live(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "alive"})
}

// Ready runs every registered check and reports the outcome per dependency.
func (s *Set) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	s.mu.RLock()
	checks := make(map[string]Check, len(s.checks))
	for k, v := range s.checks {
		checks[k] = v
	}
	s.mu.RUnlock()

	results := make(map[string]string, len(checks))
	status := http.StatusOK
	for name, check := range checks {
		if err := check(ctx); err != nil {
			results[name] = "unavailable"
			status = http.StatusServiceUnavailable
			continue
		}
		results[name] = "ok"
	}
	httpx.JSON(w, status, map[string]any{"status": statusWord(status), "checks": results})
}

func statusWord(status int) string {
	if status == http.StatusOK {
		return "ready"
	}
	return "not ready"
}
