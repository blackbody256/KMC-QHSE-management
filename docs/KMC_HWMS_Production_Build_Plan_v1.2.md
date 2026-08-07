# KIIRA MOTORS CORPORATION

> **Superseded on 7 August 2026 by `KMC_HWMS_Production_Build_Plan_v1.3.md`.** Preserved as project history; its department-wide services and expansion phases were deliberately removed after the 4 August scope decision.

## Quality, Health, Safety and Environment Management System (QHSE MS)

### Production Build Plan

**Version:** 1.2
**Date:** 3 August 2026
**Status:** For technical review by KMC ICT and the Health and Wellness Division

**Revision history**

| Version | Change |
|---|---|
| 1.0 | Issued |
| 1.1 | Section 3 corrected following the prototype track's v0.3 planning. Recordability became a recorded determination rather than a computed rule; period attestation added; monitoring register shared across industrial hygiene and environment. The v1.0 severity ladder imported a foreign recordability rule and was withdrawn |
| 1.2 | Consistency revision. Safety figures no longer described uniformly as event counts; duplicated classification field removed; Director and Manager given separate permission sets; hours worked returned to unresolved; K6 and K7 withdrawal recorded as confirmed with the generic expiry component retained; governing requirements document updated to SRS v2.0 |

**Governing requirements document:** KMC QHSE Management System SRS v2.0, which supersedes KMC_HWMS_SRS_v1.0.md and KMC_HWMS_SRS_v1.1_DRAFT.md in full.
**Companion documents:** KMC_HWMS_Agent_Build_Brief_v1.0.md (design language, subject to its authority notice), Stakeholder Decision Register v0.3, KMC_HWMS_Prototype_v0.3_Plan_Review.md

---

# 0. What this document is

The prototype answered "what could this system feel like". This document answers "how is the real system built, by whom, in what order, and on what infrastructure".

It is written against a decision already taken by the Corporation: **microservices are the organisational architectural standard**, following the Velo precedent, with Go on the backend, React and Tailwind on the frontend, Keycloak for identity, and Grafana for observability. Section 1.1 records the consequence of that decision honestly, because the previous specification decided the opposite and a future maintainer must be able to see that the change was deliberate.

Two tracks run in parallel and must not be confused:

| Track | Purpose | Owner | Output |
|---|---|---|---|
| Prototype track | Confirm requirements with stakeholders, settle open decisions | Prototype agent | Validated decisions, design source of truth, no production code |
| Production track | Build the viable product | This plan | Deployed system on KMC infrastructure |

Section 9 states what the prototype track must and must not do so that its output feeds this plan rather than becoming a second system.

---

# 1. Architecture

## 1.1 ADR-13: Microservice topology supersedes ADR-10

**Context.** ADR-10 in SRS v1.0 selected a modular monolith. Its reasoning was a small user population, no independently scaling workload, and a single maintainer. Three things have changed since that decision. The Corporation has stated microservices as its standard, consistent with Velo. The scope has widened from one division to the whole Quality, Health, Safety and Environment department, meaning four units with different owners, different data, and different approval lifecycles. KMC ICT will own deployment, and alignment with their standard is a precondition for them accepting the system.

**Decision.** HWMS is built as a set of independently deployable Go services, one per bounded context, behind a single gateway, with one database per service and Keycloak as the identity provider. ADR-10 is superseded. ADR-01 through ADR-09, ADR-11 and ADR-12 are unaffected and remain binding.

**Rationale.** Beyond the organisational standard, the split strengthens the invariant that matters most in this system. Under ADR-10, the rule that only the clinical context holds clinical credentials was enforced by code review, because every context ran in one process with one configuration. Under this decision it is enforced by deployment: the clinical service is the only workload issued clinical database credentials, the only workload granted the clinical Keycloak scope, and the only workload permitted network access to the clinical database. A defect in the metrics service cannot read a clinical record because it has no credentials with which to try.

**Consequences, stated plainly.** This costs more operationally than a monolith: eight deployables, an event bus, a service mesh or ingress layer, and an observability stack to run. That cost is real and it lands on whoever maintains the system after handover. Section 1.5 sets out the specific measures that hold it down — one repository, one service skeleton, one pipeline, one platform library. If those measures are not followed, the topology becomes the project's principal risk rather than its principal strength.

## 1.2 Service topology

Eight deployables. Each owns its data exclusively and exposes it only through its API.

| Service | Bounded context | Owns | Special conditions |
|---|---|---|---|
| `hwms-gateway` | Edge | Routing, OIDC session for the browser, rate limiting | No business logic. Holds no data |
| `hwms-admin` | Administration | Org structure, workstations, monitoring locations, parameters, effective-dated standards, KPI registry and targets, unit register | Every configurable rule in the system lives here |
| `hwms-clinical` | Clinical | Patients, encounters, sections, signing, amendments | **Separate database instance, separate credentials, separate encryption key, separate network policy.** Only holder of the clinical scope |
| `hwms-occupational` | Occupational health and ergonomics | Surveillance, disease cases, fitness for work, ergonomic assessments and corrective actions | Holds no diagnosis and no clinical narrative |
| `hwms-safety` | Workplace safety | Incident register, investigations, exposure hours, safety corrective actions | New. See Section 3 |
| `hwms-environment` | Environment and industrial hygiene | Monitoring plans, events, readings, limit evaluation; later sustainability records | Compliance state immutable once written |
| `hwms-metrics` | Metrics and reporting | KPI computation, periodic returns, dashboard aggregation, report generation and archive | **Issued no clinical credentials at all.** Receives clinical figures only as counts |
| `hwms-audit` | Audit | `audit_log`, `clinical_access_log` | Append only. Write API open to all services, read API restricted to the Data Protection Officer role |

`hwms-quality` (Quality Inspection and Testing) is defined in Section 8 and is **not built** in the first production release. Its parameters are unconfirmed. It exists as a navigation placeholder in the frontend only.

**Why not fewer services.** Splitting on bounded context rather than on entity keeps the count at eight and each service at a size one person can hold in their head. Splitting further — a service per KPI, a service per form — produces distributed complexity with no isolation benefit.

**Why not more.** Reporting stays inside `hwms-metrics` in v1 because it consumes exactly the same data and would otherwise need a synchronous call for every figure it prints. Extract it when report generation becomes slow enough to need its own scaling, and not before.

## 1.3 Communication

**Synchronous, service to service:** REST over HTTP with JSON, contracts defined as OpenAPI 3.1 documents held in the repository, Go clients generated from them. If Velo has standardised on gRPC internally, match Velo instead and generate from protobuf — this is a consistency decision for KMC ICT, recorded as **P-03** in Section 10.

**Asynchronous:** NATS JetStream. It is a single binary, runs on premise without a Zookeeper-class dependency, and provides the durable subjects needed. Kafka is over-specified for this load.

Events are published through a **transactional outbox** in each service: the domain write and the outbox row commit in one transaction, and a relay publishes from the outbox. Without this, a metric can silently disagree with the records behind it, which defeats ADR-01.

**The one communication rule that is not negotiable.** `hwms-metrics` never requests a clinical record. `hwms-clinical` publishes only counts and non-identifying facts:

```
clinical.encounter.recorded    { encounter_id, period, department_id_ref, work_related, patient_category }
clinical.encounter.signed      { encounter_id, period }
clinical.case.raised           { case_id, department_id_ref, exposure_category }
```

No name, no diagnosis, no narrative, no free text ever crosses that boundary. This is DR-04 and FR-KPI-09 expressed as a message schema, and the schema is the enforcement point. A contract test asserts that the published event types contain no clinical fields.

## 1.4 Data

| Rule | Implementation |
|---|---|
| One database per service | Separate Postgres 16 databases, separate roles, separate credentials. Clinical on its own **instance**, not merely its own database |
| No cross-service joins | Cross references are `_id_ref` UUID columns with no foreign key, per DR-02 |
| Migrations | `golang-migrate`, versioned, per service, in the repository. CI fails if a migration is not reversible or not applied in staging first |
| Effective dating | `environmental_standard`, `kpi_target` and every limit carry `effective_from` and `effective_to`. Every read passes the event date. A query for a limit without a date predicate fails review |
| Immutability | `parameter_reading.compliance_state` written once, enforced by a database trigger that raises on UPDATE, per FR-ENV-05 |
| Append only | `clinical_access_log` and `audit_log` have INSERT and SELECT grants only. No UPDATE, no DELETE, at the database role level |
| Soft delete | `is_deleted`, `deleted_at`, `deleted_by`. No hard delete on a referenced entity, per DR-05 |
| Backups | Nightly, encrypted. Clinical backups use a separate key and separate storage, per OPS-06. Quarterly restore test, recorded |

Reference data owned by `hwms-admin` is consumed by other services through a cached read with the effective date passed in. A service that evaluates a reading stores the `standard_version_id_ref` it used, so a later change to the standard cannot rewrite history.

## 1.5 Holding the operational cost down

These are not optional. They are what makes eight services maintainable by a small team.

1. **One repository.** A monorepo containing all services, the frontend, the deployment manifests, and the migrations. Cross-service changes land in one commit and one review.
2. **One service skeleton.** A `cmd/` template generating config loading, structured logging, OpenTelemetry setup, health endpoints, Keycloak token validation middleware, Postgres pool, outbox relay, and graceful shutdown. A new service is a generated skeleton plus domain code.
3. **One platform library.** `internal/platform` holds everything in point 2 as importable packages. A service that reimplements any of it fails review.
4. **One pipeline.** The same CI job builds, tests, scans and deploys every service. Adding a service adds a matrix entry, not a pipeline.
5. **One local environment.** `docker compose up` brings the whole system, Keycloak, Postgres, NATS and the Grafana stack, seeded, on a developer laptop. If a new joiner cannot run the system within thirty minutes of cloning, that is a defect with a ticket.

---

# 2. Identity and access, with Keycloak

## 2.1 Why this matters more here than in a typical system

The single most consequential requirement in this project is ADR-03: only the attending clinician may retrieve an individual clinical record, and no management role may do so under any circumstance. Keycloak is not merely a login convenience — it is where that rule is expressed in a form KMC ICT can audit independently of the application code.

## 2.2 Realm configuration

Realm `kmc`, shared with other KMC systems if ICT prefers, otherwise `kmc-hwms`.

| Client | Type | Purpose |
|---|---|---|
| `hwms-web` | Public, PKCE, standard flow | The React application, via the gateway |
| `hwms-<service>` | Confidential, client credentials | Service to service calls |

**Browser token handling uses the backend-for-frontend pattern.** The gateway completes the OIDC code exchange, holds the refresh token server side, and issues the browser an `HttpOnly`, `Secure`, `SameSite=Strict` session cookie. Access tokens are never written to `localStorage` or `sessionStorage`. In a system holding health data, a token readable by any script on the page is not acceptable.

## 2.3 Roles

Mapped from SRS Appendix 6.5, extended for the QHSE units and the read-only roles the stakeholder requested on 31 July 2026.

| Keycloak role | SRS role | Notes |
|---|---|---|
| `hwms-physician` | Occupational Health Physician | **Only role granted the `clinical` scope** |
| `hwms-ohs-officer` | OHS Officer | Ergonomics and environmental capture |
| `hwms-safety-officer` | New | Incident capture and investigation |
| `hwms-division-head` | Head, Health and Wellness | Approvals, plans, returns |
| `hwms-executive` | Executive Management | Aggregates and reports |
| `hwms-director-view` | New, read only | Dashboard and reports. No entry screen, no approval, no clinical navigation |
| `hwms-manager-view` | New, read only | As above, optionally scoped to one unit |
| `hwms-admin` | System Administrator | Users and reference data. **Never clinical** |
| `hwms-dpo` | Data Protection Officer | Sole reader of `clinical_access_log` |

**The two read-only roles carry separate permission sets.** An earlier draft gave them one shared policy differing only in label, which no longer holds: the Manager receives aggregate unit drilldowns subject to the suppression rules, and the Director receives company-level headline values and trends only. Those are different data exposures and must be different policies, or the narrower role inherits the wider one by accident.

The reduced detail at Director level reflects the oversight task, not lesser authority. Record that rationale in the specification — otherwise the first director to notice reads it as a defect.

**The administrator cannot grant themselves clinical access in practice as well as in policy.** Grant the `hwms-physician` role through a Keycloak group that requires a second approver, or restrict role assignment to a dedicated realm-management role held by a different person. Whichever ICT chooses, every role grant is written to `hwms-audit`.

## 2.4 Enforcement, twice, deliberately

A token claim is a statement about who is asking. It is not authorisation. Every service checks permission **at the HTTP handler and again in the service layer**, per NFR-SEC-04. The second check is not redundant: it is what protects a code path reached from an event consumer, a scheduled job, or a future internal caller that never passes through a handler.

The clinical store is wrapped so that reading is structurally impossible without logging. The undecorated store is unexported; the decorator writes to `hwms-audit` **before** returning the record, per ADR-11 and FR-SEC-04. A record returned without a log entry is a build failure, proved by test.

## 2.5 What Keycloak gives that must be used

- Multi-factor authentication on `hwms-physician` and `hwms-admin`, satisfying FR-SEC-08 without application code.
- Idle session timeout, conservatively set for shared Infirmary workstations, satisfying FR-SEC-07. The value requires a view from the Division — currently open.
- Brute-force detection and lockout, satisfying OPS-15.
- Identity brokering to the corporate identity provider later, which is exactly the INT-04 seam. Because the application only ever sees OIDC, that later change is Keycloak configuration and not an application release.

**Break-glass access (FR-SEC-09, C-01) is not built until C-01 is answered.** When it is, it is implemented as a Keycloak-issued, time-limited scope requiring a stated reason, written to `clinical_access_log` with route `break_glass`, and notifying the Physician on next sign-in. A half-implementation of this is worse than none.

---

# 3. Workplace safety: recording the data behind the requested metrics

The stakeholder asked for zero fatalities, zero workplace injuries, total recordable incidents, and total incidents investigated, and asked how the data behind them is recorded. This section answers that. It is the design proposal, and the items marked **decision** need the Division's and the safety function's confirmation.

## 3.1 The principle applies unchanged

These figures are counts drawn from events — though not all of them count the same thing, which 3.6 sets out precisely: fatalities and injuries count **people**, recordable incidents and near misses count **events**, and investigations are a completed-against-required ratio. Under ADR-01 the system records the events and derives all of them. A dashboard where someone types "3 recordable incidents" is the same second manual system the project exists to avoid. So the safety unit gets an incident register, and the metrics fall out of it.

## 3.2 The incident record

One record per event, created by the safety officer, at the time of the event.

| Field | Notes |
|---|---|
| `occurred_at`, `reported_at` | Both. The gap between them is itself a reporting-culture indicator |
| `location_id_ref`, `unit_id_ref` | From the admin register |
| `activity`, `description` | What was being done, what happened |
| `person_category` | Employee, contractor, intern, visitor. Determines which denominators the event belongs to |
| `person_id_ref` | Optional. **Not a clinical reference.** See 3.5 |
| `event_classification` | Occupational accident, occupational disease, dangerous occurrence, or incident and near miss, following the terminology of the Occupational Safety and Health Act, 2006. **One classification field, not two** — an earlier draft carried a parallel incident-type list, and two overlapping classifications guarantee they will disagree. Property damage, fire and vehicle events are recorded through this field with a supporting descriptor |
| `severity` | Fatality, lost-time injury, restricted work or job transfer, medical treatment, first aid only, or no injury |
| `fatality_count`, `injury_count` | Counts of **people** affected. Deliberately distinct from the count of events, see 3.6 |
| `days_away`, `restricted_days` | Supports severity-rate reporting in a later phase |
| `recordability`, `recordability_basis`, `determined_by`, `determined_at` | Pending, recordable, or not recordable. **A determination made by a named person, not a computation.** See 3.3 |
| `investigation_required`, `investigation_required_reason` | Sets the S4 denominator, see 3.4 |
| `body_part`, `mechanism`, `agency` | Standard coding for trend analysis |
| `potential_severity` | What it could have been. A near miss with fatal potential is the most valuable record in the register |
| `reportable_to_authority` | Whether the event is notifiable under the Occupational Safety and Health Act, 2006. **Decision:** the notification threshold and recipient require confirmation from Legal and the safety function |

## 3.3 Recordability is determined by a person, not computed by the system

Version 1.0 of this plan specified that the system computes recordability from a severity ladder, in which an incident is recordable if it results in death, days away from work, restricted work or job transfer, medical treatment beyond first aid, or loss of consciousness. **That was wrong on two counts and is withdrawn.**

It imported a foreign jurisdiction's rule and applied it to a Ugandan workplace. The Occupational Safety and Health Act, 2006 works in different terms — occupational accident, occupational disease, dangerous occurrence — and the threshold at which KMC treats an event as recordable is a decision KMC has not yet made. Encoding someone else's threshold would have quietly manufactured that decision.

It also broke Rule 1 of the build brief. A recordability threshold is a threshold, and thresholds live in effective-dated reference data, never in application code. The system that refuses to hard-code an air quality limit cannot hard-code an injury classification rule.

**Decision.** The officer records severity and event classification as facts, then makes a separate recordability determination — pending, recordable, or not recordable — with a stated basis, their name and a timestamp. The system counts determinations; it does not make them. When KMC approves a written rule, it becomes an effective-dated reference row that pre-fills the determination and leaves it overridable, which is the same pattern as every other configurable rule in the system.

Severity remains a recorded fact because the injury counts depend on it:

| Severity | Feeds | Recordable |
|---|---|---|
| Fatality | S1, and S2 is reported separately from it | Determined |
| Lost-time injury, days away from work | S2 | Determined |
| Restricted work or job transfer | S2 | Determined |
| Medical treatment beyond first aid | S2 | Determined |
| First aid only | S2, shown as a distinct band | Determined |
| No injury — near miss, dangerous occurrence, property damage | S5 and the register views | Determined |

**"Zero workplace injuries" counts any injury, including first aid only.** This is the Division's choice and it is the more demanding reading. It carries one well-known failure mode that the design must answer: if every first-aid case counts against a target of zero, the cheapest way to hit the target is to stop reporting first-aid cases, and the register degrades exactly where early warning lives.

Two safeguards, both required. Show S2 **broken down by severity band** rather than as a single number, so a month of four first-aid cases is visibly different from a month with a lost-time injury. And report the near-miss count at S5 beside it, so that reporting more is not uniformly punished. A safety dashboard that only ever rewards silence will be given silence.

## 3.4 The investigation record

"Total incidents investigated" is a ratio, not a count, or it cannot be read. Ten investigations against ten incidents is a functioning safety system; ten against forty is not.

**The denominator is investigations *required*, not incidents reported.** Not every event warrants a formal investigation, and a system that treats a first-aid cut as an outstanding investigation produces a permanently failing metric that everybody learns to ignore. Each incident therefore carries an explicit investigation-required flag and a reason, set by the officer at the time of recording. If July has ten reported events of which six require investigation and five are complete, the metric reads five of six, and the remaining four are not overdue — they were never due. Where KMC later approves a rule making serious or recordable events automatically require investigation, that rule pre-fills the flag and remains overridable, per 3.3.

| Field | Notes |
|---|---|
| `incident_id` | One investigation per incident |
| `status` | Not started, in progress, completed |
| `investigator`, `method` | Five-why, ICAM, or the Division's chosen method |
| `root_causes` | Structured, not only free text, so causes become analysable |
| `due_at`, `completed_at` | Drives an overdue flag, reusing the ergonomics corrective-action pattern |
| Corrective actions | The **same** `corrective_action` model as ergonomics, with owner, due date, evidence and approval |

Reusing the corrective-action model across ergonomics, safety and environment is deliberate. Three near-identical action tables would be three places to fix the same bug.

## 3.5 Where safety meets clinical, and where it stops

An injured employee is treated at the Infirmary, so one event produces a safety record and a clinical record. **They are not the same record and the boundary between them is load-bearing.**

The safety incident may carry a `clinical_encounter_id_ref` written by the Physician. The safety service can read from that reference exactly one fact: whether the person was treated at the Infirmary, yes or no. It cannot read the encounter. The safety officer sees "treated at Infirmary: yes"; the diagnosis, the narrative and the examination remain inaccessible, exactly as they are to the Division Head.

This is ADR-03 holding at a new boundary that ADR-03 did not anticipate, and it should be written into the SRS as an explicit rule rather than left to be rediscovered.

## 3.6 The metric definitions

| ID | Metric | Numerator | Denominator | Target | Source |
|---|---|---|---|---|---|
| S1 | Fatalities | **People** killed in work-related events | Absolute count | 0 | Computed |
| S2 | Workplace injuries | **People** injured in work-related events, any severity including first aid, banded by severity | Absolute count | 0 | Computed |
| S3 | Total recordable incidents | **Events** determined recordable per 3.3 | Absolute count | Informational, no invented target | Computed |
| S4 | Investigations completed | Required investigations completed | Required investigations, per 3.4 | 100% | Computed |
| S5 | Near-miss reports | Near misses and dangerous occurrences recorded | Absolute count | **Higher is better** | Computed |

**S1 and S2 count people; S3 counts events.** One event injuring three people is one recordable incident and three injuries. Conflating the two produces figures that cannot be reconciled with anything the safety function reports elsewhere, and the difference must be visible in the field names, not left to whoever writes the query.

**S3 carries no target.** A count of recordable incidents against an invented threshold would imply KMC has set one. It has not. Show it as informational until a target is approved, and give the dashboard an explicit informational status for exactly this case, distinct from within-target, breach and no-data.

S5 is proposed as an addition. Every other metric in this system falls when safety fails; a near-miss count *rising* is usually a sign the reporting culture is improving, and a dashboard that only ever rewards silence will get silence. Show it, and label its direction explicitly so it is not misread.

**Rate-based metrics require one more input.** The total recordable incident rate is conventionally normalised as recordable incidents × 200,000 ÷ hours worked, which makes performance comparable across periods and against industry figures. That requires **monthly hours worked**, which HR holds and HWMS does not. Whether HR can supply it is unresolved, and the answer is not assumed here. The monthly return carries an optional, clearly labelled hours-worked field whose only purpose in the near term is to put the question in front of the person entering the return. No rate is computed until HR confirms the figure is available and reliable; the field shows "Not supplied" and nothing is derived from it. Until it is supplied, S3 shows a count and the rate shows "No data" — it is never estimated. Note that any such rate inherits KMC's own recordability definition, so it is comparable across KMC periods but not against published industry figures unless the definitions happen to align. Label it accordingly.

## 3.7 Period attestation: making zero mean something

A safety dashboard reporting zero fatalities is making one of two entirely different statements. Either nothing happened, or nobody entered anything. Every other metric in this system already distinguishes those cases — that is what FR-RET-04 and the no-data rule exist for — but a count metric hides the distinction, because an empty register and a clean month both render as zero.

**Each period is therefore attested.** The safety officer confirms that all known events for the month have been entered. Until that happens the period is open, and the design follows from it:

| Period state | Register | Display |
|---|---|---|
| Open, no events entered | Empty | **No data.** Never zero |
| Open, events entered | Partial | Provisional values, marked as such |
| Attested, no events | Empty | **Zero.** A meaningful, defensible zero |
| Attested, events entered | Complete | Final values |

Attestation is blocked while any incident in the period has a pending work-related status or a pending recordability determination, because a figure that could still move is not something a person should be asked to attest to.

This is ADR-06 applied to a new domain. The Division already accepted that "monitoring completed as scheduled" is a different question from "readings within limit"; here, "the register is complete" is a different question from "the count is zero", and the same reasoning says do not merge them.

---

# 4. Observability with Grafana

## 4.1 Stack

| Signal | Tool | Source |
|---|---|---|
| Metrics | Prometheus | Go services, RED metrics per endpoint, database pool stats, outbox lag, NATS consumer lag |
| Logs | Loki | Structured JSON via `slog`, correlated by trace id |
| Traces | Tempo | OpenTelemetry SDK, propagated through gateway, HTTP calls and NATS messages |
| Dashboards and alerting | Grafana | One folder per service plus one system overview |

The OpenTelemetry setup lives in the platform library, so a service gets all three signals from the skeleton without per-service instrumentation code.

## 4.2 The rule that makes this safe

**No clinical content in any telemetry signal.** No patient identifier, no name, no diagnosis, no free-text clinical field in a log line, a span attribute, a metric label or an exception message. This is OPS-14 and it is easy to violate accidentally by logging a request body during debugging.

Three enforcement measures, because one is not enough:

1. The platform logger takes structured fields only, and the clinical service's logger is constructed with a redacting handler that drops any field not on an allow-list.
2. A CI check greps for logging calls in `hwms-clinical` that pass a domain struct rather than named safe fields.
3. Patient and encounter identifiers are never used as metric labels — separately from privacy, unbounded label cardinality will destroy Prometheus.

Trace sampling for clinical routes records timing and status only. It never records payloads.

## 4.3 What to alert on

Alerts exist to protect the clinical service and the integrity of the reported figures, not to page someone about CPU.

| Alert | Why |
|---|---|
| Clinical service unavailable | NFR-AVL-05. Triggers the printable downtime form procedure |
| Clinical access log write failure | A read that was not logged is an ADR-11 breach. **Fail the read rather than serve it unlogged** |
| Outbox relay lag above threshold | Metrics are drifting from records |
| Nightly backup failure, or restore test overdue | OPS-05, OPS-08 |
| Monthly return not submitted by the reporting date | FR-RET-04, prevents a period silently reporting incomplete |
| Licence within 90, 60, 30 days of expiry | FR-LIC-03, from a scheduled job, not from someone opening a screen |
| Authentication failure rate spike | OPS-15 |

## 4.4 What Grafana is not

Grafana is for operating the system. **It is not a second route to the Division's data.** No Grafana dashboard queries the clinical database, and no Grafana dashboard reproduces a KPI. The Division's dashboard is the product, subject to the minimum cell size guard and the access matrix; a Grafana panel is subject to neither. Grafana access is ICT and the maintainer only.

---

# 5. Frontend

React 18, TypeScript, Vite, Tailwind, TanStack Query, react-hook-form with zod. One single-page application, feature modules mirroring the service boundaries, served through the gateway.

**The design language is already decided and must not be re-litigated.** Build Brief Section 1 holds the tokens, the typography and the status conventions, and the prototype is their working reference. In particular:

- KMC red is masthead, one primary action per screen, and active navigation. It never indicates status.
- Every status carries a glyph, a text label and a colour, in that order. The greyscale test is part of the definition of done for every screen.
- Measured values render in IBM Plex Mono with tabular figures. Interface text renders in IBM Plex Sans.
- No limit, target or threshold appears in TypeScript. Those arrive from `hwms-admin` at runtime.
- Incomplete renders as "No data" in neutral, never as failure.

`StatusIndicator` and `DataValue` are the only means of rendering a status or a measured value. Lift both from the prototype rather than rewriting them.

Authentication is a redirect to Keycloak through the gateway; the application never handles a password and never stores a token.

**Navigation follows the confirmed unit structure**, with items hidden entirely rather than disabled when the role has no access:

```
QHSE Management System         (product name above the four units)

Dashboard
Health and Wellness            (the module. "Infirmary" is retired)
  Occupational health
    Patients                   (Health and Wellness Officer only)
    Patient visits             (Health and Wellness Officer only)
    Surveillance
    Occupational disease cases
  Ergonomics and wellness
  Industrial hygiene           (occupational and indoor views of the monitoring register)
Workplace safety
  Incidents
  Investigations
  Corrective actions
Environment and sustainability (placeholder until confirmed, Section 8)
  Ambient monitoring           (ambient view of the same monitoring register)
Quality inspection and testing (placeholder until confirmed, Section 8)
Monthly returns
Reports
Administration                 (Administrator only)
```

**The module is "Health and Wellness"; the role is "Health and Wellness Officer".** The 31 July minutes conflated the two and recorded the module as being renamed to the role name. Correct the minutes rather than the naming.

Note that **industrial hygiene and ambient monitoring are two views of one register**, not two registers, per 8.2. The medical certification register does not appear because its removal was confirmed at P-11; the generic expiry pattern remains available for approved permits, consents and calibration records.

---

# 6. Delivery phases

Each phase is independently demonstrable and does not begin until the previous phase meets its criteria.

## Phase 0 — Platform foundation

Monorepo, service skeleton, platform library, Keycloak realm and roles, Postgres instances, NATS, Grafana stack, CI pipeline, Compose environment, staging environment.

**Done when:** a generated no-op service is deployed to staging; a user signs in through Keycloak and reaches it via the gateway; its traces, logs and metrics appear in Grafana; a request without the required role returns 403 and appears in `hwms-audit`; a developer clones the repository and runs the whole system locally in under thirty minutes.

## Phase 1 — Administration, audit and identity

`hwms-admin`, `hwms-audit`, role mapping, reference-data screens, seed loaders.

**Done when:** the environmental standards from SRS Appendix 6.3 load with effective dates and correct active flags; the KPI registry loads; a limit is superseded through the interface with a new effective date and historical evaluations are unchanged; no limit or target exists anywhere in Go or TypeScript source; every reference change appears in the audit log; `clinical_access_log` rejects UPDATE and DELETE at the database role level.

## Phase 2 — Clinical

`hwms-clinical`, patient registry, encounter with all twelve sections, section state, completeness, signing, amendment.

**Done when:** a patient with no employee number can be registered and treated; a minimal walk-in completes in under two minutes; a section marked not applicable requires a reason; a signed encounter cannot be edited, only amended; every individual record read appears in `clinical_access_log` before the response is sent; **an automated suite proves every non-Physician role receives 403 on every clinical route, and it runs on every merge.**

Write that last test before the feature. It is the acceptance gate for ADR-03 and it is the test most likely to be quietly weakened later.

## Phase 3 — Metrics, returns and dashboard

`hwms-metrics`, periodic returns, KPI computation, dashboard with provenance, read-only Director and Manager roles, minimum cell size guard.

**Done when:** the worked example at SRS Appendix 6.6 reproduces exactly; a missing return renders K1 and K3 as "No data" rather than a computed value; drill-down from the occupational disease metric exposes no patient identity; a department below the minimum cell size renders as a suppressed value; every card shows its source chip; a Director account sees the dashboard and no entry control anywhere; `hwms-metrics` holds no clinical credentials, proved by inspecting its configuration.

## Phase 4 — Workplace safety

`hwms-safety`, incident register, severity classification, investigations, corrective actions, metrics S1 to S5, hours-worked return field.

**Done when:** every severity and classification can be recorded independently of the officer's Recordable/Not recordable determination; S1 to S5 compute from the register with no manual KPI entry; the investigated ratio moves when an investigation completes; a near miss records without an injury; the safety view of a clinically linked incident shows treatment status and nothing else, proved by test.

## Phase 5 — Environment and ergonomics

`hwms-environment` and `hwms-occupational`: monitoring plans, events, readings, immutable limit evaluation, not-performed recording, ergonomic assessments, corrective actions, and the reusable expiry-tracked register for approved permits, consents and calibration records.

**Done when:** a reading above limit stores a breach that survives a later change to the limit; an inactive parameter is visible, not enterable, and excluded from the index denominator; a not-performed event reduces completeness without affecting compliance; an approved expiry-tracked record 21 days from renewal raises a dashboard alert from a scheduled job.

## Phase 6 — Reporting

Monthly and quarterly reports matching the template layout, PDF and Word export, report archive.

**Done when:** a generated month is comparable to the Division's existing template; no individual clinical content appears in any report; every report carries generation timestamp, user and period; a previously circulated report reproduces exactly from the archive.

## Phase 7 — Expansion

Environment and Sustainability, Quality Inspection and Testing, HR integration through INT-01 to INT-03, corporate SSO through Keycloak brokering.

Begins only when the parameters in Section 8 are confirmed by their unit owners.

---

# 7. Engineering practice

| Area | Standard |
|---|---|
| Source control | **Git, from the first commit, on a KMC-approved remote.** There is currently no repository. This is the single cheapest risk reduction available and it is presently unaddressed |
| Branching | Trunk-based, short-lived branches, required review |
| Testing | Go `testing` with `testify`; `testcontainers` for integration; consumer-driven contract tests between services; Playwright for the access-control suite; k6 only if load becomes a question |
| Coverage priority | KPI computation, access-control enforcement and limit evaluation are the minimum, per NFR-MNT-05 |
| CI | Build, unit, integration, contract, migration check, container build, vulnerability scan, SBOM |
| CD | Automatic to staging on merge; production by tag with a named approver |
| Secrets | Never in the repository. Kubernetes secrets or Vault per ICT preference. Clinical credentials issued to `hwms-clinical` alone |
| Environments | Local Compose, staging, production. **Staging contains synthetic data only, always**, per NFR-PRIV-07 |
| Documentation | Architecture decisions as ADRs in the repository; OpenAPI contracts generated and published; a runbook per alert |

**Deployment target is open.** Kubernetes, k3s, Nomad or Compose on virtual machines are all workable; the choice belongs to KMC ICT and is recorded as **P-01** in Section 10. Everything above is orchestrator-independent except the manifests.

---

# 8. The three additional units

The Corporation intends HWMS to cover the whole Quality, Health, Safety and Environment department. The Health and Wellness unit is defined. The remaining three are not, and the stakeholders have said they are not yet certain what belongs under them.

**These are proposals for confirmation, drawn from how the corresponding functions are structured in manufacturing organisations generally and under the relevant management-system standards. They are not requirements, and nothing here should be built until the unit's owner confirms it.** The purpose of putting them in writing is to give the owner something to correct, which is faster than asking them to specify a unit from a blank page.

## 8.1 Workplace safety — defined, buildable now

Structured around occupational safety management practice, ISO 45001 in outline. Covered by Section 3 above. Candidate records beyond the incident register, for a later phase:

| Record | Purpose | Candidate indicator |
|---|---|---|
| Hazard identification and risk assessment | Register of hazards, risk rating, controls, review date | Assessments current, high risks with controls in place |
| Permit to work | High-risk activity authorisation, hazards, controls, closure | Permits closed correctly, permit audit pass rate |
| Safety inspection and audit | Planned inspections by area, findings, actions | Inspections completed against plan |
| Toolbox talk and training | Attendance, topic, competence records | Training completed against plan |
| Personal protective equipment | Issue, inspection, compliance observation | PPE compliance rate |
| Emergency preparedness | Drills, equipment checks, response times | Drills completed, response time |
| Contractor safety | Contractor induction, competence, performance | Contractor incident rate |

## 8.2 Environment and sustainability — proposal for confirmation

Structured around environmental management practice, ISO 14001 in outline, with the National Environment Management Authority obligations that already apply to the plant. The 2026 edition of ISO 14001 raises climate risk, biodiversity and resource availability from peripheral concerns to central ones, which is worth knowing before the unit's scope is fixed.

**The industrial hygiene and environment split is resolved by a shared register, not by dividing the parameters.** PM2.5 and noise can be measured for either purpose: industrial hygiene asks what an employee is exposed to at the workstation, environment asks what the facility releases at its boundary. The parameter is identical; the sampling method, the applicable limit and the accountable unit are not.

One reading is therefore stored once, with a **required context** of occupational exposure, indoor workplace, or ambient and environmental, and the standard family and version it was evaluated against. Industrial hygiene sees the occupational and indoor views; environment sees the ambient view. The industrial hygiene compliance index draws only on eligible occupational readings.

This removes the duplicate-entry problem and, more importantly, makes it structurally impossible to judge a worker-exposure reading against an ambient limit — which is the error that would otherwise be invisible, produce a plausible number, and be wrong in the direction of false reassurance.

| Candidate scope | Records | Candidate indicator |
|---|---|---|
| Waste management | Waste streams, quantities, disposal route, licensed handler, manifests | Waste generated per unit produced, percentage diverted from landfill |
| Effluent and water | Discharge monitoring against consent limits, water abstraction | Discharge compliance, water use per unit produced |
| Emissions to air | Stack and fugitive emissions, monitoring events | Emission compliance, monitoring completed against plan |
| Energy | Consumption by source and area, renewable share | Energy per unit produced, renewable percentage |
| Greenhouse gas | Scope 1 and 2 as a minimum, Scope 3 later | Emission intensity per vehicle produced |
| Environmental permits and licences | Consents, expiry, conditions | Permit validity, condition compliance — reuses the existing licence register |
| Environmental incidents | Spills and releases | Reportable events, closed within target — reuses the incident register |
| Environmental audits and impact assessments | Findings, actions, closure | Findings closed on time |

Note how much of this reuses machinery the system already needs: an effective-dated limit register, a monitoring plan and event model, a licence register, an incident register and a corrective-action model. Building the Health and Wellness unit properly makes this unit substantially cheaper.

**Questions for the unit owner.** Which permits and consents does the plant hold, and who owns their renewal? Which discharge and emission points are monitored, at what frequency, by whom, and against which schedule of the applicable regulations? Is greenhouse gas reporting a current obligation or a future intention? Is there an existing environmental management system whose records must not be duplicated?

## 8.3 Quality inspection and testing — proposal for confirmation

Structured around quality management practice for vehicle manufacturing: ISO 9001 with the automotive sector requirements of IATF 16949, whose emphasis is defect prevention, variation reduction and waste elimination across the supply chain.

| Candidate scope | Records | Candidate indicator |
|---|---|---|
| Incoming inspection | Supplier part inspection, accept and reject, supplier reference | Supplier defect rate, incoming rejection rate |
| In-process inspection | Inspection points against the control plan, measurements | Conformance at inspection point, first-pass yield |
| Final inspection and pre-delivery | Vehicle-level checklist, defects found | Defects per unit, direct-run rate |
| Test and validation | Functional, road, electrical and safety tests, results | Test pass rate, retest rate |
| Non-conformance | Non-conformance reports, disposition — rework, repair, scrap, concession | Open non-conformances, ageing |
| Corrective and preventive action | Root cause, eight-discipline or equivalent, verification | Actions closed on time, recurrence rate |
| Calibration and measurement | Instrument register, calibration due dates, measurement system analysis | Instruments in calibration |
| Supplier quality | Approval, audits, scorecards | Supplier score, on-time quality |
| Customer and warranty | Complaints, warranty claims, field failures | Complaint resolution time, warranty rate |
| Cost of poor quality | Scrap, rework, warranty cost | Cost of poor quality as a share of output |

Two of these overlap the existing design directly. The **calibration register** answers the open industrial-hygiene question about instrument calibration status, which is currently outside the system. The **corrective and preventive action** model is the same one used by ergonomics, safety and environment. Both argue for building the shared components in a way the quality unit can adopt without a rewrite.

**Questions for the unit owner.** Is KMC certified or pursuing certification to IATF 16949 or ISO 9001, since that determines which records are mandatory rather than optional? Do inspection results already live in a manufacturing execution or enterprise system that HWMS must not duplicate? Is the unit of measure a vehicle, a subassembly or a batch? Who owns the calibration register today?

## 8.4 How the placeholders behave until then

A placeholder is a navigation entry and a page that states what the unit is proposed to cover, that its parameters are not yet confirmed, and who owns the confirmation. **A placeholder never shows a fabricated figure.** A stakeholder who sees a number assumes a capability exists behind it, and the credibility cost of correcting that later is higher than the demonstration value of showing it. This is the same rule as FR-KPI-07 and it applies to whole modules as much as to single metrics.

---

# 9. Corrections to the prototype track

The prototype track is confirming requirements in parallel. These are the constraints that keep its output useful to this plan. They are corrections in the sense that each one is a thing a prototype naturally drifts into doing, and each one costs real money later.

1. **The prototype is not the first increment of production, and its code is not migrated.** Its enduring output is threefold: confirmed decisions, the design language, and the React components that express it. Say this explicitly wherever the prototype is described, or someone will eventually ask why the production build is "starting again".

2. **Do not deepen the demonstration login.** Production authentication is Keycloak and OIDC. Every hour spent making the demo login more realistic is an hour thrown away, and worse, it creates the impression that authentication is solved. Keep it in one module, keep it labelled as a workflow simulation, and let it be deleted whole.

3. **Do not seed the new safety metrics with invented figures.** The stakeholder asked for zero fatalities, zero injuries, recordable incidents and incidents investigated. If the prototype shows a plausible number with no incident register behind it, the demonstration is misleading in exactly the way this project set out to avoid. Show "No data" with the provenance chip, or build the minimal incident capture from Section 3.2 so the number is real. Either is defensible. A seeded number is not.

4. **Placeholders must be honest, per 8.4.** Name the unit, state that its parameters are unconfirmed, name the owner who will confirm them. No charts, no figures.

5. **Add hours worked to the monthly return now.** It costs one input field in the prototype and it settles a question that otherwise surfaces halfway through Phase 4: whether rate-based safety metrics are wanted, and whether HR can supply monthly man-hours.

6. **Rename to "Health and Wellness Officer" in labels only.** Keep `encounter` and `patient visit` as the internal and interface terms respectively, per SRS v2.0 Section 5.1. Renaming the domain vocabulary as well as the navigation label will cost more than it returns and will make the prototype harder to read against the specification.

7. **Read-only roles hide entry controls; they do not disable them.** A disabled button tells a director there is something they are not allowed to do, which invites a conversation about being allowed to do it. Hidden is calmer and matches Build Brief Section 2.1. Say plainly in the demonstration that this is a workflow illustration, not a security boundary.

8. **Do not build the ergonomic template builder, attachments, photographs, or the amendment workflow.** All four are explicitly deferred, and all four are attractive to build. Deferral is a decision already taken.

9. **Keep the prototype under version control.** A local repository was initialised on 3 August 2026. A KMC-approved private remote remains a handover blocker because local Git alone does not remove the single-filesystem loss risk.

10. **Resolve the two specifications into one.** SRS v1.0 and SRS v1.1 disagree — retention, hosting, patient categories, minimum cell size, and now architecture. Production cannot be built against two documents that contradict each other. Issue **v2.0** merging them: v1.1's confirmed-versus-proposed labelling discipline applied to v1.0's completeness, plus ADR-13 from Section 1.1, the safety unit from Section 3, the read-only roles from Section 2.3, and the unit structure from Section 8. Everything the stakeholders confirm on the prototype track lands in that document.

---

# 10. Open items for KMC ICT and the Division

The SRS carries 26 confirmation items, of which C-01, C-04, C-07, C-08, C-11, C-12, C-22, C-24 and C-26 are high impact and unanswered. These are the additional ones this plan creates.

| ID | Question | Proposed answer | Owner |
|---|---|---|---|
| P-01 | What orchestrates the services in production? | Kubernetes or k3s on KMC infrastructure. Compose on virtual machines is acceptable if ICT prefers | ICT |
| P-02 | Is there an existing KMC Keycloak realm, or is one provisioned for HWMS? | Provision `kmc-hwms`, broker to the corporate identity provider later | ICT |
| P-03 | REST with OpenAPI, or gRPC, for internal calls? | Match whatever Velo uses. Default REST | ICT |
| P-04 | Is there an existing Grafana and Prometheus estate to join? | Join it if one exists; deploy the stack alongside HWMS if not | ICT |
| P-05 | Who operates the system day to day after handover? | **Release blocker.** Named business owner, technical owner, data owner and support contact, per C-26 and F05 | Division and ICT |
| P-06 | Does "zero workplace injuries" mean all injuries or lost-time injuries? | **Answered.** Any injury including first aid, displayed banded by severity with the near-miss count beside it, per 3.3 | Division |
| P-11 | Is the removal of the medical certification register, and with it KPIs 6 and 7, confirmed? | **Confirmed** verbally by Benard Okanyakure on 31 July 2026, omitted from the meeting minutes and recorded here as a dated template deviation. The dashboard carries a note explaining why five indicators appear where the template lists seven. The generic expiry-tracking capability is retained for environmental permits, consents and instrument calibration. **Residual action:** obtain the confirmation in writing and record the confirmer's title, since a verbal recollection is thin authority for withdrawing an approved-template KPI and the person who recorded it is leaving | Division and Executive |
| P-12 | What is KMC's rule for treating an event as recordable? | To be issued as an effective-dated reference row. Until then the determination is made by a named officer with a stated basis, per 3.3 | Safety function and Legal |
| P-13 | Once a dedicated safety officer role exists, what does that role see of an injured person's identity? | De-identified by default, with the same suppression discipline as clinical aggregates. Small-plant incident detail identifies people even without a name, per 3.5 | Data Protection Officer |
| P-07 | Can HR supply monthly hours worked, and on what basis? | **Open.** Not assumed. An optional labelled field on the monthly return asks the question; no rate metric exists until the answer is yes | HR and the Division |
| P-08 | Which incidents are notifiable to the authorities, and by whom? | To be confirmed against the Occupational Safety and Health Act, 2006, and its regulations | Legal and safety function |
| P-09 | Does industrial hygiene monitoring sit with Health and Wellness or with Environment and Sustainability? | **Answered.** Neither owns it exclusively. One shared register, each reading carrying a required context and standard family, with a unit-specific view over it, per 8.2 | Division and environment function |
| P-10 | What does "view the dashboard without specific access rights" mean in practice? | Signed-in read-only Director and Manager roles. **No unauthenticated route is exposed** until the audience is defined and the clinical-derived aggregates are confirmed safe for it | Division and Data Protection Officer |

P-05 and P-10 should be settled first. P-05 because nothing should be deployed with real data until someone owns it, and P-10 because it is the only item on this list that could, if answered carelessly, weaken ADR-03.

---

# 11. Risks

| Risk | Consequence | Mitigation |
|---|---|---|
| Operational burden of eight services exceeds the maintainer's capacity | The system decays after handover | Section 1.5, without exception. Reassess the topology at the end of Phase 1, while reversing it is still cheap |
| ADR-03 is eroded under management pressure | Loss of clinical confidentiality, exposure under the Data Protection and Privacy Act | The rule is in the access matrix, in the Keycloak roles, in the service credentials and in a merge-blocking test. Four layers, deliberately |
| Scope grows across four QHSE units before Health and Wellness is complete | Nothing is finished and nothing is trusted | Phase order. Units 2 to 4 are placeholders until their parameters are confirmed by their owners |
| No source control | Total loss of work is possible today | Section 7, first row. Do this before anything else in this document |
| Ownership after handover is undefined | The system is deployed and then unmaintained | P-05 is a release blocker, not a preference |
| Safety metrics are demanded before the incident register exists | Fabricated figures on an executive dashboard | Section 9, item 3 |

---

# 12. Sources for Section 3 and Section 8

The classification ladder, metric definitions and candidate unit scopes are drawn from general practice in occupational safety, environmental management and automotive quality management. They are starting points for confirmation by the responsible KMC function, not statements about KMC's obligations.

- Total recordable incident rate definition and formula — [National Safety Council, Injury Facts](https://injuryfacts.nsc.org/definitions/trir-total-recordable-incident-rate/), [EHS Insight](https://www.ehsinsight.com/blog/trir-calculation-how-to-calculate-total-recordable-incident-rate)
- Recordable incident criteria and lagging versus leading indicators — [Creative Safety Supply](https://www.creativesafetysupply.com/articles/osha-incident-rates-calculators-formulas/), [OSHA standard interpretation](https://www.osha.gov/laws-regs/standardinterpretations/2016-08-23)
- Workplace safety function scope, permit to work and risk assessment — [SafetyCulture](https://safetyculture.com/topics/permit-to-work), [L2L, EHS in manufacturing](https://www.l2l.com/blog/ehs-manufacturing)
- Integrated QHSE management system structure — [Creative Safety Supply](https://www.creativesafetysupply.com/articles/quality-health-safety-environment-qhse-management-systems/), [Tekmon](https://www.tekmon.com/resources/blog/what-is-qhse-foundations-guide)
- Environmental indicators under ISO 14001 — [Dcycle](https://dcycle.io/blog/iso-14001-and-environmental-kpis-optimising-your-companys-environmental-impact/), [Astutis](https://www.astutis.com/astutis-hub/blog/5-essential-environmental-kpis)
- Automotive quality management under IATF 16949 — [Certainty Software](https://www.certaintysoftware.com/iatf-16949/), [NQA](https://www.nqa.com/en-us/certification/standards/iatf-16949)
- Uganda Occupational Safety and Health Act, 2006 — [Uganda Legal Information Institute](https://ulii.org/akn/ug/act/2006/9/eng@2006-06-08), [Ministry of Gender, Labour and Social Development OSH information system](https://oshmis.mglsd.go.ug/)

---

**End of document**
