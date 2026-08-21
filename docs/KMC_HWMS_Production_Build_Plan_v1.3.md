# Kiira Motors Corporation

## Health and Wellness management system

### Production build plan

**Version:** 1.3  
**Date:** 7 August 2026  
**Status:** For KMC ICT and Health and Wellness technical review  
**Governing requirements:** `KMC_HWMS_SRS_v2.1_DRAFT.md`  
**Companion decisions:** `KMC_HWMS_Stakeholder_Decision_Register_v0.4.md`  
**Supersedes:** `KMC_HWMS_Production_Build_Plan_v1.2.md`

## 1. Revision intent

The 4 August 2026 follow-up decision narrowed the product to Health and Wellness only. This revision:

- removes services, phases and expansion work for the two divisions that already have systems;
- removes the planned local Workplace Safety incident register;
- treats the four safety counts as attributed monthly returns or an integration from their authoritative system;
- moves laboratory testing and medical referral into the clinical phase;
- keeps Ergonomics and Wellness and Industrial Hygiene as the other two in-scope units;
- adds effective-dated laboratory reference ranges and referral confidentiality as first-class engineering work;
- treats the final product name and four source-document conflicts as recorded decisions, not implementation assumptions.

The prototype remains a requirements/design artefact. Its browser storage, demo login and synthetic records do not migrate to production.

## 2. Architecture

KMC’s microservice standard remains binding, but the bounded contexts reduce with scope.

| Deployable | Owns | Important boundary |
|---|---|---|
| `hwms-gateway` | OIDC browser session, routing, rate limiting | No business data or clinical transformation |
| `hwms-admin` | Organisation reference, KPI definitions, targets, Industrial Hygiene limits, laboratory ranges, effective dates | Every rule/limit/range is data, audited and versioned |
| `hwms-clinical` | Patients, visits, lab requests/results, referrals, PDF generation, signing/amendments | Separate database instance, credentials, encryption key, network policy and Keycloak clinical scope |
| `hwms-occupational` | Surveillance programme, occupational disease counts, ergonomics, Industrial Hygiene readings/actions | No clinical narrative or diagnosis |
| `hwms-metrics` | Monthly returns, safety ingestion seam, KPI/YTD computation, dashboard and report archive | Has no clinical database credentials; receives only approved non-clinical facts |
| `hwms-audit` | Audit log and clinical access log | Append-only database grants; clinical reads logged before response |

Use one monorepo, one Go service skeleton, one platform library, one CI matrix and one local Compose environment. Postgres 16 is one database per service; clinical uses a separate instance. Keycloak provides identity; NATS JetStream plus transactional outbox handles approved asynchronous facts; OpenTelemetry feeds the KMC Grafana/Prometheus estate or a project deployment if none exists.

### 2.1 Clinical event boundary

`hwms-clinical` must never publish patient name, diagnosis, narrative, HIV status, mental-health condition, treatment or free text to metrics or occupational services. Allowed messages are narrow facts such as signed encounter count, surveillance-context completion and approved referral-leave contribution with period. Contract tests reject clinical fields in published schemas.

### 2.2 Effective-dated reference data

`hwms-admin` exposes dated reads for:

- KPI target, direction, comparison and approaching band;
- Industrial Hygiene parameter limits, unit, averaging period and standard version;
- laboratory panel/analyte unit and population/applicability range.

Every evaluation request includes the event/result date. Industrial Hygiene readings and laboratory results store the reference ID, effective version, human-readable range/limit and evaluated outcome. Database constraints prevent later updates to those historical snapshots and abnormality/compliance flags.

### 2.3 Safety ingestion boundary

Do not create `hwms-safety` in this programme. `hwms-metrics` exposes two mutually exclusive adapters behind one canonical monthly payload:

```text
period
fatalities?
total_recordable_incidents?
total_recordable_injuries?
reportable_near_misses?
source_system_or_return
source_owner
received_at
received_by
```

The initial adapter may accept an approved signed/attributed monthly return. The integration adapter consumes the authoritative Workplace Safety system after DEC-027 identifies it. The payload uses nullable values; omission is No data, never zero. Store ingestion source and correction history. Do not expose an event capture endpoint.

## 3. Identity and confidentiality

Keycloak roles/scopes:

| Role | Scope |
|---|---|
| Health and Wellness Officer | Clinical and operational create/read/update subject to record state |
| Health and Wellness Manager | Metrics and operational aggregate read only; no clinical scope |
| Director viewer | Dashboard/report read only |
| Data Protection Officer | Audited clinical-access-log review; no routine clinical treatment role |
| System administrator | Configuration/identity; no clinical record scope |

Every clinical endpoint returns 403 to every token without the clinical scope. `hwms-clinical` is the only workload with clinical database credentials. Management roles cannot obtain a referral PDF by knowing its URL. PDF downloads are audited clinical reads.

### 3.1 Referral authorisation blocker

DEC-024 must be resolved before production authoriser accounts or authorisation payloads are exposed. Build the domain behind an interface that supports the proposed minimum-disclosure document independently from the clinical referral. Under the proposed handling:

1. clinical creates the referral;
2. clinical produces a summary containing patient, destination, referral reason and cost implication only;
3. authorised roles approve that summary without a clinical scope;
4. clinical receives only the approval decision, names, dates, remarks and summary identifier;
5. the clinical PDF stays with the Officer/receiving facility.

If KMC rejects this proposal and authorises management clinical access, stop and revise SRS, access matrix, DPIA, Keycloak scopes, audit tests and retention before implementation.

## 4. Clinical implementation

### 4.1 Visits

Implement patient registry, separate encounters, section state, vital signs, work-related consideration, signing and append-only amendments. A signed visit is the source for lab/referral initiation and its identifiers/vitals are copied as historical snapshots rather than re-keyed.

### 4.2 Laboratory requests and results

- Request aggregate: officer, time, patient/visit, specimen, panels/tests, indication, priority and pre-employment/periodic/exit/incident context.
- Result aggregate: one row per analyte with value, unit, applied-range snapshot, practitioner abnormality flag, verifier and date.
- Generic forms/ranges stay behind a feature flag and visible proposal label until DEC-029 supplies controlled KMC forms.
- The system may validate required fields and data types. It must not diagnose, recommend, derive an unapproved clinical flag or block a practitioner-selected abnormal result.
- A revised range creates a new effective-dated row; it never updates an old result.

### 4.3 Referral and PDF

Model drafted, authorised, issued, returned and reviewed transitions with actor/time audit data. Draft pre-fills from visit/patient snapshots. Returned sick leave emits an approved non-clinical contribution to metrics once, with idempotency key `referral_id + feedback_version`; corrections append a reversal/replacement rather than double count.

Generate the controlled PDF server-side from a versioned template. Include form number, confidentiality declaration and the controlled section labels. Preserve the current duplicate Section E/no Section D and “KMC infirmary officer” wording until DEC-025/026 authorise a new template version. Keep prior templates so an archived PDF reproduces exactly.

## 5. Metrics and dashboard

The canonical KPI registry carries effective dates, target label/value, comparison, direction, approaching band, source owner and approval state. `hwms-metrics` computes:

- the reporting-month value/status;
- the arithmetic average of January through the reporting month only when every required month exists;
- `Incomplete history (x/y months available)` otherwise;
- the count of nine reporting-month KPIs On target.

Near-miss evaluation is higher-is-better. UI and report contract tests assert the target is `≥ 200`, a value below the approaching band cannot be green, and the card/row contains the direction phrase. No target or band is compiled into frontend or Go decision logic.

Health-Related Absenteeism consumes the monthly return’s other health-related lost days plus idempotent linked referral-leave contributions, divided by month-end headcount. HR/Health and Wellness must confirm whether the production numerator risks overlap; record that as a data-mapping acceptance item before go-live.

## 6. Delivery phases

Each phase is independently demonstrable and gated by its tests.

### Phase 0: platform foundation

Monorepo, service skeleton/library, Keycloak realm, databases, NATS/outbox, observability, CI, local Compose and staging.

**Done when:** a user signs in through the gateway; role rejection is audited; all services produce health, logs, metrics and traces; a new developer runs the stack locally in under thirty minutes.

### Phase 1: identity, audit and reference administration

Build `hwms-admin` and `hwms-audit`; configure roles/scopes; implement effective-dated KPI, hygiene and lab reference APIs/screens; append-only clinical access log.

**Done when:** superseding a target/range leaves historical fixtures unchanged; source scans find no embedded decision thresholds; database roles reject audit UPDATE/DELETE; non-clinical roles cannot obtain clinical credentials.

### Phase 2: clinical visits, laboratory and referral

Build `hwms-clinical` patient/visit, laboratory request/result, medical referral lifecycle, linked leave event and versioned PDF. Laboratory and referral are not later-release expansion items.

**Done when:** an Officer raises request/referral from a signed visit without re-keying identity/vitals; a flagged abnormal result saves; changing a range does not change history; the referral completes all states; the PDF is recognised against the controlled form; leave is emitted once; every non-clinical role receives 403 on every clinical route. DEC-024 and DEC-029 are resolved before real data.

### Phase 3: ergonomics and industrial hygiene

Build `hwms-occupational` surveillance, disease count, ergonomic assessments/actions, monitoring events/readings and immutable reference evaluation.

**Done when:** completeness and compliance are separate; a later limit revision does not change a stored reading outcome; ergonomic action timing derives OH4; no removed-division route or data contract exists.

### Phase 4: returns, safety integration and dashboard

Build `hwms-metrics`, manual return with provenance, canonical safety adapter, nine KPI rows, YTD completeness, summary band, trends and viewer roles.

**Done when:** missing is No data; incomplete YTD is not averaged; near-miss direction tests pass; referral leave reaches absenteeism once; the metrics service has no clinical credentials; DEC-027 determines the production source adapter.

### Phase 5: reporting and readiness

Generate monthly/quarterly PDF and spreadsheet reports, archive exact versions, complete backup/restore, security/privacy review, training, support handover and runbooks.

**Done when:** archived reports reproduce; no report contains individual clinical content; greyscale/accessibility and access-control suites pass; operational owner/support contacts are named; restore and incident-response exercises are recorded.

There is no phase for removed divisions. Any future connection to their existing systems is a separately authorised integration project with its own requirements.

## 7. Test gates

| Gate | Required scenarios |
|---|---|
| Access | All non-clinical roles 403 on every patient, visit, lab, referral and PDF endpoint; guessed identifiers do not alter outcome; reads are audited. |
| Reference history | Supersede KPI target, hygiene limit and lab range; old calculation/result remains byte-for-byte unchanged. |
| Lab | Routine/urgent and all surveillance contexts; qualitative/numeric result; abnormal warning non-blocking; missing effective range fails with No reference rather than a source fallback. |
| Referral | Visit pre-fill; each valid transition; invalid skipped transition rejected; PDF template version; duplicate sign-off idempotency; returned leave correction without double count. |
| Metrics | All nine directions/targets from reference data; No data; zero supplied explicitly; approaching; off target; complete and incomplete YTD; near-miss higher-is-better. |
| Provenance | Manual/ingested safety correction keeps old and new source records; no event capture API exists. |
| Visual/accessibility | Glyph + word before colour; measured values mono/tabular; KMC red absent from status semantics; full changed-screen greyscale review. |
| Build/security | Unit, integration, contract, migration, SAST/dependency/container scans and SBOM pass. |

## 8. Rollout and operations

1. Resolve DEC-024, DEC-027, DEC-028 and DEC-029; receive controlled referral/lab forms.
2. Map existing Health and Wellness reference data and synthetic-test fixtures; import no prototype browser data.
3. Pilot with the Health and Wellness Officer using synthetic then approved non-sensitive test records.
4. Run parallel monthly reporting for an agreed period; compare every KPI/source with the authoritative return.
5. Enable real clinical data only after DPIA/privacy approval, access tests, backup restore, support ownership and user training pass.
6. Monitor failed clinical access, audit write failure, missing monthly returns, stale integration, outbox lag, PDF generation failure and reference records nearing expiry.

Rollback is by deployable version and reversible migration. Reference-data corrections create superseding rows; historical evaluations are never rewritten. Distributed events are idempotent and replayable from outbox/consumer offsets.

## 9. Open blockers

| Decision | Required before |
|---|---|
| DEC-024 referral confidentiality | Authoriser UI/API, DPIA completion and real referral use |
| DEC-025/026 controlled referral corrections | New PDF template/version |
| DEC-027 safety authoritative owner/system | Safety adapter go-live or any capture work |
| DEC-028 product name | Production branding, DNS and training material |
| DEC-029 laboratory forms/ranges | Real lab entry, clinical validation and training |
| KMC ICT hosting/Keycloak/Grafana choices | Staging infrastructure completion |
| Named business, data, technical and support owners | Production go-live |

## 10. Recorded implementation divergences

> **Implementation record.** This section describes the repository as built.
> It does not revise or waive the planned production guarantees. Where the
> repository records no reason for a divergence, the reason is stated as
> unknown rather than inferred.

| Planned position | Current implementation and reason | Consequence before production |
|---|---|---|
| Generate controlled PDFs server side from versioned templates and retain prior versions. | `web/src/lib/labPdf.ts`, `referralPdf.ts` and `patientHistoryPdf.ts` generate files in the browser with jsPDF. `web/src/lib/pdfChrome.ts` explains that this avoids a guessable PDF URL and uses data already returned through the audited clinical API. | There is no server template version or archived generated file, so exact reproduction and archival guarantees in Sections 4.3 and 5 are not met. Browser generation also does not create a separate export audit event. |
| Deliver approved asynchronous facts through NATS JetStream plus a transactional outbox. | `services/clinical/publisher.go` drains `referral_leave_outbox` and sends direct HTTP to `/internal/leave-contributions`. The Compose stack runs no NATS service, so direct HTTP was used while preserving transactional capture and retry. | The current path is idempotent and retried, but it does not provide the broker durability, consumer offsets or replay model specified in Sections 2 and 8. |
| Deploy `hwms-audit` separately with append-only database grants. | No `services/audit` deployable exists. `clinical_access_log` remains in the clinical database and is written by the same database role as clinical records. No `GRANT` or `REVOKE` statement prevents that role updating or deleting access rows. The repository records no reason for omitting the separate service and grants. | The code fails a clinical read when its log write fails, but the stored log is not append-only against its own service role. The Phase 1 audit isolation gate is not met. |
| Keep k3s manifests deployable alongside the Compose stack. | Closed. `deploy/k8s` now defines all eight deployables, both database StatefulSets and per-caller network policies, and the ConfigMap carries `ADMIN_SERVICE_URL`, `OCCUPATIONAL_SERVICE_URL` and `METRICS_SERVICE_URL`. The metrics deployment receives no clinical credential and the ingest token is a secret reference. | The startup blocker is resolved. One item remains: the clinical database URL requires TLS and the clinical StatefulSet configures no server certificate, so ICT must supply certificates or approve a different connection policy before a real deployment. |
