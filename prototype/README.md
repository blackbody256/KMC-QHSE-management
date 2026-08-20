# KMC Health and Wellness Dashboard Prototype v0.4

> **Proposed product name:** the 4 August 2026 “DQHSE Dashboard” name was overtaken by the later decision to scope the system to Health and Wellness only. Client confirmation is pending.

This stakeholder prototype covers the Health and Wellness division only: Occupational Health, Ergonomics and Wellness, and Industrial Hygiene. It uses synthetic browser-local data and is not suitable for real patient, employee, laboratory or referral records.

## Run

```bash
npm install
npm run dev
```

Production verification:

```bash
npm test
npm run build
```

## Demonstration accounts

| Role | Email | Password | Access |
|---|---|---|---|
| Health and Wellness Officer | `officer@kmc.demo` | `Officer#2026` | Patients, visits, laboratory testing, referrals and operational entry |
| Health and Wellness Manager | `manager@kmc.demo` | `Manager#2026` | Read-only monthly returns and operational summaries; no clinical records |
| Director viewer | `director@kmc.demo` | `Director#2026` | Read-only dashboard and trends |

## v0.4 walkthrough

1. Open the dashboard and verify nine indicators: the five client health/safety summary KPIs plus four retained occupational health indicators.
2. Confirm every KPI has a reporting-month value, a year-to-date average or “Incomplete history”, a glyph-and-word status, target, direction and provenance.
3. Verify Reportable Near Misses is labelled “Higher is better” with target `≥ 200`.
4. Open Monthly returns and confirm safety figures are attributed values with an owner-pending note, not records from a local incident register.
5. Sign in as the Officer, open a visit and raise a laboratory requisition on KMC.DQHSE.05/26-FM008. Tick investigations, confirm the fasting note appears against FBS, record results and a specimen, and download the form PDF.
6. Raise a referral from a visit, confirm the vitals are pre-filled, and move it through drafted, authorised, issued, returned and reviewed.
7. Enter recommended sick leave in returned feedback and verify the linked days appear in Monthly returns and Health-Related Absenteeism.
8. Download the clinical referral PDF and verify the form number, confidentiality declaration, duplicate Section E labels and printed “KMC infirmary officer” wording.
9. Sign in as Manager or Director and verify patient, visit, laboratory and referral routes are denied.

## Important boundaries

- Safety figures remain visible, but their authoritative owner is awaiting Benard’s confirmation. There is no parallel incident register.
- Management authorisation uses a proposed minimum-disclosure summary. Management clinical access is not granted.
- The laboratory module reproduces KMC.DQHSE.05/26-FM008: seven investigations in four groups. The form carries no units and no reference ranges, so results are recorded as the laboratory reported them and nothing is flagged abnormal. Whether the laboratory wants structured ranges is an open question for them.
- KPI targets and hygiene limits are effective-dated reference records, and readings snapshot the limit applied. Laboratory results carry no such snapshot because the form defines no ranges to snapshot.
- Missing values display as “No data”; synthetic records are labelled; abnormal clinical values warn and never block.
- Browser data is stored under `kmc-health-wellness-demo-v3`.

## Current documents

- `docs/KMC_HWMS_SRS_v2.1_DRAFT.md`
- `docs/KMC_HWMS_Prototype_Spec_v0.4.md`
- `docs/KMC_HWMS_Stakeholder_Decision_Register_v0.4.md`
- `docs/KMC_HWMS_Production_Build_Plan_v1.3.md`

Earlier versions remain in `docs/` and are explicitly marked superseded.
