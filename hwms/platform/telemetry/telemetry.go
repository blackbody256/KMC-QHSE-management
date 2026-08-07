// Package telemetry exposes Prometheus metrics for Grafana.
//
// Route templates are used as label values, never concrete paths. A label
// carrying a patient or encounter identifier would both leak and destroy
// Prometheus through unbounded cardinality, which is why the two rules point
// the same way here. See Section 4.2 of the production build plan.
package telemetry

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds the standard request instruments every service reports.
type Metrics struct {
	registry *prometheus.Registry
	requests *prometheus.CounterVec
	duration *prometheus.HistogramVec
	inFlight prometheus.Gauge
}

// New builds a registry carrying process, Go runtime and HTTP instruments.
func New(service string) *Metrics {
	reg := prometheus.NewRegistry()
	labels := prometheus.Labels{"service": service}

	m := &Metrics{
		registry: reg,
		requests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name:        "hwms_http_requests_total",
			Help:        "HTTP requests by route template, method and status.",
			ConstLabels: labels,
		}, []string{"route", "method", "status"}),
		duration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:        "hwms_http_request_duration_seconds",
			Help:        "HTTP request duration by route template.",
			Buckets:     []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
			ConstLabels: labels,
		}, []string{"route", "method"}),
		inFlight: prometheus.NewGauge(prometheus.GaugeOpts{
			Name:        "hwms_http_requests_in_flight",
			Help:        "HTTP requests currently being served.",
			ConstLabels: labels,
		}),
	}

	reg.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		m.requests, m.duration, m.inFlight,
	)
	return m
}

// Handler serves the metrics endpoint.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

// Registry exposes the registry so a service can add its own instruments.
func (m *Metrics) Registry() *prometheus.Registry { return m.registry }

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (w *statusRecorder) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// Middleware records request count and duration against the chi route
// template, so that /api/identity/users/{id} is one label rather than one per
// user.
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		m.inFlight.Inc()
		defer m.inFlight.Dec()

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		route := "unmatched"
		if ctx := chi.RouteContext(r.Context()); ctx != nil && ctx.RoutePattern() != "" {
			route = ctx.RoutePattern()
		}
		m.requests.WithLabelValues(route, r.Method, strconv.Itoa(rec.status)).Inc()
		m.duration.WithLabelValues(route, r.Method).Observe(time.Since(start).Seconds())
	})
}
