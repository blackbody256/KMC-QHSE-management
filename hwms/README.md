# KMC QHSE Management System

Production system for the Quality, Health, Safety and Environment department of Kiira Motors Corporation.

This is not the prototype. The prototype in `../prototype` exists to confirm requirements with stakeholders and holds synthetic data in a browser. This repository is the real system: Keycloak for identity, Postgres per service, Go services behind a gateway, and a React application. No code moves from one to the other — what the prototype hands over is confirmed decisions and the design language.

**Governing documents:** `../docs/KMC_HWMS_Production_Build_Plan_v1.2.md` for architecture and phasing, and the QHSE SRS v2.0 for requirements.

---

## What exists today

Phase 0, the identity half of Phase 1, and the first half of the clinical phase. Deliberately narrow and complete rather than broad and partial.

| Built | Not built |
|---|---|
| Keycloak realm, roles, and the OIDC sign-in flow | Medical referrals and their PDF |
| Gateway holding tokens server side, browser holds an opaque cookie | Industrial hygiene and ergonomics registers |
| **Laboratory requisitions on KMC.DQHSE.05/26-FM008, with results and a form PDF** | Monthly returns |
| Account administration: the manager creates officers and directors | Industrial hygiene and ergonomics registers |
| **Patient registry and patient visits, on a separate database instance** | Monthly returns |
| **Visit sections, section state, signing, completeness** | Metrics service, so every dashboard figure reads "no data" |
| **Clinical access logging before every retrieval** | Amendment of a signed visit |
| **An access-control suite proving no other role reaches a clinical route** | Reports |
| Role-based routing for all three roles | Loki and Tempo |
| Prometheus metrics and Grafana | CI pipeline |
| Compose stack and k3s manifests | |

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
| Application | http://localhost:8090 |
| Keycloak | http://keycloak:8180 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

### Seed the manager

There are no accounts yet. The manager is the only account created outside the application; everything else is created by the manager, so that account creation is an audited action inside the system rather than a shell command nobody has a record of.

```bash
make seed-manager
```

It asks for **two different passwords** and mixing them up is the usual way this step fails.

The first is the **Keycloak administrator** password, which already exists. Without a `.env` file it is the `docker-compose.yml` default, `admin-development-password`. With one, it is whatever `KEYCLOAK_ADMIN_PASSWORD` holds.

The second is the **temporary password for the manager account** you are creating. The script never stores it, and the manager must change it at first sign-in. Sign in at http://localhost:8090, change the password when prompted, then open **Accounts** to create Health and Wellness Officer and Director accounts.

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

**Individual clinical records are accessible to the Health and Wellness Officer only.** Not the manager, not the director, not an administrator, not a report generator. That rule is enforced in four independent places, deliberately:

1. **The Keycloak role.** Only `hwms-officer` carries it.
2. **The route table.** Clinical routes are not offered to any other role.
3. **The service.** Checked in the HTTP handler and again in the service layer, so a code path that never passes through a handler is still refused.
4. **The deployment.** The clinical service holds the only credentials for the clinical database, which runs as a separate instance. In the cluster a network policy means no other pod can even open the port. A defect in another service cannot read a patient record because it has nothing to read it with.

`services/clinical/access_test.go` proves the third of those on every build: 49 assertions covering every clinical route against every non-officer role, plus a walk of the route tree that fails if a route is added without being covered. The tests run against a **nil** store, so any handler that reached the data layer before checking the role would panic rather than pass.

Every retrieval of an individual record writes to `clinical_access_log` **before** the record is returned. If that write fails, the read fails — a system that cannot say who read a patient's record has lost the one question the Data Protection and Privacy Act makes it answerable for.

A laboratory requisition carries the patient's name, staff number, clinical summary and results. It is a clinical record and is covered by all of the above.

---

## The patient record

`GET /api/clinical/patients/{id}/record` returns one patient's whole history in one call, and the screen at `/patients/record` renders it as a single timeline.

**The problem it fixes.** Visits, laboratory requisitions and referrals were three separate registers, each keyed differently. An officer reconstructing what had happened to a patient opened the visit register and filtered it, then opened the laboratory register and filtered that, and held the join in their head. The registry itself offered no way to open a patient at all — its only action was "Start visit".

That threw away a relationship the data already has. A requisition is raised *from* a visit; a referral is raised *from* a visit. The visit is the natural unit of the record, and the things that came out of it belong underneath it.

**How it is organised**, in the order a clinician needs it:

1. **Who this is** — identity in one line.
2. **What is outstanding** — draft visits, requisitions without results. Shown *only when there is something*. A permanent banner reading "0 outstanding" teaches people to stop reading banners, and the one time it matters is the time it gets scrolled past.
3. **How much history there is** — visit count, first and last seen, work-related count, so the length of the stream is expected before scrolling.
4. **The timeline** — reverse chronological, one card per visit, quoting the complaint, impression and treatment. Requisitions raised from that visit are nested inside its card with their own status. Actions sit where the reader already is: continue or review the visit, request laboratory.

Requisitions whose visit falls outside the loaded window appear in a separate block rather than being dropped. A result nobody can find is worse than an untidy list.

**Assembled server side for two reasons.** The join stays where the data is, and opening a record writes **one** entry to `clinical_access_log` rather than three. One purposeful read, one entry — three entries for one act would make the log harder to read without making it more truthful.

The timeline quotes three sections per visit, not the whole record. A timeline that reproduced everything would *be* the record, and the officer would scroll past what they opened it to find. Where a section was completed by ticking rather than typing, the selections are shown — a section recorded properly should not display as empty because the notes box was.

---

## Laboratory — KMC.DQHSE.05/26-FM008

Seven investigations in four groups, as the clinic's form prints them: blood smear and mRDT for malaria; typhoid antigen and *H. pylori* stool antigen; complete blood count; random and fasting blood sugar. The catalogue is published by the service at `/api/clinical/lab/catalogue` so the interface keeps no copy of it — two lists would eventually disagree, and the one that disagreed silently would be the one a clinician ticked.

The form drives two decisions that differ from what a laboratory module is usually assumed to do.

**A result belongs to a requested investigation, not to a separate analyte record.** The form puts the Results column beside the Requested Investigations column, so the result is stored on the join row.

**There is no abnormality flag.** The form carries no units and no reference ranges, so a result is recorded exactly as the laboratory reported it. Deciding a value is abnormal needs a range KMC has not defined, and inventing one would put a clinical judgement in the software's mouth.

> **Open question for the laboratory.** An earlier draft of this system carried effective-dated reference ranges and an automatic abnormal flag. That was our proposal, not KMC's requirement, and it was removed when the real form arrived. If the laboratory wants structured ranges and flagging, they can be added — the machinery already exists for environmental limits. Ask them; do not assume.

`laboratory_test.go` asserts the catalogue against the form: seven codes in printed order, every test in a printed group, and the fasting instruction preserved against FBS. That last one is a patient instruction — losing it means somebody fasts unnecessarily, or does not fast when they should.

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
