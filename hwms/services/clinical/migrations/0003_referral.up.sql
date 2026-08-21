-- Medical referral, KMC.DQHSE.02/26-FM004.
--
-- The referral is the one clinical document in this system that leaves the
-- building. Everything below follows from that.
--
-- Identity is snapshotted at creation, as it is for a laboratory requisition
-- and for the same reason: a correction to the registry next month must not
-- rewrite a letter that went to an external facility last month.
--
-- The vital signs are copied from the source visit rather than re-entered.
-- Re-keying figures that were recorded ten minutes earlier is how the two
-- records come to disagree, and of the two the one an external clinician reads
-- is this one.
--
-- Three properties of the client's form are reproduced rather than corrected,
-- per DEC-025 and DEC-026. The form has two sections labelled E and no Section
-- D. It names the role "KMC Infirmary Officer", which KMC has since renamed to
-- Health and Wellness Officer. Both are defects in a controlled client
-- document; correcting them here would put this system out of step with the
-- paper it digitises, and the correction is Document Control's to authorise.

create table if not exists referral (
    referral_id                   uuid primary key,
    form_number                   text        not null default 'KMC.DQHSE.02/26-FM004',
    visit_id                      uuid        not null references patient_visit (visit_id),
    patient_id                    uuid        not null references patient (patient_id),

    -- The lifecycle as the paper moves: written, authorised, handed over,
    -- returned with the facility's findings, and reviewed by the clinic.
    -- Transitions are gated in the service; this constraint is the floor.
    status                        text        not null default 'drafted'
                                      check (status in ('drafted', 'authorised', 'issued',
                                                        'returned', 'reviewed')),

    -- --- Section A, preliminary information -----------------------------
    referred_to                   text        not null,
    snapshot_name                 text        not null,
    snapshot_position             text        not null default '',
    snapshot_age                  integer     not null check (snapshot_age >= 0 and snapshot_age < 150),
    snapshot_sex                  text        not null check (snapshot_sex in ('Female', 'Male')),
    snapshot_department           text        not null default '',
    snapshot_division             text        not null default '',
    snapshot_unit                 text        not null default '',
    snapshot_contact_number       text        not null default '',
    snapshot_supervisor_name      text        not null default '',
    referral_date                 date        not null,
    referral_time                 text        not null default '',

    clinical_features             text        not null default '',

    -- Clinical findings, copied from the visit. Body mass index is derived
    -- from the copied height and weight and is never stored: a derived figure
    -- held alongside its inputs is a figure that can contradict them.
    vitals                        jsonb       not null default '{}'::jsonb,

    general_examination           jsonb       not null default '[]'::jsonb,
    general_examination_other     text        not null default '',
    past_medical_history          jsonb       not null default '[]'::jsonb,
    past_medical_history_other    text        not null default '',

    -- Occupational consideration. Note the third option: the visit record says
    -- Unsure, this form says Suspected. Each follows its own printed form.
    work_related                  text        not null default 'No'
                                      check (work_related in ('Yes', 'No', 'Suspected')),
    suspected_exposure            text        not null default '',
    investigations_done           text        not null default '',
    provisional_diagnosis         text        not null default '',
    treatment_given               text        not null default '',
    referral_reasons              jsonb       not null default '[]'::jsonb,
    referral_reason_other         text        not null default '',

    -- --- Section B, infirmary clearance ---------------------------------
    -- printed_position defaults to the wording on the client's form, which
    -- names a role KMC no longer uses. Retained pending DEC-026.
    clearance_officer             text        not null,
    clearance_printed_position    text        not null default 'KMC Infirmary Officer',
    clearance_signature_confirmed boolean     not null default false,
    clearance_contact             text        not null default '',
    clearance_date                date,
    clearance_time                text        not null default '',

    issued_at                     timestamptz,

    -- --- Section E (first of two), external medical facility feedback ----
    -- Completed after the referral is issued, from what the facility returns.
    --
    -- feedback_version increments on every correction. It is the idempotency
    -- key for the sick-leave contribution below: without it, a facility that
    -- sends an amended letter would have its leave counted twice.
    feedback_version              integer     not null default 0,
    feedback_recorded_at          timestamptz,
    feedback_facility             text        not null default '',
    feedback_practitioner         text        not null default '',
    feedback_diagnosis            text        not null default '',
    feedback_treatment_provided   text        not null default '',
    feedback_recommended_followup text        not null default '',
    feedback_sick_leave_days      numeric(5,1) not null default 0
                                      check (feedback_sick_leave_days >= 0),
    feedback_sick_leave_from      date,
    feedback_sick_leave_to        date,
    feedback_signature_confirmed  boolean     not null default false,
    feedback_date                 date,

    -- --- Section E (second of two), KMC infirmary follow-up review -------
    review_recorded_at            timestamptz,
    review_comments               text        not null default '',
    review_reviewed_by            text        not null default '',
    review_position               text        not null default '',
    review_signature_confirmed    boolean     not null default false,
    review_date                   date,

    created_by                    text        not null,
    created_at                    timestamptz not null default now(),
    updated_at                    timestamptz not null default now(),

    -- A leave range that runs backwards is a transcription slip, and it would
    -- produce a negative contribution to absenteeism.
    constraint referral_sick_leave_range_ordered check (
        feedback_sick_leave_from is null
        or feedback_sick_leave_to is null
        or feedback_sick_leave_to >= feedback_sick_leave_from
    )
);

create index if not exists referral_patient_idx on referral (patient_id, referral_date desc);
create index if not exists referral_visit_idx on referral (visit_id);
create index if not exists referral_status_idx on referral (status);

comment on table referral is
    'Medical referrals on KMC.DQHSE.02/26-FM004. Clinical data: officer access only, every read logged.';

-- Section C, official authorisation.
--
-- Held apart from the referral rather than as more columns on it, and that
-- separation is the whole point of the table.
--
-- The printed Section C requires the Head of Division and the Chief of Staff to
-- sign a document carrying a provisional diagnosis, HIV status and mental
-- health condition. ADR-03 says no management role sees an individual clinical
-- record. Both cannot stand, and DEC-024, which is open, and is a production
-- blocker for authoriser access, decides which gives way.
--
-- Until it is decided, this system implements the proposed safe answer. There
-- is no management route to a referral at all. The officer obtains the
-- authorisation outside the system, from a summary carrying the patient, the
-- destination, the reason and the cost implication and nothing clinical, and
-- records here that it was obtained. cost_implication lives on this row, not on
-- the referral, because it is the one field that exists for the authoriser
-- rather than for the clinician.
--
-- If KMC later decides authorisers do see clinical content, that is a decision
-- to make knowingly and to record. The split here is what makes it a change of
-- policy rather than a rewrite.
create table if not exists referral_authorisation (
    referral_id                       uuid primary key
                                          references referral (referral_id) on delete cascade,
    cost_implication                  text        not null default '',

    head_of_division_name             text        not null default '',
    head_of_division_signature_confirmed boolean  not null default false,
    head_of_division_date             date,
    head_of_division_remarks          text        not null default '',

    chief_of_staff_name               text        not null default '',
    chief_of_staff_signature_confirmed boolean    not null default false,
    chief_of_staff_date               date,
    chief_of_staff_remarks            text        not null default '',

    -- Who recorded the decision, not who made it. The distinction matters if
    -- anyone later asks whether management held the record.
    recorded_by                       text        not null,
    recorded_at                       timestamptz not null default now()
);

comment on table referral_authorisation is
    'Section C authorisation as recorded by the officer from a minimum-disclosure summary. DEC-024 open: no management role has a route to this or to the referral.';

-- The sick-leave contribution to Health-Related Absenteeism.
--
-- A transactional outbox, written in the same transaction as the feedback that
-- produced it, and read by the metrics service. It exists so the referral is
-- part of the system rather than a document store: leave recommended by an
-- external facility reaches the absenteeism figure without being re-keyed into
-- a monthly return.
--
-- The column list is the contract, and it is deliberately this short. There is
-- no patient identifier, no name, no diagnosis and no free text, nothing here
-- would tell a reader of the metrics database who was referred or why. A
-- contract test asserts that column set, so a later column carrying clinical
-- content fails the build rather than reaching a service with no clinical
-- credentials.
create table if not exists referral_leave_outbox (
    outbox_id        bigserial   primary key,
    referral_id      uuid        not null references referral (referral_id) on delete cascade,
    feedback_version integer     not null,
    -- The reporting month the leave falls in, as YYYY-MM.
    period           text        not null check (period ~ '^\d{4}-\d{2}$'),
    days             numeric(5,1) not null check (days >= 0),
    -- A corrected feedback appends a new row and marks the previous one
    -- superseded, rather than updating in place. The metrics service applies
    -- the surviving row per referral, so a correction replaces rather than
    -- adds, which is the difference between a fix and a double count.
    superseded       boolean     not null default false,
    published_at     timestamptz,
    created_at       timestamptz not null default now(),
    unique (referral_id, feedback_version)
);

create index if not exists referral_leave_outbox_unpublished_idx
    on referral_leave_outbox (created_at) where published_at is null;

comment on table referral_leave_outbox is
    'Non-clinical sick-leave facts for the metrics service. No patient identity, diagnosis or free text may be added to this table.';
