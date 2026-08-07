# KIIRA MOTORS CORPORATION

## Health and Wellness Management System

### System Requirements Specification

**Version:** 2.1 DRAFT  
**Date:** 7 August 2026  
**Status:** Current requirements baseline; client decisions at DEC-024 to DEC-029 remain open  
**Supersedes:** `KMC_QHSE_MS_SRS_v2.0.md` in full. That document is preserved as project history.

## 1. Authority and scope

The 4 August 2026 client meeting accepted the prototype direction. The client then confirmed that the other departmental divisions already operate their own systems. This system therefore covers the **Health and Wellness division only**:

1. Occupational Health — patient visits and laboratory testing;
2. Ergonomics and Wellness;
3. Industrial Hygiene.

The previously modelled Quality Inspection and Testing and Environment and Sustainability modules are removed, not deferred and not displayed as placeholders. Workplace Safety is not an operational module in this system. Its four safety figures may be consumed as attributed monthly returns or through an integration after the authoritative owner is confirmed.

The working product name is **Health and Wellness Dashboard**, explicitly labelled proposed until KMC confirms DEC-028. “DQHSE Dashboard” was overtaken by the scope reduction and must not be presented as the final name.

## 2. Governing rules

| ID | Requirement |
|---|---|
| ADR-01 | Capture data at its authoritative source and derive displays from those records. |
| ADR-03 | Only the Health and Wellness Officer may retrieve an individual clinical record. Management roles receive no clinical route or clinical payload. |
| ADR-06 | Missing data is “No data”, never zero and never a failure state. Incomplete YTD history is not averaged. |
| ADR-08 | Targets, thresholds, limits and reference ranges are effective-dated reference data, not source constants. A result stores the version applied. |
| ADR-15 | Abnormal clinical values warn and do not block. The system records practitioner decisions; it does not diagnose, recommend or suggest. |
| ADR-16 | Synthetic data only in the prototype and all non-production environments used for demonstrations. |
| ADR-17 | KMC red is brand chrome only. Status is communicated by glyph, word and then colour. Measured values use a mono face with tabular figures. |

## 3. Users and access

| Capability | Health and Wellness Officer | Health and Wellness Manager | Director viewer |
|---|:---:|:---:|:---:|
| Dashboard and trends | Yes | Yes, read-only | Yes, read-only |
| Monthly attributed returns | Create/update | Read-only | No |
| Ergonomics and Industrial Hygiene | Create/update | Read-only | No |
| Patient identity and visits | Yes | No | No |
| Laboratory requests/results | Yes | No | No |
| Clinical referrals/PDF | Yes | No | No |
| Management authorisation summary | Officer records the external decision in the prototype | No route until DEC-024 is resolved | No |

Production must enforce access at the identity provider, gateway, service and database boundaries. A frontend route guard alone is not security.

## 4. Functional requirements

### 4.1 Patient visits

| ID | Requirement |
|---|---|
| FR-CLIN-01 | Register employee, intern or other patient identities without requiring an employee number. |
| FR-CLIN-02 | Record a separate visit with clinical sections, vital signs, work-related consideration, clinician, draft/signed state and immutable signing metadata. |
| FR-CLIN-03 | A signed visit is read-only; production corrections append an amendment rather than overwrite the signed record. |
| FR-CLIN-04 | A visit is the source record from which laboratory requests and referrals are raised. |

### 4.2 Laboratory testing

All laboratory fields are marked **proposal awaiting the actual KMC laboratory forms** until the Laboratory Lead supplies and approves them.

| ID | Requirement |
|---|---|
| FR-LAB-01 | Raise a test request from a visit, carrying requesting officer, request date/time, patient, specimen type, tests requested, clinical indication and routine/urgent priority. |
| FR-LAB-02 | Record whether the request relates to pre-employment, periodic surveillance, exit or an incident. This link supports surveillance reporting. |
| FR-LAB-03 | The proposed generic catalogue may include full blood count, liver function, renal function, random/fasting blood sugar, urinalysis, lipid profile, audiometry, spirometry, vision screening and relevant exposure monitoring. |
| FR-LAB-04 | Store a result as one row per analyte with value, unit, reference range applied, abnormality flag, verifying practitioner and result date. |
| FR-LAB-05 | Select the range effective on the result date and snapshot its identifier, display range, unit, effective date and source on the result. |
| FR-LAB-06 | Write the practitioner’s abnormality flag once. Later reference-range revisions must not recompute it. |
| FR-LAB-07 | An abnormal flag displays a glyph-and-word warning and never blocks saving. |

### 4.3 Medical referral

The referral digitises `KMC.DQHSE.02/26-FM004`. It is raised from a visit and pre-fills patient details and recorded vital signs. Body mass index is derived from the copied height and weight.

| ID | Requirement |
|---|---|
| FR-REF-01 | Section A captures destination; patient name, position, age, sex, department, division, unit, contact and supervisor; date/time; clinical features; vital signs; general examination; past medical history; occupational consideration; investigations; provisional diagnosis; treatment and referral reason. |
| FR-REF-02 | Section B captures officer, printed position, signature confirmation, contact, date and time. The supplied “KMC infirmary officer” wording remains visible pending DEC-026. |
| FR-REF-03 | Section C captures the Head of Division and Chief of Staff name, signature confirmation, date and remarks only through the privacy handling selected at DEC-024. The prototype demonstrates the proposed minimum-disclosure summary. |
| FR-REF-04 | External feedback captures facility, practitioner, diagnosis, treatment, recommended follow-up, recommended sick-leave day count/date range, signature/stamp confirmation and date. |
| FR-REF-05 | KMC follow-up captures review comments, reviewer, position, signature confirmation and date. |
| FR-REF-06 | Display lifecycle states drafted, authorised, issued, returned and reviewed; only valid next-stage actions are offered. |
| FR-REF-07 | Recommended leave on a returned/reviewed referral creates the linked contribution used by Health-Related Absenteeism. It is not re-keyed into the monthly return. |
| FR-REF-08 | Download a PDF recognisable as the printed referral, including the form number, confidentiality declaration and supplied section labels. |
| FR-REF-09 | Follow the client form’s duplicate Section E labels and missing Section D until DEC-025 authorises a controlled form correction. Flag the defect; do not silently renumber it. |

### 4.4 Referral confidentiality conflict — decision required

The printed Section C requires management signatures on a form containing provisional diagnosis, HIV status and mental-health condition. ADR-03 forbids management access to an individual clinical record. Both rules cannot operate unchanged.

**Proposed answer:** authorisers see a separate summary containing patient, destination facility, referral reason and cost implication. Clinical detail remains between the Health and Wellness Officer and receiving facility. The clinical PDF is not supplied to management. KMC’s accountable sponsor and Data Protection Officer must approve or reject this proposal at DEC-024 before production authoriser access is built. If KMC knowingly permits management clinical access, the decision, lawful basis, exact fields, audit controls and retention must be recorded before implementation.

### 4.5 Ergonomics and Wellness

Record workstation, work type, assessor, outcome, findings and optional corrective action with owner, due date, state and closure date. Ergonomic risk control is derived from actions closed on time divided by actions due. The formula remains proposed until its owner approves it.

### 4.6 Industrial Hygiene

Record event, period, time, location, instrument, parameter, value and monitoring context. Select an effective-dated reference limit and snapshot its identifier, value, unit, averaging period, standard family and effective version. Later reference revisions do not change the stored historical evaluation.

### 4.7 Monthly returns and safety provenance

| ID | Requirement |
|---|---|
| FR-RET-01 | Record reporting month, other health-related lost days, month-end headcount, surveillance scheduled/completed and a health source note. |
| FR-RET-02 | Accept fatality, Total Recordable Incidents, Total Recordable Injuries and Reportable Near Misses only as optional attributed figures with a named source. Blank remains No data. |
| FR-RET-03 | Do not provide a safety incident capture screen or maintain a second incident register while DEC-027 is unresolved. |
| FR-RET-04 | Production exposes an integration seam for the authoritative Workplace Safety system or accepts an approved signed monthly return. |

## 5. KPI catalogue

The supplied client graphic determines indicator existence, target and direction; its June 2026 values are not seed data.

| ID | KPI | Target | Direction | Source |
|---|---|---|---|---|
| S1 | Fatality | 0 | Lower is better | Attributed return/integration; owner pending |
| S2 | Total Recordable Incidents | 0 | Lower is better | Attributed return/integration; owner pending |
| S3 | Total Recordable Injuries | 0 | Lower is better | Attributed return/integration; owner pending |
| S4 | Reportable Near Misses | ≥ 200 | **Higher is better** | Attributed return/integration; owner pending |
| S5 | Health-Related Absenteeism | < 0.5 days/person/month | Lower is better | Monthly return plus linked referral leave |
| OH1 | Surveillance compliance | Effective-dated target | Higher is better | Scheduled/completed return |
| OH2 | Occupational disease cases | Effective-dated target | Lower is better | Approved case count |
| OH3 | Industrial hygiene compliance | Effective-dated target | Higher is better | Eligible readings against snapshotted limits |
| OH4 | Ergonomic risk control | Effective-dated target | Higher is better | Actions closed on time/actions due |

Each KPI row displays the reporting-month value and year-to-date monthly average. The YTD cell displays **Incomplete history** with months available when any required month is missing. Status has three target states—tick/On target, warning/Approaching, cross/Off target—plus neutral No data. A summary band states `x of 9 KPIs on target` for the selected month.

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-PRIV-01 | Encrypt clinical data at rest and in transit; use a separate clinical database role and access scope. |
| NFR-PRIV-02 | Log every clinical record read before returning the record. Audit logs are append-only. |
| NFR-PRIV-03 | Never place clinical narrative, diagnosis, HIV status or mental-health condition in KPI/integration events. |
| NFR-DATA-01 | No target, threshold, limit or reference range is embedded in Go/TypeScript decision logic. |
| NFR-DATA-02 | Effective-dated evaluations store the reference identifier and evaluated outcome; history is immutable. |
| NFR-UX-01 | A greyscale review must preserve every status meaning through glyph and word. |
| NFR-UX-02 | Missing data is explicitly labelled and is not styled as failure. |
| NFR-CLIN-01 | Abnormal values warn but never block, and no interface text diagnoses or recommends. |
| NFR-DEMO-01 | Prototype data is synthetic, visibly labelled and browser-local. |

## 7. Acceptance

1. Removed divisions have no route, navigation item, type, seed record or current-specification module.
2. The nine KPI rows show both columns, source, target, direction and non-colour status; near misses explicitly say Higher is better.
3. Incomplete YTD data is never partially averaged.
4. A laboratory request can be raised from a visit and an abnormal analyte saved against a snapshotted effective range without blocking.
5. A referral pre-fills from a visit, progresses through all five states and downloads as a PDF containing the printed identifiers and defects.
6. Returned referral leave contributes to Health-Related Absenteeism.
7. Manager and Director accounts cannot retrieve patient, visit, laboratory or referral routes.
8. DEC-024 to DEC-029 remain visibly open; the prototype posture matches their proposed safe handling without claiming client approval.
9. Automated tests and the production frontend build pass.

## 8. Open decision references

See `KMC_HWMS_Stakeholder_Decision_Register_v0.4.md`, especially DEC-024 confidentiality, DEC-025 form numbering, DEC-026 role wording, DEC-027 safety ownership, DEC-028 naming and DEC-029 laboratory forms/ranges.
