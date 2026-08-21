#!/usr/bin/env bash
#
# Phase 0 acceptance checks against a running stack.
#
# These are the criteria from Section 6 of the production build plan that can
# be verified without a browser. The remaining one, that a user signs in
# through Keycloak and lands on a role-appropriate page, needs a person, and
# is listed at the end rather than pretended at here.
#
# Usage: ./deploy/scripts/smoke-test.sh

set -uo pipefail

APP="${APP_BASE_URL:-http://localhost:8090}"
KEYCLOAK="${KEYCLOAK_URL:-http://keycloak:8180}"
REALM="${KEYCLOAK_REALM:-hwms}"

pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  \033[32mpass\033[0m  %s\n' "$name"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m  %s (expected %s, got %s)\n' "$name" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1" 2>/dev/null || echo "000"; }

echo
echo "Checking the stack at ${APP}"
echo

echo "Reachability"
check "application is served"            "200" "$(status "${APP}/")"
check "identity provider realm resolves" "200" "$(status "${KEYCLOAK}/realms/${REALM}/.well-known/openid-configuration")"

echo
echo "Health"
# Deliberately not ${APP}/livez. nginx proxies only /auth and /api, so any
# other path falls through to the single-page application and returns 200 -
# which would pass this check while telling us nothing about the gateway.
# /auth/session is proxied, so reaching it proves the gateway is answering.
# Kubernetes probes hit /livez and /readyz on the pod directly, not through
# this origin.
check "gateway answers through the proxy" "200" "$(status "${APP}/auth/session")"

echo
echo "Access control"
# No session cookie, so the API must refuse. This is the check that matters:
# authorisation is enforced by the services, not by the interface hiding a
# control the caller may not use.
check "accounts API refuses an unauthenticated caller" "401" "$(status "${APP}/api/identity/users")"

anonymous="$(curl -s --max-time 10 "${APP}/auth/session" 2>/dev/null)"
case "$anonymous" in
  *'"authenticated":false'*)
    printf '  \033[32mpass\033[0m  %s\n' "session endpoint returns authenticated:false"; pass=$((pass + 1)) ;;
  *)
    printf '  \033[31mFAIL\033[0m  %s (got: %s)\n' "session endpoint returns authenticated:false" "$anonymous"; fail=$((fail + 1)) ;;
esac

echo
echo "Observability"
check "prometheus is scraping"  "200" "$(status "http://localhost:9090/-/ready")"
check "grafana is up"           "200" "$(status "http://localhost:3001/api/health")"

echo
printf 'passed %d, failed %d\n\n' "$pass" "$fail"

cat <<'EOF'
Still to check by hand, because they need a person:

  1. Seed the manager, sign in, and confirm the password change is demanded.
  2. Confirm the manager lands on the dashboard and sees Accounts in the rail.
  3. Create an officer and a director account.
  4. Sign in as the director; confirm the rail shows only Dashboard, and that
     opening /accounts directly gives the explanatory refusal rather than the
     page.
  5. Sign in as the officer; confirm the landing page is Occupational health,
     not the dashboard.
  6. Apply filter: grayscale(100%) in the browser and confirm every status is
     still unambiguous.

EOF

[ "$fail" -eq 0 ]
