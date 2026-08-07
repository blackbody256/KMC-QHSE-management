-- Administrative audit trail for the identity service.
--
-- Append only. No update or delete operation is defined on this table, and the
-- database role the service connects as is granted insert and select only. See
-- FR-SEC-06 and Section 1.4 of the production build plan.

create table if not exists audit_log (
    audit_log_id    bigserial primary key,
    actor_id        text        not null,
    actor_username  text        not null,
    action          text        not null,
    entity_type     text        not null,
    entity_id       text        not null default '',
    detail          jsonb       not null default '{}'::jsonb,
    occurred_at     timestamptz not null default now()
);

create index if not exists audit_log_occurred_at_idx on audit_log (occurred_at desc);
create index if not exists audit_log_actor_idx on audit_log (actor_id, occurred_at desc);

comment on table audit_log is
    'Append-only record of administrative actions. Never contains clinical content.';
