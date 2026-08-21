-- Effective-dated reference data.
--
-- ADR-08: no target, threshold, limit or reference range is a source constant.
-- Every one of them is data, versioned, with an effective date and a stated
-- source. Changing a target is then a recorded decision by its owner, not a
-- release by a developer, and NFR-DATA-01 is enforceable by grep.
--
-- The reason for the effective dating is not tidiness. A reading taken in
-- July 2026 was compliant or not against the limit in force in July 2026. If
-- the limit is revised in 2027 and the evaluation is recomputed, the system
-- silently rewrites history and a compliance report run twice a year apart
-- gives two different answers about the same day. Consumers therefore resolve
-- the row in force on the event date and snapshot what they used.
--
-- approval_state carries whether anybody has actually agreed the value:
--
--   approved             the owner has signed it off
--   proposal             this project's proposal, awaiting an owner
--   confirmation-pending carried from the reviewed prototype, owner not yet
--                        confirmed
--
-- Nothing seeded below is 'approved'. The values come from the prototype the
-- client reviewed, and a reviewed prototype is not an approval.

create table if not exists kpi_definition (
    kpi_definition_id  uuid        primary key,
    metric_id          text        not null check (
                           metric_id in ('OH1','OH2','OH3','OH4','S1','S2','S3','S4','S5')),
    name               text        not null,
    kpi_group          text        not null check (
                           kpi_group in ('Occupational health', 'Health and safety summary')),

    target_label       text        not null,
    target_value       numeric(12,4) not null,
    comparison         text        not null check (comparison in ('gte', 'lt', 'eq')),
    -- Higher-is-better or lower-is-better. Reportable near misses are the
    -- indicator most often got backwards: more near-miss reports mean a
    -- stronger reporting culture, not a less safe factory. It is stored as
    -- data and asserted by test.
    direction          text        not null check (direction in ('higher', 'lower')),
    -- The value at which a figure stops being on target and is not yet off it.
    -- Null where the owner has set no band, in which case there is no
    -- Approaching state for this indicator rather than an invented one.
    approaching_boundary numeric(12,4),
    format             text        not null check (
                           format in ('integer', 'decimal-1', 'decimal-2', 'percent-1')),
    provenance         text        not null,
    note               text        not null default '',

    effective_from     date        not null,
    effective_to       date,
    source_note        text        not null,
    approval_state     text        not null default 'proposal' check (
                           approval_state in ('approved', 'proposal', 'confirmation-pending')),

    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),

    constraint kpi_definition_period_ordered
        check (effective_to is null or effective_to > effective_from)
);

-- One definition in force per indicator per day. Two overlapping rows would
-- make "the target on 3 July" ambiguous, and the query would silently pick one.
create unique index if not exists kpi_definition_current_idx
    on kpi_definition (metric_id) where effective_to is null;
create index if not exists kpi_definition_lookup_idx
    on kpi_definition (metric_id, effective_from desc);

comment on table kpi_definition is
    'Effective-dated KPI targets. Never read a target from anywhere else, and never compile one into Go or TypeScript.';

create table if not exists hygiene_reference_limit (
    hygiene_limit_id   uuid        primary key,
    parameter          text        not null,
    limit_value        numeric(12,4) not null,
    unit               text        not null,
    averaging_period   text        not null,
    -- The same parameter has different limits depending on what is being
    -- judged. 85 dB(A) over an eight-hour shift is an occupational exposure
    -- limit; an ambient night-time limit is far lower. A reading evaluated
    -- against the wrong context is worse than an unevaluated one, so the
    -- context is part of the key rather than a label.
    monitoring_context text        not null check (
                           monitoring_context in ('occupational-exposure', 'indoor-workplace', 'ambient')),
    standard_family    text        not null,
    standard_version   text        not null default '',

    effective_from     date        not null,
    effective_to       date,
    source_note        text        not null,
    approval_state     text        not null default 'proposal' check (
                           approval_state in ('approved', 'proposal', 'confirmation-pending')),

    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),

    constraint hygiene_limit_period_ordered
        check (effective_to is null or effective_to > effective_from)
);

create unique index if not exists hygiene_reference_limit_current_idx
    on hygiene_reference_limit (parameter, monitoring_context) where effective_to is null;
create index if not exists hygiene_reference_limit_lookup_idx
    on hygiene_reference_limit (parameter, monitoring_context, effective_from desc);

comment on table hygiene_reference_limit is
    'Effective-dated exposure limits. A reading snapshots the row it was judged against; revising a limit must never change a stored evaluation.';

-- --- seed ------------------------------------------------------------------
--
-- Carried from the prototype the client reviewed on 4 August 2026. Every row
-- is marked confirmation-pending and says so in its source note, so nothing
-- here can be mistaken for a figure an owner has agreed. The values are
-- changeable through the reference data screens without a release, which is
-- the entire point of the table.

insert into kpi_definition (
    kpi_definition_id, metric_id, name, kpi_group, target_label, target_value,
    comparison, direction, approaching_boundary, format, provenance, note,
    effective_from, source_note, approval_state
) values
    ('11111111-1111-4111-8111-000000000001', 'OH1', 'Surveillance compliance', 'Occupational health',
     '100%', 100, 'gte', 'higher', 90, 'percent-1', 'Manual',
     'Employees assessed divided by employees scheduled for the month.',
     '2026-01-01', 'Prototype indicator reviewed 4 August 2026. Formula and target await the unit owner.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000002', 'OH2', 'Occupational disease cases', 'Occupational health',
     '0', 0, 'eq', 'lower', null, 'integer', 'Manual',
     'Confirmed cases recorded for the reporting month.',
     '2026-01-01', 'Prototype indicator reviewed 4 August 2026. Case confirmation workflow remains proposed.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000003', 'OH3', 'Industrial hygiene compliance', 'Occupational health',
     'at least 95%', 95, 'gte', 'higher', 90, 'percent-1', 'Derived',
     'Readings within the limit in force on the day, divided by eligible readings.',
     '2026-01-01', 'Prototype indicator reviewed 4 August 2026. Target awaits the unit owner.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000004', 'OH4', 'Ergonomic risk control', 'Occupational health',
     'at least 95%', 95, 'gte', 'higher', 90, 'percent-1', 'Derived',
     'Corrective actions closed on or before their due date, divided by actions due.',
     '2026-01-01', 'Prototype indicator reviewed 4 August 2026. Formula remains proposed pending its owner.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000005', 'S1', 'Fatality', 'Health and safety summary',
     '0', 0, 'eq', 'lower', null, 'integer', 'Attributed return',
     'Counts people. Entered as an attributed monthly return until the owning division is confirmed.',
     '2026-01-01', 'Client KPI graphic. Authoritative owner pending DEC-027.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000006', 'S2', 'Total Recordable Incidents', 'Health and safety summary',
     '0', 0, 'eq', 'lower', null, 'integer', 'Attributed return',
     'Entered as an attributed monthly return until the owning division is confirmed.',
     '2026-01-01', 'Client KPI graphic. Authoritative owner pending DEC-027.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000007', 'S3', 'Total Recordable Injuries', 'Health and safety summary',
     '0', 0, 'eq', 'lower', null, 'integer', 'Attributed return',
     'Entered as an attributed monthly return until the owning division is confirmed.',
     '2026-01-01', 'Client KPI graphic. Authoritative owner pending DEC-027.', 'confirmation-pending'),

    -- Higher is better, and the only indicator here that is. A month with
    -- fewer near-miss reports than target is a reporting problem, not a safety
    -- achievement, and a dashboard that shows it green has said the opposite
    -- of the truth.
    ('11111111-1111-4111-8111-000000000008', 'S4', 'Reportable Near Misses', 'Health and safety summary',
     'at least 200', 200, 'gte', 'higher', 180, 'integer', 'Attributed return',
     'Higher is better: more reports indicate a stronger reporting culture, not a less safe workplace.',
     '2026-01-01', 'Client KPI graphic, which states the target as 200 or more. Authoritative owner pending DEC-027.', 'confirmation-pending'),

    ('11111111-1111-4111-8111-000000000009', 'S5', 'Health-Related Absenteeism', 'Health and safety summary',
     'under 0.5 days per person', 0.5, 'lt', 'lower', 0.45, 'decimal-2', 'Derived',
     'Monthly lost days plus linked referral leave, divided by month-end headcount.',
     '2026-01-01', 'Client KPI graphic. Numerator composition awaits confirmation from HR, per DEC-003.', 'confirmation-pending')
on conflict (kpi_definition_id) do nothing;

insert into hygiene_reference_limit (
    hygiene_limit_id, parameter, limit_value, unit, averaging_period,
    monitoring_context, standard_family, standard_version,
    effective_from, source_note, approval_state
) values
    ('22222222-2222-4222-8222-000000000001', 'PM2.5', 25, 'µg/m³', '24 hours',
     'indoor-workplace', 'Indoor air quality reference', '',
     '2026-01-01', 'Prototype reference value. The applicable standard and version await confirmation by the Industrial Hygiene owner.', 'proposal'),

    ('22222222-2222-4222-8222-000000000002', 'PM10', 50, 'µg/m³', '24 hours',
     'indoor-workplace', 'Indoor air quality reference', '',
     '2026-01-01', 'Prototype reference value. The applicable standard and version await confirmation by the Industrial Hygiene owner.', 'proposal'),

    ('22222222-2222-4222-8222-000000000003', 'Noise · day', 85, 'dB(A)', '8-hour shift',
     'occupational-exposure', 'Occupational exposure reference', '',
     '2026-01-01', 'Prototype reference value. The applicable standard and version await confirmation by the Industrial Hygiene owner.', 'proposal'),

    ('22222222-2222-4222-8222-000000000004', 'Noise · night', 55, 'dB(A)', 'Night-time',
     'ambient', 'Ambient noise reference', '',
     '2026-01-01', 'Prototype reference value. The applicable standard and version await confirmation by the Industrial Hygiene owner.', 'proposal')
on conflict (hygiene_limit_id) do nothing;
