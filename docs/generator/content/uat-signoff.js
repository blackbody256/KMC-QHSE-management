module.exports = {
  slug: 'uat-signoff',
  filename: 'Velo User Acceptance Testing Sign-Off.docx',
  meta: {
    title: 'User Acceptance Testing and Operations Sign-Off',
    reference: 'KMC.DPD.08/26-SP018',
    description: 'Formal user acceptance test plan, execution record and Operations acceptance for the Velo Electric Bus Fleet Operations Planning System',
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
    p('This document is the formal user acceptance testing instrument for the Velo Electric Bus Fleet Operations Planning System. It defines what Operations will test, how each test is judged to have passed or failed, how defects found during testing are classified, and the conditions under which Operations signs acceptance.');
    p('It is designed to be used as the working record. Test cases are executed against the delivered system by Operations staff, results are entered directly into the result column of each table, and the completed document with the signatures in Section 7 constitutes the acceptance record.');

    b.push(L.h2(d, 'Acceptance Principle'));
    p('Acceptance is judged against whether Operations can perform its daily work using the system, not against whether every specified requirement is implemented. Capabilities that are not delivered in this release are listed explicitly in Section 2.3 and are excluded from acceptance. Operations is asked to accept the delivered scope, not the full specification.');

    b.push(L.h2(d, 'Participants'));
    const t11 = L.tableCaption(d, 'User Acceptance Testing Participants');
    b.push(t11.paragraph);
    b.push(L.table(
      ['Role', 'Responsibility', 'Organisation'],
      [
        ['Operations Manager', 'Owns acceptance, executes operator test cases, signs the acceptance record', 'E-Bus Xpress'],
        ['Depot Manager', 'Executes charging and grid related test cases', 'E-Bus Xpress'],
        ['Driver Supervisor', 'Executes roster and driver record test cases', 'E-Bus Xpress'],
        ['Nominated Drivers', 'Execute the driver application test cases on their own devices', 'E-Bus Xpress'],
        ['Test Coordinator', 'Prepares the environment, records results, manages defects', 'KMC Product Development'],
        ['Technical Support', 'Investigates defects raised during execution', 'KMC Product Development'],
      ],
      [2400, 5000, 2200],
    ));

    // ---------------------------------------------------------------- 2
    b.push(L.h1(d, 'Scope of Acceptance'));

    b.push(L.h2(d, 'In Scope'));
    p('The following capabilities are delivered and are subject to acceptance testing.');
    bl('Authentication and role based access for operators, supervisors and drivers');
    bl('Fleet reference data administration covering depots, bus models, buses, routes, stops, chargers, regions and grid nodes');
    bl('Driver record administration and linked driver account creation');
    bl('Driver pre trip and post trip submission from the driver application');
    bl('Bus readiness classification derived from driver submissions');
    bl('Charger inventory and state visibility');
    bl('Daily plan generation covering trips, bus duty assignment, charging reservations and grid load');
    bl('Weekly and daily driver roster generation');
    bl('Plan publication and driver visibility of the published schedule');
    bl('Planning alert visibility in the operator portal');
    bl('Schedule import and schedule change sets');

    b.push(L.h2(d, 'Test Environment'));
    const t21 = L.tableCaption(d, 'Test Environment Definition');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Aspect', 'Setting'],
      [
        ['Environment', 'Staging, configured to mirror the intended production configuration'],
        ['Data', 'Representative fleet, route, driver and charger data agreed with Operations before execution begins'],
        ['Juza integration', 'Disabled unless the read scope has been confirmed in writing before execution'],
        ['Accounts', 'One account per participant, issued individually. No shared accounts are used during acceptance testing'],
        ['Devices', 'Operator portal on the standard operations workstation. Driver application on drivers own devices'],
        ['Duration', 'Ten working days including defect correction and retest'],
      ],
      [2400, 7200],
    ));

    b.push(L.h2(d, 'Explicitly Out of Scope'));
    p('The following capabilities are not delivered in this release and are excluded from acceptance. Operations is asked to confirm that it can operate without them for the pilot period, using the manual practices set out in the training document.');
    const t22 = L.tableCaption(d, 'Capabilities Excluded from Acceptance');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Capability', 'Status', 'Operational Practice During the Pilot'],
      [
        ['Automated route energy estimation', 'Not delivered', 'Planning uses a configured consumption rate for each bus model, reviewed monthly against actual consumption'],
        ['Alert delivery by electronic mail', 'Not delivered', 'Operators review the portal alert view at the start of each shift and before publishing any plan'],
        ['Alert acknowledgement and escalation workflow', 'Not delivered', 'Alerts are actioned and recorded in the shift log'],
        ['Automated charger control or session start', 'Not delivered by design', 'Charging is executed on the Juza platform as it is today'],
        ['Real time vehicle telemetry', 'Not delivered by design', 'Bus state comes from driver submissions'],
        ['Multi factor authentication', 'Not delivered', 'Compensating controls in the information security review apply'],
      ],
      [2600, 1800, 5200],
    ));

    // ---------------------------------------------------------------- 3
    b.push(L.h1(d, 'Test Approach'));

    b.push(...L.figure(d, 'uat-process', 'User Acceptance Testing Process'));
    b.push(L.richPara([
      'The process in ',
      { ref: 'fig_3_1', cached: 'Figure 3.1' },
      ' runs until no blocker or major defect remains open. A major defect may instead be accepted with a documented workaround, which is the only route by which acceptance is granted with a known defect outstanding.',
    ]));

    b.push(L.h2(d, 'Entry Criteria'));
    p('Acceptance testing may not begin until all of the following are satisfied. The Test Coordinator confirms each item before the first test case is executed.');
    const t31 = L.tableCaption(d, 'Entry Criteria');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Criterion', 'Confirmed By'],
      [
        ['The staging environment is deployed and all services report healthy', 'Test Coordinator'],
        ['All automated smoke tests pass against the staging environment', 'Test Coordinator'],
        ['Agreed test data is loaded and verified with Operations', 'Operations Manager'],
        ['Participant accounts are created with the correct roles', 'Test Coordinator'],
        ['Participants have received the training set out in the training document', 'Operations Manager'],
        ['This test plan has been reviewed and agreed by Operations', 'Operations Manager'],
      ],
      [6400, 3200],
    ));

    b.push(L.h2(d, 'Defect Classification'));
    const t32 = L.tableCaption(d, 'Defect Severity and Response');
    b.push(t32.paragraph);
    b.push(L.table(
      ['Severity', 'Definition', 'Effect on Acceptance', 'Correction Window'],
      [
        ['Blocker', 'A test case cannot be completed and no workaround exists. Daily operation would be impossible', 'Acceptance withheld until corrected and retested', 'Within two working days'],
        ['Major', 'A test case completes but the result is wrong, or a workaround is required that is not sustainable in daily use', 'Acceptance withheld unless Operations accepts a documented workaround', 'Within five working days'],
        ['Minor', 'The result is correct but the behaviour is awkward, unclear or inconsistent', 'Does not withhold acceptance. Recorded for a later release', 'Next release'],
        ['Cosmetic', 'Presentation issue with no effect on the result', 'Does not withhold acceptance', 'When next changed'],
      ],
      [1600, 3800, 2400, 1800],
    ));

    b.push(L.h2(d, 'Exit Criteria'));
    p('Acceptance is granted when every one of the following is true.');
    bl('Every test case in Section 4 has been executed and its result recorded');
    bl('No blocker defect remains open');
    bl('No major defect remains open unless Operations has accepted a documented workaround and recorded that acceptance in Section 6');
    bl('The defect register in Section 6 is complete and signed');
    bl('Operations confirms that a full working day of fleet planning can be performed using the system');

    // ---------------------------------------------------------------- 4
    b.push(L.h1(d, 'Test Cases'));
    p('Each test case states its precondition, the steps to follow and the result that constitutes a pass. The tester records the observed result and marks the case as passed or failed.');

    b.push(L.h2(d, 'Access and Security'));
    const t41 = L.tableCaption(d, 'Access and Security Test Cases');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-SEC-01', 'Sign in to the operator portal with valid operator credentials', 'Access is granted and the dashboard is displayed', ''],
        ['UAT-SEC-02', 'Attempt to sign in with an incorrect password', 'Access is refused with no indication of whether the account exists', ''],
        ['UAT-SEC-03', 'Sign in to the driver application with a valid employee number and personal identification number', 'Access is granted and the current day view is displayed', ''],
        ['UAT-SEC-04', 'While signed in as a driver, attempt to reach an administrative page by entering its address directly', 'Access is refused', ''],
        ['UAT-SEC-05', 'Sign out and attempt to use the browser back navigation to reach a protected page', 'Access is refused and the sign in page is shown', ''],
        ['UAT-SEC-06', 'Change a driver personal identification number using the change facility, then sign in with the new value', 'The new value is accepted and the previous value is refused', ''],
        ['UAT-SEC-07', 'As an operator, confirm that permanent account deletion is not offered', 'The action is not available to the operator role', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Fleet Reference Data'));
    const t42 = L.tableCaption(d, 'Fleet Reference Data Test Cases');
    b.push(t42.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-REF-01', 'Create a depot with a name, code, location and grid capacity', 'The depot is created and appears in the depot list', ''],
        ['UAT-REF-02', 'Create a bus model with battery capacity, connector type and consumption rate', 'The model is created and is selectable when creating a bus', ''],
        ['UAT-REF-03', 'Create a bus, assign it to a model and a home depot', 'The bus is created and appears on the fleet view', ''],
        ['UAT-REF-04', 'Create a route with a service window, headway, destination and at least two located stops', 'The route is created and is marked as available for planning', ''],
        ['UAT-REF-05', 'Create a route without a service window, then attempt to include it in a plan', 'The route is not included in planning and the reason is visible', ''],
        ['UAT-REF-06', 'Compute route geometry for a created route', 'Road geometry, distance and duration are stored and the route is drawn on the map', ''],
        ['UAT-REF-07', 'Create a driver record together with a linked user account', 'Both are created and the driver can sign in to the driver application', ''],
        ['UAT-REF-08', 'Reset a driver personal identification number as an administrator', 'A new temporary value is issued and the driver can sign in with it', ''],
        ['UAT-REF-09', 'Edit a bus and change its home depot', 'The change is saved and reflected in planning input', ''],
        ['UAT-REF-10', 'Retire a bus and confirm it is excluded from the next plan', 'The bus is not assigned any duty in the following plan run', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Driver Application'));
    const t43 = L.tableCaption(d, 'Driver Application Test Cases');
    b.push(t43.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-DRV-01', 'View the assigned bus and duty for the current day', 'The assigned bus and duty are displayed correctly', ''],
        ['UAT-DRV-02', 'Complete a pre trip submission entering state of charge, completing the checklist and recording no faults', 'The submission is accepted and confirmation is shown', ''],
        ['UAT-DRV-03', 'Complete a pre trip submission recording a critical fault', 'The submission is accepted and the bus is classified as not ready', ''],
        ['UAT-DRV-04', 'Attempt a pre trip submission with a state of charge outside the valid range', 'The entry is refused with a clear message', ''],
        ['UAT-DRV-05', 'Complete a post trip submission recording the closing state of charge and odometer', 'The submission is accepted', ''],
        ['UAT-DRV-06', 'View the published schedule for the coming days', 'The driver own duties are displayed and no other driver duties are visible', ''],
        ['UAT-DRV-07', 'Install the driver application to the device home screen', 'The application installs and opens from the home screen', ''],
        ['UAT-DRV-08', 'Open the application with the device network disabled', 'The application opens and indicates that it is offline', ''],
        ['UAT-DRV-09', 'View the route map for the assigned duty', 'The route is displayed with its stops', ''],
        ['UAT-DRV-10', 'Report an issue using the report facility', 'The report is recorded and confirmation is shown', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Readiness and Fleet State'));
    const t44 = L.tableCaption(d, 'Readiness Test Cases');
    b.push(t44.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-RDY-01', 'Submit a pre trip check with a healthy state of charge and no faults, then view the bus in the portal', 'The bus is shown as ready with its confidence value', ''],
        ['UAT-RDY-02', 'Submit a pre trip check with a state of charge below the caution threshold', 'The bus is shown as requiring caution and the reason is visible', ''],
        ['UAT-RDY-03', 'Submit a pre trip check where the driver marks the bus as not ready', 'The bus is shown as not ready and the reason is visible', ''],
        ['UAT-RDY-04', 'View a bus that has never received a submission', 'The bus is shown as unknown', ''],
        ['UAT-RDY-05', 'Override the readiness of a bus as an operator with a stated reason', 'The override is applied and the reason is recorded', ''],
        ['UAT-RDY-06', 'Confirm the time at which the readiness of a bus was last determined is visible', 'The determination time is displayed', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Planning'));
    const t45 = L.tableCaption(d, 'Planning Test Cases');
    b.push(t45.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-PLN-01', 'Trigger a plan run for a service date with a weekly roster window', 'The run is accepted and its progress can be followed to completion', ''],
        ['UAT-PLN-02', 'Attempt a second plan run while the first is still active', 'The second request is refused with a clear message', ''],
        ['UAT-PLN-03', 'View the generated passenger trips for a completed run', 'Trips are listed with their route, departure and arrival', ''],
        ['UAT-PLN-04', 'View the bus duty assignments for a completed run', 'Each assignment shows its bus, duty and state of charge position', ''],
        ['UAT-PLN-05', 'View the charging reservations for a completed run', 'Reservations show charger, bay, time window and power', ''],
        ['UAT-PLN-06', 'View the grid load profile for a completed run', 'Load is shown against the cap for each interval with its status', ''],
        ['UAT-PLN-07', 'Confirm no charger bay carries two overlapping reservations in a completed run', 'No overlap exists', ''],
        ['UAT-PLN-08', 'Confirm no driver is assigned two overlapping duties in a completed run', 'No overlap exists', ''],
        ['UAT-PLN-09', 'View the weekly driver schedule and the daily driver assignments', 'Both are displayed with driver, route and role', ''],
        ['UAT-PLN-10', 'Trigger a plan run with insufficient buses to cover all trips', 'The run completes, uncovered trips are reported and the reason is visible', ''],
        ['UAT-PLN-11', 'View planning alerts raised by a completed run', 'Alerts are listed with their type and severity', ''],
        ['UAT-PLN-12', 'Publish a completed plan', 'The plan is marked as published and drivers can see their schedule', ''],
        ['UAT-PLN-13', 'Withdraw a published plan', 'The plan is no longer published and the change is recorded', ''],
        ['UAT-PLN-14', 'Amend a planning configuration value and confirm it affects the next run', 'The new value is used by the following run', ''],
        ['UAT-PLN-15', 'Import a schedule from the provided template', 'Valid records are accepted and invalid records are reported individually', ''],
        ['UAT-PLN-16', 'Create a schedule change set, validate it and apply it', 'Conflicts are reported at validation and the applied change takes effect', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Charging and Grid'));
    const t46 = L.tableCaption(d, 'Charging and Grid Test Cases');
    b.push(t46.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-CHG-01', 'View the charger inventory and the bays of each charger', 'Chargers and their bays are listed with capacity and connector type', ''],
        ['UAT-CHG-02', 'Create a grid node with a power cap and associate a depot with it', 'The node is created and the association is saved', ''],
        ['UAT-CHG-03', 'Run a plan where demand would exceed the grid cap if all buses charged at once', 'Charging is staggered and no interval exceeds the cap', ''],
        ['UAT-CHG-04', 'Confirm the grid load profile identifies intervals approaching the cap', 'Intervals are marked with their status', ''],
        ['UAT-CHG-05', 'Cancel a charging reservation from the portal', 'The reservation is cancelled and the change is recorded', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Audit and Accountability'));
    const t47 = L.tableCaption(d, 'Audit Test Cases');
    b.push(t47.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-AUD-01', 'Perform an administrative change and confirm it appears in the audit trail', 'The change is recorded with actor, action, result and time', ''],
        ['UAT-AUD-02', 'Attempt an action the role does not permit and confirm the refusal is recorded', 'The refused attempt appears in the audit trail', ''],
        ['UAT-AUD-03', 'Confirm a driver submission is attributed to the submitting driver', 'The submission records the driver identity and time', ''],
        ['UAT-AUD-04', 'Filter the audit trail by actor and by date range', 'Only matching records are returned', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    b.push(L.h2(d, 'Operational Day Simulation'));
    p('This final test is the most important single case in the plan. It asks Operations to run a complete planning day using only the system, in order to judge whether the system supports the work rather than whether individual features function.');
    const t48 = L.tableCaption(d, 'Operational Day Simulation');
    b.push(t48.paragraph);
    b.push(L.table(
      ['Reference', 'Test Case', 'Expected Result', 'Result'],
      [
        ['UAT-DAY-01', 'Drivers submit pre trip checks for every bus intended to operate', 'All submissions are recorded and readiness is visible for every bus', ''],
        ['UAT-DAY-02', 'The operator reviews fleet readiness and resolves any bus not ready', 'Every operating bus is ready or has a recorded override', ''],
        ['UAT-DAY-03', 'The operator generates the daily plan and the weekly roster', 'The plan completes and covers the intended service', ''],
        ['UAT-DAY-04', 'The depot manager reviews charging reservations against the grid cap', 'Reservations are within the cap and are operationally acceptable', ''],
        ['UAT-DAY-05', 'The driver supervisor reviews the roster for coverage and fairness', 'The roster is acceptable and uncovered duties are understood', ''],
        ['UAT-DAY-06', 'The operator publishes the plan', 'The plan is published', ''],
        ['UAT-DAY-07', 'Drivers confirm their schedule is visible on their own devices', 'Each driver sees the correct duties', ''],
        ['UAT-DAY-08', 'Drivers submit post trip checks at the end of the duty', 'All submissions are recorded', ''],
        ['UAT-DAY-09', 'Operations judges whether the day could have been run using the system alone', 'Operations records its judgement in Section 7', ''],
      ],
      [1600, 3400, 3200, 1400],
    ));

    // ---------------------------------------------------------------- 5
    b.push(L.h1(d, 'Execution Record'));
    p('The Test Coordinator completes the summary below once execution is finished.');
    const t51 = L.tableCaption(d, 'Execution Summary');
    b.push(t51.paragraph);
    b.push(L.plainTable(
      ['Measure', 'Entry'],
      [
        ['Execution start date', ''],
        ['Execution end date', ''],
        ['Total test cases', '71'],
        ['Test cases passed', ''],
        ['Test cases failed', ''],
        ['Test cases not executed', ''],
        ['Blocker defects raised', ''],
        ['Blocker defects closed', ''],
        ['Major defects raised', ''],
        ['Major defects closed', ''],
        ['Minor and cosmetic defects raised', ''],
        ['Environment used', ''],
        ['Build commit under test', ''],
      ],
      [4400, 5200],
    ));

    // ---------------------------------------------------------------- 6
    b.push(L.h1(d, 'Defect Register'));
    p('Every defect raised during execution is recorded below. A defect that is closed by correction must show the retest result. A major defect that is accepted rather than corrected must show the agreed workaround and be initialled by the Operations Manager.');
    const t61 = L.tableCaption(d, 'Defect Register');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Defect Reference', 'Test Case', 'Description', 'Severity', 'Resolution', 'Retest'],
      [
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
      ],
      [1600, 1400, 2800, 1200, 1600, 1000],
    ));

    b.push(L.h2(d, 'Accepted Workarounds'));
    p('Where Operations accepts a major defect rather than requiring correction before acceptance, the workaround is recorded here together with the date by which the defect will be corrected.');
    const t62 = L.tableCaption(d, 'Accepted Workarounds');
    b.push(t62.paragraph);
    b.push(L.table(
      ['Defect Reference', 'Agreed Workaround', 'Correction Due', 'Accepted By'],
      [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
      ],
      [1800, 4400, 1800, 1600],
    ));

    // ---------------------------------------------------------------- 7
    b.push(L.h1(d, 'Acceptance Declaration'));

    b.push(L.h2(d, 'Operations Judgement'));
    p('The Operations Manager records the overall judgement below before signing.');
    const t71 = L.tableCaption(d, 'Operations Judgement');
    b.push(t71.paragraph);
    b.push(L.plainTable(
      ['Question', 'Response'],
      [
        ['Can a full planning day be performed using the system alone', ''],
        ['Are the excluded capabilities in Section 2.3 acceptable for the pilot period', ''],
        ['Are the accepted workarounds in Section 6.1 sustainable for the pilot period', ''],
        ['Is the system accepted for the controlled production pilot', ''],
        ['Additional conditions attached to this acceptance', ''],
      ],
      [5600, 4000],
    ));

    b.push(L.h2(d, 'Signatures'));
    p('By signing below, Operations confirms that the test cases in Section 4 have been executed, that the results recorded are accurate, that the defect register in Section 6 is complete, and that the acceptance decision recorded in Section 7.1 is made with knowledge of the capabilities excluded in Section 2.3.');
    b.push(L.spacer());
    const t72 = L.tableCaption(d, 'User Acceptance Testing Sign-Off');
    b.push(t72.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Operations Manager, E-Bus Xpress', '', '', ''],
        ['Depot Manager, E-Bus Xpress', '', '', ''],
        ['Driver Supervisor, E-Bus Xpress', '', '', ''],
        ['Test Coordinator, KMC', '', '', ''],
        ['Director Product Development, KMC', '', '', ''],
      ],
      [3600, 2200, 2400, 1400],
    ));

    return b;
  },
};
