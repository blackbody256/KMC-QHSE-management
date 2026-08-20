module.exports = {
  slug: 'production-readiness',
  filename: 'Velo Production Readiness Report.docx',
  meta: {
    title: 'Production Readiness Report',
    reference: 'KMC.DPD.08/26-SP015',
    description: 'Assessment of the readiness of the Velo Electric Bus Fleet Operations Planning System for production release to E-Bus Xpress',
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
    p('This Production Readiness Report records the state of the Velo Electric Bus Fleet Operations Planning System at the point of review and states the conditions under which the system may be released into production service with E-Bus Xpress. It is prepared in response to the request from E-Bus Xpress dated 11 August 2026 and is intended to give operations management an evidence based basis for a release decision rather than a general status summary.');
    p('The report assesses what has been built and verified, what remains outstanding, and what compensating controls apply to each outstanding item. Every assessment statement in this report is traceable to the delivered software, its automated tests, or its configuration.');

    b.push(L.h2(d, 'Scope'));
    p('This report covers the Velo platform as delivered in the current release. That comprises the API gateway, the fleet service, the planning service and the audit service, together with the operator portal, the driver progressive web application, and the supporting infrastructure of PostgreSQL with PostGIS, Apache Kafka, Redis and the self hosted OSRM routing engine.');
    p('The energy service, the alert service and the notification service are present in the delivered system as deployable service shells with defined interfaces and no business logic. They are assessed in this report as not ready and are excluded from the recommended production scope.');

    b.push(L.h2(d, 'Intended Audience'));
    const t11 = L.tableCaption(d, 'Audience and Reading Guide');
    b.push(t11.paragraph);
    b.push(L.table(
      ['Audience', 'Purpose of Reading', 'Priority Sections'],
      [
        ['E-Bus Xpress Operations Management', 'Take the release decision', 'Sections 5 and 6'],
        ['KMC Product Development', 'Confirm the technical assessment', 'Sections 3 and 4'],
        ['Platform and Infrastructure Owner', 'Plan the remaining deployment work', 'Sections 4.5 and 5'],
        ['Security and Compliance Owner', 'Confirm the security position', 'Section 4.4'],
        ['Quality Assurance', 'Confirm verification coverage', 'Sections 3.2 and 4.1'],
      ],
      [2800, 4200, 2400],
    ));

    b.push(L.h2(d, 'References'));
    const t12 = L.tableCaption(d, 'Reference Documents');
    b.push(t12.paragraph);
    b.push(L.table(
      ['Document', 'Reference', 'Relevance'],
      [
        ['Velo System Requirements Specification', 'Version 002', 'Source of functional and non functional requirements'],
        ['Velo Software Architecture Document', 'KMC.DPD.06/26-SP014', 'Source of the target architecture'],
        ['Velo Information Security Review', 'KMC.DPD.08/26-SP016', 'Detailed security findings referenced in Section 4.4'],
        ['Velo Backup and Disaster Recovery Procedures', 'KMC.DPD.08/26-SP017', 'Recovery capability referenced in Section 4.6'],
        ['Velo Deployment, Support and Incident Management Procedures', 'KMC.DPD.08/26-SP019', 'Operating model referenced in Section 4.5'],
      ],
      [3600, 2400, 3400],
    ));

    b.push(L.h2(d, 'Definitions'));
    const t13 = L.tableCaption(d, 'Readiness Terminology');
    b.push(t13.paragraph);
    b.push(L.table(
      ['Term', 'Definition'],
      [
        ['Ready', 'The capability is implemented, verified by automated or documented manual test, and carries no open condition'],
        ['Ready with condition', 'The capability is implemented and verified but depends on a stated action being completed before or at go live'],
        ['Not ready', 'The capability is absent or unverified and must be excluded from the production scope'],
        ['Compensating control', 'An operational or configuration measure that reduces the risk of an outstanding item to an acceptable level'],
        ['Go live gate', 'A condition that must be satisfied before production traffic is admitted'],
      ],
      [2600, 7000],
    ));

    // ---------------------------------------------------------------- 2
    b.push(L.h1(d, 'System Overview'));

    b.push(L.h2(d, 'Delivered Architecture'));
    p('Velo is delivered as a set of independently deployable services. Each service owns its own database and its own database role within a single PostgreSQL instance, and no service reads or writes another service database directly. Cross domain references are held as unenforced identifier columns and resolved at the application layer. This boundary is the primary control that keeps the services independently deployable.');
    p('All external traffic enters through a single API gateway which authenticates the caller, enforces role based access control, forwards the request to the owning service and records an audit event. Downstream services accept requests only when they carry the shared internal secret issued by the gateway, so a caller cannot reach a service directly and bypass authorisation.');
    const f21 = L.figure(d, 'architecture', 'Velo Delivered Service Topology');
    b.push(...f21);
    b.push(L.richPara([
      'The topology in ',
      { ref: 'fig_2_1', cached: 'Figure 2.1' },
      ' shows the delivered position rather than the target architecture. The three service shells that carry no business logic are omitted, and the supporting systems reached only by the fleet service are drawn with a dashed border.',
    ]));

    b.push(L.h2(d, 'Service Inventory'));
    const t21 = L.tableCaption(d, 'Delivered Service Inventory and Readiness Position');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Service', 'Port', 'Responsibility', 'Position'],
      [
        ['gateway', '8000', 'Authentication, role enforcement, request routing, audit emission', 'Ready with condition'],
        ['fleet-service', '8001', 'Buses, models, depots, routes, stops, chargers, drivers, regions, grid nodes, readiness classification, Juza synchronisation, route geometry', 'Ready'],
        ['planning-service', '8003', 'Trip generation, bus duty assignment, charging reservations, driver roster, plan publication, schedule import', 'Ready'],
        ['audit-service', '8006', 'Append only audit trail consumer and query interface', 'Ready with condition'],
        ['energy-service', '8002', 'Route energy estimation', 'Not ready'],
        ['alert-service', '8004', 'Operational alert lifecycle', 'Not ready'],
        ['notification-service', '8005', 'Multi channel alert delivery', 'Not ready'],
        ['ops-portal', '5174', 'Operator administration and planning interface', 'Ready'],
        ['driver-pwa', '5173', 'Driver pre trip and post trip submission interface', 'Ready'],
      ],
      [2000, 800, 4600, 2200],
    ));

    b.push(L.h2(d, 'Supporting Infrastructure'));
    const t22 = L.tableCaption(d, 'Infrastructure Components');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Component', 'Role', 'Current Deployment'],
      [
        ['PostgreSQL with PostGIS', 'Primary data store, seven databases with one role each', 'Single instance, no replica'],
        ['Apache Kafka in KRaft mode', 'Event backbone for audit, readiness, alert and schedule events', 'Single broker, replication factor 1'],
        ['Redis', 'Rate limit counters and cache', 'Single instance'],
        ['OSRM', 'Road network geometry, distance and duration', 'Single instance, internal only'],
        ['Nginx', 'Static hosting of both front end applications and same origin API forwarding', 'One container per front end'],
      ],
      [2800, 4200, 2600],
    ));

    // ---------------------------------------------------------------- 3
    b.push(L.h1(d, 'Assessment Method'));

    b.push(L.h2(d, 'Assessment Domains'));
    p('Readiness has been assessed across six domains. A domain is judged ready only when the capability is present in the delivered software and its behaviour has been demonstrated by an automated test or a documented and repeatable manual verification. A capability that exists in code but has never been executed against a running system is not counted as ready.');

    b.push(L.h2(d, 'Evidence Base'));
    p('The evidence base for this assessment consists of the automated unit and integration test suites, the end to end smoke test scripts that exercise the running stack, and direct inspection of the delivered configuration and database schema.');
    const t31 = L.tableCaption(d, 'Verification Evidence Available at Review');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Evidence Type', 'Coverage', 'Command'],
      [
        ['Go unit and integration tests', '85 test functions across gateway, fleet, audit', 'make test'],
        ['Python planner tests', '10 test functions covering planner parity, schedule inputs, roster, reservations and failure explanations', 'make test'],
        ['Infrastructure smoke test', 'Container health, service availability, Kafka topic existence', 'make smoke'],
        ['Fleet flow smoke test', 'Driver submission to classification to readiness event', 'make smoke-fleet'],
        ['Gateway flow smoke test', 'Login, proxied call, audit trail, direct service access blocked', 'make smoke-gateway'],
        ['Administration smoke test', 'Depot, model, bus and route administration with linked driver user creation', 'make smoke-week4'],
        ['Planning smoke test', 'Plan trigger to completion with trips, assignments, charging, grid readable and guard responses verified', 'make smoke-planning'],
        ['Front end smoke test', 'Static container serving, application routes, API forwarding, upload size, client address forwarding', 'make smoke-frontends'],
      ],
      [2600, 5000, 2000],
    ));

    b.push(L.h2(d, 'Assessment Scale'));
    p('Each domain receives one of the three positions defined in Table 1.3. Where a domain is assessed as ready with condition, the condition is carried forward into the go live gates in Section 6 so that no condition is recorded without an owner and a required action.');

    // ---------------------------------------------------------------- 4
    b.push(L.h1(d, 'Assessment Results'));

    b.push(L.h2(d, 'Functional Readiness'));
    p('The core operational chain has been demonstrated end to end. A driver authenticates on the progressive web application, submits a pre trip check with state of charge, odometer and fault observations, the fleet service classifies the bus and publishes a readiness event, and an operator sees the result in the portal. An operator then triggers a plan run, and the planning service generates trips, assigns buses to duties with state of charge simulation, produces charging reservations that respect grid power limits, and produces a weekly and daily driver roster.');
    const t41 = L.tableCaption(d, 'Functional Domain Assessment');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Capability', 'Position', 'Basis'],
      [
        ['Driver pre trip and post trip submission', 'Ready', 'Verified end to end by the fleet smoke test'],
        ['Bus readiness classification and confidence scoring', 'Ready with condition', 'Rule engine implemented and unit tested. The delivered state set and staleness threshold differ from the specification and require operational confirmation'],
        ['Fleet and reference data administration', 'Ready', 'Verified by the administration smoke test'],
        ['Charger inventory and state synchronisation from Juza', 'Ready with condition', 'Implemented and unit tested. Requires the production Juza credential and confirmation of the agreed integration scope'],
        ['Trip generation and bus duty assignment', 'Ready', 'Verified by the planning smoke test'],
        ['Charging reservation planning within grid limits', 'Ready', 'Verified by the planning smoke test and the grid load profile output'],
        ['Driver roster generation', 'Ready', 'Verified by the planning smoke test and the roster unit tests'],
        ['Plan publication and driver schedule visibility', 'Ready', 'Verified by the planning smoke test'],
        ['Route energy estimation', 'Not ready', 'No estimation logic is implemented. Planning uses a configured consumption rate per bus model'],
        ['Operational alert lifecycle and escalation', 'Not ready', 'No lifecycle, deduplication or escalation logic is implemented'],
        ['Alert delivery by electronic mail and webhook', 'Not ready', 'No delivery adapter is implemented'],
      ],
      [3400, 2200, 4200],
    ));

    b.push(L.h2(d, 'Integration Readiness'));
    p('Velo depends on two external interfaces. The OSRM routing engine is self hosted inside the deployment and is reachable only by the fleet service, which removes it as an external availability risk. The Juza charger platform is a genuine external dependency and is currently disabled by configuration.');
    const t42 = L.tableCaption(d, 'External Interface Assessment');
    b.push(t42.paragraph);
    b.push(L.table(
      ['Interface', 'State at Review', 'Required Before Go Live'],
      [
        ['OSRM routing engine', 'Self hosted and operational. Road graph must be built once per environment', 'Confirm the graph is built and route geometry backfill has run'],
        ['Juza station inventory and state', 'Implemented, disabled by configuration', 'Production credential issued and the read scope confirmed in writing'],
        ['Juza reservation creation and cancellation', 'Implemented, disabled by configuration', 'Written confirmation from the Juza owner that write operations are authorised, or the capability remains disabled'],
        ['Electronic mail delivery', 'Not implemented', 'Excluded from scope. Operators rely on in portal alerts'],
      ],
      [2600, 3400, 3800],
    ));
    b.push(L.richPara([
      'The reservation capability recorded in ',
      { ref: t42.ref, cached: 'Table 4.2' },
      ' is the single most significant deviation from the approved architecture, which specifies a read only relationship with Juza for the initial release. The capability is present in the delivered software but is disabled by the configuration flag that controls it, so the deployed default position complies with the approved architecture. It must not be enabled until the written authorisation recorded in Section 6 is held.',
    ]));

    b.push(L.h2(d, 'Data Readiness'));
    p('Each service owns its schema and connects with a dedicated least privilege role. Schema changes are applied through versioned migrations that are held in the source repository and applied by an explicit command, so no schema change occurs implicitly at service start.');
    const t43 = L.tableCaption(d, 'Data Integrity Assessment');
    b.push(t43.paragraph);
    b.push(L.table(
      ['Control', 'Position', 'Basis'],
      [
        ['Database per service with a dedicated role', 'Ready', 'Seven databases with seven roles, verified by inspection of the initialisation script and service configuration'],
        ['Versioned forward and reverse migrations', 'Ready', 'Every service carries paired up and down migrations'],
        ['Idempotent seed data', 'Ready', 'Seeds are safe to re run and are used by the smoke tests'],
        ['Charger reservation overlap prevention at the database layer', 'Not ready', 'An exclusion constraint exists on an earlier schema table that the planner does not write to. The table the planner writes carries a uniqueness constraint only'],
        ['Driver duty overlap prevention at the database layer', 'Not ready', 'No exclusion constraint is present. Overlap is prevented by planner logic only'],
        ['Audit record immutability', 'Ready with condition', 'Update, delete and truncate are revoked from the application role. No hash chain or signed digest is present'],
      ],
      [3400, 2000, 4400],
    ));
    p('The two overlap controls assessed as not ready are important to understand precisely. The planning engine does prevent overlapping charger bay allocations and overlapping driver duties as part of its constraint logic, and the planning smoke test demonstrates this. What is absent is the independent database level guarantee that would also reject an overlap introduced by a direct database write or by a future defect in the planner. The operational risk in the current single writer deployment is low, because the planner is the only writer to these tables and it runs one plan at a time under an active run lock. The risk rises materially if a second writer is ever introduced.');

    b.push(L.h2(d, 'Security Readiness'));
    p('A separate Information Security Review has been prepared and carries the detailed findings and the remediation plan. The summary position for release purposes is recorded below.');
    const t44 = L.tableCaption(d, 'Security Position Summary');
    b.push(t44.paragraph);
    b.push(L.table(
      ['Control', 'Position', 'Effect on Release'],
      [
        ['Authentication with signed access tokens', 'Ready', 'No effect'],
        ['Role based access control on every routed path', 'Ready', 'No effect'],
        ['Identity header stripping and internal secret enforcement', 'Ready', 'No effect'],
        ['Password storage using an adaptive hash', 'Ready', 'No effect'],
        ['Audit trail of every routed request', 'Ready', 'No effect'],
        ['Multi factor authentication for privileged actions', 'Not ready', 'Go live gate. Requires a compensating control'],
        ['Access token lifetime aligned to policy', 'Ready with condition', 'Configuration change required before go live'],
        ['Refresh token rotation on use', 'Not ready', 'Requires a compensating control'],
        ['Brute force protection on authentication', 'Ready with condition', 'Disabled by default. Must be enabled before go live'],
        ['Transport encryption at the perimeter', 'Not ready', 'Go live gate. Must be terminated at the ingress'],
        ['Secret management outside source control', 'Ready with condition', 'Secrets are supplied by environment file. A managed secret store is not deployed'],
      ],
      [3400, 2200, 4000],
    ));

    b.push(L.h2(d, 'Operational Readiness'));
    p('The delivered system runs as a set of containers orchestrated by Docker Compose. The approved architecture specifies an on premise Kubernetes deployment with a service mesh, a managed secret store and a full observability stack. That target platform is not yet built, and the gap between the delivered platform and the target platform is the largest single body of remaining work.');
    const t45 = L.tableCaption(d, 'Operational Capability Assessment');
    b.push(t45.paragraph);
    b.push(L.table(
      ['Capability', 'Position', 'Note'],
      [
        ['Reproducible build from source', 'Ready', 'Multi stage container builds producing minimal non root images'],
        ['Version identification of a running service', 'Ready', 'Each service reports its build commit on a version endpoint'],
        ['Health and readiness probes', 'Ready', 'Every service exposes health and readiness endpoints used for start ordering'],
        ['Structured logging with correlation identifiers', 'Ready', 'A correlation identifier is issued at the gateway and propagated downstream'],
        ['Metrics endpoint per service', 'Ready with condition', 'Endpoints exist. No collection or dashboard system is deployed'],
        ['Distributed tracing', 'Not ready', 'No tracing backend is deployed'],
        ['Automated deployment pipeline', 'Not ready', 'No continuous integration or delivery pipeline is configured'],
        ['Horizontal scaling of stateless services', 'Not ready', 'Single instance per service. Services are stateless and can scale once an orchestrator is in place'],
        ['High availability of data stores', 'Not ready', 'Single instance PostgreSQL, single broker Kafka, single instance Redis'],
      ],
      [3200, 2200, 4200],
    ));

    b.push(L.h2(d, 'Recovery Readiness'));
    p('Backup and recovery procedures are defined in the companion document and are executable against the delivered system. The procedures rely on scheduled logical dumps and on continuous write ahead log archiving. Neither is automated by the delivered software, so both depend on the operating procedures being put in place by the platform owner before go live.');

    // ---------------------------------------------------------------- 5
    b.push(L.h1(d, 'Open Items and Risk Register'));
    p('The following register records every item that is not fully ready, its risk to production operation, and the control that reduces that risk. Risk is expressed as the product of likelihood and operational impact on the fleet service being planned.');
    const t51 = L.tableCaption(d, 'Open Item and Risk Register');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Open Item', 'Risk', 'Compensating Control', 'Owner'],
      [
        ['Transport encryption is not terminated in front of the platform', 'High. Credentials and operational data would traverse the network unprotected', 'Terminate transport encryption at the ingress before any traffic is admitted. This is a go live gate', 'Platform and Infrastructure'],
        ['Multi factor authentication is absent for privileged actions', 'High. A compromised operator password grants full planning and administration rights', 'Restrict administrative accounts to a named minimum set, enforce a strong password standard, and review the audit trail of privileged actions weekly', 'Security and Compliance'],
        ['Brute force protection is disabled by default', 'Medium. Password guessing against the login endpoint is unthrottled', 'Enable the protection flag before go live and confirm by test. This is a go live gate', 'Platform and Infrastructure'],
        ['Refresh tokens are not rotated on use', 'Medium. A stolen refresh token remains usable until expiry', 'Shorten the refresh token lifetime and confirm that password change and account disablement revoke existing tokens', 'Security and Compliance'],
        ['Database level overlap constraints are absent on the live planning tables', 'Medium. A direct database write or a future planner defect could create an overlapping allocation', 'Restrict direct database access to the platform owner, keep the single active plan run lock in force, and add the constraints in the next release', 'Product Development'],
        ['Audit records carry no tamper evidence', 'Medium. Deletion by a privileged database account would not be detectable', 'Export the audit trail daily to storage the application account cannot modify, and restrict the administrative database account', 'Security and Compliance'],
        ['Single instance data stores', 'Medium. Loss of the database host interrupts service until restore completes', 'Operate the documented backup procedure and accept the stated recovery objectives until high availability is built', 'Platform and Infrastructure'],
        ['No automated deployment pipeline', 'Medium. Manual deployment is repeatable but error prone and unlogged', 'Follow the documented deployment procedure with two person verification and record every production change', 'Platform and Infrastructure'],
        ['No metric collection, dashboard or tracing', 'Medium. Degradation is detected by user report rather than by monitoring', 'Operate the documented daily health check and monitor container state and service logs', 'Platform and Infrastructure'],
        ['Route energy estimation is not implemented', 'Low for the initial pilot. Planning uses a configured consumption rate per bus model', 'Set the configured rate from observed operational data and review it monthly against actual consumption', 'Product Development'],
        ['Alerting and notification are not implemented', 'Low for the initial pilot. Planning alerts are visible in the portal', 'Operators review the portal alert view at defined points in the shift as set out in the training document', 'Operations'],
        ['Readiness state set differs from the specification', 'Low. The delivered states are operationally meaningful but do not match the specified set', 'Train operators on the delivered states and align the specification in the next revision', 'Product Development'],
      ],
      [3000, 2600, 3400, 1800],
    ));

    // ---------------------------------------------------------------- 6
    b.push(L.h1(d, 'Recommendation'));

    b.push(L.h2(d, 'Overall Position'));
    p('Velo is assessed as ready for a controlled production pilot with E-Bus Xpress, subject to the go live gates in Section 6.2 being satisfied and the reduced scope in Section 6.3 being accepted. It is not assessed as ready for unrestricted production operation across the full fleet.');
    p('The reasoning is that the operational chain the pilot depends on, which runs from driver submission through readiness classification to a published plan with charging reservations and a driver roster, is implemented and demonstrated end to end. The items that are not ready fall into two groups. The first group is platform maturity, which is a matter of infrastructure work rather than application defect and which can be operated around with documented manual procedures at pilot scale. The second group is functionality that the pilot does not depend on, principally automated energy estimation and automated alert delivery, for which manual operational practices are defined in the training document.');

    b.push(L.h2(d, 'Go Live Gates'));
    p('The following conditions must be satisfied and evidenced before production traffic is admitted. Each gate has a named owner and a verification method.');
    const t61 = L.tableCaption(d, 'Go Live Gates');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Gate', 'Owner', 'Verification'],
      [
        ['Transport encryption terminated at the ingress with a valid certificate and expiry monitoring in place', 'Platform and Infrastructure', 'Connection test against the production hostname and a recorded certificate expiry date'],
        ['All default and development credentials replaced with generated production values', 'Platform and Infrastructure', 'Inspection of the production environment file against the checklist in the security review'],
        ['Brute force protection enabled on the authentication endpoint', 'Platform and Infrastructure', 'Repeated failed login test returning the throttled response'],
        ['Access token lifetime set to the agreed production value', 'Platform and Infrastructure', 'Inspection of the running configuration and a token expiry test'],
        ['Juza integration scope confirmed in writing, and reservation writes disabled unless explicitly authorised', 'Integration Owner', 'Written confirmation held on file and inspection of the two Juza configuration flags'],
        ['Backup procedure executed once and a restore verified into a scratch environment', 'Platform and Infrastructure', 'Signed restore test record as set out in the backup and recovery document'],
        ['Administrative account list agreed and reduced to the named minimum', 'Operations and Security', 'Signed account register'],
        ['User acceptance testing signed off by Operations', 'Operations', 'Signed acceptance record'],
        ['Operator and driver training delivered and acknowledgements collected', 'Operations', 'Signed acknowledgement forms'],
        ['Deployment, support and incident procedures issued and the on call rota populated', 'Platform and Infrastructure', 'Issued procedure and a populated rota for the pilot period'],
      ],
      [4400, 2200, 3400],
    ));

    b.push(L.h2(d, 'Recommended Initial Scope'));
    p('The recommended production scope for the pilot is deliberately narrower than the delivered capability, so that operations gain confidence on a limited surface before the platform work completes.');
    const t62 = L.tableCaption(d, 'Recommended Pilot Scope');
    b.push(t62.paragraph);
    b.push(L.table(
      ['Dimension', 'Recommended Pilot Setting', 'Reason'],
      [
        ['Depots', 'One depot', 'Limits the operational blast radius of a defect and keeps manual recovery tractable'],
        ['Buses', 'Up to twenty five', 'Well within demonstrated planning performance and manageable by manual monitoring'],
        ['Drivers', 'Up to forty', 'Consistent with the single depot scope'],
        ['Planning horizon', 'Daily plan with a weekly roster', 'Matches the demonstrated planning flow'],
        ['Juza integration', 'Station inventory and state reads only', 'Keeps the deployed position aligned with the approved architecture'],
        ['Alerting', 'In portal review only', 'Automated delivery is not implemented'],
        ['Parallel running', 'Existing manual process retained for the first four weeks', 'Provides a fallback while confidence is established'],
      ],
      [2400, 3600, 4000],
    ));

    b.push(L.h2(d, 'Conditions for Scope Extension'));
    p('Extension beyond the pilot scope should follow completion of the platform work rather than a fixed date. The following conditions are recommended as the trigger for a full production release review.');
    bl('Multi factor authentication is implemented for privileged actions and verified');
    bl('Database level overlap constraints are present on the tables the planner writes');
    bl('Automated deployment with rollback is operating and manual production deployment is withdrawn');
    bl('Metric collection and alerting on service health are operating');
    bl('The database has a replica and a tested failover procedure');
    bl('A restore test has been completed successfully on two consecutive occasions');
    bl('The pilot has run for at least four weeks without a severity one incident');

    // ---------------------------------------------------------------- 7
    b.push(L.h1(d, 'Approval'));
    p('By signing below, the parties confirm that they have reviewed this Production Readiness Report, that they accept the assessment recorded in Section 4, that they accept the residual risks recorded in Section 5 together with their compensating controls, and that they agree the recommendation and the go live gates recorded in Section 6.');
    b.push(L.spacer());
    const t71 = L.tableCaption(d, 'Production Readiness Approval');
    b.push(t71.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Prepared by, KMC Product Development', '', '', ''],
        ['Reviewed by, Platform and Infrastructure Owner', '', '', ''],
        ['Reviewed by, Security and Compliance Owner', '', '', ''],
        ['Accepted by, E-Bus Xpress Operations Manager', '', '', ''],
        ['Approved by, KMC Director Product Development', '', '', ''],
      ],
      [3600, 2200, 2400, 1400],
    ));

    return b;
  },
};
