-- Clinical context.
--
-- This schema lives on its own database instance with its own credentials and
-- its own encryption key. No other service is issued those credentials. That
-- separation is the enforcement mechanism for the rule that only the Health
-- and Wellness Officer may retrieve an individual clinical record: a defect
-- elsewhere in the system cannot read a patient record because it holds no
-- credential with which to try.

create table if not exists patient (
    patient_id       uuid primary key,
    full_name        text        not null,
    age              integer     not null check (age >= 0 and age < 150),
    sex              text        not null check (sex in ('Female', 'Male')),
    phone            text        not null default '',
    category         text        not null check (category in ('Employee', 'Intern', 'Other')),
    category_detail  text        not null default '',
    -- Optional, and optional for every category. A registry keyed on employee
    -- number would force clinical staff to either turn a patient away or
    -- invent an identifier under time pressure. Neither is acceptable.
    employee_number  text        not null default '',
    department       text        not null default '',
    division         text        not null default '',
    unit_section     text        not null default '',
    job_title        text        not null default '',
    created_by       text        not null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    -- Soft delete only, per DR-05.
    is_deleted       boolean     not null default false,
    deleted_at       timestamptz,
    deleted_by       text
);

create index if not exists patient_name_idx on patient (lower(full_name)) where not is_deleted;
create index if not exists patient_employee_number_idx on patient (employee_number)
    where employee_number <> '' and not is_deleted;

create table if not exists patient_visit (
    visit_id     uuid primary key,
    patient_id   uuid        not null references patient (patient_id),
    visit_date   date        not null,
    time_in      text        not null default '',
    visit_type   text        not null check (
                     visit_type in ('Walk-in', 'Referred by supervisor', 'Emergency', 'Follow-up')),
    state        text        not null default 'draft' check (state in ('draft', 'signed')),
    work_related text        not null default 'Unsure' check (work_related in ('Yes', 'No', 'Unsure')),
    -- Vital signs as measured. Held as a document because the set is stable
    -- but sparsely populated: a minor complaint records none of it, and twelve
    -- mostly-null columns model that worse than one document does.
    vitals       jsonb       not null default '{}'::jsonb,
    recorded_by  text        not null,
    signed_at    timestamptz,
    signed_by    text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists patient_visit_patient_idx on patient_visit (patient_id, visit_date desc);
create index if not exists patient_visit_date_idx on patient_visit (visit_date desc);

-- Section state, per ADR-09.
--
-- A blank field on paper cannot distinguish "not clinically indicated" from
-- "forgotten". Recording that distinction is the difference between an
-- auditable record and an incomplete one, and it is the only way the Division
-- can later demonstrate that an assessment was properly conducted.
create table if not exists visit_section (
    visit_id     uuid        not null references patient_visit (visit_id) on delete cascade,
    section_code text        not null,
    status       text        not null default 'not-recorded' check (
                     status in ('not-recorded', 'partial', 'complete', 'not-indicated')),
    notes        text        not null default '',
    selections   jsonb       not null default '[]'::jsonb,
    updated_by   text        not null,
    updated_at   timestamptz not null default now(),
    primary key (visit_id, section_code)
);

-- Read access log, per ADR-11.
--
-- Ordinary audit practice logs modifications. Under the Data Protection and
-- Privacy Act the risk to the data subject arises from unauthorised reading,
-- not unauthorised writing, so a log capturing only writes provides no
-- evidence about the harm most likely to occur.
--
-- Append only. No update or delete operation is defined on this table, and the
-- database role the service connects as is granted insert and select only.
create table if not exists clinical_access_log (
    clinical_access_log_id bigserial primary key,
    acting_user_id         text        not null,
    acting_username        text        not null,
    patient_id             uuid,
    visit_id               uuid,
    access_route           text        not null check (
                               access_route in ('list', 'search', 'detail', 'break-glass')),
    result_count           integer     not null default 1,
    accessed_at            timestamptz not null default now()
);

create index if not exists clinical_access_log_patient_idx
    on clinical_access_log (patient_id, accessed_at desc);
create index if not exists clinical_access_log_actor_idx
    on clinical_access_log (acting_user_id, accessed_at desc);

comment on table clinical_access_log is
    'Append-only record of every retrieval of an individual clinical record. Readable by the Data Protection Officer only.';
