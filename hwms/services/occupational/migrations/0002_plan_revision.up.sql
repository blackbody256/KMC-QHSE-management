-- Corrections to the monthly occupational plan.
--
-- The confirmed disease count is a clinical and legal judgement. Keeping its
-- former value and the reason for changing it prevents a dashboard result from
-- being silently rewritten after review.
create table if not exists health_wellness_plan_revision (
    revision_id  bigserial   primary key,
    period       text        not null check (period ~ '^\d{4}-\d{2}$'),
    previous     jsonb       not null,
    reason       text        not null check (btrim(reason) <> ''),
    corrected_by text        not null,
    corrected_at timestamptz not null default now()
);

create index if not exists health_wellness_plan_revision_period_idx
    on health_wellness_plan_revision (period, corrected_at desc);

comment on table health_wellness_plan_revision is
    'Prior monthly plan values, including the confirmed occupational disease judgement, kept with the reason for correction.';
