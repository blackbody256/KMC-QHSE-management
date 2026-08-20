module.exports = {
  slug: 'backup-dr',
  filename: 'Velo Backup and Disaster Recovery Procedures.docx',
  meta: {
    title: 'Backup and Disaster Recovery Procedures',
    reference: 'KMC.DPD.08/26-SP017',
    description: 'Backup scope, schedules, restore runbooks, recovery objectives and disaster recovery testing for the Velo Electric Bus Fleet Operations Planning System',
    preparedBy: 'Charger Systems and Network Division',
    issueDate: '16/08/2026',
    version: '001',
    classification: 'Internal, Restricted to KMC and E-Bus Xpress',
  },

  build(d, L) {
    const b = [];
    const p = (t) => b.push(L.para(t));
    const bl = (t) => b.push(L.bullet(t));

    // ---------------------------------------------------------------- 1
    b.push(L.h1(d, 'Introduction'));

    b.push(L.h2(d, 'Purpose'));
    p('This document defines how Velo data is protected against loss, how the system is restored after a failure, and how the recovery capability is tested. It is written as an operating procedure. The runbooks in Section 5 are intended to be followed directly during an incident by the person on duty without requiring further interpretation.');

    b.push(L.h2(d, 'Scope'));
    p('The procedures cover the seven Velo databases, the event backbone, the cache, the routing graph, the deployment configuration and the container images. They apply to the production deployment. Non production environments are rebuilt from migrations and seed data rather than restored from backup, and are therefore excluded.');

    b.push(L.h2(d, 'Recovery Objectives'));
    p('Recovery objectives differ by data class because the operational consequence of losing each class differs. The objectives below are what the delivered architecture can achieve with the procedures in this document. They are not aspirational targets.');
    const t11 = L.tableCaption(d, 'Recovery Objectives by Data Class');
    b.push(t11.paragraph);
    b.push(L.table(
      ['Data Class', 'Recovery Point Objective', 'Recovery Time Objective', 'Justification'],
      [
        ['Operational fleet and reference data', 'One hour', 'Four hours', 'Loss of a bus, route or driver record interrupts planning and must be re entered manually'],
        ['Driver submissions', 'One hour', 'Four hours', 'A lost submission can be re entered by the driver, but readiness accuracy is degraded until it is'],
        ['Published plans and rosters', 'One hour', 'Four hours', 'A lost published plan can be regenerated, but drivers may already be operating to it'],
        ['Audit trail', 'Fifteen minutes', 'Eight hours', 'Audit is required for accountability. A tighter recovery point applies because records cannot be recreated'],
        ['User accounts and roles', 'One hour', 'Two hours', 'Without accounts no operator can access the system, so this is restored first'],
        ['Event backbone', 'Not applicable', 'Four hours', 'Events are transient. Loss affects the audit consumer only, which is mitigated by the audit database backup'],
        ['Cache', 'Not applicable', 'Immediate', 'Rebuilt automatically from source data on demand'],
        ['Routing graph', 'Not applicable', 'Eight hours', 'Rebuilt from the published extract by a documented command'],
      ],
      [2400, 2000, 1800, 3400],
    ));

    b.push(L.h2(d, 'Roles'));
    const t12 = L.tableCaption(d, 'Backup and Recovery Roles');
    b.push(t12.paragraph);
    b.push(L.table(
      ['Role', 'Responsibility'],
      [
        ['Platform and Infrastructure Owner', 'Operates the backup schedule, holds the credentials, performs restores, owns this document'],
        ['Security and Compliance Owner', 'Holds the backup encryption keys separately from the backup data, approves restore requests affecting personal data'],
        ['Operations Manager', 'Declares a disaster, authorises a restore that will lose committed data, communicates to drivers and depot staff'],
        ['Product Development', 'Supports recovery where a data correction or a schema question arises'],
      ],
      [3200, 6400],
    ));

    // ---------------------------------------------------------------- 2
    b.push(L.h1(d, 'What Is Backed Up'));

    b.push(L.h2(d, 'Database Inventory'));
    p('Velo runs seven logical databases inside one PostgreSQL instance. Each is owned by exactly one service and each must be backed up. Backing up only the instance as a whole is acceptable and is the recommended primary method, but the per database breakdown matters during a partial restore because a single service can be restored without disturbing the others.');
    const t21 = L.tableCaption(d, 'Database Backup Inventory');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Database', 'Owning Service', 'Contents', 'Criticality'],
      [
        ['velo_gateway', 'gateway', 'Users, roles, refresh tokens, login attempts', 'Highest. Without it no one can sign in'],
        ['velo_fleet', 'fleet-service', 'Buses, models, depots, routes, stops, chargers, drivers, regions, grid nodes, submissions, readiness states', 'Highest. The operational core'],
        ['velo_planning', 'planning-service', 'Plan runs, trips, duty assignments, charging reservations, rosters, grid profile, plan alerts', 'High. Regenerable but operationally disruptive'],
        ['velo_audit', 'audit-service', 'Append only audit trail', 'High. Cannot be recreated'],
        ['velo_energy', 'energy-service', 'Reserved. Schema only in the current release', 'Low'],
        ['velo_alert', 'alert-service', 'Reserved. Schema only in the current release', 'Low'],
        ['velo_notification', 'notification-service', 'Reserved. Schema only in the current release', 'Low'],
      ],
      [1800, 1800, 4000, 2000],
    ));

    b.push(L.h2(d, 'Non Database Items'));
    const t22 = L.tableCaption(d, 'Non Database Backup Items');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Item', 'Method', 'Frequency', 'Retention'],
      [
        ['Environment configuration file', 'Encrypted copy to the secure configuration store', 'On every change', 'All versions retained'],
        ['Container images', 'Retained in the image registry, tagged to the build commit', 'On every build', 'Twelve months'],
        ['Source repository', 'Mirrored to the secondary repository host', 'On every push', 'Indefinite'],
        ['Routing graph data', 'Not backed up. Rebuilt from the published extract', 'Not applicable', 'Not applicable'],
        ['Database migration files', 'Held in the source repository', 'On every change', 'Indefinite'],
      ],
      [2600, 3400, 1800, 1800],
    ));
    p('The environment configuration file requires particular care. It carries the token signing secret, the internal gateway secret, every database password and the Juza interface key. A database backup is useless without it, because the restored gateway cannot validate tokens issued against a different signing secret. It must be backed up, it must be encrypted, and its encryption key must be held separately from the backup data itself.');

    // ---------------------------------------------------------------- 3
    b.push(L.h1(d, 'Backup Methods and Schedule'));

    b.push(L.h2(d, 'Logical Backup'));
    p('A logical backup captures the contents of the databases in a form that can be restored selectively. It is the primary method for the current single instance deployment because it is simple to operate, simple to verify and allows a single service to be restored independently.');
    const t31 = L.tableCaption(d, 'Logical Backup Schedule');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Backup', 'Timing', 'Scope', 'Retention'],
      [
        ['Full cluster dump', 'Daily at 02:00 East Africa Time', 'All seven databases including roles and grants', 'Thirty daily copies'],
        ['Weekly retained copy', 'Sunday 02:00 East Africa Time', 'All seven databases', 'Twelve weekly copies'],
        ['Monthly retained copy', 'First Sunday of the month', 'All seven databases', 'Twenty four monthly copies'],
        ['Pre change backup', 'Immediately before any migration or deployment', 'All seven databases', 'Fourteen days'],
        ['Audit database dump', 'Every six hours', 'velo_audit only', 'Ninety days'],
      ],
      [2400, 2800, 2600, 1800],
    ));
    p('The audit database is backed up more frequently than the others because its recovery point objective is tighter and because its records cannot be recreated from any other source.');

    b.push(L.h2(d, 'Continuous Archiving'));
    p('Continuous write ahead log archiving is required to meet the one hour recovery point objective, because a daily dump alone would expose up to twenty four hours of loss. Archiving must be enabled on the PostgreSQL instance and the archive destination must be on separate storage from the database volume.');
    p('Where continuous archiving has not yet been enabled, the achievable recovery point objective is the interval between logical backups. This must be stated explicitly to Operations rather than left implied, because the difference between one hour and twenty four hours of potential loss is an operational decision and not a technical detail.');

    b.push(L.h2(d, 'Storage and Encryption'));
    bl('Backups are written to storage that is physically separate from the host running the database');
    bl('A second copy is transferred to the designated recovery location each day');
    bl('Every backup is encrypted at rest before it leaves the database host');
    bl('Encryption keys are held by the Security and Compliance Owner and are not stored with the backups');
    bl('Backup storage is accessible only to the Platform and Infrastructure Owner');
    bl('Backups containing driver personal data carry the same access restrictions as production data');

    b.push(L.h2(d, 'Backup Verification'));
    p('A backup that has never been restored is not a backup. The following verification regime applies and each verification is recorded.');
    const t32 = L.tableCaption(d, 'Backup Verification Regime');
    b.push(t32.paragraph);
    b.push(L.table(
      ['Check', 'Frequency', 'Method', 'Pass Criterion'],
      [
        ['Backup completion', 'Daily', 'Confirm the expected files exist with a plausible size and a current timestamp', 'All expected files present and not materially smaller than the previous day'],
        ['Archive integrity', 'Weekly', 'Verify the archive can be read and its checksum matches', 'Checksum matches'],
        ['Partial restore', 'Monthly', 'Restore one database into a scratch environment and run the smoke tests against it', 'Smoke tests pass'],
        ['Full restore drill', 'Quarterly', 'Full recovery exercise as set out in Section 6', 'Recovery objectives met and recorded'],
      ],
      [2200, 1600, 3600, 2200],
    ));

    // ---------------------------------------------------------------- 4
    b.push(L.h1(d, 'Failure Scenarios'));
    p('The recovery action depends on what failed. The following classification determines which runbook in Section 5 applies.');
    b.push(...L.figure(d, 'recovery-decision', 'Recovery Runbook Selection'));
    b.push(L.richPara([
      'The decision path in ',
      { ref: 'fig_4_1', cached: 'Figure 4.1' },
      ' is followed from the top on every failure. It is ordered so that the questions with the largest consequence are asked first, which prevents time being spent diagnosing a single service when the database itself is the problem.',
    ]));
    const t41 = L.tableCaption(d, 'Failure Scenario Classification');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Scenario', 'Symptom', 'Data Loss', 'Runbook'],
      [
        ['Single service failure', 'One service unreachable, others healthy', 'None', 'Runbook A'],
        ['Service defect after deployment', 'A service starts but behaves incorrectly after a change', 'None if caught before data is written', 'Runbook B'],
        ['Database corruption or accidental data loss', 'Query errors, or data confirmed to be wrong or missing', 'Back to the recovery point', 'Runbook C'],
        ['Complete host loss', 'The whole deployment is unreachable', 'Back to the recovery point', 'Runbook D'],
        ['Event backbone failure', 'Audit events stop being recorded, services otherwise healthy', 'Audit events during the outage', 'Runbook E'],
        ['Routing graph loss', 'Route geometry computation fails', 'None', 'Runbook F'],
        ['Secret compromise', 'A secret is known or suspected to be exposed', 'None', 'Runbook G'],
      ],
      [2400, 3000, 2200, 1400],
    ));

    // ---------------------------------------------------------------- 5
    b.push(L.h1(d, 'Recovery Runbooks'));
    p('Each runbook states the trigger, the steps in order, and the verification that closes the incident. Steps are written to be executed exactly as given.');

    b.push(L.h2(d, 'Runbook A, Single Service Failure'));
    p('Trigger. One service is unreachable or failing its readiness check while the database and the other services are healthy.');
    const t51 = L.tableCaption(d, 'Runbook A Steps');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Confirm scope', 'Check container status and identify which services are affected', 'Only the suspected service is unhealthy'],
        ['Capture evidence', 'Save the service logs before restarting, as a restart discards the in memory state that explains the failure', 'Logs saved to the incident record'],
        ['Restart the service', 'Restart the single affected service', 'The service reaches its readiness check'],
        ['Verify', 'Run the infrastructure smoke test', 'All checks pass'],
        ['Escalate if unresolved', 'If the service fails again within fifteen minutes, treat as a defect and follow Runbook B', 'Escalation recorded'],
      ],
      [1800, 4600, 3200],
    ));

    b.push(L.h2(d, 'Runbook B, Rollback After a Bad Deployment'));
    p('Trigger. A service has been deployed and is behaving incorrectly. The decision to roll back should be taken quickly rather than after extended investigation, because the previous image is known good and diagnosis can continue afterwards.');
    const t52 = L.tableCaption(d, 'Runbook B Steps');
    b.push(t52.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Stop further change', 'Halt any deployment in progress and notify Operations', 'No further change is applied'],
        ['Determine schema impact', 'Establish whether the deployment applied a database migration', 'Migration status known for the affected service'],
        ['Roll back the image', 'Redeploy the previously running image, identified by its build commit', 'The previous version is running'],
        ['Roll back the schema only if required', 'If the migration is not backward compatible, apply the reverse migration for that service. If it is backward compatible, leave the schema in place', 'Schema consistent with the running image'],
        ['Verify', 'Run the smoke test for the affected area', 'Checks pass'],
        ['Record', 'Record the rollback, the reason and the commit identifiers in the incident record', 'Incident record complete'],
      ],
      [2000, 4600, 3000],
    ));
    p('Attention is drawn to the schema step. Reversing a migration that has already accepted writes can discard those writes. Where the migration is backward compatible, which is the standard the project follows, the correct action is to leave the schema forward and roll back only the image.');

    b.push(L.h2(d, 'Runbook C, Database Restore'));
    p('Trigger. Data is confirmed lost, corrupted or incorrectly modified, and the correct state exists in a backup. This runbook loses every change made after the restore point, so it requires authorisation from the Operations Manager before it is executed.');
    const t53 = L.tableCaption(d, 'Runbook C Steps');
    b.push(t53.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Obtain authorisation', 'Confirm with the Operations Manager that the loss of changes after the restore point is accepted, and record the decision', 'Authorisation recorded'],
        ['Stop the writers', 'Stop all application services so that nothing writes during the restore', 'Only the database remains running'],
        ['Back up the current state', 'Take a dump of the current damaged database before overwriting it, since it may still be needed for investigation', 'Pre restore copy saved'],
        ['Select the restore point', 'Identify the most recent backup that precedes the damage', 'Backup file identified and its integrity verified'],
        ['Restore', 'Restore the affected database or databases from the selected backup', 'Restore completes without error'],
        ['Reconcile the signing secret', 'Confirm the environment configuration in use matches the one in force when the backup was taken, otherwise existing sessions will fail', 'Configuration confirmed'],
        ['Restart services', 'Start the application services in dependency order', 'All services reach their readiness checks'],
        ['Verify', 'Run the full smoke test suite', 'All checks pass'],
        ['Communicate', 'Inform Operations of the exact restore point so that work performed after it can be re entered', 'Restore point communicated in writing'],
      ],
      [2000, 4600, 3000],
    ));

    b.push(L.h2(d, 'Runbook D, Full Recovery After Host Loss'));
    p('Trigger. The deployment host is lost and the platform must be rebuilt on replacement infrastructure.');
    const t54 = L.tableCaption(d, 'Runbook D Steps');
    b.push(t54.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Declare the disaster', 'The Operations Manager declares a disaster and notifies stakeholders', 'Declaration recorded with a timestamp'],
        ['Provision the host', 'Provision replacement infrastructure with the container runtime installed', 'Host reachable'],
        ['Restore configuration', 'Retrieve and decrypt the environment configuration file. This must precede the data restore', 'Configuration in place'],
        ['Retrieve images', 'Pull the container images matching the last known good build commit', 'Images present locally'],
        ['Start infrastructure', 'Start the database, the event backbone and the cache only', 'All three healthy'],
        ['Restore databases', 'Restore all seven databases from the most recent verified backup', 'Restore completes without error'],
        ['Apply outstanding migrations', 'Apply any migrations issued after the backup was taken', 'Migration status current'],
        ['Start services', 'Start all application services', 'All services reach their readiness checks'],
        ['Rebuild the routing graph', 'Rebuild the routing graph and run the geometry backfill', 'Route geometry available'],
        ['Recreate event topics', 'Recreate the event topics, since automatic creation is disabled', 'Topics present'],
        ['Verify', 'Run the full smoke test suite and confirm a driver submission and a plan run complete', 'All checks pass'],
        ['Stand down', 'Confirm recovery to Operations and record the achieved recovery time', 'Recovery time recorded against the objective'],
      ],
      [2000, 4600, 3000],
    ));

    b.push(L.h2(d, 'Runbook E, Event Backbone Failure'));
    p('Trigger. The event backbone is unavailable. Services continue to operate because audit publication is best effort and does not block a response, so this is a data completeness incident rather than an outage.');
    const t55 = L.tableCaption(d, 'Runbook E Steps');
    b.push(t55.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Confirm impact', 'Confirm that services are responding and only event publication is failing', 'Impact confined to audit completeness'],
        ['Record the window', 'Record the start time of the failure, as audit events in this window will be absent', 'Window recorded in the incident record'],
        ['Restore the backbone', 'Restart the event backbone and confirm the topics still exist', 'Backbone healthy and topics present'],
        ['Recreate topics if lost', 'If topics are absent, recreate them using the topic creation command', 'Topics present'],
        ['Verify', 'Perform an authenticated request and confirm a new audit record appears', 'Audit record present'],
        ['Record the gap', 'Note the audit gap in the incident record and inform the Security and Compliance Owner', 'Gap formally recorded'],
      ],
      [2000, 4600, 3000],
    ));

    b.push(L.h2(d, 'Runbook F, Routing Graph Rebuild'));
    p('Trigger. Route geometry computation fails and the routing engine reports a missing or corrupt graph. No data is lost, because the graph is derived rather than authoritative.');
    const t56 = L.tableCaption(d, 'Runbook F Steps');
    b.push(t56.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Confirm the cause', 'Confirm the routing engine is running but reporting a graph error', 'Cause confirmed'],
        ['Rebuild the graph', 'Run the graph build script, which downloads the extract and builds it', 'Build completes'],
        ['Restart the routing engine', 'Restart the routing engine container', 'Engine healthy'],
        ['Backfill geometry', 'Run the geometry backfill so stored routes regain their geometry, distance and duration', 'Backfill completes'],
        ['Verify', 'Confirm a route displays its geometry in the operator portal', 'Geometry visible'],
      ],
      [2000, 4600, 3000],
    ));

    b.push(L.h2(d, 'Runbook G, Secret Compromise'));
    p('Trigger. A secret is known or suspected to have been exposed. Speed matters more than certainty, and a suspected compromise is treated as a confirmed one.');
    const t57 = L.tableCaption(d, 'Runbook G Steps');
    b.push(t57.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Expected Result'],
      [
        ['Identify the secret', 'Determine which secret is affected and what it protects', 'Scope established'],
        ['Rotate the token signing secret', 'If the signing secret is affected, replace it and restart the gateway. Every existing session is invalidated and all users must sign in again', 'New secret in force'],
        ['Rotate the internal secret', 'If the internal gateway secret is affected, replace it and restart the gateway together with every downstream service, since a mismatch refuses all proxied traffic', 'All services restarted with the new value'],
        ['Rotate database passwords', 'If a database password is affected, change the role password and update the configuration, then restart the owning service', 'Service reconnects successfully'],
        ['Rotate the Juza key', 'If the interface key is affected, request a replacement from the Juza owner and disable the integration until it is issued', 'Integration disabled or reissued'],
        ['Review the audit trail', 'Review the audit trail for the exposure window for unexpected activity', 'Review recorded'],
        ['Record', 'Record the compromise, the rotation and the review outcome', 'Incident record complete'],
      ],
      [2000, 4600, 3000],
    ));
    p('The order of the two secret rotations matters. Replacing the internal gateway secret without restarting the downstream services will cause every proxied request to be refused, because the downstream services compare the presented value against the one they hold. Both sides must be restarted together.');

    // ---------------------------------------------------------------- 6
    b.push(L.h1(d, 'Disaster Recovery Testing'));

    b.push(L.h2(d, 'Testing Schedule'));
    p('A recovery capability that is not exercised will not work when it is needed. The following schedule applies and each exercise produces a signed record.');
    const t61 = L.tableCaption(d, 'Recovery Exercise Schedule');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Exercise', 'Frequency', 'Scope', 'Success Criterion'],
      [
        ['Partial restore', 'Monthly', 'Restore one database to a scratch environment', 'Smoke tests pass against the restored database'],
        ['Full recovery drill', 'Quarterly', 'Execute Runbook D end to end on replacement infrastructure', 'Recovery time objective met and data verified'],
        ['Rollback drill', 'Quarterly', 'Execute Runbook B against a deliberately faulty deployment in staging', 'Previous version restored within five minutes'],
        ['Secret rotation drill', 'Twice yearly', 'Execute Runbook G for the internal gateway secret in staging', 'All services return to service after rotation'],
      ],
      [2000, 1600, 3200, 2800],
    ));

    b.push(L.h2(d, 'Exercise Record'));
    p('Each exercise is recorded using the format below. The record is retained for three years and is the evidence that the recovery capability is real.');
    const t62 = L.tableCaption(d, 'Recovery Exercise Record Template');
    b.push(t62.paragraph);
    b.push(L.plainTable(
      ['Field', 'Entry'],
      [
        ['Exercise type', ''],
        ['Date and start time', ''],
        ['Conducted by', ''],
        ['Backup used, date and identifier', ''],
        ['Recovery point achieved', ''],
        ['Recovery time achieved', ''],
        ['Objectives met', ''],
        ['Issues encountered', ''],
        ['Corrective actions raised', ''],
        ['Verified by', ''],
        ['Signature and date', ''],
      ],
      [3000, 6600],
    ));

    b.push(L.h2(d, 'Known Limitations'));
    p('The following limitations apply to the recovery capability as delivered. They are recorded so that Operations accepts them knowingly rather than discovering them during an incident.');
    bl('The database runs as a single instance with no replica, so recovery from host loss requires a restore rather than a failover');
    bl('The event backbone runs as a single broker with no replication, so events not yet consumed are lost if the broker is lost');
    bl('Backup and archiving are not automated by the delivered software and depend on the schedule being configured and monitored by the platform owner');
    bl('Automatic purging of expired data is not implemented, so retention periods are enforced by procedure');
    bl('A restore returns the whole database to a point in time and cannot selectively recover a single record without manual extraction from the backup');

    // ---------------------------------------------------------------- 7
    b.push(L.h1(d, 'Approval'));
    p('By signing below, the parties confirm that they have reviewed these procedures, that the recovery objectives in Section 1.3 are accepted, and that the limitations recorded in Section 6.3 are understood and accepted for the pilot period.');
    b.push(L.spacer());
    const t71 = L.tableCaption(d, 'Backup and Disaster Recovery Approval');
    b.push(t71.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Prepared by, Platform and Infrastructure Owner', '', '', ''],
        ['Reviewed by, Security and Compliance Owner', '', '', ''],
        ['Recovery objectives accepted by, E-Bus Xpress Operations Manager', '', '', ''],
        ['Approved by, KMC Director Product Development', '', '', ''],
      ],
      [3800, 2200, 2400, 1400],
    ));

    return b;
  },
};
