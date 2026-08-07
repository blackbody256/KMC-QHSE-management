package main

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/kiiramotors/hwms/platform/httpx"
)

// proxyTo forwards an API call to an internal service, attaching the session's
// access token.
//
// The browser never holds a token, so every authenticated API call must pass
// through here. That is the point: it gives the system one place where an
// outbound call can be inspected, and it means a compromised page script
// cannot call a service directly.
func (g *gateway) proxyTo(target *url.URL, prefix string) http.Handler {
	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.Out.Host = target.Host
			pr.SetXForwarded()
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			g.log.Error("upstream unavailable",
				slog.String("request_id", httpx.RequestIDFrom(r.Context())),
				slog.String("upstream", target.String()),
				slog.String("error", err.Error()),
			)
			httpx.Problem(w, http.StatusBadGateway,
				"That service is not responding. Try again shortly, and report the request identifier if it continues.")
		},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, id, ok := g.currentSession(r)
		if !ok {
			httpx.Problem(w, http.StatusUnauthorized, "Sign in to continue.")
			return
		}
		g.sessions.touch(id)

		token, err := g.accessToken(r, sess)
		if err != nil {
			g.log.Warn("token refresh failed",
				slog.String("username", sess.Subject.Username),
				slog.String("error", err.Error()),
			)
			g.sessions.delete(id)
			g.clearCookie(w, sessionCookie)
			httpx.Problem(w, http.StatusUnauthorized, "The session has expired. Sign in again.")
			return
		}

		outbound := r.Clone(r.Context())
		outbound.Header.Set("Authorization", "Bearer "+token)
		outbound.Header.Set("X-Request-Id", httpx.RequestIDFrom(r.Context()))

		// Strip cookies before the request leaves the edge. An internal
		// service has no business seeing the browser's session cookie, and
		// forwarding it invites someone to start trusting it.
		outbound.Header.Del("Cookie")

		if !strings.HasPrefix(outbound.URL.Path, prefix) {
			httpx.Problem(w, http.StatusNotFound, "That address does not exist.")
			return
		}

		proxy.ServeHTTP(w, outbound)
	})
}
