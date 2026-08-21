-- Monthly returns and the linked referral leave.
--
-- This service computes every figure on the executive dashboard and holds no
-- clinical database credential. Nothing in this schema names a patient, and
-- nothing carries a diagnosis or any free clinical text. The one row that
-- originates in the clinical service, referral_leave_contribution, carries a
-- referral identifier, a month and a number of days and nothing else.

-- Figures sourced outside this system.
--
-- FR-RET-01 and FR-RET-02. The health figures come from the HR portal; the four
-- safety figures come from Workplace Safety, which is a separate division that
-- may already hold them in its own system. Both are recorded here with the
-- source they came from, so a dashboard figure can always be traced back to
-- somebody who stated it.
create table if not exists monthly_return (
    period                     text        primary key check (period ~ '^\d{4}-\d{2}$'),

    -- Health, entered from the Human Resource portal.
    health_related_lost_days   numeric(10,1) not null check (health_related_lost_days >= 0),
    headcount                  integer     not null check (headcount > 0),
    surveillance_scheduled     integer     not null default 0 check (surveillance_scheduled >= 0),
    surveillance_completed     integer     not null default 0 check (surveillance_completed >= 0),
    health_source_note         text        not null,

    -- Safety, attributed. Nullable, and null means No data rather than zero.
    -- A month where nobody supplied the near-miss count is not a month with no
    -- near misses, and the dashboard must be able to tell the two apart -
    -- ADR-06. This is why these are not "not null default 0".
    fatalities                 integer     check (fatalities >= 0),
    total_recordable_incidents integer     check (total_recordable_incidents >= 0),
    total_recordable_injuries  integer     check (total_recordable_injuries >= 0),
    reportable_near_misses     integer     check (reportable_near_misses >= 0),
    safety_source_note         text        not null default '',

    entered_by                 text        not null,
    entered_at                 timestamptz not null default now(),
    updated_at                 timestamptz not null default now(),

    -- More people assessed than were scheduled is a data-entry slip, and it
    -- would produce a surveillance compliance figure above 100%.
    constraint monthly_return_surveillance_within_scheduled
        check (surveillance_completed <= surveillance_scheduled),

    -- A safety figure with no stated source cannot be defended when it is
    -- questioned, and these four are the figures most likely to be questioned.
    constraint monthly_return_safety_figures_have_a_source check (
        safety_source_note <> ''
        or (fatalities is null and total_recordable_incidents is null
            and total_recordable_injuries is null and reportable_near_misses is null)
    )
);

comment on table monthly_return is
    'Figures sourced outside this system, entered once a month with their source. Null safety figures mean No data, never zero.';

-- Corrections, kept rather than overwritten.
--
-- A submitted return that is corrected keeps its prior value and the reason.
-- Without this, a dashboard figure quietly changes and nobody can say why -
-- which is precisely the failure this system was commissioned to remove.
create table if not exists monthly_return_revision (
    revision_id  bigserial   primary key,
    period       text        not null,
    -- The row as it stood before the correction.
    previous     jsonb       not null,
    reason       text        not null,
    corrected_by text        not null,
    corrected_at timestamptz not null default now()
);

create index if not exists monthly_return_revision_period_idx
    on monthly_return_revision (period, corrected_at desc);

-- Sick leave recommended by an external facility, from the clinical service.
--
-- The column list is the contract and it is deliberately this short. There is
-- no patient identifier, no name, no diagnosis and no free text: nothing here
-- would tell a reader of this database who was referred or why. The mirror of
-- this constraint lives in the clinical service's own migration, and a contract
-- test on each side fails the build if either widens.
--
-- (referral_id, feedback_version) is unique, so a redelivered message is a
-- no-op. superseded marks a contribution replaced by a later correction; the
-- surviving row per referral is the one that counts, which is what makes a
-- correction a replacement rather than a second period of leave.
create table if not exists referral_leave_contribution (
    referral_id      uuid        not null,
    feedback_version integer     not null,
    period           text        not null check (period ~ '^\d{4}-\d{2}$'),
    days             numeric(5,1) not null check (days >= 0),
    superseded       boolean     not null default false,
    received_at      timestamptz not null default now(),
    primary key (referral_id, feedback_version)
);

create index if not exists referral_leave_contribution_period_idx
    on referral_leave_contribution (period) where not superseded;

comment on table referral_leave_contribution is
    'Non-clinical sick-leave facts from the clinical service. No patient identity, diagnosis or free text may be added to this table.';
