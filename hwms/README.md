# KMC QHSE Management System

Production system for the Quality, Health, Safety and Environment department of Kiira Motors Corporation.

This is not the prototype. The prototype in `../prototype` exists to confirm requirements with stakeholders and holds synthetic data in a browser. This repository is the real system: Keycloak for identity, Postgres per service, Go services behind a gateway, and a React application. No code moves from one to the other — what the prototype hands over is confirmed decisions and the design language.

**Governing documents:** `../docs/KMC_HWMS_Production_Build_Plan_v1.2.md` for architecture and phasing, and the QHSE SRS v2.0 for requirements.

---

## What exists today

This is Phase 0 and the identity half of Phase 1. It is a foundation, deliberately narrow and complete rather than broad and partial.

| Built | Not built |
|---|---|
| Keycloak realm, roles, and the OIDC sign-in flow | Clinical records, patients, patient visits |
| Gateway holding tokens server side, browser holds an opaque cookie | Safety incident register and attestation |
| Account administration: the manager creates officers and directors | Monitoring register, ergonomics, monthly returns |
| Audit trail for every account action | Metrics service, so every dashboard figure reads "no data" |
| Role-based routing for all three roles, across every planned module | Reports |
| Design tokens, type, icons, status and value components | |
| Prometheus metrics and Grafana | Loki and Tempo |
| Compose stack and k3s manifests | CI pipeline |

Every module in the navigation is routed and access-controlled. The ones that are not built say so, and show what records they will hold. **None of them shows a figure**, because a number with no record behind it is the problem this system was commissioned to remove — and a stakeholder who sees one assumes the capability exists.

---

## Running it

Requirements: Docker with Compose v2, and for frontend work, Node 20 and Go 1.26.

### One-time setup

Keycloak must answer to the same hostname from the browser and from inside the container network, or the token issuer will not match on the way back. Add one line to `/etc/hosts`:

```bash
echo "127.0.0.1 keycloak" | sudo tee -a /etc/hosts
```

Then copy the environment file:

```bash
cp .env.example .env
```

The defaults work as they are. They are development values, they are in source control, and they must be changed before this reaches anything but a laptop.

### Start

```bash
make up
```

| Service | Address |
|---|---|
| Application | http://localhost:8080 |
| Keycloak | http://keycloak:8180 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |

### Seed the manager

There are no accounts yet. The manager is the only account created outside the application; everything else is created by the manager, so that account creation is an audited action inside the system rather than a shell command nobody has a record of.

```bash
make seed-manager
```

It asks for **two different passwords** and mixing them up is the usual way this step fails.

The first is the **Keycloak administrator** password, which already exists. Without a `.env` file it is the `docker-compose.yml` default, `admin-development-password`. With one, it is whatever `KEYCLOAK_ADMIN_PASSWORD` holds.

The second is the **temporary password for the manager account** you are creating. The script never stores it, and the manager must change it at first sign-in. Sign in at http://localhost:8080, change the password when prompted, then open **Accounts** to create Health and Wellness Officer and Director accounts.

### Frontend development

Run the stack, then run Vite against it for hot reloading:

```bash
make web-dev     # http://localhost:5173, proxying /auth and /api to the gateway
```

---

## The three roles

| Role | Sees | Enters |
|---|---|---|
| Health and Wellness Officer | Everything except account administration | Clinical records, monitoring, ergonomics, safety incidents, monthly returns |
| Manager | Dashboard, unit pages, monthly returns, accounts | Accounts only. No operational record |
| Director | Dashboard | Nothing |

The Director sees less than the Manager. That is deliberate and it reflects the oversight task rather than lesser authority — worth saying out loud, because it inverts the usual hierarchy and otherwise reads as a defect.

**Individual clinical records will be accessible to the Health and Wellness Officer only.** Not the manager, not the director, not an administrator, not a report generator. That rule is already expressed in the Keycloak roles and the route table; when the clinical service is built it will also be expressed in that service holding the only credentials for the clinical database, and in a test that proves every other role receives 403 on every clinical route. Write that test before the feature.

---

## How it is put together

```
Browser ──► web (nginx)  ──► gateway ──► identity ──► Keycloak admin API
             │                  │                          │
             │ serves the SPA   │ holds tokens             │
             │ proxies /auth    │ session cookie           ▼
             │ and /api         │                       Postgres
             ▼                  ▼
          index.html      Keycloak (OIDC)
```

**The browser never holds a token.** The gateway completes the OIDC exchange, keeps the tokens server side, and gives the browser an opaque `HttpOnly` cookie. In a system that will hold health data, a token readable by any script on the page is not acceptable, and that single decision is why the gateway exists.

**The manager's token is never used to administer Keycloak.** The identity service authorises the manager, then acts through its own service account. A stolen manager token cannot create accounts directly.

**Authorisation is checked twice**, in the HTTP handler and again in the service layer. The second check is not redundant: it protects code paths reached from a scheduled job or an internal caller that never passes through a handler. Do not remove it as duplication.

### Layout

```
hwms/
  platform/          shared library: config, logging, auth, health, telemetry, postgres, migrations
  services/
    gateway/         OIDC, sessions, API proxy. No business logic and no data
    identity/        account administration, audit trail
  web/               React application
  deploy/
    keycloak/        realm import
    scripts/         manager seeding
    postgres/        database creation
    prometheus/      scrape configuration
    grafana/         datasource provisioning
    k8s/             k3s manifests
```

One Go module, one service skeleton, one pipeline, one `docker compose up`. Those constraints are what keep a microservice topology maintainable by a small team — see Section 1.5 of the build plan. They are not optional.

---

## Design rules that are easy to erode

1. **KMC red is brand chrome, never status.** Masthead, one primary action per screen, active navigation. Nowhere else.
2. **Status is a glyph, a word, then a colour, in that order.** Apply `filter: grayscale(100%)` to any screen before calling it finished; if a status becomes ambiguous, it is not finished.
3. **Measured values render in the mono face with tabular figures.** Every one of them, through `DataValue`.
4. **No colour value outside `src/styles/tokens.css`.**
5. **No limit, threshold or target in application source.** They arrive from reference data at runtime. If you write `if (value > 35)`, something has gone wrong.
6. **Missing data renders as "no data", never as zero and never as a failure.** A month with no data is a different problem from a month that failed.
7. **No clinical content in any log line, span attribute or metric label.** Ever, including while debugging.

---

## Observability

Prometheus scrapes each service; Grafana reads Prometheus. Route templates are metric labels, so `/api/identity/users/{id}` is one series rather than one per user — which is both a privacy rule and the only way the database survives.

Grafana is for operating the system. It is not a second route to the Division's data: no dashboard queries clinical data and none reproduces a KPI. The Division's dashboard is the product, subject to the access rules and the suppression rules; a Grafana panel is subject to neither.

---

## Deployment

`deploy/k8s` holds k3s manifests, written in parallel with the Compose stack so that production is a deployment change rather than a rewrite. **P-01 is still open**: if ICT prefers Compose on virtual machines, that directory is discarded and nothing else changes.

Two things in those manifests are load-bearing:

- The gateway runs **one replica**. Its session store is in-memory by construction, so two replicas would not share sessions and users would appear to be signed out at random. Replace the store before raising the number — the interface is three methods, deliberately.
- Secrets are **not** in this repository. The manifest declares the key names; ICT supplies the values. The development secrets in `docker-compose.yml` and the realm import must never reach a cluster.

---

## Known limitations

| Limitation | Consequence | Fix |
|---|---|---|
| In-memory gateway sessions | Single replica; a restart signs everyone out | Shared session store behind the existing interface |
| Client secrets in the realm import | Fine for development, unacceptable in a deployment | Generated secrets from a KMC secret store |
| Temporary passwords are handed over in person | No email delivery | Configure SMTP in Keycloak and use its credential-setup email |
| No CI pipeline | Nothing enforces the build on merge | Phase 0 completion item |
| No Loki or Tempo | Logs and traces are not aggregated | Add to the Compose stack and the manifests |

---

## Next

Phase 1 proper: the administration service, reference data, and the audit service as a separate deployable. Then Phase 2, the clinical service — and its acceptance gate, the test proving every non-officer role is refused on every clinical route, is written first.
