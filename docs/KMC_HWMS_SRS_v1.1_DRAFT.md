The# KIIRA MOTORS CORPORATION

## Health and Wellness Management System (HWMS)

### System Requirements Specification

**Version:** 1.1 Draft  
**Date:** 30 July 2026  
**Prepared for:** Health and Wellness Division, Kiira Motors Corporation  
**Status:** Stakeholder validation draft — not approved for production use

---

## 1. Purpose and document authority

HWMS is proposed as the operational record system for the Health and Wellness Division. It captures the records that produce management statistics instead of asking staff to re-enter totals into a separate dashboard.

This document distinguishes facts from proposals:

| Label | Meaning |
|---|---|
| Confirmed | Stated directly in a supplied form, the interview transcript, or subsequent project-owner clarification |
| Proposed default | A recommended answer that makes the prototype coherent but still needs the responsible KMC stakeholder's approval |
| Open | The source material does not settle the question |

The supplied medical form, executive dashboard template, and interview transcript remain the primary discovery sources. This draft becomes authoritative for a production build only after the open decisions in the stakeholder register are signed off.

## 2. Product strategy

### 2.1 Product principle

Operational events are captured once, close to where they occur. Dashboard values are derived from those records whenever the source is inside HWMS. Values sourced from HR or another external system are entered as attributed manual returns until integration is approved.

Every displayed metric must therefore state its provenance:

- **Derived:** calculated from operational records in HWMS.
- **Manual:** entered from a named external source.
- **Register:** evaluated from an internal register, such as licence validity.
- **Proposed:** illustrative formula awaiting stakeholder approval.
- **No data:** the required source record is absent; never treated as zero.

### 2.2 Delivery stages

| Stage | Purpose | Data |
|---|---|---|
| Prototype v0.2 | Demonstrate the product vision, guided login, clinical quick entry, and visit history | Synthetic browser-local data only |
| Proposed production MVP v1 | Clinical core, privacy controls, attributed manual returns, and executive dashboard | Real data only after KMC approval and production controls |
| Later releases | Full environmental, ergonomic, compliance, reporting, HR and identity integrations | Governed production data |

The prototype is intentionally broad and shallow. The production MVP should be narrower and deeper.

### 2.3 Velo-aligned principles

HWMS follows the principles used in KMC's Velo specification where they fit this domain:

- a modular monolith for the first production release;
- clear domain ownership and adapter-based integration seams;
- PostgreSQL as the production system of record;
- role-based access, auditability, reproducible deployment, and synthetic test data;
- configurable business rules where standards and targets can change;
- explicit unknown and incomplete states;
- future integrations do not block the first useful release.

HWMS does not inherit Velo's transport-specific architecture or workloads.

## 3. Confirmed current state

| Finding | Status | Source |
|---|---|---|
| Infirmary records are captured on a paper medical form | Confirmed | Medical form and project-owner account |
| Staff requested an executive dashboard and monthly/quarterly reporting | Confirmed | Dashboard template |
| The full medical form is not clinically indicated for every visit | Confirmed | Project-owner account |
| Employees and interns receive treatment | Confirmed | Project-owner clarification |
| Individual clinical records are intended to be accessible only to the doctor | Confirmed for prototype; requires KMC approval for production | Project-owner clarification |
| HR leave and headcount figures can be read from the HR portal, but initial integration is not wanted | Confirmed | Interview and project-owner account |
| The current absenteeism working example uses a cumulative sick-day total divided by headcount | Confirmed current practice | Interview |
| Ergonomic assessments are performed against workstations and currently need compliant, partially compliant, or non-compliant outcomes | Confirmed | Interview |
| Detailed ergonomic criteria are not yet standardised | Confirmed | Interview |
| The currently discussed particulate meter measures PM2.5 and PM10 | Confirmed | Interview |
| The Division expects its requirements to evolve | Confirmed | Interview |

Contractor and visitor treatment, formal surveillance processes, corrective-action approvals, disease confirmation, fitness-for-work sharing, retention, hosting, and report circulation rules remain open.

## 4. User groups and privacy boundary

### 4.1 Prototype roles

| Role | Prototype access |
|---|---|
| Doctor | Patient registry, individual patient visits, and aggregate/operational modules |
| Management | Aggregate dashboard, monthly returns, environment, ergonomics, and medical certification status; no patient identities or clinical narratives |

The prototype uses a guided login with separate synthetic Doctor and Management accounts. This demonstrates sign-in, sign-out, role assignment, and restricted navigation, but it is not production authentication or server-side authorisation.

### 4.2 Proposed production roles

The minimum recommended production roles are Doctor, Health and Wellness Management, Operational Officer, System Administrator, and Data Protection/Audit Reviewer. Exact job titles, assistants, deputies, and permission boundaries require approval.

### 4.3 Clinical privacy invariants

- Individual clinical records are not included in management dashboards or reports.
- Aggregate data must be designed to reduce re-identification risk in small groups; the suppression threshold is set by the KMC data owner or DPO.
- A system administrator must not gain clinical access merely through the administrator role.
- Production reads and changes to clinical records must be audited.
- Real clinical records must never be copied into development, training, or demonstration environments.
- A clinician-facing fitness or restriction output, if required, must avoid disclosing diagnosis to management.

## 5. Functional requirements

### 5.1 Patient registry

| ID | Requirement | Status |
|---|---|---|
| PAT-01 | Register a patient with name, age at visit, sex, phone contact, department, division, unit/section, and job title | Confirmed from medical form |
| PAT-02 | Record patient category with Employee and Intern available | Confirmed |
| PAT-03 | Provide an Other category in the prototype without assuming which additional populations are treated | Proposed default |
| PAT-04 | Employee/staff number is optional until an authoritative identity rule is confirmed | Proposed default |
| PAT-05 | Missing organisational fields must not block urgent care | Proposed default |
| PAT-06 | Doctor can search existing patients and begin a new visit | Proposed default |
| PAT-07 | Doctor can open a patient-specific visit history and review the complete read-only details of each past visit | Confirmed after prototype review |

### 5.2 Patient visits

“Patient visit” is the interface term. “Encounter” is the internal term for one visit by one patient.

| ID | Requirement | Status |
|---|---|---|
| VIS-01 | Record visit date, time in, and Walk-in, Referred by supervisor, Emergency, or Follow-up visit type | Confirmed |
| VIS-02 | Capture presenting complaint and history of present illness, including sudden/gradual onset | Confirmed |
| VIS-03 | Capture work-related status and exposure/activity description | Confirmed |
| VIS-04 | Capture the discrete medical, surgical, medication, and occupational history fields on the paper form | Confirmed |
| VIS-05 | Capture vital signs with their units and derive BMI from height and weight | Confirmed fields; calculation proposed |
| VIS-06 | Capture general and systemic examination, investigations, impression, work-related determination, treatment, and clinician | Confirmed |
| VIS-07 | Each clinical section may be Not recorded, Partial, Complete, or Not clinically indicated | Proposed default based on stated partial-form use |
| VIS-08 | A minimal visit can be completed without entering clinically irrelevant sections | Confirmed need |
| VIS-09 | The prototype supports Draft and Signed states; signing locks editing | Proposed default |
| VIS-10 | A production correction must append an amendment rather than silently overwrite a signed record | Proposed default |
| VIS-11 | Abnormal clinical values may warn but must not be rejected solely because they are abnormal | Proposed safety default |
| VIS-12 | HWMS records the clinician's decision and does not diagnose or recommend treatment | Required product boundary |
| VIS-13 | Common, discrete clinical choices must use visible radio buttons or checkboxes; Other or additional information opens or accompanies a text field | Confirmed after prototype review |
| VIS-14 | A doctor recording a visit can see links to the selected patient's previous visits and open the full record | Confirmed after prototype review |

### 5.3 Monthly returns

| ID | Requirement | Status |
|---|---|---|
| RET-01 | Capture reporting month, health-related lost days, month-end headcount, surveillance scheduled, and surveillance completed | Proposed initial return based on interview and dashboard |
| RET-02 | Record the external source note, entering user, and timestamp | Proposed default |
| RET-03 | Display calculated surveillance and absenteeism results during entry | Proposed default |
| RET-04 | Do not accept future reporting periods or a completed count greater than scheduled | Proposed default |
| RET-05 | Missing source data produces No data, not zero | Required provenance rule |
| RET-06 | The leave categories included in health-related lost days must match an approved HR definition | Open |

### 5.4 Environmental monitoring

| ID | Requirement | Status |
|---|---|---|
| ENV-01 | Maintain monitoring locations and instruments | Proposed default |
| ENV-02 | Record date/time, location, instrument, parameter, measured value, unit, and averaging/sampling period | Proposed default |
| ENV-03 | Prototype entry supports PM2.5, PM10, and day/night noise | Confirmed/proposed demonstration scope |
| ENV-04 | Evaluate a reading against an effective-dated, approved standard record | Proposed default |
| ENV-05 | Store standard family and version so ambient, occupational, and indoor limits cannot be silently mixed | Required correction |
| ENV-06 | Capture or reference instrument calibration status in production | Open |
| ENV-07 | Track planned versus performed monitoring separately from result compliance | Proposed default |

Values seeded in the prototype are illustrative. KMC's environmental function must confirm standard family, monitoring method, locations, frequency, instruments, and applicable limits.

### 5.5 Ergonomics

| ID | Requirement | Status |
|---|---|---|
| ERG-01 | Maintain a workstation register | Proposed default |
| ERG-02 | Record assessment date, workstation, office/industrial type, and assessor | Proposed default |
| ERG-03 | Record Compliant, Partially compliant, or Non-compliant outcome | Confirmed |
| ERG-04 | Record free-text findings | Proposed default |
| ERG-05 | Prototype may record an optional proposed corrective action with owner, due date, and state | Proposed; requires confirmation |
| ERG-06 | Do not build a dynamic assessment-template engine until criteria are standardised | Confirmed deferral |
| ERG-07 | Photographs, their purpose, retention, and approval rules require confirmation | Open |

### 5.6 Medical certification register

| ID | Requirement | Status |
|---|---|---|
| LIC-01 | Demonstrate facility operating authorisation and practitioner professional-registration validity and days to expiry | Proposed from supplied dashboard/SRS; stakeholder confirmation required |
| LIC-02 | Production must preserve licence validity history | Proposed default |
| LIC-03 | Required document types, authorities, identifiers, accountable owner, and warning periods require confirmation | Open |
| LIC-04 | The module may be removed if KMC confirms that these records are not required or are controlled in another authoritative system | Open |

### 5.7 Dashboard and reports

| ID | Requirement | Status |
|---|---|---|
| KPI-01 | Present the seven KPIs listed in the supplied summary table as the primary executive set | Confirmed |
| KPI-02 | Display monitoring and ergonomic completion as supporting indicators rather than extra primary KPIs | Proposed default |
| KPI-03 | Show value, target, period, status, and provenance for every metric | Proposed default |
| KPI-04 | Show No data when a required return or record is missing | Required provenance rule |
| KPI-05 | Management dashboard and reports contain aggregate clinical information only | Confirmed privacy intent |
| KPI-06 | Provide monthly trend and relevant operational breakdowns with exact-value alternatives to charts | Proposed default |
| KPI-07 | Monthly and quarterly export formats require stakeholder confirmation | Open |

## 6. Proposed KPI catalogue

| KPI | Proposed computation | Target from supplied template | Prototype source | Approval |
|---|---|---|---|---|
| Occupational Health Surveillance Compliance | Completed ÷ scheduled | 100% | Monthly return | Formula open |
| Occupational Disease Rate | Confirmed work-attributable cases | 0 | Synthetic seeded value | Confirmation workflow open |
| Health-related Absenteeism | Monthly health-related lost days ÷ month-end employee headcount | <0.5 days/person/month | Monthly return | Leave definition and monthly rule open |
| Industrial Hygiene Compliance Index | Eligible readings within approved limit ÷ eligible readings taken | ≥95% | Environmental readings | Formula and inclusion rules open |
| Ergonomic Risk Control Index | Approved actions closed on time ÷ actions due | ≥95% | Ergonomic actions | Formula and approval workflow open |
| KVP Infirmary Licence Compliance | Valid cover during reporting period | Valid | Licence register | Licence details open |
| Practitioner Licence Compliance | Practitioners with valid required credentials ÷ practitioners in scope | 100% | Licence register | Credential scope open |

Supporting indicators:

- Monitoring completion = performed events ÷ planned events.
- Ergonomic assessment completion = completed assessments ÷ planned assessments.

For every division operation, zero denominator returns No data unless stakeholders approve a different domain rule.

## 7. Production non-functional requirements

These are candidate acceptance requirements for production, not claims about the prototype.

### 7.1 Security and privacy

- KMC-approved authentication and server-side role authorisation.
- TLS in transit, protected secrets, encrypted backups, and least-privilege database credentials.
- Immutable audit trail for clinical reads and record changes.
- Configurable inactivity timeout for shared clinical workstations.
- Approved retention, archiving, privacy notice, data-subject access, incident response, and breach procedures.
- Synthetic data in every non-production environment.

### 7.2 Availability and safety

- Printable downtime form and a controlled retrospective-entry process.
- Nightly backup, defined recovery objectives, and tested restores.
- A system outage must never prevent urgent clinical treatment.
- Signed clinical records and historical compliance evaluations remain reproducible.

### 7.3 Usability and accessibility

- Minimal patient visit target: under two minutes for the agreed fast path.
- Keyboard-operable interface, visible focus, associated form labels, and responsive desktop/tablet layouts.
- No status communicated by colour alone.
- Charts include exact values and a table or written equivalent.
- English interface using plain clinical labels from the supplied form.

### 7.4 Maintainability

- Configurable, effective-dated standards and targets.
- Versioned database migrations and reproducible deployment.
- Modular monolith with clinical, occupational/operational, metrics/reporting, administration, identity, and audit boundaries.
- External HR, identity, document, and instrument integrations hidden behind replaceable adapters.

## 8. Proposed production MVP v1

Production MVP v1 should include:

1. KMC-approved authentication, role authorisation, audit, backup, and operational controls.
2. Patient registry and doctor-only patient visit records.
3. Draft, sign, read-access logging, and append-only correction behaviour.
4. Attributed monthly returns for data still sourced from HR or unimplemented operational modules.
5. Seven-KPI aggregate dashboard with provenance and No data states.
6. Administration of the minimum organisational and target reference data.

Environmental and ergonomic source workflows demonstrated in the prototype become production scope only after their fields, methods, and owners are approved. Full reports, HR integration, SSO, configurable ergonomic templates, stock management, and instrument ingestion are later releases.

## 9. Acceptance and approval gates

No production implementation using real clinical data begins until:

- the Division approves the stakeholder decision register;
- KMC ICT approves deployment ownership and support;
- the relevant privacy/data owner approves the clinical access and retention model;
- KPI owners approve definitions, denominators, periods, and targets;
- the environmental function approves standard families and measurement methods;
- named users validate the prototype's patient-visit and reporting workflows.
