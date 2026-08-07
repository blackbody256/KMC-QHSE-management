# KMC Health and Wellness Stakeholder Decision Register v0.4

**Date:** 7 August 2026  
**Status:** Current register; proposed product name pending confirmation  
**Supersedes:** `KMC_QHSE_Stakeholder_Decision_Register_v0.3.md`

## Confirmed and superseding decisions

| ID | Decision | Date/evidence | Consequence |
|---|---|---|---|
| DEC-018 | The 4 August prototype review accepted the direction of travel. | Client meeting, 4 August 2026 | Retain design language, privacy model and synthetic workflow approach. |
| DEC-019 | The system scope is the Health and Wellness division only because the other divisions already operate their own systems. | Client follow-up immediately after the 4 August meeting | Supersedes v0.3 D01 and removes department-wide coverage. |
| DEC-020 | Health and Wellness comprises Occupational Health, Ergonomics and Wellness, and Industrial Hygiene. | Client definition, 4 August 2026 | These are the only operational units in scope. |
| DEC-021 | Quality Inspection and Testing and Environment and Sustainability are removed, not deferred placeholders. | Scope decision, 4 August 2026 | Routes, navigation, cards, types, seed data and current documentation sections deleted. Old versions remain as history. |
| DEC-022 | Occupational Health includes patient visits and laboratory testing; laboratory requests/results and referrals move into the clinical delivery phase. | Client meeting and supplied referral form, 4 August 2026 | Production phase order revised; generic lab form remains proposal pending DEC-029. |
| DEC-023 | The client dashboard panel defines five summary KPIs and their directions; its June figures are not project seed data. Reportable Near Misses has target ≥ 200 and Higher is better. | Client dashboard graphic supplied for review | Dashboard uses attributed synthetic returns and labels the near-miss direction explicitly. |
| DEC-030 | A referral is raised from a visit and pre-fills patient details and vitals. Returned recommended sick leave contributes to Health-Related Absenteeism. | Workflow design derived from the supplied form, 4–7 August 2026 | Prevent duplicate entry and connect the document to the KPI data flow. |
| DEC-031 | Client-owned form defects are preserved until controlled correction is authorised. | Source form `KMC.DQHSE.02/26-FM004` | Prototype flags duplicate Section E labels/no Section D and the old role wording without silently changing them. |

## Open decisions — raise, do not silently resolve

| ID | Decision required | Conflict/risk | Proposed answer | Owner | Prototype posture | Status |
|---|---|---|---|---|---|---|
| DEC-024 | May Head of Division and Chief of Staff see the individual clinical content they authorise? | Section C signatures sit on a form containing provisional diagnosis, HIV status and mental-health condition; ADR-03 forbids management clinical access. | Give authorisers a separate summary containing patient, destination, referral reason and cost implication. Keep clinical content between clinician and receiving facility. If KMC chooses management clinical access, record the lawful basis, fields, controls and retention knowingly. | KMC accountable sponsor **and Data Protection Officer** | No management clinical route. Officer records the decision obtained from a separate minimum-disclosure summary. Clinical PDF remains restricted. | **Open — production blocker for authoriser access** |
| DEC-025 | Should the referral form be reissued with Section D/E numbering corrected? | Two sections are labelled E and no Section D exists. Silent correction would diverge from the controlled client form. | Document Control issues a corrected form/version; software changes labels only after the controlled document is approved. | KMC Document Control and Health and Wellness Officer | Duplicate E labels reproduced and visibly flagged. | Open |
| DEC-026 | Should “KMC infirmary officer” be retained or should the form be reissued as “Health and Wellness Officer”? | The client-owned printed wording conflicts with the renamed role. | Reissue the controlled form with the current role title; preserve the old wording until then. | KMC Document Control and Health and Wellness Officer | Printed wording retained and flagged. | Open |
| DEC-027 | Which system/role is authoritative for fatalities, recordable incidents, recordable injuries and near misses? | Workplace Safety is a separate division and may already have its own system. A second incident register would create two sources for one number. | Benard confirms the owner. Consume approved attributed monthly returns initially and expose an integration seam to the authoritative system. Do not build an incident register here. | **Benard Okanyakure**, Workplace Safety owner and KMC ICT | KPI rows retained; optional attributed monthly values require source notes; safety capture screens removed. | **Open — resolve before safety capture/integration build** |
| DEC-028 | What is the final product name after the one-division scope cut? | “DQHSE Dashboard” claims department-wide coverage and will create false expectations for excluded divisions. | **Health and Wellness Dashboard** (or Health and Wellness Management System where the workflow scope must be explicit). | Benard Okanyakure and accountable executive sponsor | Interface says “Health & Wellness Dashboard · proposed name”. | Open |
| DEC-029 | What are the approved KMC laboratory request/result forms, panels, analytes, units and population-specific reference ranges? | The Laboratory Lead has not yet supplied the real forms. Generic clinical content must not become accidental policy. | Replace the generic proposal only from controlled laboratory forms. Store all approved ranges as effective-dated reference data and snapshot the applied range/flag on each result. | KMC Laboratory Lead and Health and Wellness Officer | Every lab screen/field is marked proposal; generic ranges are proposal records. | **Open — blocker for real clinical use** |

## Owner action list

1. Benard: confirm DEC-027 safety ownership and DEC-028 name.
2. Data Protection Officer plus sponsor: decide DEC-024 before any management authoriser account or payload exists.
3. Document Control plus Health and Wellness Officer: decide DEC-025 and DEC-026 through a controlled form revision.
4. Laboratory Lead: supply the real request/result forms and reference-range authority for DEC-029.

No open item above is represented as client-approved in code or documentation.
