# KMC Health and Wellness Dashboard Prototype v0.4

**Date:** 7 August 2026  
**Status:** Current stakeholder workflow prototype; synthetic data only  
**Product name:** Health and Wellness Dashboard — proposed, pending DEC-028  
**Supersedes:** `KMC_QHSE_Prototype_Spec_v0.3.md`

## Purpose

Demonstrate the post-meeting Health and Wellness-only scope, including Occupational Health laboratory testing and medical referral. The prototype is browser-local and is not production code or production security. Its durable outputs are stakeholder decisions, validated workflow behaviour and design conventions.

## Active scope and navigation

- Dashboard and attributed Monthly Returns;
- Occupational Health: Patients, Patient Visits, Laboratory Testing and Medical Referrals;
- Ergonomics and Wellness;
- Industrial Hygiene.

The removed divisions have no route, navigation item, research card, type or seed data. The previous Workplace Safety incident/attestation register is also absent: four externally owned safety values enter only through attributed monthly returns pending DEC-027.

## Roles

| Role | Demonstration |
|---|---|
| Health and Wellness Officer | Full clinical and operational prototype entry |
| Health and Wellness Manager | Dashboard, trends, monthly returns, ergonomics and hygiene read-only; no patient identity |
| Director viewer | Dashboard and trends only |

Laboratory and referral routes use the same Officer-only boundary as visits. No management role can retrieve a clinical record or referral PDF.

## Dashboard

- One summary band displays `x of 9 KPIs on target` for the selected reporting month.
- The five client KPIs are Fatality, Total Recordable Incidents, Total Recordable Injuries, Reportable Near Misses and Health-Related Absenteeism.
- Reportable Near Misses visibly says **Higher is better** and uses target `≥ 200` from the effective-dated KPI record.
- Four retained rows are Surveillance compliance, Occupational disease cases, Industrial hygiene compliance and Ergonomic risk control.
- Every row displays target/direction, reporting-month value/status, YTD monthly average/status and provenance.
- Any missing month produces **Incomplete history** in YTD rather than a partial average. Missing monthly data is **No data**, not zero.
- Tick/word/green, warning/word/amber and cross/word/red are the three target states. Neutral states retain a glyph and word.

The synthetic safety return values are not copied from the client’s June 2026 graphic.

## Laboratory workflow

1. Open a visit and raise a request; the patient and visit are linked.
2. Record requesting officer, date/time, specimen, panels, indication, priority and surveillance context.
3. Open the request and add one analyte result at a time.
4. Select the range effective on the result date. The saved row snapshots its range identifier, display, unit, effective date and source.
5. Select the practitioner’s abnormality decision. An abnormal result shows a warning but save remains enabled.

Every lab field, panel and range is labelled as a proposal awaiting KMC laboratory forms. The generic catalogue includes the candidate panels listed in SRS v2.1.

## Referral workflow

1. Open a visit and raise `KMC.DQHSE.02/26-FM004`. Patient identity, organisation, clinical notes and vitals pre-fill from the source records; BMI is derived.
2. Save Section A and Section B as **Drafted**. The printed “KMC infirmary officer” wording is retained and flagged.
3. Record **Authorised** from a separate minimum-disclosure summary containing patient, destination, referral reason and cost implication. Head of Division and Chief of Staff sign-off metadata is captured. This is the proposed safe answer to DEC-024, not client approval.
4. Mark **Issued**.
5. Record external feedback as **Returned**, including recommended sick-leave day count and dates. Those days immediately appear as the referral contribution to Health-Related Absenteeism.
6. Record KMC follow-up as **Reviewed**.
7. Download an actual PDF with corporate/form headers, form number, confidentiality declaration, printed sections and clinical content. PDF access remains Officer-only.

The UI and PDF deliberately reproduce two Section E labels and no Section D. Both locations flag the controlled-document defect.

## Effective-dated data behaviour

- KPI targets/directions, Industrial Hygiene limits and laboratory reference ranges are reference records with effective dates and approval state.
- Industrial Hygiene readings and lab results snapshot the reference used.
- A later catalogue change cannot rewrite a saved compliance outcome, range or abnormality flag.
- Proposal status is visible; no generic clinical range is presented as approved KMC policy.

## Synthetic demonstration state

- July 2026 contains attributed synthetic monthly returns and full monthly history for the client KPI YTD averages.
- Industrial Hygiene and ergonomics have July-only operational examples, so their July YTD cells say Incomplete history.
- One synthetic laboratory request includes an abnormal result to demonstrate non-blocking warning behaviour.
- One synthetic referral has reached Reviewed and contributes two linked sick-leave days to July absenteeism.
- Reset restores `kmc-health-wellness-demo-v3` data.

## Acceptance walkthrough

1. Use Director to verify the KPI columns, summary band, near-miss direction, incomplete history and absence of entry routes.
2. Use Manager to inspect attributed returns and operational registers, then verify direct clinical URLs are denied.
3. Use Officer to raise a lab request/result and save an abnormal flag.
4. Use Officer to raise and progress a referral, download its PDF and verify leave appears in Monthly Returns/dashboard calculation.
5. Apply `filter: grayscale(100%)` during review and confirm status remains understandable from glyph and word.
6. Run `npm test` and `npm run build`.

## Known source limitation

The implementation brief fully specifies referral fields and the client KPI panel. The binary files `MEDICAL_REFERRAL_TREATMENT_FORM (2).pdf`, `Meeting started 2026_08_04 11_17 UTC - Notes by Gemini.pdf` and the dashboard image were not present in the checked-out workspace on 7 August 2026. Exact pixel/layout comparison against those binaries remains an attachment-review action; no requirement from the supplied brief was replaced with an invented client decision.
