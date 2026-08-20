module.exports = {
  slug: 'deployment-support',
  filename: 'Velo Deployment Support and Incident Management Procedures.docx',
  meta: {
    title: 'Deployment, Support and Incident Management Procedures',
    reference: 'KMC.DPD.08/26-SP019',
    description: 'Environment model, deployment runbook, support model and incident management procedures for the Velo Electric Bus Fleet Operations Planning System',
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
    p('This document defines how the Velo platform is deployed, how it is supported in daily operation, and how incidents are classified, escalated and resolved. It is an operating procedure intended for direct use by the platform owner and the support team.');

    b.push(L.h2(d, 'Scope'));
    p('The procedures apply to the delivered Velo platform running as a set of containers under a container orchestrator. They cover deployment of application services, database schema changes, configuration changes, routine operational checks, support handling and incident management. They do not cover the underlying host operating system or the network into which the platform is deployed.');

    b.push(L.h2(d, 'Governing Principles'));
    bl('No change reaches production without first being applied and verified in staging');
    bl('Every production change is recorded before it is made, not after');
    bl('Every deployment is reversible, and the reverse path is confirmed before the change is applied');
    bl('Database schema changes are backward compatible with the previously running version');
    bl('Two people are involved in every production change, one performing and one verifying');
    bl('Where a change cannot be verified, it is not made');

    // ---------------------------------------------------------------- 2
    b.push(L.h1(d, 'Environment Model'));

    b.push(L.h2(d, 'Environments'));
    const t21 = L.tableCaption(d, 'Environment Definitions');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Environment', 'Purpose', 'Data', 'Change Control'],
      [
        ['Development', 'Feature work and unit testing on the engineer own machine', 'Seed data only', 'None'],
        ['Staging', 'Integration verification, acceptance testing, rehearsal of production changes', 'Representative data, no live personal data', 'Change recorded, no approval required'],
        ['Production', 'Live fleet operation', 'Live operational and personal data', 'Recorded, approved and scheduled'],
      ],
      [1800, 3600, 2400, 2000],
    ));

    b.push(L.h2(d, 'Promotion Path'));
    p('A change moves from development to staging to production in that order. The container image built for staging is the image promoted to production. An image is never rebuilt for production, because a rebuild produces a different artefact from the one that was verified.');
    p('Each image is tagged with the source commit identifier from which it was built, and each running service reports that identifier on its version endpoint. This is what allows the support team to establish exactly which code is running during an incident without consulting anyone.');
    b.push(...L.figure(d, 'promotion-path', 'Environment Promotion and Rollback Path'));
    b.push(L.richPara([
      'The path in ',
      { ref: 'fig_2_1', cached: 'Figure 2.1' },
      ' has one rule that must not be relaxed. The artefact verified in staging is the artefact deployed to production, and rollback returns to the artefact that was running immediately before.',
    ]));

    b.push(L.h2(d, 'Configuration Management'));
    p('Configuration is supplied to services through environment variables. Each environment holds its own configuration file and the files are not shared between environments. Production configuration is held in the secure configuration store, is encrypted, and is backed up on every change as set out in the backup procedures.');
    const t22 = L.tableCaption(d, 'Configuration Items Requiring Deliberate Setting in Production');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Item', 'Production Requirement', 'Consequence If Left at Default'],
      [
        ['Token signing secret', 'Generated value of at least thirty two bytes, unique to production', 'Tokens could be forged using a known development value'],
        ['Internal gateway secret', 'Generated value of at least thirty two bytes, unique to production', 'A caller could bypass the gateway and reach services directly'],
        ['Database passwords', 'Generated value per service role', 'Known credentials grant direct database access'],
        ['Access token lifetime', 'Set to the agreed policy value', 'Captured tokens remain usable longer than intended'],
        ['Brute force protection', 'Enabled', 'Password guessing against the sign in endpoint is unthrottled'],
        ['Environment name', 'Set to production', 'Diagnostic behaviour intended for development may remain active'],
        ['Log level', 'Set to information', 'Excessive logging obscures real events and may record sensitive detail'],
        ['Juza integration flags', 'Set according to the written authorisation held', 'The platform may contact the charger platform outside the agreed scope'],
      ],
      [2200, 3400, 4000],
    ));

    // ---------------------------------------------------------------- 3
    b.push(L.h1(d, 'Deployment Procedure'));

    b.push(L.h2(d, 'Pre Deployment Checklist'));
    p('The following are confirmed before any production deployment begins. If any item cannot be confirmed, the deployment does not proceed.');
    const t31 = L.tableCaption(d, 'Pre Deployment Checklist');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Check', 'Confirmed By'],
      [
        ['The change has been applied and verified in staging', 'Deploying engineer'],
        ['The change record has been raised and approved', 'Platform owner'],
        ['The currently running image commit identifier has been recorded for rollback', 'Deploying engineer'],
        ['A pre change database backup has been taken and verified', 'Deploying engineer'],
        ['Any database migration included has been confirmed backward compatible', 'Product development'],
        ['The deployment window has been agreed with Operations', 'Operations Manager'],
        ['A second person is available to verify', 'Platform owner'],
      ],
      [6600, 3000],
    ));

    b.push(L.h2(d, 'Standard Deployment Sequence'));
    p('The sequence below applies to a routine release. Order matters. Schema changes precede application changes because a backward compatible migration is safe for the currently running version, whereas a new application version may require the new schema.');
    const t32 = L.tableCaption(d, 'Standard Deployment Sequence');
    b.push(t32.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Verification'],
      [
        ['Notify', 'Inform Operations that the deployment is starting', 'Acknowledgement received'],
        ['Back up', 'Take a full pre change database backup', 'Backup file present and of a plausible size'],
        ['Apply migrations', 'Apply any pending migrations for the affected services', 'Migration status reports the expected version'],
        ['Deploy services', 'Deploy the new images for the affected services', 'Each affected service reaches its readiness check'],
        ['Verify version', 'Confirm each deployed service reports the expected commit identifier', 'Version matches the intended release'],
        ['Smoke test', 'Run the smoke test suite covering the affected areas', 'All checks pass'],
        ['Functional confirmation', 'Confirm a driver submission is accepted and a plan run completes', 'Both succeed'],
        ['Notify completion', 'Inform Operations that the deployment is complete', 'Acknowledgement received'],
        ['Close the record', 'Record the outcome, the commit identifiers and the verification results', 'Change record closed'],
      ],
      [1600, 4400, 3600],
    ));

    b.push(L.h2(d, 'First Deployment of an Environment'));
    p('A new environment requires additional steps that a routine release does not, because the event topics, the schema and the routing graph do not yet exist. Automatic topic creation is disabled deliberately, so topics must be created explicitly.');
    const t33 = L.tableCaption(d, 'First Deployment Sequence');
    b.push(t33.paragraph);
    b.push(L.table(
      ['Step', 'Action', 'Verification'],
      [
        ['Prepare configuration', 'Create the environment configuration with generated production secrets', 'No default or placeholder value remains'],
        ['Start infrastructure and services', 'Start the full stack', 'All containers report healthy'],
        ['Create event topics', 'Create the event topics explicitly', 'All expected topics listed'],
        ['Apply migrations', 'Apply migrations for every service in dependency order', 'Every service reports its expected version'],
        ['Load reference data', 'Load the agreed reference data', 'Data visible in the operator portal'],
        ['Build the routing graph', 'Build the road network graph for the operating geography', 'Build completes and the routing engine is healthy'],
        ['Backfill geometry', 'Compute and store geometry for the loaded routes', 'Routes display their geometry'],
        ['Full verification', 'Run the complete smoke test suite', 'All checks pass'],
      ],
      [1600, 4400, 3600],
    ));

    b.push(L.h2(d, 'Rollback'));
    p('Rollback is the first response to a failed deployment, not the last. The previously running image is known good and diagnosis can continue after service is restored. The detailed steps are held in the backup and recovery procedures as Runbook B and are not repeated here.');
    p('The one judgement required during rollback concerns the database. Where the deployment applied a backward compatible migration, the correct action is to roll back the image only and leave the schema in place, because the previous version operates correctly against the newer schema. Reversing a migration that has already accepted writes will discard those writes.');

    // ---------------------------------------------------------------- 4
    b.push(L.h1(d, 'Routine Operations'));

    b.push(L.h2(d, 'Daily Checks'));
    p('The following checks are performed each working morning before the operational peak and the result recorded in the operations log. In the absence of an automated monitoring system these checks are the primary means of detecting degradation.');
    const t41 = L.tableCaption(d, 'Daily Operational Checks');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Check', 'Method', 'Escalate If'],
      [
        ['All services running', 'Review container status', 'Any service is not running or is restarting repeatedly'],
        ['Service health', 'Query the health endpoint of each service', 'Any service fails its health check'],
        ['Database reachable', 'Confirm each service reports ready, which requires a database connection', 'Any service is not ready'],
        ['Overnight backup completed', 'Confirm the expected backup file exists with a current timestamp', 'The backup is missing or materially smaller than the previous day'],
        ['Event topics present', 'List the event topics', 'Any expected topic is absent'],
        ['Audit trail advancing', 'Confirm recent audit records exist', 'No audit record has been written in the last hour during working hours'],
        ['Disk capacity', 'Review free space on the data volume', 'Free space is below twenty percent'],
        ['Error volume', 'Review service logs for repeated errors since the previous check', 'A repeated error appears more than ten times'],
      ],
      [2200, 3600, 3800],
    ));

    b.push(L.h2(d, 'Weekly Activities'));
    bl('Review the audit trail of privileged actions with the Security and Compliance owner');
    bl('Review the account register and disable accounts for anyone who has changed role or left');
    bl('Review open incidents and confirm each has an owner and a next action');
    bl('Confirm the backup verification for the week has been completed and recorded');
    bl('Review the configured energy consumption rates against observed consumption');

    b.push(L.h2(d, 'Monthly Activities'));
    bl('Perform the partial restore test defined in the backup procedures');
    bl('Review capacity, covering database size, disk growth and plan run duration');
    bl('Review the defect and change record for recurring themes');
    bl('Confirm certificate expiry dates remain outside the renewal window');

    // ---------------------------------------------------------------- 5
    b.push(L.h1(d, 'Support Model'));

    b.push(L.h2(d, 'Support Levels'));
    const t51 = L.tableCaption(d, 'Support Levels and Responsibilities');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Level', 'Provided By', 'Handles', 'Escalates When'],
      [
        ['Level one', 'E-Bus Xpress operations supervisor', 'Sign in problems, navigation questions, data entry questions, driver application questions, initial triage and logging', 'The issue is not resolved within thirty minutes or affects more than one user'],
        ['Level two', 'E-Bus Xpress operations lead with KMC support', 'Planning results that appear wrong, roster and charging queries, reference data corrections, readiness questions', 'The issue appears to be a system defect rather than a data or usage issue'],
        ['Level three', 'KMC platform and infrastructure', 'Service failures, database issues, deployment problems, performance degradation, backup and restore', 'The issue requires a code change'],
        ['Level four', 'KMC product development', 'Defects in planning logic, classification rules, schema changes, integration contract changes', 'Not applicable, this is the final level'],
      ],
      [1400, 2200, 3600, 2400],
    ));

    b.push(L.h2(d, 'Support Hours'));
    const t52 = L.tableCaption(d, 'Support Hours and Response Targets');
    b.push(t52.paragraph);
    b.push(L.table(
      ['Period', 'Coverage', 'Response Target'],
      [
        ['Monday to Saturday, 05:00 to 20:00 East Africa Time', 'Full support at all levels', 'As defined by incident severity in Section 6.2'],
        ['Outside those hours', 'On call for severity one and severity two only', 'Severity one within thirty minutes, severity two within two hours'],
        ['Sunday and public holidays', 'On call for severity one only', 'Within thirty minutes'],
      ],
      [3600, 3000, 3000],
    ));
    p('The support window opens at 05:00 because driver pre trip submissions begin before the first departure, and a sign in failure at that hour prevents the fleet from operating. This is the single most time critical period of the operating day.');

    b.push(L.h2(d, 'Logging a Support Request'));
    p('Every request is logged, including those resolved immediately, because the pattern of requests is the main evidence available for improving the system in the absence of automated monitoring.');
    const t53 = L.tableCaption(d, 'Support Request Record');
    b.push(t53.paragraph);
    b.push(L.table(
      ['Field', 'Requirement'],
      [
        ['Reference', 'Sequential identifier issued on logging'],
        ['Reported by and role', 'Named individual, not a team'],
        ['Time reported', 'Recorded to the minute'],
        ['Affected function', 'The operational activity that cannot be performed'],
        ['Affected users', 'One user, several users or all users'],
        ['Steps to reproduce', 'What was done immediately before the problem appeared'],
        ['Correlation identifier', 'Taken from the error message shown to the user where one is displayed'],
        ['Severity', 'Assigned using Section 6.1'],
        ['Resolution and time closed', 'What was done and when'],
      ],
      [2600, 7000],
    ));

    // ---------------------------------------------------------------- 6
    b.push(L.h1(d, 'Incident Management'));

    b.push(L.h2(d, 'Severity Classification'));
    p('Severity is assigned by operational impact on the fleet, not by technical cause. A defect that prevents drivers from submitting pre trip checks before the morning departure is severity one regardless of how small the underlying fault is.');
    const t61 = L.tableCaption(d, 'Incident Severity Definitions');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Severity', 'Definition', 'Examples'],
      [
        ['Severity one', 'Fleet operation is prevented or fleet visibility is entirely lost', 'No user can sign in. The platform is unreachable. Drivers cannot submit before the first departure. Published plans are not visible to drivers'],
        ['Severity two', 'A major function is unavailable but operation can continue with a workaround', 'Plan generation fails. The roster cannot be produced. Charger state is not updating. One depot cannot be planned'],
        ['Severity three', 'Degraded performance or a non critical function is failing', 'The portal is slow. Route geometry fails to compute. Planning alerts are not displayed. Audit queries fail'],
        ['Severity four', 'Minor or presentation issue with no operational effect', 'A label is incorrect. A column sorts unexpectedly. A message is unclear'],
      ],
      [1600, 3400, 4600],
    ));

    b.push(L.h2(d, 'Response and Resolution Targets'));
    const t62 = L.tableCaption(d, 'Incident Response Targets');
    b.push(t62.paragraph);
    b.push(L.table(
      ['Severity', 'Initial Response', 'Update Frequency', 'Resolution Target', 'Escalation'],
      [
        ['Severity one', 'Thirty minutes', 'Every thirty minutes', 'Four hours', 'Platform owner immediately, Operations Manager and Director within one hour'],
        ['Severity two', 'Two hours', 'Every two hours', 'One working day', 'Platform owner within two hours, Operations Manager if unresolved after one day'],
        ['Severity three', 'Next working day', 'Daily', 'Five working days', 'Operations Manager if unresolved after five days'],
        ['Severity four', 'Five working days', 'On change', 'Next release', 'None'],
      ],
      [1400, 1800, 1800, 1800, 2800],
    ));

    b.push(...L.figure(d, 'escalation', 'Incident Severity and Escalation Path'));
    b.push(L.richPara([
      'The escalation path in ',
      { ref: 'fig_6_1', cached: 'Figure 6.1' },
      ' is triggered by the severity assigned at logging. Where there is doubt between two severities, the higher is assigned and lowered later if the impact proves smaller, because an incident under escalated at the start is rarely re examined.',
    ]));

    b.push(L.h2(d, 'Incident Handling Sequence'));
    const t63 = L.tableCaption(d, 'Incident Handling Sequence');
    b.push(t63.paragraph);
    b.push(L.table(
      ['Stage', 'Action', 'Owner'],
      [
        ['Detect and log', 'Log the incident with the fields in Table 5.3 and assign a provisional severity', 'Whoever receives it'],
        ['Acknowledge', 'Confirm receipt to the reporter and confirm the severity', 'Support level one'],
        ['Contain', 'Take action to limit operational impact, including rolling back a recent deployment where one preceded the incident', 'Platform owner'],
        ['Preserve evidence', 'Capture service logs before restarting anything, since a restart discards the state that explains the failure', 'Platform owner'],
        ['Diagnose', 'Establish the cause using the logs, the correlation identifier and the version endpoints', 'Appropriate support level'],
        ['Resolve', 'Apply the fix, following the deployment procedure if a change is required', 'Appropriate support level'],
        ['Verify', 'Confirm with the original reporter that the operational activity now works', 'Support level one'],
        ['Close and review', 'Close the record. Hold a review within five working days for every severity one', 'Platform owner'],
      ],
      [1800, 5000, 2800],
    ));
    p('Attention is drawn to the evidence preservation stage. Restarting a service resolves many symptoms and destroys the information needed to prevent recurrence. Logs must be captured first, even under time pressure, because the same incident will otherwise repeat.');

    b.push(L.h2(d, 'Common Incidents and First Actions'));
    p('The following table gives the first action for the incidents most likely to occur in the delivered configuration. It is intended for the person on duty at the time.');
    const t64 = L.tableCaption(d, 'Common Incidents and First Actions');
    b.push(t64.paragraph);
    b.push(L.table(
      ['Symptom', 'Likely Cause', 'First Action'],
      [
        ['No user can sign in and services report healthy', 'The token signing secret has changed, or the gateway database is unreachable', 'Confirm the gateway readiness check and confirm the signing secret matches the value in force'],
        ['All proxied requests are refused although sign in succeeds', 'The internal gateway secret does not match between the gateway and the services', 'Confirm the internal secret is identical across all services and restart them together'],
        ['A plan run will not start and returns a conflict', 'A previous run is still recorded as active', 'Confirm whether the earlier run is genuinely running, and clear the active run only after confirming it has stopped'],
        ['Plan generation fails immediately', 'No route qualifies for planning, or reference data is incomplete', 'Confirm at least one route has a service window, a headway, a destination and two located stops'],
        ['Route geometry cannot be computed', 'The routing graph is missing or the routing engine is not running', 'Follow the routing graph rebuild runbook in the backup procedures'],
        ['Charger state is not updating', 'The charger integration is disabled or the interface key is rejected', 'Confirm the integration flag and confirm the key with the integration owner'],
        ['Audit records stop appearing', 'The event backbone is unavailable', 'Follow the event backbone runbook in the backup procedures and record the audit gap'],
        ['Drivers cannot see a published schedule', 'The plan was generated but not published', 'Confirm the plan publication state in the operator portal'],
        ['The portal is slow during the morning peak', 'Contention on the single database instance', 'Confirm disk capacity and connection counts, and defer non urgent plan runs until after the peak'],
      ],
      [2600, 3000, 4000],
    ));

    b.push(L.h2(d, 'Post Incident Review'));
    p('Every severity one incident and every repeated severity two incident requires a review within five working days. The review is conducted without attributing individual blame, on the basis that a procedure which depends on a person not making a mistake is a procedure that will fail.');
    const t65 = L.tableCaption(d, 'Post Incident Review Record');
    b.push(t65.paragraph);
    b.push(L.plainTable(
      ['Field', 'Entry'],
      [
        ['Incident reference and severity', ''],
        ['Duration of operational impact', ''],
        ['What happened', ''],
        ['Why it happened', ''],
        ['How it was detected', ''],
        ['Why it was not detected earlier', ''],
        ['What limited the impact', ''],
        ['Corrective actions with owners and dates', ''],
        ['Reviewed by and date', ''],
      ],
      [3400, 6200],
    ));

    // ---------------------------------------------------------------- 7
    b.push(L.h1(d, 'Change Management'));

    b.push(L.h2(d, 'Change Categories'));
    const t71 = L.tableCaption(d, 'Change Categories and Approval');
    b.push(t71.paragraph);
    b.push(L.table(
      ['Category', 'Definition', 'Approval', 'Window'],
      [
        ['Standard', 'Pre agreed low risk change with a known procedure, such as adding a bus or a route', 'Operations lead', 'Any time'],
        ['Normal', 'Application release, configuration change or schema migration', 'Platform owner and Operations Manager', 'Agreed window outside operational peak'],
        ['Emergency', 'Change required to resolve a severity one or severity two incident', 'Platform owner, recorded within one working day', 'Immediate'],
      ],
      [1600, 4000, 2400, 1600],
    ));

    b.push(L.h2(d, 'Deployment Windows'));
    p('Normal changes are applied outside the operational peak. The peak runs from 05:00 to 09:00 and from 16:00 to 20:00 East Africa Time, covering driver submissions and the departure windows at each end of the operating day. The preferred window is Tuesday to Thursday between 10:00 and 15:00, which leaves working hours available for support if a change behaves unexpectedly.');
    p('Changes are not applied on a Friday afternoon or immediately before a public holiday, because a fault introduced then is discovered when the least support is available.');

    // ---------------------------------------------------------------- 8
    b.push(L.h1(d, 'Approval'));
    p('By signing below, the parties confirm that these procedures are adopted, that the support levels and response targets in Sections 5 and 6 are agreed, and that the named roles accept the responsibilities assigned to them.');
    b.push(L.spacer());
    const t81 = L.tableCaption(d, 'Procedure Approval');
    b.push(t81.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Prepared by, Platform and Infrastructure Owner', '', '', ''],
        ['Reviewed by, KMC Product Development', '', '', ''],
        ['Support model accepted by, E-Bus Xpress Operations Manager', '', '', ''],
        ['Approved by, KMC Director Product Development', '', '', ''],
      ],
      [3800, 2200, 2400, 1400],
    ));

    return b;
  },
};
