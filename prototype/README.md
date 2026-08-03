# KMC QHSE Management System Prototype v0.3

This stakeholder prototype demonstrates how Health and Wellness and Workplace Safety operational records produce an executive QHSE dashboard. It uses synthetic browser-local data only and is not suitable for real patient, employee, incident or compliance records.

The prototype is not the first increment of production. Its code, demo authentication, local-storage state and synthetic records will not migrate. The enduring outputs are confirmed decisions, the design language and reusable React components.

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

Verification:

```bash
npm test
npm run build
npm run preview
```

## Demonstration accounts

| Role | Email | Password | Workflow |
|---|---|---|---|
| Health and Wellness Officer | `officer@kmc.demo` | `Officer#2026` | Clinical history and operational entry |
| QHSE Manager | `manager@kmc.demo` | `Manager#2026` | Read-only unit summaries and suppressed drilldowns |
| QHSE Director | `director@kmc.demo` | `Director#2026` | Read-only executive dashboard and trends |

There is no unauthenticated dashboard and no role-switch dropdown. The login is a workflow simulation, not production security.

## Suggested walkthrough

1. Sign in as Director. Review the five Health and Wellness KPIs and five safety indicators for July 2026.
2. Select August 2026 and show that an open, empty safety register displays **No data**, not zero.
3. Sign in as Manager. Open Workplace Safety and show that exact dates, shifts, locations and event rows are absent; small units are suppressed.
4. Review Monthly Returns in read-only mode and note that hours worked is not supplied and feeds no rate.
5. Sign in as Health and Wellness Officer. Open a patient’s complete past-visit history.
6. Record an incident using radio-button choices, a manual recordability determination and an explicit investigation-required decision.
7. Review the safety/clinical boundary: the safety module receives only “Treated by Health and Wellness: Yes/No.”
8. Compare Industrial Hygiene and Environment views over the same monitoring register. Context fixes the standard family and only eligible occupational readings feed K4.
9. Open the Workplace Safety, Environment and Quality research cards and confirm they show no figures, charts or data-entry controls.
10. Use **Reset demo** to restore July attested and August open/empty seed data.

## Important constraints

- Browser data is stored under `kmc-qhse-demo-v2`.
- All operational and clinical records are fictional.
- Medical certification tracking and KPIs K6/K7 were withdrawn through the recorded stakeholder decision. The generic expiry pattern remains for future permits, consents and calibration.
- The minimum disclosure cell size of five is proposed pending Data Protection Officer approval.
- Environmental limits and KPI formulas labelled Proposed require accountable-owner approval.
- A signed visit is locked in the interface; production append-only amendment remains deferred.
- Production requires Keycloak, Go services, Postgres, server-side authorization, audit, encryption, backup and KMC infrastructure.

## Governing documents

- [QHSE SRS v2.0](../docs/KMC_QHSE_MS_SRS_v2.0.md)
- [Prototype specification v0.3](../docs/KMC_QHSE_Prototype_Spec_v0.3.md)
- [Stakeholder decision register v0.3](../docs/KMC_QHSE_Stakeholder_Decision_Register_v0.3.md)
- [Production build plan v1.2](../docs/KMC_HWMS_Production_Build_Plan_v1.2.md)
