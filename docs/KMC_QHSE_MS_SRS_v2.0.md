# KIIRA MOTORS CORPORATION

> **Superseded on 7 August 2026 by `KMC_HWMS_SRS_v2.1_DRAFT.md`.** Preserved as project history; the successor reflects the post-meeting Health and Wellness-only scope.

## Quality, Health, Safety and Environment Management System

### System Requirements Specification

**Version:** 2.0  
**Date:** 3 August 2026  
**Status:** Stakeholder validation draft — not approved for production use  
**Prepared for:** Quality, Health, Safety and Environment Department, Kiira Motors Corporation

## 1. Document authority

This is the single governing requirements specification for the KMC QHSE Management System. Operational records are captured once, close to the event, and dashboard values are derived from them. Values owned by another system are entered as attributed returns until integration is approved.

### 1.1 Superseded documents

| Document | Status | Rule |
|---|---|---|
| `KMC_HWMS_SRS_v1.0.md` | Superseded in full | Retained for traceability only |
| `KMC_HWMS_SRS_v1.1_DRAFT.md` | Superseded in full | Retained for traceability only |

Where either earlier SRS differs from this document, **version 2.0 governs**. The v1.0 build brief remains authoritative only for design language, accessibility, and implementation quality where it does not conflict with this SRS.

### 1.2 Requirement labels

| Label | Meaning |
|---|---|
| Confirmed | Stated in supplied records or a dated project-owner/stakeholder clarification |
| Proposed | Recommended for a coherent design but awaiting the accountable KMC owner |
| Open | Available evidence does not settle the question |

## 2. Product strategy and boundaries

### 2.1 Department structure

1. **Health and Wellness**
   - Occupational Health
   - Ergonomics and Wellness
   - Industrial Hygiene
2. **Workplace Safety**
3. **Environment and Sustainability**
4. **Quality Inspection and Testing**

Health and Wellness and the minimum safety incident register are the active prototype capabilities. The remaining candidate functions are benchmark proposals until their unit owners confirm scope.

### 2.2 Delivery tracks

| Track | Purpose | Technology/data | Enduring output |
|---|---|---|---|
| Prototype v0.3 | Confirm requirements and workflows | React, browser local storage, synthetic data and demo login | Confirmed decisions, design language and reusable React components |
| Production | Govern real QHSE records | Go services, React, Keycloak, Postgres and KMC infrastructure | Deployed production system |

Prototype code, authentication, state and synthetic records **are not migrated** into production.

### 2.3 Data provenance

Every dashboard value shows one of: Derived, Manual, Register, Proposed, Informational, Provisional, Not applicable, or No data. Missing source data is never converted into zero. A safety zero becomes final only after period attestation.

## 3. Architecture decisions

### ADR-01 — Capture at source

Operational records produce dashboard metrics. Users do not separately type derived KPI totals.

### ADR-03 — Clinical privacy

Only an authorised clinical role retrieves an individual clinical encounter. Management, executives, system administrators, metrics services and future safety roles cannot retrieve clinical narrative, diagnosis, examination or treatment.

### ADR-06 — Completeness and compliance are separate

The system distinguishes whether planned work was completed from whether completed results met a limit. Safety attestation likewise distinguishes a complete register from an empty register.

### ADR-08 — Configurable rules

Standards, targets, notification thresholds and future recordability rules are effective-dated reference data, never hard-coded legal conclusions.

### ADR-13 — KMC-aligned microservice topology

Production uses independently deployable Go bounded-context services behind one gateway, one database per service, Keycloak identity, and KMC-approved observability. The clinical database has separate credentials, encryption and network policy. This supersedes the v1.0 modular-monolith decision.

### ADR-14 — Shared monitoring register

Industrial-hygiene and environmental readings share one register. Each reading carries a required context and matching standard family so an occupational reading cannot be evaluated against an ambient limit.

### ADR-15 — Safety/clinical boundary

A safety incident and a clinical encounter are separate records. A safety record may reference an encounter, but the safety domain may read exactly one derived fact: whether the person was treated by Health and Wellness. It cannot retrieve the encounter or its identifier through a safety response.

## 4. Users and access

### 4.1 Prototype roles

| Role | Access |
|---|---|
| Health and Wellness Officer | Clinical records and history; monthly returns; ergonomics; shared monitoring; safety entry and attestation |
| QHSE Manager | Read-only dashboard, returns, benchmark pages and aggregate unit drilldowns subject to suppression |
| QHSE Director | Read-only company-level executive dashboard and trends; no unit drilldown |

The Director sees less detail because the role consumes executive oversight information while the Manager performs operational review. This is task-based data minimisation, not a statement about organisational seniority.

There is no unauthenticated dashboard route. Demo login illustrates workflow only and is not a security boundary.

### 4.2 Production roles

Production includes Occupational Health Physician, OHS Officer, Safety Officer, Division Head, Executive, Director Viewer, Manager Viewer, System Administrator and Data Protection Officer. Clinical permission is enforced at the HTTP handler, service layer, service credential and database/network boundary.

### 4.3 Disclosure controls

- Management receives no patient identities or clinical narratives.
- A company-level safety headline may be displayed as an approved KPI.
- Incident drilldowns are aggregate only. Exact event date, shift, workstation, narrative and person references are unavailable to Manager and Director.
- Manager breakdowns coarsen time to month and location to unit.
- A proposed minimum cell size of five applies. Counts from one to four display `<5`; their rows and reconstructive filters are withheld.
- The Data Protection Officer must approve the threshold and any exception before production.

## 5. Functional requirements

### 5.1 Patient registry and encounters

| ID | Requirement | Status |
|---|---|---|
| PAT-01 | Register a patient with biodata, category, contact and organisational/job information | Confirmed |
| PAT-02 | Employee and Intern are available categories; Other requires a description | Confirmed |
| PAT-03 | Employee number and organisational fields do not block urgent care | Proposed |
| PAT-04 | Health and Wellness Officer can search patients and open complete past-visit history | Confirmed |
| VIS-01 | Record visit date/time, visit type, complaint, history, work relationship, examination, investigation, impression and treatment | Confirmed |
| VIS-02 | Every clinical section supports Not recorded, Partial, Complete or Not clinically indicated | Proposed |
| VIS-03 | A minimal visit can be signed without clinically irrelevant sections | Confirmed |
| VIS-04 | Common categorical choices use visible radios/checkboxes; Other reveals additional text | Confirmed |
| VIS-05 | Signed visits are read-only in the prototype; production corrections are append-only amendments | Proposed |
| VIS-06 | The system records professional judgment and does not diagnose or recommend treatment | Required boundary |

“Patient visit” is the interface term and “encounter” is the internal term. The user-facing company title is Health and Wellness Officer; clinical domain vocabulary remains unchanged.

### 5.2 Monthly returns

| ID | Requirement | Status |
|---|---|---|
| RET-01 | Capture month, health-related lost days, month-end headcount, surveillance scheduled/completed and source note | Proposed |
| RET-02 | Capture entering user and timestamp | Proposed |
| RET-03 | Capture optional monthly hours worked, visibly sourced from HR | Proposed question |
| RET-04 | Hours worked does not feed a v0.3 rate; it remains Not supplied unless HR provides it | Confirmed for prototype |
| RET-05 | Missing inputs produce No data, not zero | Required |
| RET-06 | Completed surveillance cannot exceed scheduled and future periods are rejected | Proposed |
| RET-07 | The HR owner must confirm leave categories and whether monthly man-hours are available | Open |

Monthly Returns is top-level navigation because it supplies several units rather than only the clinical workflow.

### 5.3 Shared monitoring

| ID | Requirement | Status |
|---|---|---|
| MON-01 | Record time, location, instrument, parameter, value, unit, method/averaging period and standard version | Proposed |
| MON-02 | Require context: Occupational exposure, Indoor workplace or Ambient/environmental | Required correction |
| MON-03 | Only matching standard families may be selected for the context | Required correction |
| MON-04 | Industrial Hygiene shows occupational/indoor views; Environment shows ambient view | Confirmed design |
| MON-05 | Prototype K4 includes eligible occupational-exposure readings only | Proposed |
| MON-06 | Calibration status and ownership require confirmation | Open |

### 5.4 Ergonomics and wellness

Maintain workstation assessments, outcome, findings and optional corrective action. Outcomes are Compliant, Partially compliant and Non-compliant. A dynamic assessment-template builder, attachments and photographs remain deferred until the criteria, purpose and retention rules are approved.

### 5.5 Safety incident register

One event record captures:

- case number and Draft/Submitted state;
- occurred/reported timestamps, unit, location, work area, shift, activity and description;
- person category and a restricted optional person reference;
- work-related status of Yes, No or Pending;
- classification of occupational accident, occupational disease, dangerous occurrence, or incident/near miss;
- severity of Fatality, Lost-time, Restricted work/job transfer, Medical treatment, First aid only, or No injury;
- `fatality_count` and `non_fatal_injury_count`, both counting people;
- days away and restricted-work days;
- recordability of Pending, Recordable or Not recordable, its basis, deciding officer and time;
- whether formal investigation is required and why;
- investigation owner, status, dates, findings, root causes and corrective actions;
- optional clinical encounter reference protected by ADR-15.

Recordability is a named officer’s determination, not a computation. A future approved rule may pre-fill it through effective-dated reference data and remains overridable with attribution.

### 5.6 Safety period attestation

The responsible officer confirms that all known events for a month are entered. Closure is blocked while any event has Pending work-related status or Pending recordability. Investigation completion does not block closure because attestation concerns register completeness.

| Period/register state | Dashboard result |
|---|---|
| Open and empty | No data |
| Open with events | Provisional values |
| Attested and empty | Final zero |
| Attested with events | Final values |

### 5.7 Medical certifications and generic expiry tracking

Medical facility/practitioner licence tracking and KPIs K6/K7 were withdrawn for the prototype by Benard Okanyakure in a verbal 31 July 2026 clarification omitted from the Gemini minutes. The executive dashboard identifies this deviation from the seven-item supplied template. Written confirmation and the confirmer’s company title remain a residual governance action.

The reusable expiry pattern remains required for future environmental permits/consents, instrument calibration and other approved renewal-controlled records. No medical certification route or seed record exists in v0.3.

### 5.8 Research placeholders

Unconfirmed functions render as non-editable research cards labelled **“Benchmark proposal—not approved by KMC.”** They identify the proposed records, responsible owner and questions for confirmation. They contain no data-entry controls, charts, figures, targets or fabricated operational records.

Candidate areas are:

- Workplace Safety: hazards and risk, permits, inspections, actions, PPE, emergency readiness and training.
- Environment and Sustainability: legal/audits, water/effluent, waste, emissions, energy/GHG, biodiversity and environmental incidents.
- Quality Inspection and Testing: incoming/in-process/final inspection, tests, nonconformity/CAPA, calibration, laboratory competence, supplier quality and audits.

## 6. KPI catalogue

### 6.1 Health and Wellness

| ID | Metric | Computation | Target/status |
|---|---|---|---|
| K1 | Surveillance compliance | Completed ÷ scheduled | 100%; formula proposed |
| K2 | Occupational disease cases | Confirmed work-attributable cases | 0; workflow open |
| K3 | Health-related absenteeism | Monthly lost days ÷ month-end headcount | <0.5 days/person/month; HR definition open |
| K4 | Industrial hygiene compliance | Eligible occupational readings within limit ÷ eligible readings | ≥95%; inclusion proposed |
| K5 | Ergonomic risk control | Approved actions closed on time ÷ actions due | ≥95%; workflow proposed |

K4 and K5 retain separate completion companions. A visible note explains that K6/K7 were withdrawn from the supplied seven-KPI template.

### 6.2 Workplace Safety

| ID | Metric | Computation | Target/status |
|---|---|---|---|
| S1 | Fatalities | People killed in work-related events | Target 0 |
| S2 | Workplace injuries | Non-fatally injured people in work-related events, including first aid, banded by severity | Target 0 |
| S3 | Recordable incidents | Work-related events manually determined Recordable | Informational; no invented target |
| S4 | Investigations completed | Completed required investigations ÷ required investigations | Target 100%; none required is Not applicable |
| S5 | Near-miss and dangerous-occurrence reports | Work-related reports in either classification | Informational; reporting is encouraged |

S1/S2 count people. S3/S5 count events. S4 is a ratio. S5 is a reporting-culture indicator and is not proof that risk improved.

## 7. Non-functional and production requirements

- No status is conveyed by colour alone; every status has a glyph and text label and passes a grayscale check.
- Keyboard operation, visible focus, associated labels, responsive desktop/tablet/mobile layouts and exact-value chart alternatives are required.
- Minimal clinical fast path targets under two minutes.
- Real data requires KMC-approved identity, server-side authorization, encryption, audit, backup, recovery and retention.
- Clinical reads and all material changes are attributed and audited; clinical/audit logs are append-only.
- Non-production environments use synthetic data only.
- Production migrations and deployment are reproducible from source control.
- The KMC-approved private repository/remote, business owner, technical owner, data owner and support contact are handover blockers.

## 8. Prototype acceptance

The v0.3 prototype is accepted for stakeholder review when:

1. Three demo roles sign in and direct-route guards enforce their declared views.
2. The Officer can review complete visit history and use quick radio/checkbox entry.
3. July’s six synthetic incidents derive S1–S5; August open/empty shows No data.
4. Attestation blocks pending work-related/recordability decisions.
5. Safety selectors expose only treatment Yes/No across the clinical boundary.
6. Manager drilldowns suppress groups below five and expose no event rows.
7. Shared monitoring rejects context/standard mismatch and excludes ambient readings from K4.
8. K6/K7 and medical certification routes/data are absent; generic expiry behavior remains specified and tested.
9. Research pages are clearly unapproved and contain no figures or entry controls.
10. Tests, TypeScript build and grayscale/status checks pass.

## 9. Authoritative references for confirmation

- Uganda Occupational Safety and Health Act, 2006 (ULII).
- ILO recording and notification guidance for occupational accidents and diseases.
- ISO 45001 occupational health and safety management guidance.
- NEMA Uganda environmental compliance monitoring obligations and ISO 14001 environmental management guidance.
- GRI topical standards for sustainability reporting.
- ISO 9001, ISO/IEC 17025, ISO 10012 and ISO 19011 for quality, laboratory, measurement and audit benchmark structure.

These international materials guide candidate fields and questions. They do not create a Ugandan legal recordability rule or an approved KMC requirement.
