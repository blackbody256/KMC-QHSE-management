# KMC Health and Wellness Management System Prototype

This is a stakeholder-review prototype for the proposed KMC Health and Wellness Management System (HWMS). It demonstrates the first-version workflows and dashboard agreed during requirements analysis.

The prototype uses synthetic demonstration data only. It stores changes in the browser's local storage and is not suitable for real patient records or production use.

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

To verify and preview a production build:

```bash
npm test
npm run build
npm run preview
```

## Suggested stakeholder walkthrough

1. On the login screen, select the **Health & Wellness Manager** demonstration account and sign in.
2. Review the seven primary KPIs, data provenance, formula labels, alerts, and trend charts.
3. Open **Monthly returns** and enter a reporting month to see dashboard metrics recalculate.
4. Record an **Environment** reading and review its comparison with the illustrative threshold.
5. Record an **Ergonomic assessment** using the three confirmed outcomes.
6. Open **Medical certifications** and explain that it is a proposed expiry reminder for facility authorisation and clinician professional registration—not employee driving licences.
7. Sign out, select the **Infirmary doctor** demonstration account, and sign in.
8. Register a patient, continue into a visit, and use the visible radio buttons and checkboxes for quick entry.
9. Open a previous visit from the patient history, review its full details, and start a follow-up.
10. Save a draft or sign the new visit, then use **Reset demo data** when finished.

## Important prototype constraints

- All names, records, results, and medical certification entries are synthetic.
- Browser data is stored under `kmc-hwms-demo-v1`.
- The demonstration login is a workflow simulation. Production authentication, server storage, audit logging, encryption, backups, integrations, and privacy controls are not implemented.
- Environmental limits and KPI formulas marked **Proposed** require stakeholder approval before production use.
- A signed visit is locked in the interface; the production append-only amendment workflow is intentionally deferred and identified in the specification.

## Requirements and review documents

- [Corrected SRS](../docs/KMC_HWMS_SRS_v1.1_DRAFT.md)
- [Prototype specification](../docs/KMC_HWMS_Prototype_Spec_v0.2.md)
- [Stakeholder review and decision register](../docs/KMC_HWMS_Stakeholder_Review_v0.2.md)
