-- Laboratory requisition, KMC.DQHSE.05/26-FM008.
--
-- Modelled on the form the Occupational Health & Wellness Clinic actually
-- uses. Two properties of that form drive this schema and both differ from
-- what a laboratory module is usually assumed to do.
--
-- The Results column sits beside the Requested Investigations column, so a
-- result belongs to a requested test on one sheet. It is stored on the join
-- row rather than in a separate results table.
--
-- The form carries no units and no reference ranges, so a result is recorded
-- as the laboratory wrote it and the system does not decide whether it is
-- abnormal. Flagging abnormality needs a range KMC has not defined; inventing
-- one would put a clinical judgement in the software's mouth. Whether the
-- laboratory wants structured ranges is an open question, not a gap.

create table if not exists lab_requisition (
    requisition_id                 uuid primary key,
    form_number                    text        not null default 'KMC.DQHSE.05/26-FM008',
    visit_id                       uuid        not null references patient_visit (visit_id),
    patient_id                     uuid        not null references patient (patient_id),
    status                         text        not null default 'requested'
                                       check (status in ('requested', 'collected', 'resulted')),

    -- Patient information as printed on the requisition. A snapshot, because
    -- a later correction to the registry must not silently rewrite a form
    -- that has already gone to the laboratory.
    snapshot_full_name             text        not null,
    snapshot_staff_id_number       text        not null default '',
    snapshot_department            text        not null default '',
    snapshot_gender                text        not null check (snapshot_gender in ('Female', 'Male')),
    snapshot_age_or_dob            text        not null default '',

    request_date                   date        not null,
    clinical_summary               text        not null default '',
    authorised_by                  text        not null,
    authorised_signature_confirmed boolean     not null default false,

    -- For Laboratory Use Only.
    specimen_collected             jsonb       not null default '[]'::jsonb,
    collected_by                   text        not null default '',
    time_of_collection             text        not null default '',

    created_at                     timestamptz not null default now(),
    updated_at                     timestamptz not null default now()
);

create index if not exists lab_requisition_patient_idx
    on lab_requisition (patient_id, request_date desc);
create index if not exists lab_requisition_visit_idx on lab_requisition (visit_id);

create table if not exists lab_requisition_test (
    requisition_id uuid        not null references lab_requisition (requisition_id) on delete cascade,
    -- The seven investigations printed on the form. A code outside this list
    -- is an investigation the clinic does not offer.
    test_code      text        not null check (
                       test_code in ('BS', 'MRDT', 'TYPHOID_AG', 'HPYLORI_AG', 'CBC', 'RBS', 'FBS')),
    result         text        not null default '',
    resulted_at    timestamptz,
    primary key (requisition_id, test_code)
);

comment on table lab_requisition is
    'Laboratory requisitions on KMC.DQHSE.05/26-FM008. Clinical data: officer access only, every read logged.';
