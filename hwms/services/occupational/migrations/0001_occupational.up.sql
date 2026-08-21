-- Ergonomics and Industrial Hygiene.
--
-- ADR-06 governs both: completeness and compliance are separate questions. How
-- many assessments were done is a different fact from how many passed, and a
-- module that reports only the second lets a unit look compliant by doing less
-- work. Planned counts are therefore recorded alongside the results.

-- --- Industrial hygiene -----------------------------------------------------

create table if not exists hygiene_monitoring_event (
    event_id     uuid        primary key,
    -- The reporting month, as YYYY-MM.
    period       text        not null check (period ~ '^\d{4}-\d{2}$'),
    event_date   date        not null,
    location     text        not null,
    instrument   text        not null default '',
    -- An event that did not happen is still a record. A month with no readings
    -- because monitoring was not performed is a different fact from a month
    -- with no readings because nothing was scheduled, and the difference is
    -- the whole of what a completeness figure measures.
    performed    boolean     not null default true,
    not_performed_reason text not null default '',
    notes        text        not null default '',
    recorded_by  text        not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),

    constraint hygiene_event_reason_given_when_not_performed
        check (performed or not_performed_reason <> '')
);

create index if not exists hygiene_event_period_idx on hygiene_monitoring_event (period, event_date desc);

create table if not exists hygiene_reading (
    reading_id       uuid        primary key,
    event_id         uuid        not null references hygiene_monitoring_event (event_id) on delete cascade,
    period           text        not null check (period ~ '^\d{4}-\d{2}$'),
    reading_date     date        not null,
    location         text        not null,
    instrument       text        not null default '',
    parameter        text        not null,
    value            numeric(12,4) not null,

    -- The reference limit as it stood on reading_date, copied here in full.
    --
    -- Copied, not referenced. A foreign key to the limit table would give the
    -- right answer today and a different one after the limit is revised, and
    -- a compliance report run twice a year apart would disagree about the same
    -- day. NFR-DATA-02: the evaluation is immutable, so what it was evaluated
    -- against must be immutable too.
    limit_reference_id uuid      not null,
    limit_applied    numeric(12,4) not null,
    unit             text        not null,
    averaging_period text        not null,
    monitoring_context text      not null check (
                         monitoring_context in ('occupational-exposure', 'indoor-workplace', 'ambient')),
    standard_family  text        not null,
    standard_version text        not null default '',

    -- Written once, at the moment of recording, and never recomputed.
    compliance       text        not null check (compliance in ('within', 'outside')),

    -- A reading taken outside the monitoring plan still belongs in the
    -- register, but it should not move the compliance percentage. Ad-hoc
    -- readings are usually taken because somebody already suspects a problem,
    -- and letting them into the denominator makes the figure a measure of how
    -- often people went looking.
    kpi_eligible     boolean     not null default true,

    recorded_by      text        not null,
    created_at       timestamptz not null default now()
);

create index if not exists hygiene_reading_period_idx on hygiene_reading (period, reading_date desc);
create index if not exists hygiene_reading_event_idx on hygiene_reading (event_id);

comment on table hygiene_reading is
    'Industrial hygiene readings with the limit in force on the reading date copied in. The snapshot and the evaluation are immutable; see the trigger below.';

-- The immutability rule, enforced by the database rather than by convention.
--
-- Correcting a reading is not editing it. A misread instrument produces a new
-- reading with a note; it does not quietly change what the register said last
-- quarter. Without this a well-meaning fix to one row silently rewrites a
-- compliance figure that has already been reported to management.
create or replace function hygiene_reading_snapshot_is_immutable()
returns trigger as $$
begin
    if new.value              is distinct from old.value
    or new.reading_date       is distinct from old.reading_date
    or new.parameter          is distinct from old.parameter
    or new.limit_reference_id is distinct from old.limit_reference_id
    or new.limit_applied      is distinct from old.limit_applied
    or new.unit               is distinct from old.unit
    or new.averaging_period   is distinct from old.averaging_period
    or new.monitoring_context is distinct from old.monitoring_context
    or new.standard_family    is distinct from old.standard_family
    or new.standard_version   is distinct from old.standard_version
    or new.compliance         is distinct from old.compliance then
        raise exception
            'a recorded hygiene reading and its evaluation cannot be altered; record a new reading instead'
            using errcode = 'restrict_violation';
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists hygiene_reading_immutable on hygiene_reading;
create trigger hygiene_reading_immutable
    before update on hygiene_reading
    for each row execute function hygiene_reading_snapshot_is_immutable();

-- --- Ergonomics and wellness ------------------------------------------------

create table if not exists ergonomic_assessment (
    assessment_id uuid        primary key,
    period        text        not null check (period ~ '^\d{4}-\d{2}$'),
    assessed_on   date        not null,
    workstation   text        not null,
    work_type     text        not null check (work_type in ('Office', 'Industrial')),
    assessor      text        not null,
    -- Three outcomes, not a pass/fail pair. "Partially compliant" is the
    -- common real result and collapsing it into either neighbour loses the
    -- distinction the assessor drew.
    outcome       text        not null check (
                      outcome in ('Compliant', 'Partially compliant', 'Non-compliant')),
    findings      text        not null default '',
    recorded_by   text        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists ergonomic_assessment_period_idx
    on ergonomic_assessment (period, assessed_on desc);

create table if not exists corrective_action (
    action_id     uuid        primary key,
    assessment_id uuid        not null references ergonomic_assessment (assessment_id) on delete cascade,
    description   text        not null,
    owner         text        not null,
    due_date      date        not null,
    status        text        not null default 'Open' check (status in ('Open', 'Implemented', 'Closed')),
    closed_on     date,
    evidence      text        not null default '',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),

    -- A closed action must say when. OH4 is "closed on time", and an action
    -- closed on an unknown date cannot be counted either way.
    constraint corrective_action_closed_has_date
        check (status <> 'Closed' or closed_on is not null)
);

create index if not exists corrective_action_due_idx on corrective_action (due_date);
create index if not exists corrective_action_assessment_idx on corrective_action (assessment_id);

comment on table corrective_action is
    'Corrective actions from ergonomic assessments. Actions closed on or before their due date, over actions due, derives OH4.';

-- --- The plan ---------------------------------------------------------------
--
-- What was scheduled, against which what was done is measured. Without this,
-- "twelve assessments completed" has no denominator and completeness cannot be
-- reported separately from compliance, which is what ADR-06 requires.

create table if not exists health_wellness_plan (
    period                        text        primary key check (period ~ '^\d{4}-\d{2}$'),
    hygiene_events_planned        integer     not null default 0 check (hygiene_events_planned >= 0),
    ergonomic_assessments_planned integer     not null default 0 check (ergonomic_assessments_planned >= 0),
    -- Confirmed occupational disease cases for the month, which is OH2. It is
    -- a count an officer confirms, not one this system derives: deciding a
    -- case is occupational in origin is a clinical and legal judgement.
    confirmed_occupational_diseases integer   not null default 0
                                      check (confirmed_occupational_diseases >= 0),
    recorded_by                   text        not null,
    created_at                    timestamptz not null default now(),
    updated_at                    timestamptz not null default now()
);
