// Package httpx holds the HTTP middleware and response helpers shared by every
// service. A service that reimplements any of this has diverged and should be
// brought back, per Section 1.5 of the production build plan.
package httpx

import (
	"context"
	"encoding/json"
	"github.com/go-chi/chi/v5"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/google/uuid"
)

type ctxKey string

const requestIDKey ctxKey = "request_id"

// RequestID attaches a request identifier to the context and the response, so
// that a log line, a trace and a user-reported failure can be joined up.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = uuid.NewString()
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
	})
}

// RequestIDFrom returns the request identifier carried on the context.
func RequestIDFrom(ctx context.Context) string {
	if v, ok := ctx.Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// Recoverer converts a panic into a 500 rather than a dropped connection, and
// records the stack. The stack is logged; it is never sent to the client.
func Recoverer(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					// The route template, never the path. A panic on
					// /api/clinical/patients/{id}/record would otherwise put a
					// patient identifier into the one log line most likely to
					// be copied into a ticket and mailed around.
					route := "unmatched"
					if ctx := chi.RouteContext(r.Context()); ctx != nil && ctx.RoutePattern() != "" {
						route = ctx.RoutePattern()
					}
					log.Error("panic recovered",
						slog.String("request_id", RequestIDFrom(r.Context())),
						slog.String("route", route),
						slog.Any("panic", rec),
						slog.String("stack", string(debug.Stack())),
					)
					Problem(w, http.StatusInternalServerError,
						"The request could not be completed. Try again, and report the request identifier if it recurs.")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// RequestLogger records method, route, status and duration.
//
// The route template is logged, never the concrete path. On a clinical route
// the path itself is the disclosure: /api/clinical/patients/{id}/record names a
// patient, and a log line naming a patient is a clinical record held outside
// the clinical access ledger and outside the controls that ledger has. Logged
// as the template, the same request reads as
// /api/clinical/patients/{id}/record and says only that somebody opened a
// record, which is what a service log is for. Who opened whose record is the
// ledger's question, and the ledger is where it is answerable.
//
// Query strings and bodies are recorded nowhere, for the same reason.
func RequestLogger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(sw, r)

			// The pattern is only known after routing, so it is read here
			// rather than before the handler runs. A request that matched no
			// route has no pattern, and its path is not logged either, an
			// unmatched path is just as capable of carrying an identifier.
			route := "unmatched"
			if ctx := chi.RouteContext(r.Context()); ctx != nil && ctx.RoutePattern() != "" {
				route = ctx.RoutePattern()
			}

			log.Info("request",
				slog.String("request_id", RequestIDFrom(r.Context())),
				slog.String("method", r.Method),
				slog.String("route", route),
				slog.Int("status", sw.status),
				slog.Duration("duration", time.Since(start)),
			)
		})
	}
}

// JSON writes v as a JSON response with the given status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// ProblemBody is the error shape every service returns.
type ProblemBody struct {
	Status int    `json:"status"`
	Detail string `json:"detail"`
}

// Problem writes an error response.
//
// The detail states the corrective action rather than the failure, per
// NFR-USE-03. "Enter a value between 30 and 250", not "Invalid input".
func Problem(w http.ResponseWriter, status int, detail string) {
	JSON(w, status, ProblemBody{Status: status, Detail: detail})
}

// DecodeJSON reads a JSON body with a size limit.
func DecodeJSON(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
