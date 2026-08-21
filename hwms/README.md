# KMC QHSE management system

Production codebase for the Health and Wellness division of the Quality, Health, Safety and Environment department of Kiira Motors Corporation.

This is not the prototype. The prototype in `../prototype` exists to confirm requirements with stakeholders and holds synthetic data in a browser. This repository is the real system: Keycloak for identity, Postgres per service, Go services behind a gateway, and a React application. No code moves from one to the other. What the prototype hands over is confirmed decisions and the design language.

**Governing documents:** `../docs/KMC_HWMS_Production_Build_Plan_v1.3.md` for architecture and phasing, `../docs/KMC_HWMS_SRS_v2.1_DRAFT.md` for requirements, and `../docs/KMC_HWMS_Stakeholder_Decision_Register_v0.4.md` for decisions that must not be hidden in implementation assumptions.

---

## What exists today

The local Compose build now includes the platform, identity, clinical,
operational and metrics work described below. This does not mean every delivery
phase is complete: reporting, production deployment, audit isolation and
several client decisions remain open. Every module currently offered in the
navigation has a screen behind it.

| Built | Not built |
|---|---|
| Keycloak realm, roles, and the OIDC sign-in flow, on a KMC-branded login theme | Amendment of a signed visit |
| Gateway holding tokens server side, browser holds an opaque cookie | Monthly and quarterly reports, plus the report archive |
| Patient registry and patient visits, on a separate database instance | Loki and Tempo |
| Visit sections, section state, signing, completeness | CI pipeline |
| Laboratory requisitions on KMC.DQHSE.05/26-FM008, with results and a form PDF | Safety incident register, deliberately, see DEC-027 |
| Medical referrals on KMC.DQHSE.02/26-FM004, through all five lifecycle states, with a PDF | A separately audited patient-history export |
| Referral sick leave counted once through a transactional outbox, with schema boundary tests on both sides | A reference-data screen and an agreed owner for changes |
| Effective-dated KPI targets and exposure limits | A separate `hwms-audit` deployable and database grants that make the clinical access log append-only |
| Industrial hygiene readings evaluated against the limit in force on the reading date, with the evaluation frozen | Human browser verification of the new screens |
| Ergonomic assessments and their corrective actions | |
| Monthly occupational plans and confirmed disease counts, with kept corrections | |
| Monthly returns with the rate computed live during entry, and kept corrections | |
| A dashboard of nine indicators derived from those records, each stating its provenance | |
| Clinical access logging before every retrieval | |
| An access-control suite proving no other role reaches a clinical route | |
| Prometheus metrics and Grafana | |
| Compose development stack | |
| Kubernetes manifests for all six services, their databases and caller network policies | |

**No figure on the dashboard is entered directly.** Every one is derived from a
record somebody captured, and every one states how it was worked out. Where a
month has no figure it reads *No data*, which is a different statement from
zero and is never styled as a failure.

---

## The six services

| Deployable | Owns | The boundary that matters |
|---|---|---|
| `gateway` | OIDC session, routing | No business data. The browser never holds a token |
| `identity` | Accounts and their administration audit trail | Acts through its own service account, never the manager's token |
| `clinical` | Patients, visits, laboratory, referrals | The only holder of clinical database credentials, on a separate instance |
| `admin` | Effective-dated KPI targets and exposure limits | Every threshold is a dated, sourced database row. Seeded proposals are not compiled decision logic |
| `occupational` | Ergonomics and industrial hygiene | No clinical content. A reading is a fact about a place |
| `metrics` | Monthly returns, KPI computation, the dashboard | **Holds no clinical credential of any kind** |

The last row is the point of the whole topology. `metrics` computes
health-related absenteeism, which includes sick leave recommended on a
clinical referral, without being able to read a patient record. What reaches
it from `clinical` is four fields: a referral identifier, a version, a month
and a number of days. The metrics request decoder rejects unknown fields, and
schema contract tests fail if either the clinical outbox or the metrics
contribution table is widened. The ordinary build therefore proves the
boundary from both sides without needing a database.

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

`make up` depends on `make images`. It therefore compiles the frontend on the
host before it builds the containers, because `web/Dockerfile` copies the
existing `web/dist` directory and a plain `docker compose up --build` can
otherwise package a stale interface.

| Service | Address |
|---|---|
| Application | http://localhost:8090 |
| Keycloak | http://keycloak:8180 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

Compose also starts all six Go deployables. The gateway is the only application
API exposed to the browser; Keycloak remains browser-accessible for OIDC, and
Grafana and Prometheus expose their development interfaces. `admin`,
`occupational` and `metrics` stay on the internal network because the gateway
is the single authenticated browser route into their APIs.

### Seed the manager

There are no accounts yet. The manager is the only account created outside the application; everything else is created by the manager, so that account creation is an audited action inside the system rather than a shell command nobody has a record of.

```bash
make seed-manager
```

It asks for **two different passwords** and mixing them up is the usual way this step fails.

The first is the **Keycloak administrator** password, which already exists. Without a `.env` file it is the `docker-compose.yml` default, `admin-development-password`. With one, it is whatever `KEYCLOAK_ADMIN_PASSWORD` holds.

The second is the **temporary password for the manager account** you are creating. The script never stores it, and the manager must change it at first sign-in. Sign in at http://localhost:8090, change the password when prompted, then open **Accounts** to create Health and Wellness Officer and Director accounts.

### Apply the login theme to an older stack

The realm import already selects the KMC theme for a new stack. Keycloak's
`--import-realm` option skips a realm that already exists rather than merging
new settings into it, so a stack created before the theme was added continues
to show the stock pages. Apply the one realm setting without deleting accounts
or clinical data:

```bash
make login-theme
```

The theme covers sign-in, the required first password change, general errors
and an expired sign-in page. The script needs `curl` and `jq`, and asks for the
Keycloak administrator password when `KEYCLOAK_ADMIN_PASSWORD` is unset.

### Make targets

| Target | Purpose |
|---|---|
| `make images` | Compile the frontend, then build every container image, because the web image copies the host build output |
| `make up` | Run `images`, then start the complete Compose stack |
| `make restart` | Rebuild and restart the six Go services and the web application while keeping data |
| `make login-theme` | Point an existing realm at the KMC login theme without destroying its data |
| `make seed-manager` | Create the first manager as an audited bootstrap step |
| `make build` | Compile Go and the frontend without packaging images |
| `make test` | Run `go vet` and all Go tests |
| `make integration-test` | Run the clinical and metrics SQL regression tests against configured databases |
| `make access-test` | Run the clinical route access-control suite on its own |
| `make smoke` | Check the running stack against the platform acceptance checks |
| `make logs` | Follow logs from all six Go services |
| `make down` | Stop the stack while keeping its data |
| `make clean` | Delete the realm, accounts and all records after an explicit confirmation |

### Database integration tests

The ordinary `make test` run needs no infrastructure. The SQL regression tests
read `CLINICAL_TEST_DATABASE_URL` and `METRICS_TEST_DATABASE_URL`, and skip
cleanly when those variables are absent.

Compose publishes both development databases on loopback for the opt-in test
target. Start or recreate them after pulling this configuration, then run the
target:

```bash
docker compose up -d postgres postgres-clinical
make integration-test
```

The defaults use ports `55433` for the clinical database and `55432` for the
shared metrics database, with the development credentials in
`docker-compose.yml`. If `.env` changes either credential or port, pass the two
complete URLs to Make:

```bash
make integration-test \
  CLINICAL_TEST_DATABASE_URL='postgres://user:password@127.0.0.1:port/clinical?sslmode=disable' \
  METRICS_TEST_DATABASE_URL='postgres://user:password@127.0.0.1:port/metrics?sslmode=disable'
```

### Frontend development

Run the stack, then run Vite against it for hot reloading:

```bash
make web-dev     # http://localhost:5173, proxying /auth and /api to the gateway
```

---

## The three roles

| Role | Sees | Enters |
|---|---|---|
| Health and Wellness Officer | Everything except account administration | Clinical records, monitoring, ergonomics and monthly returns |
| Manager | Dashboard, unit pages, monthly returns and accounts | Accounts, plus KPI targets and exposure limits through the API. The latter ownership is open at DEC-035 |
| Director | Dashboard | Nothing |

The Director sees less than the Manager. That is deliberate and it reflects the oversight task rather than lesser authority, worth saying out loud, because it inverts the usual hierarchy and otherwise reads as a defect.

**Individual clinical records are accessible to the Health and Wellness Officer only.** Not the manager, not the director, not an administrator, not a report generator. That rule is enforced in four independent places, deliberately:

1. **The Keycloak role.** Only `hwms-officer` carries it.
2. **The route table.** Clinical routes are not offered to any other role.
3. **The service.** Checked in the HTTP handler and again in the service layer, so a code path that never passes through a handler is still refused.
4. **The deployment.** The clinical service holds the only credentials for the clinical database, which runs as a separate instance. In the cluster a network policy means no other pod can even open the port. A defect in another service cannot read a patient record because it has nothing to read it with.

`services/clinical/access_test.go` proves the third of those on every build. It
checks 25 clinical routes against the manager, director, administrator, Data
Protection Officer and no-role caller profiles, which gives 125 route and
caller combinations. It also walks the route tree and fails if a route is
added without coverage. The tests run against a **nil** store, so any handler
that reached the data layer before checking the role would panic rather than
pass.

Every retrieval of an individual record writes to `clinical_access_log` **before** the record is returned. If that write fails, the read fails. A system that cannot say who read a patient's record has lost the one question the Data Protection and Privacy Act makes it answerable for.

A laboratory requisition carries the patient's name, staff number, clinical summary and results. It is a clinical record and is covered by all of the above.

---

## The patient record

`GET /api/clinical/patients/{id}/record` returns a consolidated view in one
call, and the screen at `/patients/record` renders it as a single timeline. The
endpoint loads up to 200 visits, requisitions and referrals from each register,
so it is not an unlimited archive for a record larger than that window.

**The problem it fixes.** Visits, laboratory requisitions and referrals were three separate registers, each keyed differently. An officer reconstructing what had happened to a patient opened the visit register and filtered it, then opened the laboratory register and filtered that, and held the join in their head. The registry itself offered no way to open a patient at all. Its only action was "Start visit".

That threw away a relationship the data already has. A requisition is raised *from* a visit; a referral is raised *from* a visit. The visit is the natural unit of the record, and the things that came out of it belong underneath it.

**How it is organised**, in the order a clinician needs it:

1. **Who this is**, identity in one line.
2. **What is outstanding**. Draft visits, requisitions without results. Shown *only when there is something*. A permanent banner reading "0 outstanding" teaches people to stop reading banners, and the one time it matters is the time it gets scrolled past.
3. **How much history there is**. Visit count, first and last seen, work-related count, so the length of the stream is expected before scrolling.
4. **The timeline**. Reverse chronological and grouped by year, one card per visit, quoting the complaint, impression and treatment. Requisitions and referrals raised from that visit are nested inside its card with their own status. Actions sit where the reader already is: continue or review the visit, request laboratory or open the referral.

The lenses for Everything, Work related, Laboratory, Referrals and Unfinished
filter that one stream instead of creating five competing registers. Each lens
shows its count before it is selected, because an answer of none should be
visible without making the officer search an empty list.

Requisitions whose visit falls outside the loaded window appear in a separate block rather than being dropped. A result nobody can find is worse than an untidy list.

**Assembled server side for two reasons.** The join stays where the data is, and opening a record writes **one** entry to `clinical_access_log` rather than three. One purposeful read, one entry, three entries for one act would make the log harder to read without making it more truthful.

The timeline quotes three sections per visit, not the whole record. A timeline that reproduced everything would *be* the record, and the officer would scroll past what they opened it to find. Where a section was completed by ticking rather than typing, the selections are shown. A section recorded properly should not display as empty because the notes box was.

**Patient history summary PDF.** The download is generated in the browser from
the consolidated record already returned to the screen. It includes signed
visits only and says how many drafts were withheld, because an unsigned visit
is not yet part of the record. It uses the shared KMC letterhead and a filename
without a patient name or identifier, because downloaded files travel beyond
the access controls of the application. The browser generation and its audit
gap are recorded as known limitations below and at DEC-037.

---

## Laboratory, KMC.DQHSE.05/26-FM008

Seven investigations in four groups, as the clinic's form prints them: blood smear and mRDT for malaria; typhoid antigen and *H. pylori* stool antigen; complete blood count; random and fasting blood sugar. The catalogue is published by the service at `/api/clinical/lab/catalogue` so the interface keeps no copy of it, two lists would eventually disagree, and the one that disagreed silently would be the one a clinician ticked.

The form drives two decisions that differ from what a laboratory module is usually assumed to do.

**A result belongs to a requested investigation, not to a separate analyte record.** The form puts the Results column beside the Requested Investigations column, so the result is stored on the join row.

**There is no abnormality flag.** The form carries no units and no reference ranges, so a result is recorded exactly as the laboratory reported it. Deciding a value is abnormal needs a range KMC has not defined, and inventing one would put a clinical judgement in the software's mouth.

> **Open question for the laboratory.** An earlier draft of this system carried effective-dated reference ranges and an automatic abnormal flag. That was our proposal, not KMC's requirement, and it was removed when the real form arrived. If the laboratory wants structured ranges and flagging, they can be added. The machinery already exists for environmental limits. Ask them; do not assume.

`laboratory_test.go` asserts the catalogue against the form: seven codes in printed order, every test in a printed group, and the fasting instruction preserved against FBS. That last one is a patient instruction. Losing it means somebody fasts unnecessarily, or does not fast when they should.

---

## Referrals, KMC.DQHSE.02/26-FM004

A referral is raised from a patient visit, never as a standalone record. The
database join in `services/clinical/referralstore.go` proves that the visit
belongs to the named patient before it writes anything. Name, age, sex,
department, division, unit and vital signs come from the joined records, so a
stale browser tab cannot pair one person's visit with another person's letter.
Position and contact number default from the registry but may be corrected for
the referral, and the supervisor name is entered on the referral, because
those three details may legitimately differ on the day.

The lifecycle is drafted, authorised, issued, returned and reviewed. Each
stage moves forward one step and the database update names the state it expects,
so a stale page cannot overwrite a transition another officer has already
recorded. Facility feedback is the deliberate exception to a single write per
stage: it may be corrected after the referral is returned or reviewed. A
correction increments `feedback_version` and leaves a reviewed referral
reviewed, because correcting the facility's letter must not reopen the clinic's
completed work.

Authorised means that the officer recorded the two signatures obtained outside
the system. No management role can open the clinical referral while DEC-024 is
unresolved. The service can produce a minimum-disclosure authorisation summary,
but that route is also officer-only today because even the summary identifies a
patient. This preserves the clinical boundary while KMC decides whether the
controlled paper form or the no-management-clinical-access rule must change.

The referral PDF is generated in the browser and uses the shared KMC
letterhead. It reproduces the controlled form's duplicate Section E labels, its
missing Section D and its older role wording, because Document Control has not
authorised silent corrections to KMC.DQHSE.02/26-FM004.

### Referral leave outbox

Recording facility feedback and appending its leave fact to
`referral_leave_outbox` happen in one database transaction. The clinical record
therefore remains independent of metrics availability, while a successful save
cannot lose the corresponding absenteeism contribution between two writes.

The publisher retries direct HTTP delivery to
`metrics` at `/internal/leave-contributions`. Delivery is at least once, not
exactly once. The metrics store is idempotent on referral identifier and
feedback version, and it keeps only the highest version active, so retries and
out-of-order corrections affect the dashboard once. A corrected feedback row
replaces the prior contribution rather than adding a second absence.

Only four fields cross the clinical event boundary: `referralId`,
`feedbackVersion`, `period` and `days`. No patient identifier, name, diagnosis
or free text travels. The internal route currently uses a shared secret and is
not exposed through the gateway. That is development-grade authentication and
must become a scoped Keycloak service account before production, see DEC-034.

Leave spanning a month end is currently attributed whole to the month it began
in. The form supplies a total and a date range but no daily allocation rule,
so splitting it would require KMC to decide how non-working days and partial
days are assigned. That decision remains open at DEC-033.

---

## How it is put together

```
Browser --> web (nginx) --> gateway --> identity --> Keycloak admin API
               |              |             |              |
               |              |             +----------> identity database
               |              |
               |              +---------> clinical --> clinical database
               |              +---------> admin ------> admin database
               |              +---------> occupational -> occupational database
               |              +---------> metrics ----> metrics database
               |                              ^   ^
               |                              |   |
               |                  dated targets   monthly aggregates
               |                         admin   occupational
               |
               +-- serves the SPA and proxies /auth and /api

clinical referral_leave_outbox --> four-field internal HTTP --> metrics
```

**The browser never holds a token.** The gateway completes the OIDC exchange, keeps the tokens server side, and gives the browser an opaque `HttpOnly` cookie. In a system that will hold health data, a token readable by any script on the page is not acceptable, and that single decision is why the gateway exists.

**The manager's token is never used to administer Keycloak.** The identity service authorises the manager, then acts through its own service account. A stolen manager token cannot create accounts directly.

**The non-clinical services compose rather than share databases.** `metrics`
reads dated KPI definitions from `admin` and monthly counts from
`occupational`; `occupational` resolves a hygiene limit from `admin` on the
reading date before it writes the reading. The services forward the signed-in
user's bearer token for those reads, so the upstream service applies its own
role checks and the caller remains attributable.

**Authorisation is checked twice**, in the HTTP handler and again in the service layer. The second check is not redundant: it protects code paths reached from a scheduled job or an internal caller that never passes through a handler. Do not remove it as duplication.

### Layout

```
hwms/
  platform/          shared library: config, logging, auth, health, telemetry, postgres, migrations
  services/
    gateway/         OIDC, sessions, API proxy. No business logic and no data
    identity/        account administration, audit trail
    clinical/        patients, visits, laboratory, referrals. Separate database instance
    admin/           effective-dated KPI targets and exposure limits
    occupational/    ergonomics and industrial hygiene registers
    metrics/         monthly returns, KPI computation, the dashboard
  web/               React application
  deploy/
    keycloak/        realm import, and the KMC login theme
    scripts/         manager seeding, login theme application
    postgres/        database creation
    prometheus/      scrape configuration
    grafana/         datasource provisioning
    k8s/             k3s manifests
```

One Go module, one shared service skeleton and one `docker compose up` keep the
microservice topology maintainable by a small team. A single CI matrix is still
planned but not built, which is why the known limitations do not claim a
pipeline exists.

---

## Design rules that are easy to erode

1. **KMC red is brand chrome, never status.** Masthead, one primary action per screen, active navigation. Nowhere else.
2. **Status is a glyph, a word, then a colour, in that order.** Apply `filter: grayscale(100%)` to any screen before calling it finished; if a status becomes ambiguous, it is not finished.
3. **Measured values render in the mono face with tabular figures.** Every one of them, through `DataValue`.
4. **No colour value outside `src/styles/tokens.css`.**
5. **No decision threshold is compiled into Go or TypeScript logic.** Targets and limits arrive from reference data at runtime. The migration seeds proposal rows so a new database can demonstrate the workflow, but the evaluation code does not treat those values as constants.
6. **Missing data is "No data", never zero.** A month nobody supplied a near-miss count for is not a month with no near misses, and the two produce opposite management responses.
7. **An incomplete year-to-date history produces no figure.** The cell says how many months are available instead, because filling a gap with zero would invent a result. For a complete history, count indicators are totalled and rate indicators are recomputed from summed numerators and denominators. The SRS still calls the result a monthly average, so DEC-032 must resolve that conflict.
8. **An evaluation is frozen when it is made.** A hygiene reading stores the limit it was judged against and its outcome; revising the limit next year must not change what the reading meant this year. The database enforces this with a trigger, not a convention.
9. **No clinical content in any log line, span attribute or metric label.** This includes debugging, because operational telemetry does not have the access controls of the clinical record.
10. **A PDF carries the shared letterhead and confidentiality statement.** Laboratory, referral and patient-history documents use `web/src/lib/pdfChrome.ts`, because separate brand blocks would drift and the inconsistency would become visible only after a document left the organisation.

---

## Branding and generated documents

The signed-in shell uses a white brand band above the KMC-red action bar. The
logo keeps its supplied colours on white, because reversing it out of red would
reduce the lockup to a silhouette. A muted lockup at the foot of the navigation
rail closes the shell without competing with the primary brand band.

The laboratory requisition, referral and patient history summary are all
generated in the browser and all call the same letterhead and footer helpers in
`web/src/lib/pdfChrome.ts`. One implementation keeps the organisation name,
form identification, logo proportions and confidentiality treatment aligned.
The production-plan section records why browser generation still falls short of
versioned templates, archival reproduction and distinct export auditing.

---

## Dashboard presentation

The dashboard leads with the selected month's exceptions. Off-target items
come before approaching items, while missing data is counted separately and is
not presented as a performance failure. This lets a reader see the problems
before scanning all nine indicators.

The mark on each card follows the meaning of the figure:

- a proportion uses a radial meter with the target marked on its track;
- a value against a floor or ceiling uses a linear meter that can continue
  beyond its target;
- a count whose target is zero uses the figure itself, because a meter of zero
  out of zero would add shape without information.

Every card also carries a January-to-reporting-month sparkline. A missing month
breaks the line instead of being interpolated, because joining across the gap
would imply a value nobody recorded. Complete year-to-date counts are totalled
and rates are recomputed from summed inputs; incomplete histories show the
number of available months instead. DEC-032 records the remaining conflict with
the SRS wording.

---

## Observability

Prometheus scrapes each service; Grafana reads Prometheus. Route templates are metric labels, so `/api/identity/users/{id}` is one series rather than one per user, which is both a privacy rule and the only way the database survives.

Grafana is for operating the system. It is not a second route to the Division's data: no dashboard queries clinical data and none reproduces a KPI. The Division's dashboard is the product, subject to the access rules and the suppression rules; a Grafana panel is subject to neither.

---

## Deployment

`deploy/k8s` holds the earlier k3s manifests, and **P-01 is still open**: ICT
has not confirmed k3s rather than Compose on virtual machines. The manifests
have not been extended for `admin`, `occupational` or `metrics`, and the
gateway now requires all three service URLs at startup. Applying the current
manifests would therefore make the production gateway fail to start. The
directory is a proposal, not a usable production deployment.

Two things in those manifests are load-bearing:

- The gateway runs **one replica**. Its session store is in-memory by construction, so two replicas would not share sessions and users would appear to be signed out at random. Replace the store before raising the number. The interface is three methods, deliberately.
- Secrets are **not** in this repository. The manifest declares the key names; ICT supplies the values. The development secrets in `docker-compose.yml` and the realm import must never reach a cluster.

---

## Known limitations

| Limitation | Consequence | Fix |
|---|---|---|
| In-memory gateway sessions | Single replica; a restart signs everyone out | Shared session store behind the existing interface |
| Client secrets in the realm import | Fine for development, unacceptable in a deployment | Generated secrets from a KMC secret store |
| Temporary passwords are handed over in person | No email delivery | Configure SMTP in Keycloak and use its credential-setup email |
| Year-to-date semantics conflict between the SRS and prototype | The implemented totals and weighted rates may not be the reporting interpretation KMC intended | Decide DEC-032, then align the SRS, prototype and implementation |
| Leave spanning a month end is assigned wholly to its first month | Monthly absenteeism moves differently from a calendar-day split | Decide DEC-033 and define any daily allocation convention |
| Clinical to metrics authentication is a shared secret | The internal route has no service identity or scoped OIDC token | Register a Keycloak service account before production, per DEC-034 |
| The manager can change reference data through the API, while the build plan assigns configuration to a System administrator | The implemented authority and planned governance disagree | Decide DEC-035, add the chosen role and expose an appropriate administration screen |
| The confirmed occupational disease count is a clinical judgement entered on an operational screen | It sits on Monthly returns, beside figures that come from HR, which is a boundary worth a second look | Confirm the placement at DEC-036. Corrections are already kept with a reason in `health_wellness_plan_revision` |
| Patient-history PDF generation happens in the browser | The file is not generated from a versioned server template and cannot be reproduced from an archive guarantee | Move controlled generation and archival server side if those plan guarantees remain required |
| A patient-history download has no separate audit event | Viewing and exporting are indistinguishable, and `clinical_access_log.access_route` rejects `export` | Decide DEC-037, add an allowed export route and make the download fail if its audit write fails |
| The SQL regression tests need a database and are skipped by `make test` | A developer who never runs `make integration-test` does not exercise the compare-and-set, feedback-correction or out-of-order-delivery rules | Run them in CI against a throwaway Postgres once a pipeline exists |
| Leave delivery uses direct HTTP, not NATS JetStream | The implementation does not provide the planned broker durability or replay model | Either accept and operate the HTTP outbox or add the broker the plan requires |
| No separate `hwms-audit` deployable or restrictive database grants | The clinical service role can update or delete its own access-log rows despite the migration comment calling the log append-only | Build the planned audit boundary and enforce insert-only grants |
| The clinical database URL in the manifests requires TLS, but the clinical StatefulSet configures no server certificate | The clinical service would fail to connect in a real cluster | ICT supplies certificates and enables TLS, or approves a different connection policy in writing |
| No CI pipeline | Nothing enforces the build on merge | Phase 0 completion item |
| No Loki or Tempo | Logs and traces are not aggregated | Add to the Compose stack and the manifests |
| No person has signed in to inspect the new screens | Compilation, Go tests and direct database checks do not establish browser layout or end-to-end usability | Complete a role-by-role browser review with non-sensitive test data |

---

## Before production

Resolve the open decisions in the stakeholder register, build the separate
audit boundary, add the missing plan and reference administration workflows,
bring `deploy/k8s` into line with the gateway configuration, and complete the
report archive. The code is not production-ready while the current manifests
make the gateway fail at startup, regardless of whether the Compose stack runs
on a developer machine.
