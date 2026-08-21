#!/bin/bash
# Create one database per service.
#
# Each service owns exactly one database and reaches no other, per DR-01. On
# the composed stack they share a Postgres instance to keep the local footprint
# small; in production they are separately provisioned, and the clinical
# service runs on its own instance entirely because the reason for that
# separation is legal rather than architectural.
set -euo pipefail

for db in keycloak identity admin occupational metrics; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
    SELECT 'CREATE DATABASE ${db}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db}')\gexec
SQL
done
