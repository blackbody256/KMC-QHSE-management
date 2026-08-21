#!/usr/bin/env bash
#
# Point an existing realm at the KMC login theme.
#
# realm-hwms.json already carries "loginTheme": "kmc", so a realm imported from
# scratch needs nothing from this script. But Keycloak's --import-realm skips a
# realm that already exists, and it does not merge changes into one. On a stack
# that has been running since before the theme was added, the realm therefore
# still points at the stock login pages.
#
# The alternative is "make clean", which destroys the realm, every account and
# every clinical record to change one setting. This exists so that is not the
# only route.
#
# Usage:
#   ./deploy/scripts/apply-login-theme.sh
#
# Environment:
#   KEYCLOAK_URL             default http://localhost:8180
#   KEYCLOAK_REALM           default hwms
#   KEYCLOAK_ADMIN           default admin
#   KEYCLOAK_ADMIN_PASSWORD  prompted when unset
#   LOGIN_THEME              default kmc

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-hwms}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
LOGIN_THEME="${LOGIN_THEME:-kmc}"

die() { printf '\nError: %s\n' "$1" >&2; exit 1; }

command -v curl >/dev/null || die "curl is required."
command -v jq   >/dev/null || die "jq is required. Install it with: sudo apt install jq"

printf 'Setting the login theme of realm "%s" to "%s" at %s\n\n' \
  "$KEYCLOAK_REALM" "$LOGIN_THEME" "$KEYCLOAK_URL"

if [ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]; then
  echo "This is the Keycloak administrator password."
  if [ -f .env ]; then
    echo "It is KEYCLOAK_ADMIN_PASSWORD in your .env file."
  else
    echo "You have no .env file, so it is the docker-compose.yml default:"
    echo "  admin-development-password"
  fi
  read -rsp "Keycloak admin password for user '${KEYCLOAK_ADMIN}': " KEYCLOAK_ADMIN_PASSWORD
  printf '\n\n'
fi

TOKEN="$(curl -sS --fail-with-body \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  | jq -r '.access_token')" || die "Keycloak refused that administrator password."

[ "$TOKEN" != "null" ] && [ -n "$TOKEN" ] || die "Keycloak returned no access token."

api() { curl -sS --fail-with-body -H "Authorization: Bearer ${TOKEN}" "$@"; }

# The realm update is a full representation, so read the current one and change
# the single field. Sending a hand-built object would silently reset the
# password policy, the brute-force settings and the session timeouts.
CURRENT="$(api "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}")" \
  || die "Realm ${KEYCLOAK_REALM} could not be read. Is the stack running?"

api -X PUT -H "Content-Type: application/json" \
  -d "$(jq --arg t "$LOGIN_THEME" '.loginTheme = $t' <<<"$CURRENT")" \
  "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" >/dev/null \
  || die "The login theme could not be set. Check that the theme directory is mounted into the Keycloak container."

APPLIED="$(api "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" | jq -r '.loginTheme // "not set"')"
[ "$APPLIED" = "$LOGIN_THEME" ] \
  || die "Keycloak accepted the update but the theme reads back as '${APPLIED}'."

cat <<EOF
Login theme set to "${LOGIN_THEME}".

Sign out and sign in again to see it. The stack runs Keycloak in start-dev,
which disables theme caching, so later edits to the theme files show on a
refresh without restarting the container.
EOF
