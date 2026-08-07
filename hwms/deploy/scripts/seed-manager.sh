#!/usr/bin/env bash
#
# Seed the first manager account.
#
# The manager is the only account created outside the application. Everything
# else — Health and Wellness Officers and Directors — is created by the manager
# through the Accounts screen, so that account creation is an audited action
# inside the system rather than a shell command nobody has a record of.
#
# This script is run by the person who owns the deployment. It never stores the
# password it sets: the password is read without echo, sent once to Keycloak,
# and marked temporary so the manager must change it at first sign-in.
#
# Usage:
#   ./deploy/scripts/seed-manager.sh
#
# Environment:
#   KEYCLOAK_URL             default http://localhost:8180
#   KEYCLOAK_REALM           default hwms
#   KEYCLOAK_ADMIN           default admin
#   KEYCLOAK_ADMIN_PASSWORD  prompted when unset

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-hwms}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"

die() { printf '\nError: %s\n' "$1" >&2; exit 1; }

command -v curl >/dev/null || die "curl is required."
command -v jq   >/dev/null || die "jq is required. Install it with: sudo apt install jq"

printf 'Seeding the manager account for realm "%s" at %s\n\n' "$KEYCLOAK_REALM" "$KEYCLOAK_URL"

if [ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]; then
  # This is the Keycloak administrator, not the manager account being created.
  # Two passwords are asked for in this script and confusing them is the most
  # likely way it fails, so name the source of this one.
  echo "This is the Keycloak administrator password, not the manager's."
  if [ -f .env ]; then
    echo "It is KEYCLOAK_ADMIN_PASSWORD in your .env file."
  else
    echo "You have no .env file, so it is the docker-compose.yml default:"
    echo "  admin-development-password"
  fi
  read -rsp "Keycloak admin password for user '${KEYCLOAK_ADMIN}': " KEYCLOAK_ADMIN_PASSWORD
  printf '\n\n'
fi

read -rp  "Manager first name: " FIRST_NAME
read -rp  "Manager last name: "  LAST_NAME
read -rp  "Manager email address (this becomes the sign-in name): " EMAIL
read -rsp "Temporary password (at least 12 characters, one digit): " PASSWORD; printf '\n'
read -rsp "Confirm temporary password: " PASSWORD_CONFIRM; printf '\n\n'

[ -n "$FIRST_NAME" ] && [ -n "$LAST_NAME" ] || die "Enter both a first name and a last name."
[ -n "$EMAIL" ] || die "Enter an email address."
[ "$PASSWORD" = "$PASSWORD_CONFIRM" ] || die "The two passwords do not match."
[ "${#PASSWORD}" -ge 12 ] || die "Enter a password of at least 12 characters."

# --- obtain an administration token ---------------------------------------
TOKEN="$(curl -sS --fail-with-body \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  | jq -r '.access_token')" || die "Keycloak refused that administrator password. Without a .env file it is 'admin-development-password'; with one it is KEYCLOAK_ADMIN_PASSWORD. Note this is the administrator password, not the manager password you are setting."

[ "$TOKEN" != "null" ] && [ -n "$TOKEN" ] || die "Keycloak returned no access token."

api() { curl -sS --fail-with-body -H "Authorization: Bearer ${TOKEN}" "$@"; }

# --- refuse to run twice ---------------------------------------------------
EXISTING="$(api -G --data-urlencode "username=${EMAIL}" --data-urlencode "exact=true" \
  "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users" | jq 'length')"
if [ "$EXISTING" != "0" ]; then
  die "An account already exists for ${EMAIL}. Use a different address, or remove that account in the Keycloak console first."
fi

# --- create the account ----------------------------------------------------
api -X POST -H "Content-Type: application/json" \
  -d "$(jq -n \
        --arg u "$EMAIL" --arg e "$EMAIL" \
        --arg f "$FIRST_NAME" --arg l "$LAST_NAME" --arg p "$PASSWORD" \
        '{username:$u, email:$e, firstName:$f, lastName:$l, enabled:true, emailVerified:false,
          credentials:[{type:"password", value:$p, temporary:true}]}')" \
  "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users" >/dev/null \
  || die "The account could not be created. Check the realm name and the password policy."

unset PASSWORD PASSWORD_CONFIRM

USER_ID="$(api -G --data-urlencode "username=${EMAIL}" --data-urlencode "exact=true" \
  "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users" | jq -r '.[0].id')"
[ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] || die "The account was created but could not be read back."

# --- grant the manager role ------------------------------------------------
ROLE="$(api "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/hwms-manager")" \
  || die "The hwms-manager role does not exist. Has the realm been imported?"

api -X POST -H "Content-Type: application/json" \
  -d "[$(jq -c '{id, name}' <<<"$ROLE")]" \
  "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" >/dev/null \
  || die "The account was created but the manager role was not granted. Grant hwms-manager in the Keycloak console."

cat <<EOF
Manager account created.

  Sign-in name  ${EMAIL}
  Role          hwms-manager
  Password      temporary — it must be changed at first sign-in

Sign in at the application address, then use Accounts to create the Health and
Wellness Officer and Director accounts. Those creations are recorded in the
audit log; this one is not, because it happened outside the application.
EOF
