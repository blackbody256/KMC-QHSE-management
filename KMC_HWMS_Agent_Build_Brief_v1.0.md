> **AUTHORITY NOTICE — 3 August 2026.** This brief remains authoritative for design language, accessibility, and implementation quality. Product naming, navigation, roles, KPI scope, architecture, and medical-licence screens are superseded by `docs/KMC_QHSE_MS_SRS_v2.0.md` and `docs/KMC_QHSE_Prototype_Spec_v0.3.md`.

# KMC Health and Wellness Management System

## Version 1 Build Brief for a Coding Agent

**Companion document:** KMC_HWMS_SRS_v1.0.md. That document is authoritative for what to build. This document is authoritative for how to build it and what it looks like.
**Reader:** an autonomous coding agent, or a developer working with one.
**Date:** 31 July 2026

---

# 0. How to use this brief

Read Section 1 and Section 2 before writing any code. They contain constraints that are expensive to retrofit.

Build in the phase order at Section 7. Do not start a phase until the previous phase meets its acceptance criteria. Each phase is independently demonstrable.

Every requirement reference in the form FR-XXX-00, NFR-XXX-00, ADR-00 or C-00 points into the SRS. When this brief and the SRS disagree, the SRS wins and the disagreement is a defect in this brief.

Section 8 is a list of rules that must never be broken. Read it before every phase.

---

# 1. Design direction

## 1.1 The central colour problem, and the decision

KMC's corporate identity is red on white. This system is a compliance dashboard. Those two facts are in direct conflict, and resolving that conflict is the single most important visual decision in the project.

In a compliance interface, red already has a meaning. It means a limit was breached, a target was missed, a licence expired. If red is also the brand chrome, the masthead, the buttons, the headings, then red stops carrying that meaning. The interface becomes uniformly urgent, which is the same as not urgent at all. Staff learn to read past it, and the one reading that actually needed attention is the one they scroll by.

**Decision.** KMC red is a brand colour, not a status colour. It appears in exactly three places:

1. The masthead bar and the KMC logo lockup
2. Primary action buttons, one per screen at most
3. The active state of the left navigation rail

It appears nowhere else. It never indicates status. It never fills a KPI card. It never colours a table row.

Status uses a separate, deliberately distinct palette defined at 1.3, and status is never carried by colour alone.

## 1.2 Status is a glyph and a word, then a colour

Approximately one in twelve men has a form of colour vision deficiency. Red and green are the pair most commonly confused, and they are exactly the pair a compliance dashboard reaches for first. Screen readers announce no colour at all.

The Division has already asked for the right answer without knowing it. During requirements gathering they asked for an X marker against non-compliant readings. Build on that.

**Every status indicator in this system carries three signals: a glyph, a text label, and a colour, in that order of importance.**

| State | Glyph | Label | Used for |
|---|---|---|---|
| Within target | ✓ | Within target | KPI meeting its target, reading within limit |
| Approaching | ~ | Approaching limit | Reading within 10 percent of its limit, action due within 7 days |
| Breach | ✗ | Outside limit | Reading above limit, KPI below target, licence expired |
| Incomplete | — | No data | Period return not submitted, monitoring not performed |
| Not applicable | · | Not applicable | Form section marked not applicable |

The incomplete state is not a failure state and must never be styled as one. A month with no data is a different problem from a month that failed, and conflating them produces exactly the wrong management response. Style it neutral grey, per FR-KPI-07 and FR-RET-04.

**Test before shipping any screen:** apply `filter: grayscale(100%)` in the browser. If any status becomes ambiguous, the screen is not finished.

## 1.3 Design tokens

Declare these once as CSS custom properties. Never write a raw hex value anywhere else in the codebase.

```css
:root {
  /* Brand. Sample --kmc-red from the logo on the KVP Infirmary form before building.
     The value below is a placeholder and is almost certainly slightly wrong. */
  --kmc-red:          #E4002B;
  --kmc-red-deep:     #A8001F;  /* red text on white; bright red fails contrast below 18px */
  --kmc-red-wash:     #FDF2F4;  /* masthead underlay only */

  /* Ink */
  --ink:              #16181D;  /* body text, values */
  --ink-muted:        #596273;  /* labels, captions, metadata */
  --ink-faint:        #8B94A3;  /* placeholders, disabled */

  /* Surface */
  --canvas:           #F6F7F9;  /* page background */
  --surface:          #FFFFFF;  /* cards, tables, form panels */
  --rule:             #E3E6EB;  /* hairlines, borders */
  --rule-strong:      #C8CDD6;  /* table header underline, section dividers */

  /* Status. Deliberately not the brand red, and not a naive red/green pair. */
  --ok:               #0E7C66;  /* deep teal-green, distinguishable from red under CVD */
  --ok-wash:          #ECF6F3;
  --caution:          #A85F00;  /* dark amber, passes contrast on white */
  --caution-wash:     #FBF3E6;
  --breach:           #B3261E;  /* deep red, visibly distinct from --kmc-red */
  --breach-wash:      #FBEDEC;
  --neutral:          #596273;  /* incomplete / no data */
  --neutral-wash:     #F1F3F6;

  /* Focus */
  --focus:            #0B5FCE;  /* keyboard focus ring, never red */
}
```

Note `--focus`. Keyboard focus must not be red, or it becomes indistinguishable from error state. Blue is correct here and the departure from brand is deliberate.

## 1.4 Typography

Two families, three roles. Both are freely licensed and available from Google Fonts.

| Role | Family | Usage |
|---|---|---|
| Interface | IBM Plex Sans | All labels, headings, body, buttons, navigation |
| Data | IBM Plex Mono | Every measured value, limit, KPI figure, date, time, identifier |
| Emphasis | IBM Plex Sans, 600 weight | Section headings, KPI names. No separate display face |

IBM Plex is chosen deliberately. It was designed for an industrial manufacturer, it reads as institutional rather than consumer, and its mono cut has properly disambiguated digits, which matters when a clinician is reading back a blood pressure or an officer is comparing 35 against 3.5.

**The data role is not decorative.** Every number that was measured, counted, or computed renders in IBM Plex Mono with `font-variant-numeric: tabular-nums`. This makes columns of readings align on the decimal, makes a value scannable against its limit in the row beneath, and reduces digit transposition error. Text that describes a number stays in Plex Sans. This is the visual signature of the system: **measured values look like instrument output, everything else looks like an interface.**

Type scale:

```css
--text-xs:    0.75rem;   /* 12px, table metadata, source chips */
--text-sm:    0.8125rem; /* 13px, labels, captions, table body */
--text-base:  0.875rem;  /* 14px, body, form inputs */
--text-lg:    1rem;      /* 16px, section headings */
--text-xl:    1.25rem;   /* 20px, page titles */
--text-kpi:   2rem;      /* 32px, KPI card value, mono */
```

14px base is correct for a dense data application and is deliberately smaller than a marketing site. Do not go below 13px for anything a user must read to do their job.

## 1.5 Layout

Fixed left navigation rail, 240px, collapsible to 64px icons. Content area on `--canvas`. Panels on `--surface` with a 1px `--rule` border and 4px radius. No drop shadows anywhere. No gradients anywhere.

Shadows and gradients read as consumer software and cost vertical rhythm in a dense data view. Structure comes from hairlines and whitespace.

Max content width 1440px, centred. The dashboard and tables use the full width. Forms are constrained to 720px because long line lengths destroy form scanability.

Spacing scale: 4, 8, 12, 16, 24, 32, 48. Nothing else.

## 1.6 Copy rules

Active voice. Sentence case throughout, including buttons and headings. Never title case.

Buttons name the action and keep the same word through the flow. A button that says "Save section" produces a confirmation that says "Section saved". Never "Submit".

Error messages state what to do, not that something failed. Not "Invalid input". Instead: "Enter a value between 30 and 250".

Empty states instruct. A monitoring screen with no events says "No monitoring events recorded for July 2026. Record an event or mark a planned event as not performed." It does not say "No data".

Never use clinical shorthand in interface labels. The form says "Blood pressure", not "BP".

---

# 2. Screen specifications

## 2.1 Application shell

**Masthead**, 56px, `--kmc-red` background, white KMC logo left, current user and role right, sign out.

**Left rail**, sections in this order. Items are hidden entirely, not disabled, when the role has no access. Refer to Appendix 6.5 of the SRS for the access matrix.

```
Dashboard
Infirmary          (Physician only)
  Encounters
  Patients
Occupational health
  Surveillance
  Disease cases
  Fitness for work
Ergonomics
  Assessments
  Corrective actions
Environment
  Monitoring
  Readings
Compliance
  Licences
  Monthly returns
Reports
Administration     (Administrator only)
```

**Role indicator.** The current role is displayed permanently in the masthead, not buried in a menu. In a system whose central design decision is role separation, the user must always know which role they are acting in.

## 2.2 Dashboard

The most important screen. Reference: FR-KPI-01 to 12.

```
┌────────────────────────────────────────────────────────────────┐
│  Divisional performance          [ July 2026 ▾ ]  [ Q3 2026 ▾ ] │
│  Computed 31 Jul 2026, 14:22                     [ Recompute ]  │
├────────────────────────────────────────────────────────────────┤
│  ⚠ Practitioner licence expires in 21 days                      │
├──────────────────┬──────────────────┬──────────────────────────┤
│ K1 Surveillance  │ K2 Occupational  │ K3 Absenteeism           │
│ compliance       │ disease rate     │ rate                     │
│                  │                  │                          │
│  92.5%           │  1               │  0.39                    │
│  target 100%     │  target 0        │  target <0.5 days/emp    │
│                  │                  │                          │
│  ✗ Below target  │  ✗ Below target  │  ✓ Within target         │
│  [manual return] │  [computed]      │  [manual return]         │
└──────────────────┴──────────────────┴──────────────────────────┘
   ... K4, K4c, K5, K5c, K6, K7 in the same grid, 3 across
┌────────────────────────────────────────────────────────────────┐
│  Air quality, July 2026                                         │
│  Parameter   Period    Measured   Limit    Unit    Status       │
│  PM2.5       24 hour      31.4     35      µg/m³   ✓ Within     │
│  PM10        24 hour      68.2     60      µg/m³   ✗ Outside    │
│  Noise, day  Day          72.0     75      dB      ✓ Within     │
└────────────────────────────────────────────────────────────────┘
```

**KPI card anatomy.** Metric identifier and name in Plex Sans `--text-sm` `--ink-muted`. Value in Plex Mono `--text-kpi` `--ink`. Target beneath in `--text-xs` `--ink-muted`. Status row with glyph, label, and a `--ok-wash` / `--caution-wash` / `--breach-wash` / `--neutral-wash` background tint at the card foot. Source chip in `--text-xs` on `--neutral-wash`.

**The source chip is not optional.** Every card states whether its figure was computed, entered as a manual return, or derived from a register. A reader must be able to tell at a glance which numbers the system stands behind and which numbers a person typed. This is ADR-05 made visible and it is the honesty mechanism of the whole dashboard.

**Card tinting.** Tint only the status strip at the card foot, never the whole card. A wall of nine tinted cards is unreadable.

**Incomplete state.** Where the period return is missing, the card shows "—" in place of the value, the label "No data", and the neutral tint. It never shows a partial computation.

**Drill down.** Clicking a card opens the records behind the figure. For K2, this shows department, exposure category and case status only, never patient identity, per FR-KPI-09. Aggregate cells below the minimum count are shown as "<5" and never as the actual number, per FR-KPI-10.

## 2.3 Encounter form

The second most important screen and the one that determines whether the system is actually used. Reference: FR-ENC-01 to 17, ADR-09.

Sections appear in the order of the paper form, per UI-02. Clinical staff have muscle memory for that sequence and reordering it for interface convenience will cost more than it saves.

```
┌──────────────────────────────────────────────────────────┐
│ Encounter · Walk-in · 31 Jul 2026, 09:14                 │
│ Patient: [ search or register ]                          │
│                                        Completeness 4/12 │
├──────────────────────────────────────────────────────────┤
│ ▾ 1. Biodata                              ✓ Complete     │
│   [ fields, single column, 720px ]                       │
│                          [ Not applicable ] [ Save ]     │
├──────────────────────────────────────────────────────────┤
│ ▸ 2. Presenting complaint                 ~ Partial      │
│ ▸ 3. History of present illness           — Not started  │
│ ▸ 4. Past medical history                 — Not started  │
│ ▸ 5. Past surgical history                · N/A          │
│ ▸ 6. Medication history                   — Not started  │
│ ▸ 7. Occupational health history          — Not started  │
│ ▸ 8. Vital signs                          — Not started  │
│ ▸ 9. General examination                  — Not started  │
│ ▸ 10. Systemic examination                — Not started  │
│ ▸ 11. Investigations                      — Not started  │
│ ▸ 12. Impression and treatment            — Not started  │
├──────────────────────────────────────────────────────────┤
│ [ Save draft ]                        [ Sign encounter ] │
└──────────────────────────────────────────────────────────┘
```

**Rules for this screen.**

One section open at a time. Accordion, not tabs. Never more than two levels of disclosure anywhere in the form.

Section state visible on the collapsed header, per UI-03. This is the mechanism that makes partial completion auditable rather than merely tolerated.

"Not applicable" is a button on the section, and it demands a short reason. That reason is the difference between a record that proves nothing was missed and a record that proves nothing.

Single column fields, except the vital signs grid, which is a natural 4-across because the values are read as a set.

Autosave the open section on blur. Never lose entered data on navigation, per NFR-USE-04. Show a quiet "Saved 14:22" rather than a toast.

Units are suffixed inside the input, not floated in a label. Body mass index is computed, read only, and visibly derived.

Out of range values warn in `--caution`, inline, and do not block. Per FR-ENC-09 a genuinely abnormal reading is exactly the reading that matters, and a system that refuses to record it is worse than paper.

"Sign encounter" locks the record. After signing, the only available action is "Add amendment", which appends and never overwrites, per FR-ENC-14. Make this consequence explicit in the confirmation dialogue.

**Target: a minimal walk-in encounter recordable in under two minutes**, per NFR-USE-02. Test this. Register patient, set visit type, record presenting complaint, record impression and treatment, sign. If that path exceeds two minutes, the form is wrong, not the target.

## 2.4 Environmental readings

Entry screen is an event, not a reading. One event covers one location at one time, and carries readings for several parameters.

Each parameter row shows the applicable limit beside the input, before entry. The officer should see 35 µg/m³ while typing 31.4, not discover the breach after saving.

Compliance evaluates on save and is then immutable, per FR-ENV-05.

Inactive parameters, per FR-ADM-06 and C-12, are visible but greyed with the note "No instrument available". Do not hide them. Their absence is itself information the Division needs to see.

Provide "Mark as not performed" with a reason on every planned event, per FR-ENV-10. This is what makes the completeness metric truthful.

## 2.5 Ergonomic assessment

Deliberately minimal, per ADR-07. Workstation, date, assessor, outcome, findings, photographs, corrective actions.

The outcome control is three large radio cards, not a dropdown: Compliant, Partially compliant, Non compliant. Each with its glyph. Three options do not belong in a select element.

Corrective actions are added inline from the assessment, each with description, owner, and due date. Overdue actions carry the breach glyph on the list view.

Build the workstation register before this screen. An assessment cannot exist without a workstation to attach to.

## 2.6 Monthly return

Small screen, high consequence. Reference: FR-RET-01 to 07.

Four inputs: health related lost days, month end headcount, surveillance scheduled, surveillance completed.

**Compute and display the absenteeism rate live, beside the inputs, as the user types.** Per FR-RET-03. If someone enters a year to date total by habit, the rate will read absurdly and they will see it immediately. This single behaviour is the guard against the calculation error identified at C-08.

Display the definition of health related lost days from C-07 permanently on the screen, not in a tooltip.

Refuse future periods. Flag missing prior periods at the top of the screen.

## 2.7 Licence register

Table sorted by expiry date ascending. Rows within 90 days carry caution, expired rows carry breach. Days remaining rendered in mono.

Alerts surface on the dashboard, per FR-LIC-04. A licence register nobody opens is not a control.

---

# 3. Technology

| Layer | Choice | Reason |
|---|---|---|
| Backend | Go 1.22+, chi router | Matches the developer's existing KMC work, single binary deployment suits on-premise |
| Persistence | PostgreSQL 16, pgx, sqlc | Typed queries generated from SQL, no ORM magic across context boundaries |
| Migrations | golang-migrate, versioned, in source control | NFR-MNT-03 |
| Frontend | React 18, TypeScript, Vite | Matches existing experience |
| Data fetching | TanStack Query | Cache invalidation on mutation without hand-rolled state |
| Styling | Tailwind CSS, tokens declared as CSS custom properties per 1.3 | Tokens in `:root`, Tailwind theme extends from them, never raw hex in components |
| Forms | react-hook-form with zod schemas | Section-level schemas, which maps directly onto ADR-09 |
| Charts | Recharts | Only where a trend genuinely helps. Do not chart a single number |
| Auth | Session cookie, HttpOnly, SameSite=Strict, server-side session store | Simpler to reason about than JWT for a single-deployment internal system |
| Passwords | argon2id | NFR-SEC-03 |
| Testing | Go standard testing plus testify, Vitest, Playwright for the access-control suite | NFR-MNT-05 |

If build speed becomes the binding constraint, Go templates with HTMX is a legitimate substitute for the React frontend and will halve the work. It is not the recommendation, because the encounter form's section state management is genuinely stateful, but it is a reasonable trade if the schedule demands it.

# 4. Project structure

```
hwms/
  cmd/hwms/main.go
  internal/
    platform/            # config, logging, db pools, http server, middleware
    auth/                # session, password, RBAC middleware
    audit/               # audit_log and clinical_access_log writers
    admin/               # BOUNDED CONTEXT: reference data
      domain/  store/  http/
    clinical/            # BOUNDED CONTEXT: patients, encounters. SEPARATE DB POOL.
      domain/  store/  http/
    occupational/        # BOUNDED CONTEXT: surveillance, ergonomics, environment, licences
      domain/  store/  http/
    metrics/             # BOUNDED CONTEXT: kpi registry, computation, returns
      domain/  store/  http/
  migrations/
    admin/  clinical/  occupational/  metrics/
  web/
    src/
      tokens.css         # Section 1.3, the only place hex values exist
      components/        # StatusIndicator, KpiCard, DataValue, SectionAccordion, ...
      features/          # dashboard, encounters, environment, ergonomics, ...
      lib/
  seed/
    reference/           # standards, kpi definitions, org structure
    demo/                # synthetic demonstration data
```

Each bounded context owns its package and its schema. A context package must not import another context's `store` or `domain` package. If a context needs data from another, it goes through an interface defined in the consuming context and implemented at the composition root in `main.go`.

The clinical context uses a **separate database connection pool with separate credentials**, per DR-03. This is not a stylistic preference. It is the enforcement mechanism for ADR-03, and it means a bug elsewhere in the application physically cannot read a clinical record.

# 5. Data layer rules

| Rule | Implementation |
|---|---|
| DR-01, schema isolation | One Postgres schema per context. Grants issued per context role. The occupational role has no SELECT on the clinical schema |
| DR-02, no cross-context foreign keys | Cross references use a `_id_ref` UUID column with no FK constraint, following the convention in the Velo codebase. Referential integrity across contexts is an application concern |
| DR-03, clinical separation | Separate database instance, separate credentials, separate encryption key |
| DR-04, aggregates only | The metrics context receives clinical figures through a Go interface returning counts. It has no clinical database credentials at all |
| DR-05, soft delete | `is_deleted boolean not null default false` plus `deleted_at`, `deleted_by`. No hard deletes on referenced entities |
| Effective dating | `environmental_standard` and `kpi_target` carry `effective_from` and `effective_to`. Every query for a limit passes the reading date. Never `SELECT ... WHERE parameter = $1` without a date predicate |
| Immutability | `parameter_reading.compliance_state` is written once. Add a database trigger that raises on UPDATE of that column, per FR-ENV-05 |
| Append only | `clinical_access_log` has no UPDATE or DELETE grant, only INSERT and SELECT |

# 6. Cross-cutting behaviour to build once

Build these before the features that need them. Retrofitting any of them is expensive.

**RBAC middleware.** Permission checked at the HTTP handler and again in the service layer, per NFR-SEC-04. A route that returns a clinical record checks the Physician role in both places. Write the double check deliberately, do not treat the second as redundant.

**Clinical access logging.** A decorator around the clinical store. Every read of an individual record writes to `clinical_access_log` before returning, per FR-SEC-04 and ADR-11. Make it structurally impossible to read without logging by keeping the undecorated store unexported.

**Audit writer.** Every create, update and delete across all contexts, per FR-SEC-06.

**Aggregation guard.** A single function that all clinical-derived aggregates pass through, returning `"<5"` for any count below the minimum cell size, per FR-KPI-10. One implementation, used everywhere, tested directly.

**Metric engine.** Reads the `kpi_definition` registry, dispatches on source type to a computed evaluator, a manual-return reader, or a register evaluator. Adding a metric means adding a registry row and, for computed metrics, one evaluator function. It never means touching the dashboard.

**StatusIndicator component.** Takes a state enum, renders glyph, label and tint. Every status in the system uses it. There is no other way to render a status, which is how Section 1.2 stays true after the twentieth screen.

**DataValue component.** Takes a number, a unit, and an optional limit. Renders mono, tabular, with the unit. Every measured value uses it.

# 7. Build phases

## Phase 0, foundation

Scaffold, tokens, shell, auth, audit, RBAC middleware, clinical access log, StatusIndicator, DataValue.

**Done when:** three seeded users with different roles can sign in; the left rail shows different items for each; an unauthorised API call returns 403 and appears in the audit log; the grayscale test passes on the shell; StatusIndicator renders all five states.

## Phase 1, administration and reference data

Departments, divisions, units, workstations, monitoring locations, environmental parameters and standards, KPI definitions and targets, users and roles. Seed loaders.

**Done when:** the seventeen standards rows from SRS Appendix 6.3 are loaded with effective dates and correct active flags; the nine KPI definitions from Appendix 6.2 are loaded; a limit can be superseded with a new effective date through the UI; no limit or target appears anywhere in the Go or TypeScript source.

## Phase 2, clinical

Patient registry, encounter, all twelve sections, section state, completeness, signing, amendment.

**Done when:** a visitor with no employee number can be registered and treated; a minimal walk-in completes in under two minutes; a section marked not applicable requires a reason; a signed encounter cannot be edited, only amended; every record read appears in `clinical_access_log`; a Playwright test proves each non-Physician role receives 403 on every clinical route.

That last test is the acceptance gate for ADR-03. Write it before the feature, not after.

## Phase 3, environment

Monitoring locations, plans, events, readings, automatic limit evaluation, not-performed recording.

**Done when:** a reading above limit stores a breach state that survives a later change to the limit; an inactive parameter is visible but not enterable and is excluded from the index denominator; a not-performed event reduces completeness without affecting compliance.

## Phase 4, ergonomics

Workstation assessments, tri-state outcome, corrective actions, overdue flagging, closure approval.

**Done when:** all three outcomes are recordable; an action past its due date shows breach; only the Division Head can approve closure; the assessment record carries a nullable template version reference.

## Phase 5, compliance and returns

Licence register with expiry alerting. Monthly return with live rate computation.

**Done when:** a licence 21 days from expiry raises a dashboard alert; the absenteeism rate updates as the user types; a future period is refused; a missing prior period is flagged.

## Phase 6, metrics and dashboard

Metric engine, all nine metrics, dashboard, drill down, aggregation guard.

**Done when:** the worked example in SRS Appendix 6.6 reproduces exactly, all nine figures; a missing return renders K1 and K3 as no data rather than a computed value; K2 drill down shows no patient identity; a department with fewer than five staff renders `<5`; every card shows its source chip.

The worked example is the acceptance test for this phase. Seed it and assert against it.

## Phase 7, reporting

Monthly and quarterly report matching the R2 template layout, PDF export, Word export.

**Done when:** a generated month is visually comparable to the Division's existing template; no individual clinical content appears in any report; every report carries generation timestamp, user, and period.

# 8. Rules that are never broken

An agent working on this system must treat the following as invariant. If a requirement appears to demand breaking one of these, stop and escalate rather than resolve it.

1. **No limit, threshold, target, or standard value appears in application source code.** All of them live in effective-dated reference tables. If you find yourself writing `if value > 35`, you have made an error.

2. **No role other than Physician can retrieve an individual clinical record.** Not the Division Head, not the System Administrator, not a background job, not a report generator. Enforced at the service layer, not only in the UI, and proved by test.

3. **No cross-context database join.** No foreign key across schemas. No context imports another context's store package.

4. **No status is conveyed by colour alone.** Every status carries a glyph and a text label. The grayscale test is part of the definition of done for every screen.

5. **KMC red never indicates status.** It is masthead, primary button, and active navigation, and nothing else.

6. **No real clinical data in any non-production environment.** Seed data is synthetic and visibly labelled as such, per NFR-PRIV-07 and OPS-12.

7. **Every read of an individual clinical record is logged before the record is returned.**

8. **A reading's compliance state is written once and never updated.** Enforced by database trigger, not by convention.

9. **No hard deletes on any entity that has been referenced.**

10. **Incomplete is never rendered as failure.** Missing data shows as no data, in neutral, and the metric shows no value at all.

11. **An abnormal clinical value is never rejected by validation.** Warn, never block.

12. **Nothing in this system diagnoses, recommends treatment, or suggests a clinical action.** It records what a clinician decided. It does not participate in the decision.

# 9. Starting instruction for the agent

Paste this at the beginning of the agent session, with both documents attached.

> You are building version 1 of the KMC Health and Wellness Management System.
>
> Two documents govern this work. KMC_HWMS_SRS_v1.0.md defines what to build and is authoritative on requirements. KMC_HWMS_Agent_Build_Brief_v1.0.md defines how to build it, how it looks, and the order of work.
>
> Read Section 8 of the build brief before you begin and re-read it at the start of every phase. Those twelve rules are invariant. If a task appears to require breaking one, stop and ask rather than resolving it yourself.
>
> Build in the phase order at Section 7. Do not begin a phase until the previous phase satisfies its stated acceptance criteria. At the end of each phase, report which criteria pass and which do not.
>
> Two design constraints are easy to erode and expensive to restore. First, KMC red is brand chrome only and never indicates status; status is always a glyph plus a text label plus a colour, in that order. Second, only the Physician role may retrieve an individual clinical record, enforced in the service layer and proved by test. Treat both as structural, not stylistic.
>
> Where the SRS marks an item as requiring confirmation, in Section 5, implement the proposed answer and add a code comment referencing the item identifier so it can be located when the Division responds.
>
> Begin with Phase 0.

# 10. What is deliberately not specified here

These are open and should be decided by whoever builds, not guessed at now.

| Item | Note |
|---|---|
| Exact KMC red hex | Sample from the logo on the KVP Infirmary form. The token value is a placeholder |
| Report layout detail | Requires the Division's confirmation at C-25 |
| Break glass mechanics | Requires the answer at C-01 before building. Do not implement a half version |
| Session timeout duration | Requires a view on Infirmary workstation sharing, per FR-SEC-07 |
| Whether a Clinical Assistant role exists | Requires the answer at C-02. Build the Physician role first, the assistant role is additive |
| Minimum cell size value | Proposed as five at C-04. Make it configuration, not a constant |

---

**End of brief**
