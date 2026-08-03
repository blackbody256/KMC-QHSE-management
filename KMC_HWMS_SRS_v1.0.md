> **SUPERSEDED — 3 August 2026.** This specification is retained for traceability only. `docs/KMC_QHSE_MS_SRS_v2.0.md` replaces it in full and governs wherever the documents differ.

# KIIRA MOTORS CORPORATION

## Health and Wellness Management System (HWMS)

### System Requirements Specification

**Version:** 1.0
**Date:** 31 July 2026
**Prepared by:** Akanga Andrew, Software Engineering Intern
**Prepared for:** Health and Wellness Division, Kiira Motors Corporation
**Status:** Draft for divisional review

---

## Document Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 0.1 | 29 July 2026 | Akanga Andrew | Initial requirements gathering, divisional interview |
| 1.0 | 31 July 2026 | Akanga Andrew | First complete specification issued for divisional review |

---

# 1. Introduction

## 1.1 Purpose

This System Requirements Specification defines the functional, non-functional, interface, data, and operational requirements for the Health and Wellness Management System (HWMS), an operational records and performance monitoring system for the Health and Wellness Division of Kiira Motors Corporation.

The Division initially requested a dashboard website into which staff would enter summary figures at the end of each working day. This specification proposes a wider scope. A dashboard fed by end-of-day data entry is a second manual system operating alongside the first, and it inherits every weakness of the paper process it is meant to replace: transcription error, delay, and no verifiable link between a reported figure and the event that produced it.

HWMS instead captures each operational event at the point at which it occurs, and derives the executive dashboard as a computed output of those records. The dashboard is a consequence of the system, not a component of it.

HWMS is designed to answer the following questions at any point in time:

- Who attended the KVP Infirmary, when, for what category of complaint, and was the condition work related?
- Which employees scheduled for medical surveillance have been assessed within the planned period?
- How many productive days has the organisation lost to health related absence this month?
- Which workstations have been ergonomically assessed, what were the outcomes, and have corrective actions been closed on time?
- Are measured air quality and noise levels within the applicable limits, and was monitoring performed as scheduled?
- Are the Infirmary operating licence and all practitioner licences currently valid?
- What is the Division's performance against each of its seven executive Key Performance Indicators for the current month and quarter?

This document is the single source of truth for the design, development, testing, and acceptance of HWMS. All design decisions, test cases, and acceptance gates are traceable to requirements defined in Section 3.

## 1.2 Intended Audience and Reading Suggestions

| Stakeholder | Relevant Sections | Reading Priority |
|---|---|---|
| Head, Health and Wellness Division | 1, 2, 3.2, 5, 6.2 | Full reading, Section 5 requires response |
| Occupational Health Physician | 1.3, 2.4, 2.8, 3.2.3, 3.3.2, 5 | Sections 2.8, 3.2.3, 5 |
| Occupational Health and Safety Officer | 2.3, 3.2.5, 3.2.6, 6.6 | Sections 3.2.5, 3.2.6 |
| Executive Management | 1.1, 1.3, 2.8, 6.2 | Sections 1 and 6.2 |
| Software Engineers and Architects | All | Full reading |
| Quality Assurance | 3.2, 3.3, 4 | Full reading |
| Data Protection Officer, Legal | 2.8, 3.3.2, 6.5 | Sections 2.8 and 3.3.2 |
| Future Maintainer | All, and Appendix 6.8 | Full reading |

Readers unfamiliar with the project should begin at Section 2 for a high level understanding before engaging the detailed requirements in Section 3. Reviewers with limited time should read Section 2.8 (Design Decisions) and Section 5 (Information Requiring Confirmation).

## 1.3 Project Scope

HWMS owns operational record keeping and performance monitoring for the Health and Wellness Division. It covers four operational domains and one derived domain.

**In scope**

| Domain | Coverage |
|---|---|
| Clinical service delivery | KVP Infirmary attendance records, from biodata through treatment, for employees and non-employees |
| Occupational health | Medical surveillance tracking, occupational disease case confirmation, fitness for work outcomes |
| Ergonomics | Workstation assessment records, assessment outcomes, corrective action tracking |
| Industrial hygiene and environment | Air quality and noise monitoring records, automatic evaluation against applicable limits, monitoring schedule adherence |
| Derived | Executive KPI computation, monthly and quarterly reporting, regulatory licence tracking |

**Explicitly out of scope for version 1**

| Item | Rationale | Disposition |
|---|---|---|
| Integration with the Human Resource portal | Division requested no external integration for the initial release | Integration seam reserved, see 3.1.3 and 6.7 |
| Dynamic per-station ergonomic assessment form builder | The Division has not yet standardised an assessment tool | Deferred to version 2, see ADR-07 |
| Pharmacy and medical stock management | Not raised in requirements gathering | Deferred, see 6.7 |
| Employee self service portal | Not raised in requirements gathering | Deferred, see 6.7 |
| Mobile offline data capture | Connectivity at the plant is adequate for the initial release | Deferred, see 6.7 |
| Laboratory information system integration | No on site laboratory | Not planned |
| Clinical decision support or diagnostic suggestion | Outside the competence and liability boundary of this system | Not planned |

## 1.4 References

| Ref | Document |
|---|---|
| R1 | KVP Infirmary Medical Form, Health and Wellness Division, KMC |
| R2 | Health and Wellness Division Executive Performance Dashboard and Monthly/Quarterly Report Template, KMC |
| R3 | Requirements gathering interview, Health and Wellness Division, 29 July 2026, transcript on file |
| R4 | The Data Protection and Privacy Act, 2019, Republic of Uganda |
| R5 | The Occupational Safety and Health Act, 2006, Republic of Uganda |
| R6 | National Environment (Standards for Discharge of Effluent, Air Quality and Noise) Regulations, NEMA, as referenced in R2 |
| R7 | Velo System Requirements Specification v2.0, KMC, used as the structural and formatting model for this document |

Note: references R4, R5 and R6 are cited as the governing legal framework. The specific provisions and current amendments applicable to KMC must be confirmed by the Corporation's legal function. See item C-24 in Section 5.

---

# 2. Overall Description

## 2.1 Product Perspective

HWMS is a new, self contained system. It does not replace an existing software product. It replaces a paper based process.

The Division is newly established and is, in its own description, being developed from zero. The requirement set is therefore expected to grow. This is not a risk to be mitigated away but a structural property of the problem, and the architecture in Section 3.4 treats schema evolution as a first class requirement rather than an exception.

HWMS sits alongside two systems it does not integrate with in version 1: the Human Resource portal, which is the source of leave and headcount figures, and the Corporation's identity infrastructure. Both are addressed as reserved integration seams in Section 3.1.3.

## 2.2 Current State Analysis

The Division currently operates entirely on paper and ad hoc spreadsheets.

| Process | Current method | Consequence |
|---|---|---|
| Infirmary attendance | Paper medical form, filed physically | No searchable history, no aggregate reporting, physical records are the only copy |
| Partial encounters | The full form is issued regardless of the presenting complaint, and unused sections are left blank | No distinction between "not applicable" and "not recorded", so completeness cannot be audited |
| Absenteeism | Leave figures read from the Human Resource portal on the 28th of each month and totalled by hand | Cumulative year to date figures divided by headcount, which does not produce a per month rate, see C-08 |
| Ergonomics | No assessment tool exists, no records kept | KPI cannot be computed |
| Air quality | Particulate meter readings recorded ad hoc | No evaluation against limits, no trend, no monitoring schedule adherence record |
| Noise | Recorded ad hoc | As above |
| Licences | Tracked informally | Renewal risk carried personally rather than systemically |
| Reporting | Assembled manually into the template at R2 | Slow, and the reported figure cannot be traced to a source record |

The most important observation from the current state is that the Division cannot presently produce four of its seven KPIs from any record it holds. The system's first duty is therefore to create the primary records that make those KPIs computable at all.

## 2.3 Product Functions

| ID | Module | Summary |
|---|---|---|
| M1 | Administration and Reference Data | Organisational structure, workstations, monitoring locations, environmental limits, KPI targets |
| M2 | Patient Registry | Identification of any person eligible to attend the Infirmary, whether or not they are an employee |
| M3 | Infirmary Encounter Management | Capture of the clinical encounter, section by section, with partial completion supported |
| M4 | Occupational Health Surveillance | Surveillance planning, assessment recording, occupational disease case confirmation, fitness for work outcomes |
| M5 | Ergonomic Risk Assessment | Workstation assessment records, tri state outcomes, corrective action tracking |
| M6 | Environmental and Industrial Hygiene Monitoring | Monitoring plans, parameter readings, automatic limit evaluation |
| M7 | Compliance Register | Infirmary and practitioner licences with expiry alerting |
| M8 | Periodic Returns | Manual monthly entry of figures sourced outside the system |
| M9 | KPI Computation and Dashboard | Metric registry, computation, executive dashboard |
| M10 | Reporting and Export | Monthly and quarterly report generation in the template format at R2 |
| M11 | Identity, Access and Audit | Authentication, role based authorisation, action audit, clinical read access logging |

## 2.4 User Classes and Characteristics

| Role | Description | Technical proficiency | Frequency of use |
|---|---|---|---|
| Occupational Health Physician | The attending doctor. Sole holder of clinical record access. Records encounters, confirms suspected occupational disease, issues fitness for work outcomes. | Moderate | Daily |
| Occupational Health and Safety Officer | Conducts ergonomic assessments and environmental monitoring. No clinical access. | Moderate | Several times weekly |
| Head, Health and Wellness Division | Owns divisional performance. Full access to occupational and environmental data, aggregate only view of clinical data. Approves corrective action closure and confirms occupational disease cases. | Moderate | Weekly |
| Executive Management | Consumes the dashboard and periodic reports. Aggregate data only. | Basic | Monthly and quarterly |
| System Administrator | Manages users, roles and reference data. No access to clinical record content. | High | Occasional |

The design deliberately does not grant the Division Head individual level clinical access. The rationale is set out in ADR-03.

## 2.5 Operating Environment

| Aspect | Requirement |
|---|---|
| Deployment | On premise at KMC, subject to confirmation at C-24 |
| Client | Modern desktop browser, responsive layout supporting tablet use at the workstation during ergonomic assessment |
| Connectivity | Continuous local network connectivity assumed for version 1 |
| Database | PostgreSQL, with a physically separate database instance for the clinical bounded context |
| Backup | Encrypted nightly backup to a KMC approved location, with clinical backups holding a separate encryption key |

## 2.6 Design and Implementation Constraints

| ID | Constraint |
|---|---|
| CON-01 | Clinical data is special personal data under R4 and may not leave KMC controlled infrastructure |
| CON-02 | The Division is newly formed and its data requirements will change. Schema rigidity in the occupational and environmental modules is a defect, not a feature |
| CON-03 | No ergonomic assessment tool exists at the time of writing. The system cannot depend on one |
| CON-04 | Only PM2.5 and PM10 are measurable with currently held instruments, subject to C-12 |
| CON-05 | No external system integration is permitted in version 1 |
| CON-06 | The system must reproduce the report layout at R2 without manual re-keying |
| CON-07 | The initial developer is an intern whose attachment concludes on 31 July 2026. The system must be documented for handover, see Appendix 6.8 |

## 2.7 Assumptions and Dependencies

| ID | Assumption |
|---|---|
| ASM-01 | The Division will nominate a data owner responsible for monthly returns entry |
| ASM-02 | Headcount and health related leave figures will continue to be available from the Human Resource portal for manual entry |
| ASM-03 | The environmental limits recorded in R2 reflect the applicable NEMA standards. These are held as configurable reference data, not as code, so a correction does not require redeployment |
| ASM-04 | The Corporation will nominate a Data Protection Officer or equivalent to approve the retention and access provisions in 3.3.2 |
| ASM-05 | Monitoring instruments are calibrated, and calibration status is recorded outside this system in version 1 |

## 2.8 Design Decisions

This section records the significant decisions taken during specification, the reasoning behind each, and the consequences accepted. It is presented in Architecture Decision Record form so that a future maintainer can distinguish a deliberate choice from an accident.

### ADR-01 Capture at source, dashboard as derived output

**Context.** The Division requested a dashboard into which staff would type summary figures after each day.

**Decision.** HWMS captures the primary operational record at the point of the event. Every dashboard figure is computed from those records. No KPI is typed in directly except where the source lies outside the system entirely, in which case it is entered through Module M8 and explicitly labelled as a manual return.

**Rationale.** A typed dashboard figure cannot be audited, corrected, or explained. A computed figure can be traced to the records that produced it. It also removes an entire duplicate data entry step from the Division's day.

**Consequences.** The build is larger than a dashboard alone. In exchange, four KPIs that the Division currently cannot produce at all become computable, and reporting effort falls to near zero.

### ADR-02 Two data regimes, designed separately

**Context.** The source documents describe two very different kinds of data.

**Decision.** The clinical encounter uses a fixed, fully specified schema. The occupational, ergonomic and environmental modules use configurable definitions held as reference data.

**Rationale.** The medical encounter record is stable across decades of clinical practice and gains nothing from configurability, while gaining significant risk from it. The occupational modules are the opposite: the Division has said explicitly that its requirements will grow. Applying one design to both would either make the clinical record unsafe or make the occupational modules unusable.

**Consequences.** Two design idioms coexist in one system. This is documented so it is not later mistaken for inconsistency.

### ADR-03 Clinical records are accessible only to the attending clinician

**Context.** The Division sits inside the employer. Clinical records describe employees of that employer and include data on HIV status, mental health, and other categories attracting the highest protection under R4.

**Decision.** Individual clinical record content is accessible to the Occupational Health Physician only. No other role, including the Head of Division, the System Administrator, or Executive Management, can retrieve an individual clinical record. Management need is served by two separate channels: aggregate statistics, and a fitness for work outcome that carries no diagnosis.

**Rationale.** This is the standard occupational health separation and it protects three parties at once. It protects the employee from employment consequences flowing from a medical disclosure. It protects the Physician from pressure to disclose. It protects the Corporation from liability under R4. Aggregate reporting satisfies every legitimate management information need identified in requirements gathering.

**Consequences.** The Division Head cannot answer the question "who has been to the Infirmary". This will be asked. Section 5 item C-04 records the decision for explicit confirmation so that it is agreed in advance rather than contested later. A break glass provision for clinician unavailability is proposed at C-01.

### ADR-04 Patient registry, not employee registry

**Context.** Interns, contractors and visitors are treated at the KVP Infirmary alongside employees.

**Decision.** The system maintains a Patient entity independent of employment. Every patient carries a patient category of employee, intern, contractor or visitor. The employee number is optional and applies only to the employee category.

**Rationale.** A registry keyed on employee number would force clinical staff to either turn away a patient or falsify an identifier under time pressure. Neither is acceptable. The category also matters analytically, since denominators for employee based KPIs must exclude non-employees.

**Consequences.** Headcount based KPIs must filter by patient category. This is specified in Appendix 6.2.

### ADR-05 Metric registry with three source types

**Context.** Three of the seven KPIs cannot be computed from primary records in version 1.

**Decision.** Every KPI is defined as a row in a metric registry declaring its identifier, numerator, denominator, period, target, direction, and source type. Source type is one of computed, manual return, or register derived.

**Rationale.** It makes the provenance of every dashboard figure explicit and visible to the reader. It allows a metric to be migrated from manual to computed later by changing a reference row rather than rewriting the dashboard. It prevents targets from being buried in application code, which matters because the environmental limits and internal targets in R2 will change.

**Consequences.** A small amount of additional structure in return for the ability to change every target and formula without a code release.

### ADR-06 Compliance and completeness are separate metrics

**Context.** The template at R2 mixes two distinct ideas. "Air quality within limits" and "monitoring completed as scheduled" appear in the same indicator list, as do "planned ergonomic assessments completed" and "corrective actions implemented".

**Decision.** Each monitoring module maintains a plan and a set of results. The plan yields a completeness metric. The results yield a compliance metric. They are reported separately and never combined.

**Rationale.** They fail in different ways and demand different responses. Perfect compliance across two readings taken out of a planned twelve is not performance, it is absence of data. Merging them conceals exactly the failure mode most worth surfacing.

**Consequences.** Nine metrics are reported where R2 lists seven. The two additions are companions to existing indicators and are marked as such in Appendix 6.2. This also resolves the numbering inconsistency in R2, noted at C-10.

### ADR-07 Ergonomic assessments record outcomes only in version 1

**Context.** The Division confirmed in R3 that no ergonomic assessment tool exists, that assessment criteria differ by workstation, and that for the present only outcomes need be recorded.

**Decision.** Version 1 records the workstation, date, assessor, a tri state outcome of compliant, partially compliant or non compliant, free text findings, photographs, and corrective actions. It does not attempt to model the assessment criteria themselves.

**Rationale.** This is the Division's own stated position and it is correct. Building a form engine against criteria that do not yet exist would produce a structure the Division would then be obliged to fit its eventual method into.

**Consequences.** The assessment record carries a nullable reference to a future assessment template version, so that criteria level capture can be added without migrating existing records.

### ADR-08 Environmental limits and KPI targets held as configurable reference data

**Context.** The limits in R2 derive from external standards. R2 itself contains at least three internal inconsistencies, recorded at C-13, C-14 and C-10.

**Decision.** Pollutant limits, averaging periods, noise limits and KPI targets are stored as versioned reference rows with effective dates. Historical evaluations retain the limit that applied when the reading was taken.

**Rationale.** Standards change, and R2 will itself require correction. Evaluating a 2026 reading against a 2028 limit would silently rewrite the compliance history.

**Consequences.** Limit changes require an effective date and are recorded in the audit log.

### ADR-09 Form sections are optional and independently completable

**Context.** The Division stated that the full medical form is rarely completed. A patient presenting with a minor complaint will not have vital signs, PPE compliance or systemic examination recorded.

**Decision.** The encounter form is divided into sections that are individually optional. Each section carries an explicit state of not started, partially completed, completed, or not applicable. A completeness indicator is shown on the encounter and stored with it.

**Rationale.** A blank field on paper cannot distinguish "not clinically indicated" from "forgotten". Recording that distinction is the difference between an auditable record and an incomplete one, and it is the only way the Division can later demonstrate that a surveillance assessment was properly conducted.

**Consequences.** The data model records section state alongside section content. Required field validation applies within a section once that section is started, not at form level.

### ADR-10 Modular monolith with hard bounded contexts

**Context.** The prevailing pattern in this developer's other KMC work, Velo, is a microservice architecture. That system has independent workloads, an optimisation engine, and high telemetry throughput.

**Decision.** HWMS is built as a single deployable application in Go, internally divided into four bounded contexts: clinical, occupational, metrics, and administration. Each context owns its own database schema. Cross context references use an identifier reference convention with no foreign keys across boundaries. The clinical context uses a physically separate database instance.

**Rationale.** HWMS has a small user population, no independently scaling workload, and a single maintainer who is leaving. A microservice topology here would add operational burden with no corresponding benefit. Separating the contexts internally preserves the option to extract a service later at low cost, and the clinical context is physically separated regardless because the reason for that separation is legal, not architectural.

**Consequences.** Horizontal scaling is coarse grained. This is acceptable at the anticipated load. The context boundaries must be enforced by review, since the compiler will not enforce them.

### ADR-11 Clinical read access is logged, not merely write access

**Context.** Ordinary audit practice logs modifications.

**Decision.** Every retrieval of an individual clinical record is logged with the acting user, the patient reference, the timestamp, and the access route. This log is itself readable only by the Data Protection Officer and is append only.

**Rationale.** Under R4 the risk to the data subject arises from unauthorised reading, not from unauthorised writing. A log that captures only writes provides no evidence about the harm most likely to occur.

**Consequences.** Additional write volume on every clinical retrieval, which is negligible at this scale. It also makes the break glass provision proposed at C-01 enforceable rather than aspirational.

### ADR-12 No external integration in version 1, seams reserved

**Context.** The Division asked that the initial release stand alone. The Human Resource portal nevertheless holds the authoritative leave and headcount figures.

**Decision.** Version 1 performs no external integration. Every value sourced elsewhere enters through Module M8 as an explicit manual return, attributed to a named user and a date. The integration points are specified now, at Section 3.1.3, and left unimplemented.

**Rationale.** Specifying the seam while deferring the work means the later integration replaces a manual return with an automated one behind an unchanged interface, rather than requiring the metric layer to be rebuilt.

**Consequences.** Absenteeism and surveillance compliance depend on human discipline in version 1. Section 3.2.8 therefore requires the system to flag a missing monthly return rather than silently reporting an incomplete period.

---

# 3. Specific Requirements

Priority levels used throughout: **M** mandatory for version 1, **S** should be included if schedule permits, **C** could be included, **D** deferred to a later version but specified here for completeness.

## 3.1 External Interface Requirements

### 3.1.1 User Interfaces

| ID | Requirement | Priority |
|---|---|---|
| UI-01 | The system shall present a role appropriate landing view. The Physician lands on the encounter queue, the OHS Officer on the monitoring schedule, the Division Head and Executive on the dashboard | M |
| UI-02 | The encounter form shall present sections in the order of the paper form at R1 so that staff familiar with the paper process are not required to relearn the sequence | M |
| UI-03 | Section state (not started, partial, complete, not applicable) shall be visible without opening the section | M |
| UI-04 | The dashboard shall present each KPI with its current value, target, direction, period, and source type | M |
| UI-05 | Values breaching a limit or target shall be visually distinguished, using the non compliance marker convention requested in R3 | M |
| UI-06 | The interface shall be usable on a tablet in portrait orientation to support ergonomic assessment at the workstation | S |
| UI-07 | The interface shall follow the KMC identity, using the corporate palette and the KMC logo as presented on R1 | S |

### 3.1.2 Hardware Interfaces

| ID | Requirement | Priority |
|---|---|---|
| HW-01 | The system shall accept manual entry of readings from the particulate meter. No direct instrument interface is required in version 1 | M |
| HW-02 | The system shall record the instrument identifier against every environmental reading, to support later calibration traceability | M |
| HW-03 | The system shall support photograph upload from a device camera or file system | M |
| HW-04 | Direct instrument telemetry ingestion shall be considered in a later version | D |

### 3.1.3 Reserved Integration Seams

These interfaces are specified but not implemented in version 1. Each is served in version 1 by a manual return through Module M8.

| ID | Seam | Version 1 substitute | Later behaviour |
|---|---|---|---|
| INT-01 | Human Resource portal, leave records | Monthly manual entry of health related lost days | Automated retrieval of leave records filtered by leave type |
| INT-02 | Human Resource portal, headcount | Monthly manual entry of month end headcount | Automated headcount snapshot at period close |
| INT-03 | Human Resource portal, employee master | Manual patient registration, optional CSV import | Employee master synchronisation, patient category derived |
| INT-04 | Corporate identity provider | Local user accounts | Single sign on |
| INT-05 | Document management | Local attachment storage | Corporate document store |

| ID | Requirement | Priority |
|---|---|---|
| INT-06 | Every value entering through a reserved seam substitute shall be stored with its source marked as manual, the entering user, and the entry timestamp | M |
| INT-07 | The metric layer shall consume manual and automated values through the same interface, so that later integration does not alter KPI computation | M |

## 3.2 Functional Requirements

### 3.2.1 M1 Administration and Reference Data

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-01 | The system shall maintain departments, divisions, and units or sections, reflecting the organisational fields on R1 | M |
| FR-ADM-02 | The system shall maintain a workstation register, each workstation belonging to a unit and carrying a location and a work type | M |
| FR-ADM-03 | The system shall maintain a monitoring location register for environmental monitoring | M |
| FR-ADM-04 | The system shall maintain environmental standards as versioned rows carrying parameter, averaging period, limit value, unit, effective from date, and effective to date | M |
| FR-ADM-05 | The system shall maintain KPI definitions and targets as versioned reference rows, editable without code change | M |
| FR-ADM-06 | The system shall allow an environmental parameter to be marked active or inactive, so that parameters without available instruments are defined but excluded from index computation | M |
| FR-ADM-07 | The system shall record the user and timestamp for every reference data change, and shall not permit hard deletion of reference rows that have been referenced by a record | M |
| FR-ADM-08 | The system shall support bulk import of the workstation register from CSV | S |

### 3.2.2 M2 Patient Registry

| ID | Requirement | Priority |
|---|---|---|
| FR-PAT-01 | The system shall register a patient with name, age, sex, phone contact, department, division, unit or section, and job title, per R1 | M |
| FR-PAT-02 | The system shall record a patient category of employee, intern, contractor or visitor | M |
| FR-PAT-03 | The system shall treat the employee number as optional, and shall not require it for any patient category | M |
| FR-PAT-04 | The system shall not prevent registration of a patient whose organisational details are incomplete, since emergency presentation must never be blocked by data entry | M |
| FR-PAT-05 | The system shall record duration at KMC, per the occupational health history section of R1 | M |
| FR-PAT-06 | The system shall support searching the registry by name, employee number, and department, restricted to roles permitted clinical access | M |
| FR-PAT-07 | The system shall support merging duplicate patient records, with the merge recorded in the audit log | S |
| FR-PAT-08 | The system shall maintain patient records under soft deletion only | M |

### 3.2.3 M3 Infirmary Encounter Management

| ID | Requirement | Priority |
|---|---|---|
| FR-ENC-01 | The system shall create an encounter recording patient, date of visit, time in, and visit type of walk in, referred by supervisor, emergency, or follow up, per R1 | M |
| FR-ENC-02 | The system shall structure the encounter into the sections of R1: presenting complaint, history of present illness, past medical history, past surgical history, medication history, occupational health history, vital signs, general examination, systemic examination, investigations, impression, and treatment | M |
| FR-ENC-03 | The system shall permit each section to be left not started, partially completed, completed, or explicitly marked not applicable | M |
| FR-ENC-04 | The system shall compute and store a completeness indicator for each encounter | M |
| FR-ENC-05 | The system shall record onset as sudden or gradual within history of present illness | M |
| FR-ENC-06 | The system shall record whether the condition is work related as yes, no, or unsure, and shall capture a free text exposure or activity description where yes is selected | M |
| FR-ENC-07 | The system shall record past medical history as the discrete conditions listed on R1, together with allergies and other relevant history | M |
| FR-ENC-08 | The system shall record vital signs with unit constrained numeric fields, and shall compute body mass index from weight and height | M |
| FR-ENC-09 | The system shall validate vital sign entries against physiologically plausible ranges and warn, but shall not block, on an out of range value | M |
| FR-ENC-10 | The system shall record a pain score from zero to ten | M |
| FR-ENC-11 | The system shall record nature of work, PPE compliance, recent workplace injury and previous work related injury or illness, per the occupational health history section of R1 | M |
| FR-ENC-12 | The system shall record an impression, a work related determination of yes, no or suspected, and free text treatment | M |
| FR-ENC-13 | The system shall record the attending clinician, designation, and date, and shall apply an electronic signature by way of the authenticated identity | M |
| FR-ENC-14 | The system shall prevent modification of an encounter after the clinician has signed it, permitting correction only by an appended amendment that preserves the original | M |
| FR-ENC-15 | The system shall permit an encounter to be linked to a preceding encounter where the visit type is follow up | S |
| FR-ENC-16 | The system shall permit attachment of investigation result documents to an encounter | S |
| FR-ENC-17 | The system shall not permit clinical photography in version 1, per C-21 | M |

### 3.2.4 M4 Occupational Health Surveillance

| ID | Requirement | Priority |
|---|---|---|
| FR-SURV-01 | The system shall maintain a surveillance plan defining, per period, the number of employees scheduled for statutory or risk based medical surveillance | M |
| FR-SURV-02 | The system shall record surveillance assessments completed within a period | M |
| FR-SURV-03 | Where no surveillance plan exists, the system shall accept the scheduled and completed counts as a manual return through M8, per ADR-05 | M |
| FR-SURV-04 | The system shall permit the Physician to raise a suspected occupational disease case from an encounter where the work related determination is yes or suspected | M |
| FR-SURV-05 | The system shall require confirmation of a suspected case by the Division Head before it counts toward the Occupational Disease Rate | M |
| FR-SURV-06 | The case confirmation view shall expose the department, exposure description, and case status, and shall not expose the patient identity or the clinical record | M |
| FR-SURV-07 | The system shall record a fitness for work outcome of fit, fit with restrictions, or temporarily unfit, with a review date and free text restrictions, carrying no diagnosis | M |
| FR-SURV-08 | The fitness for work outcome shall be visible to the Division Head and, where confirmed at C-05, to management, without exposing any clinical record | M |
| FR-SURV-09 | Per employee surveillance scheduling by risk group shall be supported in a later version | D |

### 3.2.5 M5 Ergonomic Risk Assessment

| ID | Requirement | Priority |
|---|---|---|
| FR-ERG-01 | The system shall maintain an assessment plan defining the workstations scheduled for assessment in a period | M |
| FR-ERG-02 | The system shall record an assessment against a workstation with date, assessor, and outcome | M |
| FR-ERG-03 | The outcome shall be one of compliant, partially compliant, or non compliant, per R3 | M |
| FR-ERG-04 | The system shall record free text findings and permit photographs of the workstation | M |
| FR-ERG-05 | The system shall distinguish office and industrial assessments, since R2 reports them separately | M |
| FR-ERG-06 | The system shall permit corrective actions to be raised from an assessment, each with a description, owner, due date, and status | M |
| FR-ERG-07 | The system shall record implementation of a corrective action by the OHS Officer and closure approval by the Division Head | M |
| FR-ERG-08 | The system shall flag corrective actions overdue against their due date | M |
| FR-ERG-09 | The assessment record shall carry a nullable reference to a future assessment template version, per ADR-07 | M |
| FR-ERG-10 | Criteria level assessment capture through a configurable template builder shall be supported in a later version | D |

### 3.2.6 M6 Environmental and Industrial Hygiene Monitoring

| ID | Requirement | Priority |
|---|---|---|
| FR-ENV-01 | The system shall maintain a monitoring plan defining, per period, the monitoring events scheduled at each location for each parameter | M |
| FR-ENV-02 | The system shall record a monitoring event with location, date, time, instrument identifier, and recording officer | M |
| FR-ENV-03 | The system shall record a reading per parameter per event, with a value and unit | M |
| FR-ENV-04 | The system shall automatically evaluate each reading against the standard in force on the date of the reading, and store the resulting compliance state | M |
| FR-ENV-05 | The stored compliance state shall be immutable once written, and shall not change when a standard is later amended | M |
| FR-ENV-06 | The system shall support the parameters listed in R2: PM2.5, PM10, TVOCs, nitrogen dioxide, sulphur dioxide, carbon monoxide, ozone, and hydrogen sulphide, with the averaging periods stated there | M |
| FR-ENV-07 | The system shall support noise readings against separate day and night limits | M |
| FR-ENV-08 | The system shall exclude inactive parameters from the compliance index denominator, per FR-ADM-06 | M |
| FR-ENV-09 | The system shall report monitoring schedule adherence separately from limit compliance, per ADR-06 | M |
| FR-ENV-10 | The system shall permit a monitoring event to be recorded as not performed, with a reason | M |
| FR-ENV-11 | The system shall present a trend view of each parameter against its limit over time | S |
| FR-ENV-12 | The system shall permit attachment of a laboratory or instrument report to a monitoring event | S |

### 3.2.7 M7 Compliance Register

| ID | Requirement | Priority |
|---|---|---|
| FR-LIC-01 | The system shall maintain a register of the KVP Infirmary operating licence with issuing authority, licence number, issue date, and expiry date | M |
| FR-LIC-02 | The system shall maintain a register of occupational health practitioners with professional registration and practising licence, each with expiry date | M |
| FR-LIC-03 | The system shall raise alerts at ninety, sixty and thirty days before expiry, per C-20 | M |
| FR-LIC-04 | The system shall raise a prominent alert on the dashboard where any licence is expired | M |
| FR-LIC-05 | The system shall retain superseded licence records to preserve a continuous validity history | M |
| FR-LIC-06 | The system shall permit attachment of a scanned licence certificate | S |
| FR-LIC-07 | The system shall compute licence validity for a reporting period as valid only where cover was continuous across every day of that period | M |

### 3.2.8 M8 Periodic Returns

| ID | Requirement | Priority |
|---|---|---|
| FR-RET-01 | The system shall provide a monthly return capturing health related lost days, month end headcount, employees scheduled for surveillance, and employees assessed | M |
| FR-RET-02 | The return shall record the entering user, the entry date, and the stated source of each figure | M |
| FR-RET-03 | The system shall present the computed absenteeism rate on the return screen at the point of entry, so that an implausible figure is visible immediately | M |
| FR-RET-04 | The system shall flag a period for which a return is due but not submitted, and shall mark any KPI depending on that return as incomplete rather than reporting a value | M |
| FR-RET-05 | The system shall permit correction of a submitted return, preserving the prior value and recording the reason | M |
| FR-RET-06 | The system shall not permit a return to be submitted for a future period | M |
| FR-RET-07 | Health related lost days shall be defined per C-07 and the definition shall be displayed on the entry screen | M |

### 3.2.9 M9 KPI Computation and Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-KPI-01 | The system shall maintain a metric registry per ADR-05, each entry declaring identifier, name, numerator, denominator, period, target, direction, and source type | M |
| FR-KPI-02 | The system shall compute the nine metrics catalogued at Appendix 6.2 | M |
| FR-KPI-03 | The dashboard shall present each metric with value, target, direction, period, source type, and compliance state | M |
| FR-KPI-04 | The dashboard shall permit selection of a reporting month and a reporting quarter | M |
| FR-KPI-05 | The dashboard shall present the air quality parameter table with measured values against limits and a compliance marker per parameter | M |
| FR-KPI-06 | The dashboard shall present licence status and any expiry alerts | M |
| FR-KPI-07 | The dashboard shall show a metric as incomplete, and shall not show a computed value, where the underlying data for the period is missing | M |
| FR-KPI-08 | The dashboard shall permit drill down from a metric to the records that produced it, subject to the access rules at 3.3.2 | M |
| FR-KPI-09 | Drill down from a clinically derived metric shall present aggregate counts only, and shall never present an individual clinical record, per ADR-03 | M |
| FR-KPI-10 | The system shall suppress any aggregate cell derived from clinical data where the count is below the minimum cell size defined at C-04, to prevent re-identification within small units | M |
| FR-KPI-11 | The system shall recompute metrics on demand and shall display the computation timestamp | M |
| FR-KPI-12 | The system shall present a twelve month trend for each metric | S |

### 3.2.10 M10 Reporting and Export

| ID | Requirement | Priority |
|---|---|---|
| FR-RPT-01 | The system shall generate a monthly report reproducing the structure of the template at R2 | M |
| FR-RPT-02 | The system shall generate a quarterly report aggregating the constituent months | M |
| FR-RPT-03 | Reports shall be exportable to PDF | M |
| FR-RPT-04 | Reports shall be exportable to a Word compatible format to permit narrative editing before circulation | S |
| FR-RPT-05 | Every report shall carry the generation timestamp, the generating user, and the reporting period | M |
| FR-RPT-06 | Reports shall contain aggregate data only and shall never contain individual clinical content | M |
| FR-RPT-07 | The system shall retain generated reports so that a previously circulated figure can be reproduced exactly | S |

### 3.2.11 M11 Identity, Access and Audit

| ID | Requirement | Priority |
|---|---|---|
| FR-SEC-01 | The system shall authenticate every user before granting access to any function | M |
| FR-SEC-02 | The system shall implement the roles and permissions defined in Appendix 6.5 | M |
| FR-SEC-03 | Access to individual clinical records shall be restricted to the Occupational Health Physician role, per ADR-03 | M |
| FR-SEC-04 | The system shall log every retrieval of an individual clinical record with acting user, patient reference, timestamp, and access route, per ADR-11 | M |
| FR-SEC-05 | The clinical access log shall be append only and shall be readable only by the Data Protection Officer role | M |
| FR-SEC-06 | The system shall log every create, update and delete action with acting user, entity, timestamp, and changed values | M |
| FR-SEC-07 | The system shall enforce session timeout after a period of inactivity, set conservatively given that Infirmary workstations are shared space | M |
| FR-SEC-08 | The system shall require multi factor authentication for the Physician and System Administrator roles | S |
| FR-SEC-09 | The system shall provide a break glass access path subject to confirmation at C-01, granting time limited clinical access, requiring a stated reason, and notifying the Physician on use | S |
| FR-SEC-10 | The System Administrator role shall be able to manage users and reference data and shall have no access to clinical record content | M |

## 3.3 Non-Functional Requirements

### 3.3.1 Security

| ID | Requirement | Priority |
|---|---|---|
| NFR-SEC-01 | All data in transit shall be encrypted using TLS | M |
| NFR-SEC-02 | The clinical database shall be encrypted at rest with a key distinct from that used for other contexts | M |
| NFR-SEC-03 | Passwords shall be stored using a memory hard hashing algorithm | M |
| NFR-SEC-04 | The application shall enforce authorisation at the service layer, not solely in the user interface | M |
| NFR-SEC-05 | Backups of the clinical context shall be encrypted with a separate key and stored separately from other backups | M |

### 3.3.2 Data Protection and Privacy

| ID | Requirement | Priority |
|---|---|---|
| NFR-PRIV-01 | Clinical data shall be treated as special personal data under R4 and shall not be transmitted outside KMC controlled infrastructure | M |
| NFR-PRIV-02 | The system shall apply data minimisation, exposing to each role only the fields required for that role's function | M |
| NFR-PRIV-03 | Aggregate outputs derived from clinical data shall apply minimum cell size suppression, per FR-KPI-10 | M |
| NFR-PRIV-04 | The system shall support a defined retention period for clinical records, per C-03, after which records are archived rather than deleted | M |
| NFR-PRIV-05 | The system shall be able to produce, on request, a complete record of access to a given patient's clinical data | M |
| NFR-PRIV-06 | The system shall record patient consent where a photograph or document identifying the patient is attached | M |
| NFR-PRIV-07 | Test and demonstration environments shall contain synthetic data only, and shall never contain a real clinical record | M |

### 3.3.3 Performance

| ID | Requirement | Priority |
|---|---|---|
| NFR-PERF-01 | A form section shall save within two seconds under normal load | M |
| NFR-PERF-02 | The dashboard shall render a full month within five seconds | M |
| NFR-PERF-03 | Metric recomputation for a month shall complete within thirty seconds | M |
| NFR-PERF-04 | The system shall support at least fifty concurrent users, which exceeds anticipated demand by a wide margin | M |

### 3.3.4 Availability and Recovery

| ID | Requirement | Priority |
|---|---|---|
| NFR-AVL-01 | The system shall target availability of 99 percent during working hours | M |
| NFR-AVL-02 | Backups shall be taken nightly with a recovery point objective of twenty four hours | M |
| NFR-AVL-03 | The recovery time objective shall be four working hours | M |
| NFR-AVL-04 | Restore from backup shall be tested quarterly and the test recorded | M |
| NFR-AVL-05 | Loss of system availability shall not prevent clinical service. A printable blank encounter form shall be available for fallback, with retrospective entry supported | M |

NFR-AVL-05 matters more than the availability target. The Infirmary must be able to treat a patient when the system is down.

### 3.3.5 Usability

| ID | Requirement | Priority |
|---|---|---|
| NFR-USE-01 | A user familiar with the paper form shall complete a routine encounter without training beyond a single orientation session | M |
| NFR-USE-02 | A minimal walk in encounter shall be recordable in under two minutes | M |
| NFR-USE-03 | Error messages shall state the corrective action required, not merely that an error occurred | M |
| NFR-USE-04 | The system shall not lose entered data on navigation between sections | M |
| NFR-USE-05 | Interface language shall be English | M |

### 3.3.6 Maintainability and Evolution

| ID | Requirement | Priority |
|---|---|---|
| NFR-MNT-01 | Environmental limits, KPI targets, and organisational reference data shall be changeable without a code release, per ADR-08 | M |
| NFR-MNT-02 | Bounded context boundaries shall be respected, with no cross context foreign keys, per ADR-10 | M |
| NFR-MNT-03 | Database schema changes shall be applied through versioned migrations held in source control | M |
| NFR-MNT-04 | The system shall be documented to a standard permitting handover to a developer with no prior exposure, per CON-07 and Appendix 6.8 | M |
| NFR-MNT-05 | Automated tests shall cover KPI computation, access control enforcement, and limit evaluation as a minimum | M |

### 3.3.7 Auditability

| ID | Requirement | Priority |
|---|---|---|
| NFR-AUD-01 | Every reported figure shall be traceable to the records or the manual return that produced it | M |
| NFR-AUD-02 | Audit records shall be immutable and retained for not less than the clinical retention period | M |
| NFR-AUD-03 | The system shall be able to reproduce the dashboard as it stood at a past period close | S |

## 3.4 Data Requirements

### 3.4.1 Canonical Data Model

Thirty one entities across four bounded contexts.

**Administration context**

| Entity | Purpose |
|---|---|
| department | Organisational department |
| division | Division within a department |
| unit_section | Unit or section within a division |
| workstation | Physical or logical work position, subject of ergonomic assessment |
| monitoring_location | Named point at which environmental monitoring is performed |
| environmental_standard | Versioned limit per parameter and averaging period, with effective dates |
| environmental_parameter | Parameter definition, including active or inactive state |
| app_user | System user account |
| role | Named role |
| role_permission | Permission grant per role |

**Clinical context, physically separate database**

| Entity | Purpose |
|---|---|
| patient | Any person eligible to attend, with patient category and optional employee number |
| encounter | A single Infirmary attendance |
| encounter_section_state | Section completion state per encounter, per ADR-09 |
| presenting_complaint | Complaint and history of present illness |
| past_medical_history | Discrete conditions, allergies, other history |
| past_surgical_history | Previous surgery and fractures |
| medication_history | Current and recent medication |
| occupational_history | Nature of work, PPE compliance, injury history, duration at KMC |
| vital_signs | Measured vitals and derived body mass index |
| examination_finding | General and systemic examination findings |
| investigation | Investigations performed and results |
| impression | Clinical impression and work related determination |
| treatment | Treatment given |
| encounter_attachment | Attached document, with consent flag |

**Occupational context**

| Entity | Purpose |
|---|---|
| surveillance_plan | Scheduled surveillance per period |
| surveillance_assessment | Completed surveillance assessment |
| occupational_disease_case | Suspected and confirmed case, carrying no clinical detail |
| fitness_for_work | Outcome, restrictions and review date, carrying no diagnosis |
| ergonomic_assessment | Workstation assessment with tri state outcome |
| corrective_action | Action raised from an assessment, with owner, due date and status |
| monitoring_plan | Scheduled monitoring events per location and parameter |
| monitoring_event | A performed or not performed monitoring occasion |
| parameter_reading | A single measured value with its stored compliance state |
| licence | Infirmary or practitioner licence with validity dates |

**Metrics context**

| Entity | Purpose |
|---|---|
| kpi_definition | Metric registry entry per ADR-05 |
| kpi_target | Versioned target with effective dates |
| kpi_value | Computed or entered value per metric per period |
| periodic_return | Monthly manual return per M8 |

**Cross cutting**

| Entity | Purpose |
|---|---|
| audit_log | Create, update and delete actions across all contexts |
| clinical_access_log | Read access to individual clinical records, append only, per ADR-11 |

### 3.4.2 Bounded Context Ownership

| Rule | Statement |
|---|---|
| DR-01 | Each context owns its schema exclusively. No context reads another's tables directly |
| DR-02 | Cross context references use an identifier reference field with no database foreign key, following the convention established in R7 |
| DR-03 | The clinical context is deployed to a separate database instance with separate credentials and a separate encryption key |
| DR-04 | The metrics context receives clinical data only as counts, never as records |
| DR-05 | Records subject to referential use are soft deleted, never hard deleted |

### 3.4.3 Data Retention

| Data class | Retention | Disposition on expiry |
|---|---|---|
| Clinical records | Per C-03 | Archived, not deleted |
| Occupational and environmental records | Per C-03 | Archived |
| Audit log | Not less than the clinical retention period | Retained |
| Clinical access log | Not less than the clinical retention period | Retained |
| Generated reports | Seven years | Archived |

## 3.5 Operational Requirements

### 3.5.1 Deployment

| ID | Requirement | Priority |
|---|---|---|
| OPS-01 | The system shall be deployed on premise on KMC controlled infrastructure, subject to C-24 | M |
| OPS-02 | Application and databases shall be deployed as separate units, with the clinical database separately provisioned | M |
| OPS-03 | Configuration shall be externalised from the application image | M |
| OPS-04 | Deployment shall be reproducible from source control without manual steps | S |

### 3.5.2 Backup and Recovery

| ID | Requirement | Priority |
|---|---|---|
| OPS-05 | Nightly encrypted backups shall be taken of all databases | M |
| OPS-06 | Clinical backups shall use a separate encryption key and separate storage | M |
| OPS-07 | Backups shall reside on KMC controlled infrastructure only | M |
| OPS-08 | A quarterly restore test shall be performed and recorded | M |

### 3.5.3 Seeding and Reference Data

| ID | Requirement | Priority |
|---|---|---|
| OPS-09 | The system shall ship with the environmental standards at R2 pre-loaded as effective dated reference rows | M |
| OPS-10 | The system shall ship with the nine metric definitions at Appendix 6.2 pre-loaded | M |
| OPS-11 | The system shall provide a synthetic seed data set for demonstration and training, containing no real clinical record | M |
| OPS-12 | Seed data shall be clearly distinguishable from production data | M |

### 3.5.4 Monitoring

| ID | Requirement | Priority |
|---|---|---|
| OPS-13 | The system shall expose a health check endpoint | M |
| OPS-14 | Application errors shall be logged with sufficient context for diagnosis and shall never log clinical content | M |
| OPS-15 | Failed authentication attempts shall be logged and rate limited | M |

---

# 4. Requirements Traceability Matrix

| Business need, source | KPI or outcome | Requirements | Verification |
|---|---|---|---|
| Replace paper Infirmary records, R1, R3 | Searchable, auditable clinical record | FR-PAT-01 to 08, FR-ENC-01 to 17 | Record a full and a minimal encounter, confirm both persist with correct section states |
| Treat non-employees, R3 and divisional confirmation | No patient turned away for want of an identifier | FR-PAT-02, FR-PAT-03, FR-PAT-04, ADR-04 | Register a visitor with no employee number, complete an encounter |
| Protect clinical confidentiality, R4 | No unauthorised access to individual records | FR-SEC-03 to 05, FR-KPI-09, FR-KPI-10, NFR-PRIV-01 to 07, ADR-03 | Attempt individual record access as each non-clinical role, confirm refusal and log entry |
| Surveillance compliance, KPI 1, R2 | 100 percent of scheduled assessments completed | FR-SURV-01 to 03, FR-RET-01 | Enter a return, confirm computed percentage and incomplete flagging |
| Occupational disease rate, KPI 2, R2 | Zero confirmed cases | FR-SURV-04 to 06, FR-ENC-06, FR-ENC-12 | Raise a suspected case, confirm it, verify the count and that identity is not exposed |
| Absenteeism rate, KPI 3, R2 and R3 | Under 0.5 days per employee per month | FR-RET-01 to 07, INT-01, INT-02 | Enter lost days and headcount, confirm the monthly rate, not a cumulative figure |
| Industrial hygiene compliance, KPI 4, R2 | At least 95 percent | FR-ENV-01 to 12, FR-ADM-04, FR-ADM-06 | Record readings above and below limit, confirm index and marker |
| Ergonomic risk control, KPI 5, R2 and R3 | At least 95 percent | FR-ERG-01 to 09 | Record all three outcomes, raise and close an action, confirm overdue flagging |
| Licence compliance, KPI 6 and 7, R2 | Continuous validity | FR-LIC-01 to 07 | Seed a licence expiring in 21 days, confirm the alert and the period validity rule |
| Monitoring completeness, ADR-06 | Plan versus actual visible | FR-ENV-09, FR-ENV-10, FR-ERG-01 | Omit a planned event, confirm completeness falls while compliance is unaffected |
| Executive reporting, R2 | Report produced without re-keying | FR-KPI-01 to 12, FR-RPT-01 to 07 | Generate a month and a quarter, compare against the R2 layout |
| Evolving requirements, CON-02, R3 | Change without redeployment | FR-ADM-04, FR-ADM-05, NFR-MNT-01, ADR-08 | Amend a limit with an effective date, confirm historical evaluations unchanged |
| Handover, CON-07 | System maintainable after departure | NFR-MNT-03 to 05, Appendix 6.8 | Independent review of documentation completeness |

---

# 5. Information Requiring Confirmation

The items below were either not resolved during requirements gathering or arise from inconsistencies within the source documents. Each carries a proposed answer, which the system will implement unless the Division directs otherwise. The proposed answers are defaults, not decisions. Items marked high impact change the design if amended and should be resolved first.

## 5.1 Clinical access and confidentiality

| ID | Question | Proposed answer | Impact |
|---|---|---|---|
| C-01 | If the Physician is absent, who may open a clinical record? | No standing access is granted to any other role. A break glass path grants time limited access to a named deputy, requires a stated reason, is logged, and notifies the Physician on next login. If no deputy is nominated, records remain inaccessible until the Physician returns. | High |
| C-02 | May a nurse or assistant record any part of an encounter? | Yes, but scoped. A Clinical Assistant role may create the encounter and record biodata, visit type, and vital signs. History, examination, impression and treatment remain Physician only. If no such role exists at the Division, this is not implemented. | Medium |
| C-03 | For how long are clinical records retained? | Ten years from the last encounter, then archived rather than deleted. Occupational exposure records retained longer where R5 requires. To be confirmed against KMC policy and legal advice. | Medium |
| C-04 | Is it confirmed that management never sees an individual clinical record? | Yes. Management receives aggregates and fitness for work outcomes only. Aggregate cells derived from clinical data are suppressed below a minimum count of five, so that a single case in a small unit cannot be attributed to an individual. | High |
| C-05 | Does management need a fitness for work outcome it can act on? | Yes. The Physician issues fit, fit with restrictions, or temporarily unfit, with restrictions and a review date, and no diagnosis. This is the only individual level clinical output visible outside the clinical role. | High |
| C-21 | What are photographs used for, and is patient consent required? | Photographs are used for workstation ergonomics and monitoring locations only. No clinical photography in version 1. Any attachment identifying a patient requires a recorded consent flag. | Medium |

## 5.2 Patient and organisational scope

| ID | Question | Proposed answer | Impact |
|---|---|---|---|
| C-06 | Which categories of person are treated at the Infirmary? | Employees, interns, contractors and visitors. All are registered. Employee number is optional and applies to employees only. Confirmed during requirements gathering. | High |
| C-17 | Is an ergonomic assessment made against a workstation or against a person? | Against a workstation, with the current occupant recorded as a reference. Reassessment after a change of occupant creates a new record against the same workstation. | Medium |
| C-18 | Who records implementation of a corrective action, and who closes it? | The OHS Officer records implementation. The Division Head approves closure. Only approved closures count toward the Ergonomic Risk Control Index. | Low |

## 5.3 Key performance indicator definitions

| ID | Question | Proposed answer | Impact |
|---|---|---|---|
| C-07 | Which leave types count as health related absence? | Certified sick leave and Infirmary referred absence. Annual, compassionate, study and maternity leave are excluded. The transcript at R3 discusses total leave and sick days interchangeably, so this requires explicit confirmation. | High |
| C-08 | Is the absenteeism figure monthly or cumulative since January? | Monthly. Health related lost days in the month divided by month end headcount. A cumulative year to date figure is shown alongside for context but is not measured against the target. The present method of dividing a year to date total by headcount does not produce a per month rate and will report compliance regardless of performance. | High |
| C-09 | Who supplies headcount, and on what date? | The Division enters month end headcount taken from the Human Resource portal, on the existing 28th of the month reporting cycle. | Low |
| C-10 | The template at R2 lists indicators numbered 1, 2, 3, 4, 5, 8 and 9 in the detailed section, but seven items in the summary table, and the two lists do not use the same names. Which set is canonical? | The seven in the summary table are canonical, plus two completeness companions, giving the nine metrics at Appendix 6.2. Occupational Exposure Monitoring Compliance is treated as the same indicator as Industrial Hygiene Compliance Index, and Ergonomic Risk Assessment Compliance as the same as Ergonomic Risk Control Index. Items 6 and 7 appear to be missing from the detailed list rather than omitted deliberately. | High |
| C-11 | How is the Industrial Hygiene Compliance Index computed? | Readings within limit divided by total readings taken in the period, expressed as a percentage, with all active parameters weighted equally. The method described at R3, averaging the parameters, cannot be applied directly because the parameters are measured in different units against different limits. | High |
| C-19 | Who confirms an occupational disease case? | The Physician raises a suspected case from an encounter. The Division Head confirms it. Only confirmed cases count toward KPI 2. The confirmation view shows department and exposure but not patient identity. | Medium |
| C-22 | Does a medical surveillance plan currently exist? | No. KPI 1 is therefore entered as a manual return in version 1, and becomes computed in a later version once risk groups and assessment periodicity are defined. | High |

## 5.4 Environmental monitoring

| ID | Question | Proposed answer | Impact |
|---|---|---|---|
| C-12 | Which parameters can actually be measured with instruments currently held? | PM2.5 and PM10 only, using the existing particulate meter. All other parameters are defined in the standards table but marked inactive, and are excluded from the compliance index denominator until instruments are available. | High |
| C-13 | The first table at R2 shows no limit for total volatile organic compounds, while a later row shows 600 µg/m³ over 24 hours. Which applies? | 600 µg/m³ over 24 hours. | Low |
| C-14 | Hydrogen sulphide appears twice in the indicator table at R2. Is this deliberate? | No. A single entry is used, 42 µg/m³ over one hour. | Low |
| C-15 | Which monitoring locations, and at what frequency? | Locations per the Industrial Hygiene Plan. Air quality quarterly, noise quarterly covering both day and night, both configurable per location. R2 states quarterly monitoring for exposure and monthly reporting for most other indicators. | Medium |
| C-16 | What time range constitutes night for noise monitoring, given shift operations? | 22:00 to 06:00, to be verified against the applicable NEMA noise regulations rather than assumed. | Low |
| C-23 | Are the limits at R2 the current applicable NEMA standards? | Assumed yes and loaded as effective dated reference data. Any correction is applied as a new version with an effective date and does not alter historical evaluations. Verification by the Corporation's environmental function is requested. | Medium |

## 5.5 Regulatory, reporting and deployment

| ID | Question | Proposed answer | Impact |
|---|---|---|---|
| C-20 | Which licences are in scope, issued by which authorities, and what warning period is required? | The KVP Infirmary operating licence and individual practitioner registration and practising licences. Issuing authorities to be named by the Division. Alerts at 90, 60 and 30 days before expiry. | Medium |
| C-24 | Is the system deployed on premise at KMC or hosted externally? | On premise. Clinical data is special personal data under R4 and the residency position should be conservative until legal advice states otherwise. | High |
| C-25 | What must the monthly and quarterly outputs look like when circulated? | A PDF reproducing the layout of the template at R2, with a Word export for narrative editing before circulation. | Medium |
| C-26 | Who owns the system after 31 July 2026? | To be confirmed by the Division. This specification and the accompanying prototype are written to permit handover to another developer. See Appendix 6.8. | High |

---

# 6. Appendices

## 6.1 Glossary

| Term | Definition |
|---|---|
| ADR | Architecture Decision Record. A short record of a design decision, its context, and its consequences |
| Break glass | An emergency access path that grants normally forbidden access, subject to logging, justification and notification |
| Bounded context | A region of the system owning its own data and vocabulary, communicating with other regions only through defined interfaces |
| Completeness metric | A measure of whether planned activity was performed, distinct from whether the results complied |
| Compliance metric | A measure of whether measured results fell within applicable limits |
| Encounter | A single attendance at the Infirmary by one patient |
| Fitness for work | A clinical judgement on capacity to perform work, expressed without disclosing the underlying condition |
| HWMS | Health and Wellness Management System |
| KVP | Kiira Vehicle Plant |
| Minimum cell size | The smallest count that may be published in an aggregate, below which the figure is suppressed to prevent identification of an individual |
| NEMA | National Environment Management Authority |
| OHS | Occupational Health and Safety |
| Patient category | Employee, intern, contractor or visitor |
| PM2.5, PM10 | Particulate matter of 2.5 and 10 micrometres or less in aerodynamic diameter |
| PPE | Personal Protective Equipment |
| Special personal data | A category of personal data attracting heightened protection under R4, including data concerning health |
| Tri state outcome | Compliant, partially compliant, or non compliant |
| TVOC | Total Volatile Organic Compounds |

## 6.2 KPI Definition Catalogue

| ID | Metric | Numerator | Denominator | Period | Target | Direction | Source type |
|---|---|---|---|---|---|---|---|
| K1 | Occupational Health Surveillance Compliance | Employees assessed within the planned period | Employees scheduled for surveillance in the period | Monthly | 100% | Higher is better | Manual return in v1, computed in v2 |
| K2 | Occupational Disease Rate | Confirmed work attributable disease cases | Not applicable, absolute count | Monthly | 0 | Lower is better | Computed, confirmation required |
| K3 | Health-related Absenteeism Rate | Health related lost days in the month | Headcount at month end, employees only | Monthly | Under 0.5 days per employee | Lower is better | Manual return |
| K4 | Industrial Hygiene Compliance Index | Parameter readings within limit | Total readings taken for active parameters | Monthly, rolled to quarterly | At least 95% | Higher is better | Computed |
| K5 | Ergonomic Risk Control Index | Corrective actions closed within the target period | Corrective actions due in the period | Monthly | At least 95% | Higher is better | Computed |
| K6 | KVP Infirmary Licence Compliance | Valid cover on every day of the period | Not applicable, boolean | Monthly | Valid | Boolean | Register derived |
| K7 | OH Practitioner Licence Compliance | Practitioners holding valid registration and practising licence | Total practitioners on register | Monthly | 100% | Higher is better | Register derived |
| K4c | Monitoring Completion Rate | Monitoring events performed | Monitoring events planned | Monthly | 100% | Higher is better | Computed |
| K5c | Ergonomic Assessment Completion | Assessments completed | Assessments planned | Monthly | 100% | Higher is better | Computed |

K4c and K5c are the completeness companions introduced by ADR-06. They are reported adjacent to K4 and K5 and never merged with them.

## 6.3 Environmental Standards Reference

Loaded as effective dated reference rows per FR-ADM-04. Values as stated at R2, subject to C-12, C-13, C-14 and C-23.

| Parameter | Averaging period | Limit | Unit | Active in v1 |
|---|---|---|---|---|
| PM2.5 | 24 hour | 35 | µg/m³ | Yes |
| PM2.5 | Annual | 25 | µg/m³ | Yes |
| PM10 | 24 hour | 60 | µg/m³ | Yes |
| PM10 | Annual | 40 | µg/m³ | Yes |
| Nitrogen dioxide | 24 hour | 50 | µg/m³ | No, C-12 |
| Nitrogen dioxide | Annual | 30 | µg/m³ | No, C-12 |
| Sulphur dioxide | 1 hour | 50 | µg/m³ | No, C-12 |
| Sulphur dioxide | 24 hour | 20 | µg/m³ | No, C-12 |
| Carbon monoxide | 1 hour | 35 | mg/m³ | No, C-12 |
| Carbon monoxide | 8 hour | 10 | mg/m³ | No, C-12 |
| Carbon monoxide | 24 hour | 7 | mg/m³ | No, C-12 |
| Ozone | 1 hour | 235 | µg/m³ | No, C-12 |
| Ozone | 8 hour | 120 | µg/m³ | No, C-12 |
| Hydrogen sulphide | 1 hour | 42 | µg/m³ | No, C-12 and C-14 |
| TVOCs | 24 hour | 600 | µg/m³ | No, C-12 and C-13 |
| Noise, day | Day period | 75 | dB | Yes |
| Noise, night | Night period per C-16 | 70 | dB | Yes |

## 6.4 Selected Data Dictionary Entries

**patient**

| Field | Type | Constraint |
|---|---|---|
| patient_id | UUID | Primary key |
| full_name | Text | Required |
| age | Integer | Required |
| sex | Enum | Male, Female |
| phone_contact | Text | Optional |
| patient_category | Enum | Employee, Intern, Contractor, Visitor. Required |
| employee_number | Text | Optional, permitted only where category is Employee |
| department_id_ref | UUID | Optional, no foreign key across contexts |
| division_id_ref | UUID | Optional |
| unit_section_id_ref | UUID | Optional |
| job_title | Text | Optional |
| duration_at_kmc | Text | Optional |
| is_deleted | Boolean | Soft delete, default false |

**encounter_section_state**

| Field | Type | Constraint |
|---|---|---|
| encounter_section_state_id | UUID | Primary key |
| encounter_id | UUID | Required |
| section_code | Enum | One of the twelve sections at FR-ENC-02 |
| state | Enum | Not started, Partial, Complete, Not applicable |
| not_applicable_reason | Text | Required where state is Not applicable |
| updated_by | UUID | Required |
| updated_at | Timestamp | Required |

**parameter_reading**

| Field | Type | Constraint |
|---|---|---|
| parameter_reading_id | UUID | Primary key |
| monitoring_event_id | UUID | Required |
| parameter_id_ref | UUID | Required |
| value | Numeric | Required |
| unit | Text | Required |
| standard_version_id_ref | UUID | Standard in force on the reading date, required |
| compliance_state | Enum | Compliant, Non compliant. Immutable once written, per FR-ENV-05 |
| recorded_by | UUID | Required |
| recorded_at | Timestamp | Required |

**periodic_return**

| Field | Type | Constraint |
|---|---|---|
| periodic_return_id | UUID | Primary key |
| period_month | Date | Required, unique per month |
| health_related_lost_days | Numeric | Required |
| headcount_month_end | Integer | Required |
| surveillance_scheduled | Integer | Required |
| surveillance_completed | Integer | Required |
| source_note | Text | Required, states where each figure came from |
| entered_by | UUID | Required |
| entered_at | Timestamp | Required |
| superseded_by | UUID | Optional, set on correction per FR-RET-05 |

**clinical_access_log**

| Field | Type | Constraint |
|---|---|---|
| clinical_access_log_id | UUID | Primary key |
| acting_user_id | UUID | Required |
| patient_id_ref | UUID | Required |
| encounter_id_ref | UUID | Optional |
| access_route | Enum | Direct, Search, Break glass |
| break_glass_reason | Text | Required where route is Break glass |
| accessed_at | Timestamp | Required |

Append only. No update or delete operation is defined on this table.

## 6.5 Access Control Matrix

| Function | Physician | OHS Officer | Division Head | Executive | System Administrator | Data Protection Officer |
|---|---|---|---|---|---|---|
| Register patient | Create, Read, Update | None | None | None | None | None |
| Individual clinical record | Create, Read, Update, Amend | None | None | None | None | None |
| Aggregate clinical statistics | Read | Read | Read | Read | None | None |
| Fitness for work outcome | Create, Read | None | Read | Read, per C-05 | None | None |
| Occupational disease case | Raise, Read | Read | Confirm, Read | Read | None | None |
| Surveillance plan and assessments | Read, Update | Read | Create, Read, Update | Read | None | None |
| Ergonomic assessment | Read | Create, Read, Update | Read, Approve closure | Read | None | None |
| Corrective action | Read | Create, Read, Update | Approve closure | Read | None | None |
| Environmental monitoring | Read | Create, Read, Update | Read | Read | None | None |
| Licence register | Read | Read | Create, Read, Update | Read | None | None |
| Periodic return | Read | Read | Create, Read, Update | Read | None | None |
| Dashboard | Read | Read | Read | Read | None | None |
| Report generation | Read | Read | Generate, Read | Read | None | None |
| Reference data | None | None | Read | None | Create, Read, Update | None |
| User and role management | None | None | None | None | Create, Read, Update | None |
| Audit log | None | None | None | None | Read | Read |
| Clinical access log | None | None | None | None | None | Read |

The System Administrator can grant the Physician role but cannot exercise it, and cannot read any clinical record. Role grants are themselves recorded in the audit log.

## 6.6 Worked Example

A representative month, to illustrate computation and the incomplete state.

**Recorded during the month**

- 41 Infirmary encounters. 3 carry a work related determination of yes or suspected. 1 is confirmed by the Division Head as an occupational disease case
- 12 monitoring events planned across 4 locations. 11 performed, 1 recorded as not performed with a stated reason
- 22 parameter readings taken across PM2.5 and PM10. 2 exceed the 24 hour limit
- 9 ergonomic assessments planned, 9 completed. Outcomes: 5 compliant, 3 partially compliant, 1 non compliant. 6 corrective actions due in the month, 5 closed and approved on time
- Monthly return submitted: 198 health related lost days, headcount 505, surveillance scheduled 40, surveillance completed 37
- Infirmary licence valid throughout. 2 practitioners on register, both licences valid

**Computed**

| Metric | Computation | Value | Target | State |
|---|---|---|---|---|
| K1 Surveillance Compliance | 37 / 40 | 92.5% | 100% | Below target |
| K2 Occupational Disease Rate | Confirmed cases | 1 | 0 | Below target |
| K3 Absenteeism Rate | 198 / 505 | 0.39 days per employee | Under 0.5 | Within target |
| K4 Industrial Hygiene Compliance | 20 / 22 | 90.9% | At least 95% | Below target |
| K4c Monitoring Completion | 11 / 12 | 91.7% | 100% | Below target |
| K5 Ergonomic Risk Control | 5 / 6 | 83.3% | At least 95% | Below target |
| K5c Assessment Completion | 9 / 9 | 100% | 100% | Within target |
| K6 Infirmary Licence | Continuous cover | Valid | Valid | Within target |
| K7 Practitioner Licences | 2 / 2 | 100% | 100% | Within target |

Two properties of this example are worth noting. First, K4 and K4c disagree, which is the situation ADR-06 exists to make visible: compliance looks moderate but one planned monitoring event was never performed, so the compliance figure rests on a smaller sample than intended. Second, the single confirmed occupational disease case appears on the dashboard as a count of one against a department, with no patient identity and no diagnosis, and where the department holds fewer than five staff the cell is suppressed entirely under FR-KPI-10.

Had the monthly return not been submitted, K1 and K3 would display as incomplete rather than showing a value, per FR-RET-04.

## 6.7 Future Work and Proposed Integrations

| Item | Description | Value | Prerequisite |
|---|---|---|---|
| Human Resource portal integration | Automate leave and headcount retrieval through INT-01 to INT-03 | Removes manual entry, removes the transcription error risk on K3, permits per employee surveillance tracking | Portal API access and data sharing agreement |
| Ergonomic assessment template builder | Configurable criteria per workstation type, versioned, per ADR-07 | Moves ergonomics from outcome recording to criteria level evidence | Division standardises an assessment tool |
| Per employee surveillance scheduling | Risk group definitions and periodicity, making K1 computed | Removes the last manual return from the clinical domain | Risk assessment completed and surveillance policy issued |
| Direct instrument ingestion | Read from the particulate meter and additional analysers | Removes manual reading entry, increases sampling frequency | Instruments with a data interface |
| Additional parameter instruments | Activate the inactive parameters at 6.3 | K4 measures the full hazard profile rather than particulates alone | Procurement |
| Pharmacy and stock management | Dispensing records and stock levels | Links treatment to consumption, supports procurement planning | Divisional requirement definition |
| Employee self service | Appointment booking, own record access | Reduces walk in load, supports data subject access rights under R4 | Identity provider integration |
| Mobile offline capture | Assessment and monitoring capture without connectivity | Supports monitoring at locations without network cover | Field survey of connectivity |
| Incident and injury management | Workplace injury reporting and investigation | Closes the loop between injury, exposure and surveillance | Alignment with the Corporation's existing safety process |

## 6.8 Handover Notes

The initial developer's field attachment concludes on 31 July 2026. The following is recorded so that the work can be continued by another party.

| Item | Position at handover |
|---|---|
| Specification status | This document, version 1.0, issued for divisional review. Section 5 unanswered |
| Prototype status | Interactive prototype with synthetic seed data, demonstrating the dashboard, encounter capture, environmental monitoring and the access separation at ADR-03. No backend, no persistence |
| Highest priority next step | Obtain answers to the high impact items in Section 5, in particular C-04, C-07, C-08, C-10, C-11, C-12, C-22, C-24 and C-26 |
| First build recommendation | Administration and reference data, then the clinical context, then environmental monitoring. The metrics context last, since it depends on all others |
| Principal design risk | Erosion of the access separation at ADR-03 under management pressure. The decision is recorded here, with its rationale, so that any later change is made deliberately and by an authorised party rather than incrementally |
| Principal delivery risk | The Division's requirements will grow, per CON-02. The configurable reference data design at ADR-08 exists to absorb that growth. Resist requests to encode a limit or target in application code |
| Where the truth lives | The two source documents at R1 and R2, and the interview transcript at R3, are the only primary sources. Everything in this specification is derived from them or is a proposal marked as such in Section 5 |

---

**End of document**
