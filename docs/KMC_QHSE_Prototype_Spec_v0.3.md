# KMC QHSE Management System Prototype v0.3

> **Superseded on 7 August 2026 by `KMC_HWMS_Prototype_Spec_v0.4.md`.** Preserved as project history; it demonstrates the department-wide scope that was deliberately removed after the 4 August meeting.

**Date:** 3 August 2026  
**Status:** Stakeholder workflow prototype; synthetic data only

## Purpose

Demonstrate how daily Health and Wellness and Workplace Safety records produce executive information, while showing role-specific access, incomplete-data states, privacy controls and honest placeholders for unconfirmed units.

The prototype is not the first production increment. Its code, browser storage, demo authentication and synthetic records will not migrate. Its enduring outputs are confirmed decisions, the design language and reusable React components.

## Demonstrated roles

| Role | Demonstration |
|---|---|
| Health and Wellness Officer | Clinical history, operational entry, incidents and attestation |
| QHSE Manager | Read-only operational dashboard and suppressed aggregate drilldowns |
| QHSE Director | Read-only executive summaries and trends |

## Active navigation

- Dashboard
- Monthly Returns
- Health and Wellness: Occupational Health, Ergonomics and Wellness, Industrial Hygiene
- Workplace Safety: incident register and future-function research cards
- Environment and Sustainability: ambient monitoring view and research cards
- Quality Inspection and Testing: research cards

## Demonstration data

- July 2026 is attested and contains six synthetic incident records deriving 0 fatalities, 3 non-fatal injuries, 2 recordable incidents, 3/4 required investigations and 3 near-miss/dangerous-occurrence reports.
- August 2026 is open and empty, producing No data rather than zero.
- All patient, employee, incident, monitoring and return information is fictional.

## Important limits

- Demo login and route guards explain workflow; they are not production security.
- Viewer safety drilldowns are aggregate, month/unit coarsened and suppressed below five.
- Medical certification tracking and K6/K7 are not active. A neutral expiry-tracking type/calculation remains reusable for future permits and calibration.
- Hours worked is an optional question to HR and feeds no v0.3 rate.
- Research cards are unapproved proposals with no figures or forms.
- Shared monitoring uses required occupational, indoor or ambient context. K4 uses eligible occupational readings only.

## Walkthrough

1. Sign in as Director and compare July final safety values with August No data.
2. Sign in as Manager and open the aggregate safety drilldown; show `<5` suppression and absence of event rows.
3. Sign in as Health and Wellness Officer, review a patient’s prior visit, create an incident and inspect attestation rules.
4. Open Industrial Hygiene and Environment to show two contextual views over one monitoring register.
5. Open the remaining unit cards and confirm that they are labelled as benchmark proposals without figures or entry controls.
