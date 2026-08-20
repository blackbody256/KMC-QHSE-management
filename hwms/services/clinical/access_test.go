package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
)

// This file is the acceptance gate for the rule that only the Health and
// Wellness Officer may retrieve an individual clinical record.
//
// It is written against the router rather than a live database, so it runs on
// every build with no infrastructure. What it proves is that the refusal comes
// before any data access: a handler that reached the store first and checked
// the role afterwards would fail these tests, which is the point.

// clinicalRoutes enumerates every route this service exposes. A route added to
// routes() without being added here is caught by TestEveryRouteIsCovered.
var clinicalRoutes = []struct {
	method string
	path   string
	body   string
}{
	{http.MethodGet, "/api/clinical/sections", ""},
	{http.MethodGet, "/api/clinical/patients", ""},
	{http.MethodPost, "/api/clinical/patients", `{"fullName":"A","age":30,"sex":"Male","category":"Employee"}`},
	{http.MethodGet, "/api/clinical/patients/11111111-1111-1111-1111-111111111111", ""},
	// The consolidated record is the widest clinical read in the system: one
	// call returning a patient, every visit and every requisition. It is
	// covered here first, not last.
	{http.MethodGet, "/api/clinical/patients/11111111-1111-1111-1111-111111111111/record", ""},
	{http.MethodGet, "/api/clinical/visits", ""},
	{http.MethodPost, "/api/clinical/visits", `{"patientId":"x","visitDate":"2026-08-07","visitType":"Walk-in"}`},
	{http.MethodGet, "/api/clinical/visits/11111111-1111-1111-1111-111111111111", ""},
	{http.MethodPut, "/api/clinical/visits/11111111-1111-1111-1111-111111111111/sections/impression", `{"status":"complete","notes":"x"}`},
	{http.MethodPost, "/api/clinical/visits/11111111-1111-1111-1111-111111111111/sign", ""},
	// A laboratory requisition carries the patient's name, staff number,
	// clinical summary and results. It is a clinical record and is covered
	// here like every other one.
	{http.MethodGet, "/api/clinical/lab/catalogue", ""},
	{http.MethodGet, "/api/clinical/lab/requisitions", ""},
	{http.MethodPost, "/api/clinical/lab/requisitions", `{"visitId":"x","patientId":"y","requestDate":"2026-08-07","testCodes":["BS"]}`},
	{http.MethodGet, "/api/clinical/lab/requisitions/11111111-1111-1111-1111-111111111111", ""},
	{http.MethodPut, "/api/clinical/lab/requisitions/11111111-1111-1111-1111-111111111111/results", `{"results":{}}`},
}

// newTestRouter builds the real route tree with a nil store.
//
// A nil store is deliberate. Any request that gets past the role check will
// panic on the nil pointer and surface as a 500, so a 403 is proof that the
// refusal happened before the data layer was touched. A test double that
// returned empty results would let a missing check pass silently.
func newTestRouter() http.Handler {
	svc := &service{log: discardLogger(), store: nil}
	r := chi.NewRouter()
	r.Route("/api/clinical", func(r chi.Router) {
		r.Use(withSubject)
		svc.routes(r)
	})
	return r
}

// withSubject reads the role from a test header and places a subject on the
// context, standing in for token verification.
func withSubject(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := r.Header.Get("X-Test-Role")
		subject := auth.Subject{ID: "test-user", Username: "test@kiiramotors.com"}
		if role != "" {
			subject.Roles = []string{role}
		}
		next.ServeHTTP(w, r.WithContext(auth.WithSubject(r.Context(), subject)))
	})
}

func TestNonOfficerRolesAreRefusedOnEveryClinicalRoute(t *testing.T) {
	router := newTestRouter()

	// Every role in the system except the officer, plus a caller holding no
	// role at all. None of these may reach a clinical record.
	refusedRoles := []string{
		auth.RoleManager,
		auth.RoleDirector,
		"hwms-admin",
		"hwms-dpo",
		"", // no role
	}

	for _, role := range refusedRoles {
		for _, route := range clinicalRoutes {
			name := role + "_" + route.method + "_" + route.path
			if role == "" {
				name = "no-role_" + route.method + "_" + route.path
			}
			t.Run(name, func(t *testing.T) {
				req := httptest.NewRequest(route.method, route.path, strings.NewReader(route.body))
				if route.body != "" {
					req.Header.Set("Content-Type", "application/json")
				}
				if role != "" {
					req.Header.Set("X-Test-Role", role)
				}
				rec := httptest.NewRecorder()

				defer func() {
					// A panic means the handler reached the nil store, which
					// means it did not refuse first.
					if rec := recover(); rec != nil {
						t.Fatalf("handler reached the data layer before checking the role: %v", rec)
					}
				}()

				router.ServeHTTP(rec, req)

				if rec.Code != http.StatusForbidden {
					t.Fatalf("expected 403, got %d — %s", rec.Code, rec.Body.String())
				}
			})
		}
	}
}

func TestRefusalNamesTheRoleThatMayAccess(t *testing.T) {
	router := newTestRouter()
	req := httptest.NewRequest(http.MethodGet, "/api/clinical/patients", nil)
	req.Header.Set("X-Test-Role", auth.RoleManager)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var problem struct {
		Detail string `json:"detail"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &problem); err != nil {
		t.Fatalf("refusal body is not JSON: %v", err)
	}
	// The message states who may do this rather than only that the caller may
	// not, per the copy rules.
	if !strings.Contains(problem.Detail, "Health and Wellness Officer") {
		t.Fatalf("refusal should name the role that may access: %q", problem.Detail)
	}
}

// TestOfficerPassesTheRoleCheck proves the tests above are meaningful. If the
// officer were refused too, they would pass for the wrong reason.
func TestOfficerPassesTheRoleCheck(t *testing.T) {
	router := newTestRouter()

	// /sections touches no data, so the officer reaches a real 200 through the
	// same middleware chain the other tests exercise.
	req := httptest.NewRequest(http.MethodGet, "/api/clinical/sections", nil)
	req.Header.Set("X-Test-Role", auth.RoleOfficer)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("the officer must not be refused: got %d — %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Sections []sectionDescriptor `json:"sections"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not JSON: %v", err)
	}
	if len(body.Sections) != len(SectionCodes) {
		t.Fatalf("expected %d sections, got %d", len(SectionCodes), len(body.Sections))
	}
}

// TestEveryRouteIsCovered walks the real route tree and fails if a route
// exists that the refusal test above does not exercise.
//
// Without this, adding a clinical route silently escapes the access-control
// suite — and the route most likely to be added in a hurry is exactly the one
// that most needs covering.
func TestEveryRouteIsCovered(t *testing.T) {
	svc := &service{log: discardLogger(), store: nil}
	r := chi.NewRouter()
	r.Route("/api/clinical", func(r chi.Router) { svc.routes(r) })

	covered := map[string]bool{}
	for _, route := range clinicalRoutes {
		covered[route.method+" "+route.path] = true
	}

	err := chi.Walk(r, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		// chi reports patterns; match them against the concrete paths above.
		for _, candidate := range clinicalRoutes {
			if candidate.method != method {
				continue
			}
			if patternMatches(route, candidate.path) {
				return nil
			}
		}
		t.Errorf("route %s %s is not covered by the access-control suite; add it to clinicalRoutes", method, route)
		return nil
	})
	if err != nil {
		t.Fatalf("walking routes: %v", err)
	}
	_ = covered
}

// patternMatches reports whether a chi route pattern such as
// /api/clinical/visits/{id}/sign matches a concrete path.
func patternMatches(pattern, path string) bool {
	patternParts := strings.Split(strings.Trim(pattern, "/"), "/")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(patternParts) != len(pathParts) {
		return false
	}
	for i, part := range patternParts {
		if strings.HasPrefix(part, "{") && strings.HasSuffix(part, "}") {
			continue
		}
		if part != pathParts[i] {
			return false
		}
	}
	return true
}
