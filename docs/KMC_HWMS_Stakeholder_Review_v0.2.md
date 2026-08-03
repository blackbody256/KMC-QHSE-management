> **HISTORICAL DECISION REGISTER.** Version 0.3 supersedes this document for active decisions; unresolved items were carried forward.

# KMC HWMS Stakeholder Review and Demonstration Guide

## Meeting objective

Validate the proposed workflows and settle the high-impact decisions needed to turn the prototype into an approved production MVP specification.

The prototype answers: “What could this system feel like?”  
The questions below answer: “What exactly must KMC authorise us to build?”

## Suggested demonstration

### 1. Begin with the current problem

Explain that paper captures the operational truth while the requested dashboard would require staff to enter the same information again. HWMS proposes capturing each event once and deriving the dashboard from it.

Point out the permanent synthetic-data banner. No real medical record is present.

### 2. Show management first

1. Select the Health & Wellness Manager account and sign in.
2. Open the seven-KPI dashboard.
3. Explain the provenance chip on every figure.
4. Show that missing data is different from a failed target.
5. Show monitoring and ergonomic completion beside, but not promoted above, the requested seven KPIs.
6. Point out the charts used for trends, measured limits, and three-part outcome distribution.
7. Attempt to open Patients and show that the management view has no clinical navigation.

### 3. Show the doctor workflow

1. Sign out, select the Infirmary Doctor account, and sign in.
2. Register a synthetic intern using the visible Sex and Patient category radio buttons.
3. Start a patient visit and use the visit-type and work-related radio buttons.
4. Select common complaints with checkboxes and add free text only where needed.
5. Complete only the complaint, impression, and treatment sections.
6. Mark an irrelevant section Not clinically indicated using the visible section-state choices.
7. Open a past visit and review every recorded section.
8. Start a follow-up from the history page.
9. Sign the visit and show that it locks.
10. Sign in again as management and show that the patient's identity and narrative remain absent.

### 4. Show how operational data changes reporting

1. Enter a monthly return and show surveillance/absenteeism update.
2. Enter a PM reading outside the illustrative limit and show the dashboard update.
3. Enter a partially compliant workstation and show the ergonomic distribution update.
4. Open Medical certifications, explain the proposed purpose, and ask whether KMC needs this register.

### 5. Close with the decision boundary

State that the prototype is ready for requirements validation, not deployment. Production needs approved roles, KPI definitions, environmental methods, data governance, hosting, ownership, audit, backup, and recovery.

## Decision register

Recommended defaults are proposals, not recorded approvals.

### A. Patients and clinical operation

| ID | Decision required | Recommended default | Alternatives / notes | Owner |
|---|---|---|---|---|
| A01 | Who may receive treatment? | Employees and interns; allow urgent registration without staff number | Confirm contractors, visitors, dependants, or other categories | Division/Doctor |
| A02 | Should age or date of birth be stored? | Date of birth when known, with age-at-visit snapshot; allow estimated age | Paper form currently asks only age | Doctor/Data owner |
| A03 | Who may open an individual record? | Treating doctor only | Name authorised clinical assistants or deputies explicitly | Doctor/DPO |
| A04 | Who may enter biodata and vital signs? | Doctor initially | Add a Clinical Assistant role if that job exists | Doctor/Division |
| A05 | What happens when the doctor is unavailable? | No implicit management access; define a nominated clinical deputy | Emergency access requires named policy, reason, logging, and review | Doctor/DPO |
| A06 | When is a section “complete”? | Doctor controls relevance; the system records section state rather than forcing every field | Define mandatory minimum per visit type if required | Doctor |
| A07 | How are signed-record errors corrected? | Append a dated amendment without erasing the original | Reopening should require an approved clinical-record policy | Doctor/DPO |
| A08 | How long are clinical records retained? | Follow KMC policy and applicable occupational/health requirements; do not invent a period | Current draft's ten years is unapproved | Legal/DPO/Doctor |
| A09 | Do patients receive a privacy notice or copy/access route? | Define notice, lawful basis, access, correction, and complaint process before production | Required governance decision | DPO/Legal |
| A10 | Are clinical attachments or photographs required? | Exclude in v1 unless a specific purpose and protection rule is approved | The interview's photograph request needs clarification | Doctor/DPO |

### B. Management outputs and occupational health

| ID | Decision required | Recommended default | Alternatives / notes | Owner |
|---|---|---|---|---|
| B01 | May management ever see diagnosis or treatment? | No; aggregates and approved non-diagnostic work restrictions only | Confirm whether fitness-for-work output is required | Doctor/DPO/HR |
| B02 | What makes a disease “confirmed occupational”? | Clinical confirmation remains with an authorised clinician; reporting status is separate | Management should not clinically confirm a diagnosis | Doctor/OHS/Legal |
| B03 | Does a medical surveillance plan exist? | Until defined, enter scheduled/completed counts as a sourced monthly return | Later model risk group, test type, and periodicity | Doctor/OHS |
| B04 | What counts as a completed surveillance assessment? | Define the required assessment and reporting window before computing K1 | Avoid counting unspecified “health tests” | Doctor/OHS |
| B05 | What small-count privacy rule applies to aggregates? | Configure a KMC-approved suppression threshold | The current draft's value of five is only a proposal | DPO/Data owner |

### C. Absenteeism

| ID | Decision required | Recommended default | Alternatives / notes | Owner |
|---|---|---|---|---|
| C01 | Which HR leave categories are health-related? | Include only HR categories explicitly designated sick/medical | Confirm certified sick leave, infirmary referral, workplace injury, and partial days | HR/Division |
| C02 | Is the official KPI monthly or cumulative? | Monthly lost days ÷ month-end employee headcount; show YTD separately | The interview described YTD practice while the template sets a monthly target | KPI owner/HR |
| C03 | Count leave applications, employees, calendar days, or working days? | Health-related working days lost | Must match HR portal semantics | HR/KPI owner |
| C04 | Which headcount applies? | Month-end active employees in the target population | Confirm treatment of interns, contractors, joiners, and leavers | HR/KPI owner |
| C05 | Who submits and approves the return? | Named Division data owner enters; second person reviews period close | Record source report and correction reason | Division/HR |

### D. Environment and industrial hygiene

| ID | Decision required | Recommended default | Alternatives / notes | Owner |
|---|---|---|---|---|
| D01 | Is monitoring ambient, indoor, occupational exposure, or more than one? | Store standard family explicitly; never compare one method to another family's limit | The 2024 regulations contain distinct schedules | Environment/OHS/Legal |
| D02 | Which instruments are currently available? | Activate only confirmed capabilities; PM2.5 and PM10 are currently reported | Confirm noise meter and other analysers | Environment/OHS |
| D03 | What sampling/averaging method is used? | Record method, duration, averaging period, unit, and instrument | A spot reading cannot automatically represent a 24-hour average | Environment/OHS |
| D04 | Which locations and frequencies are planned? | Approve a configurable monitoring plan per location | The current draft's quarterly default is unconfirmed | Environment/OHS |
| D05 | How is instrument calibration governed? | Record instrument ID and calibration validity or reference | Define who owns the calibration register | Environment/OHS |
| D06 | How is K4 calculated? | Compliant eligible readings ÷ eligible readings taken; show completion separately | Confirm weighting by parameter/location and treatment of repeated readings | KPI owner/Environment |
| D07 | Which noise limits apply? | Store location category and day/night period with the approved standard | Confirm plant classification and work-exposure requirements | Environment/OHS/Legal |

### E. Ergonomics

| ID | Decision required | Recommended default | Alternatives / notes | Owner |
|---|---|---|---|---|
| E01 | Is the assessment attached to a workstation, person, or both? | Workstation is primary; occupant reference is optional | Confirm reassessment when occupants change | OHS/Division |
| E02 | Are the three outcomes sufficient for v1? | Yes, plus findings | Defer criteria/template builder until the tool is standardised | OHS |
| E03 | Are corrective actions in scope? | Include description, owner, due date, evidence, and approval only after workflow confirmation | Transcript confirms outcomes, not the approval workflow | OHS/Division |
| E04 | How is K5 calculated? | Approved actions completed on time ÷ actions due | Alternative may combine assessment and action performance; avoid an unexplained composite | KPI owner/OHS |
| E05 | Are photographs required? | Optional workstation photo only after purpose, retention, storage, and authorisation are approved | No clinical photography in initial scope | OHS/DPO |

### F. Medical certifications, reports, technology, and ownership

| ID | Decision required | Recommended default | Alternatives / notes | Owner |
|---|---|---|---|---|
| F01 | Does KMC need a local facility-authorisation and professional-registration register? | Keep it only if these expiry records are required and are not already controlled elsewhere | This is not an employee driving-licence register; the need came from the supplied dashboard/SRS and now requires owner confirmation | Doctor/Legal |
| F02 | What warning periods are useful? | 90, 60, and 30 days, configurable | Confirm notification recipients and channels | Division |
| F03 | What monthly/quarterly output is circulated? | Aggregate PDF aligned to the supplied template | Confirm Word/Excel needs and narrative approval | Division/Executive |
| F04 | Where will production run? | KMC-controlled environment selected by ICT after privacy/security review | On-premise is a proposal, not yet an approved requirement | ICT/DPO |
| F05 | Who owns the product after internship handover? | Name business owner, technical owner, data owner, and support contact before production | This is a release blocker | Division/ICT |
| F06 | Which corporate identity and HR interfaces exist? | Manual returns and local accounts in first production release; preserve adapters for later SSO/HR | Confirm APIs, data-sharing approval, and source ownership | ICT/HR |

## Prototype sign-off checklist

- [ ] The patient-visit sequence matches clinical work.
- [ ] Optional sections represent “not clinically indicated” accurately.
- [ ] Doctor/management separation is approved in principle.
- [ ] The seven primary KPI names are correct.
- [ ] Monthly and quarterly periods are correctly understood.
- [ ] Proposed KPI formulas are accepted or corrected.
- [ ] Environmental standard family and monitoring methods are named.
- [ ] Ergonomic outcome and action workflow are accepted or corrected.
- [ ] Medical certification register is retained or removed, and any retained document types and owners are named.
- [ ] Product, data, technical, and support owners are nominated.
- [ ] The Division agrees that prototype data is synthetic and the prototype is not production-ready.
