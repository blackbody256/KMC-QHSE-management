# KMC HWMS Prototype v0.2

## Purpose

This is a presentation prototype for stakeholder validation. It demonstrates how daily operational records can produce the executive dashboard. It is not a medical-record product and must contain synthetic data only.

## Technology and runtime

- React, TypeScript, and Vite.
- Browser-local, versioned demo store with reset-to-seed.
- Recharts for meaningful, accessible dashboard visualisations.
- Tailwind CSS using KMC-aligned design tokens.
- Guided synthetic login for Doctor and Management workflow demonstration.
- No API, database, production authentication, integrations, uploads, or real patient data.

## Demonstration roles

| Role | Visible modules |
|---|---|
| Doctor | Dashboard, Patients, Patient visits, Monthly returns, Environment, Ergonomics, Medical certifications |
| Management | Dashboard, Monthly returns, Environment, Ergonomics, Medical certifications |

Users sign in with one of two clearly labelled synthetic accounts and sign out to change roles. The workflow demonstrates information separation but is not a production security boundary.

## Application shell

- Guided login with account purpose, email, password, sign-in, and error feedback.
- KMC masthead with the signed-in user's name and role.
- Left navigation with role-aware items.
- Permanent “Demo mode — synthetic data only” banner.
- Reporting-period selector on the dashboard.
- Reset demo data action.
- Desktop-first responsive layout at 1024px and 1440px.

## Core flows

### Patients and patient visits

1. Doctor searches or registers a patient.
2. Doctor starts a visit from the patient record.
3. Doctor can open the patient's previous visit list and complete read-only record.
4. Visit sections follow the supplied paper form.
5. Visible radio buttons handle single-choice decisions; checkbox groups handle common multi-choice clinical entries.
6. Other or additional information remains available as free text.
7. Only one section needs to be open at a time.
8. Each section exposes Not recorded, Partial, Complete, and Not clinically indicated state as visible radio choices.
9. Fast path is patient, visit type, complaint, impression, treatment, and sign.
10. Signing locks the visit; Amendment is visible as future work.

### Monthly returns

1. Select a month.
2. Enter lost days, headcount, surveillance scheduled/completed, and source note.
3. Display live K1 and K3 calculations.
4. Save to the demo store and update the dashboard.
5. Missing or invalid denominators display No data.

### Environment

1. Select location, instrument, date/time, and monitoring period.
2. Enter PM2.5, PM10, day noise, or night noise.
3. Show illustrative effective-dated limit beside the field.
4. Store the result and update compliance and completion displays.
5. Label every limit as pending environmental approval.

### Ergonomics

1. Select workstation and office/industrial type.
2. Record one of three confirmed outcomes.
3. Add findings and an optional proposed corrective action.
4. Store the assessment and update outcome distribution and supporting completion.

### Medical certifications

- Read-only seeded register.
- Proposed facility-authorisation and practitioner-registration reminders.
- Continuous validity state and days-to-expiry alerts.
- Plain-language explanation that this is not an employee driving-licence register.
- Clearly identified as illustrative and removable if stakeholders do not require it.

## Dashboard

### Executive layer

Seven primary KPI cards:

1. Surveillance compliance — circular percentage progress.
2. Occupational disease rate — count against zero target.
3. Absenteeism — actual-versus-target bullet display.
4. Industrial hygiene — circular percentage plus monitoring-completion companion.
5. Ergonomic risk control — circular percentage plus assessment-completion companion.
6. Infirmary authorisation — validity and days remaining.
7. Professional registrations — valid/total and nearest expiry.

Each card shows its period, target, status, provenance, and whether its formula is proposed.

### Operational layer

- Twelve-month absenteeism and surveillance trend.
- PM2.5/PM10/noise actual-versus-limit bars.
- Directly labelled three-part ergonomic outcome donut.
- Recent alerts and action table.
- Exact values remain readable without relying on chart geometry or colour.

## Data contracts

Primary types:

- `Patient`
- `PatientVisit`
- `VisitSectionState`
- `MonthlyReturn`
- `EnvironmentalReading`
- `ErgonomicAssessment`
- `CorrectiveAction`
- `LicenceRecord`
- `DashboardMetric`

Shared enums:

- `DemoRole`
- `PatientCategory`
- `VisitType`
- `RecordState`
- `SectionStatus`
- `ComplianceStatus`
- `MetricProvenance`
- `ErgonomicOutcome`

Persistence is exposed through a `DemoStore` abstraction. Calculations are pure functions outside UI components.

## UI rules

- KMC red is used for branding and the main action, not as the only status cue.
- Status always combines glyph, text, and colour.
- No gradients or decorative 3D charts.
- Circular progress is used only for bounded percentages.
- Pie/donut is used only for the three ergonomic parts of a whole.
- Line charts are used for time trends; horizontal bars are used for measured values against limits.
- Charts include descriptive headings, direct labels or tooltips, and exact-value summaries.
- Clinical forms use plain language, strong section hierarchy, visible radio buttons for single choices, checkboxes for common multi-choice entries, and free text for Other or additional information.

## Acceptance criteria

- Synthetic-data banner is present on every page.
- Reset restores the same seed data.
- An intern can be registered and given a minimal patient visit.
- A doctor can open a patient's visit history and review all stored section details.
- Common clinical choices can be entered without opening a dropdown.
- Optional clinical sections do not block signing.
- Signed visits cannot be edited.
- Management cannot navigate to or render patients or patient visits.
- Monthly-return edits update surveillance and absenteeism.
- A new environmental breach updates industrial-hygiene views.
- A new ergonomic assessment updates outcome distribution.
- Missing data is neutral and distinct from failure.
- Production build and unit tests pass.
- The interface remains usable at 1024px and 1440px and with keyboard navigation.

## Explicit exclusions

- Production authentication or server-side access control.
- Server persistence.
- Real clinical data.
- Full signed-record amendment workflow.
- Attachments and photographs.
- HR, identity, document-management, and instrument integrations.
- PDF/Word report export.
- Production-ready legal, privacy, security, backup, deployment, or operational controls.
