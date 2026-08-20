module.exports = {
  slug: 'user-training',
  filename: 'Velo User Training and Acknowledgement of Responsibilities.docx',
  meta: {
    title: 'User Training and Acknowledgement of System Use Responsibilities',
    reference: 'KMC.DPD.08/26-SP020',
    description: 'Role based training curriculum, competency assessment and user acknowledgement of responsibilities for the Velo Electric Bus Fleet Operations Planning System',
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
    p('This document defines the training that each category of Velo user receives before being granted access, the competencies each user must demonstrate, and the responsibilities each user accepts by signing the acknowledgement in Section 7. It serves both as the training curriculum and as the record that training has been delivered.');

    b.push(L.h2(d, 'Principle'));
    p('Access to Velo is granted only after training has been delivered and the acknowledgement has been signed. This is not an administrative formality. Velo produces the plan that determines which bus operates which service and which driver is assigned to it, and an operator who does not understand what the system is telling them can publish a plan that the fleet cannot execute.');

    b.push(...L.figure(d, 'training-flow', 'Training and Access Authorisation Flow'));
    b.push(L.richPara([
      'The flow in ',
      { ref: 'fig_1_1', cached: 'Figure 1.1' },
      ' is followed for every new user without exception. Access is granted at the final step only, after competency has been assessed and the acknowledgement in Section 7 has been signed.',
    ]));

    b.push(L.h2(d, 'User Categories'));
    const t11 = L.tableCaption(d, 'User Categories and Access Levels');
    b.push(t11.paragraph);
    b.push(L.table(
      ['Category', 'System Role', 'Access Granted', 'Training Duration'],
      [
        ['Driver', 'Driver', 'Own duties, own submissions, own schedule', 'One hour'],
        ['Driver Supervisor', 'Operations manager', 'Driver records, rosters, readiness, planning', 'Half day'],
        ['Depot Manager', 'Operations manager', 'Chargers, grid nodes, charging reservations, readiness, planning', 'Half day'],
        ['Operations Manager', 'Operations manager', 'Full operational surface including plan generation and publication', 'One day'],
        ['System Administrator', 'Super administrator', 'Full surface including account management and permanent deletion', 'One day plus the administrator module'],
      ],
      [2000, 1800, 3600, 2000],
    ));

    // ---------------------------------------------------------------- 2
    b.push(L.h1(d, 'Common Training Module'));
    p('Every user receives this module regardless of role. It takes approximately forty minutes.');

    b.push(L.h2(d, 'What Velo Does'));
    p('Velo turns the current state of the fleet into an executable daily plan. Drivers report the condition and state of charge of their bus, the system judges whether each bus is ready to operate, and the planning engine then decides which bus runs which service, when each bus charges, and which driver is assigned to each duty.');
    p('Trainees must understand one point above all others. The quality of the plan depends entirely on the quality of the information entered into the system. A state of charge entered incorrectly produces a plan built on a false premise, and the fault will appear as a bus that runs out of charge in service rather than as an obvious data entry error.');

    b.push(L.h2(d, 'Account Security'));
    const t21 = L.tableCaption(d, 'Account Security Rules');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Rule', 'Reason'],
      [
        ['Your account is personal and must never be shared or lent to a colleague', 'Every action is recorded against the account that performed it. An action taken under your account is attributed to you'],
        ['Never sign in on behalf of another person, including a driver who has forgotten their credentials', 'The correct action is to request a credential reset from the administrator'],
        ['Choose a password that is not used for any other system', 'A password reused from a compromised service is the most common route to unauthorised access'],
        ['Sign out when leaving a shared workstation', 'An open session can be used by anyone with physical access to the workstation'],
        ['Report a suspected compromise immediately, on the same day', 'Speed of response determines how much can be done under a compromised account'],
        ['Do not photograph or copy driver personal details out of the system', 'Personal data must remain within the platform where its access is controlled and recorded'],
      ],
      [3400, 6200],
    ));
    p('Trainees must be told plainly that the system does not currently require a second authentication factor. The password is therefore the only barrier protecting the account, and the rules above carry more weight than they would in a system with a second factor.');

    b.push(L.h2(d, 'Everything Is Recorded'));
    p('Every action taken in Velo is recorded with the identity of the person who took it, what was done, whether it succeeded, and when. This includes actions that were refused because the role did not permit them. The record cannot be edited or deleted by any user.');
    p('This is presented in training as a protection rather than as surveillance. It means an operator who follows the correct procedure can demonstrate that they did so, and that a plan published in good faith on the basis of the information available can be shown to have been reasonable.');

    // ---------------------------------------------------------------- 3
    b.push(L.h1(d, 'Driver Training Module'));
    p('Delivered to drivers, taking approximately one hour including practical exercises on the driver own device.');

    b.push(L.h2(d, 'Learning Outcomes'));
    bl('Sign in to the driver application and change the personal identification number');
    bl('Install the application to the device home screen');
    bl('Identify the bus and duty assigned for the current day');
    bl('Complete a pre trip submission accurately');
    bl('Record a fault correctly and understand the consequence of doing so');
    bl('Complete a post trip submission');
    bl('View the published schedule for the coming days');
    bl('Recognise when the device is offline and what to do about it');

    b.push(L.h2(d, 'Pre Trip Submission'));
    p('The pre trip submission is the single most important action a driver performs in Velo. It is the only source of information the system has about the condition of the bus, because no automatic telemetry is fitted.');
    const t31 = L.tableCaption(d, 'Pre Trip Submission Guidance');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Field', 'What to Enter', 'Common Error'],
      [
        ['State of charge', 'The value shown on the dashboard at the moment of the check, entered exactly', 'Entering an estimate or the value expected after charging rather than the value displayed'],
        ['Odometer', 'The current reading in kilometres', 'Transposing digits, which produces an implausible distance and causes the entry to be refused'],
        ['Checklist', 'An honest response to each item', 'Marking all items acceptable without checking, which defeats the purpose of the check'],
        ['Faults', 'Every fault observed, with the correct severity', 'Omitting a fault believed to be minor, or recording a fault as critical when it does not prevent operation'],
        ['Overall judgement', 'Your own assessment of whether the bus is fit to operate', 'Recording the bus as ready when a fault has been reported, which contradicts the fault entry'],
      ],
      [1800, 4000, 3800],
    ));
    p('Drivers are told explicitly what happens when they mark a bus as not ready or record a critical fault. The bus is classified as not ready and the planning engine will not assign it to a duty. This is the correct outcome when the bus genuinely cannot operate, and drivers must not be discouraged from recording it. A driver who suppresses a fault to avoid disruption transfers a mechanical risk into service.');

    b.push(L.h2(d, 'Working Offline'));
    p('The driver application can be opened when the device has no network connection and will indicate that it is offline. A submission requires a connection to be accepted. Drivers are trained to check that the confirmation screen appears after submitting, and to retry once a connection is available if it does not. A submission that was not confirmed has not been recorded.');

    b.push(L.h2(d, 'Driver Competency Assessment'));
    const t32 = L.tableCaption(d, 'Driver Competency Checklist');
    b.push(t32.paragraph);
    b.push(L.table(
      ['Competency', 'Demonstrated', 'Assessor Initials'],
      [
        ['Signs in unaided and changes the personal identification number', '', ''],
        ['Installs the application to the device home screen', '', ''],
        ['Identifies the assigned bus and duty', '', ''],
        ['Completes a full pre trip submission accurately', '', ''],
        ['Records a fault with the correct severity', '', ''],
        ['Completes a post trip submission', '', ''],
        ['Locates the published schedule for the coming days', '', ''],
        ['States correctly what to do if a submission is not confirmed', '', ''],
      ],
      [5400, 2200, 2000],
    ));

    // ---------------------------------------------------------------- 4
    b.push(L.h1(d, 'Operator Training Module'));
    p('Delivered to Operations Managers, Depot Managers and Driver Supervisors. Duration is half a day for the supervisor and depot roles and a full day for the Operations Manager, who additionally covers plan generation and publication.');

    b.push(L.h2(d, 'Learning Outcomes'));
    bl('Interpret the fleet readiness view and the reasoning behind each classification');
    bl('Maintain reference data for depots, bus models, buses, routes, stops, chargers, regions and grid nodes');
    bl('Create a driver record together with a linked account and reset a driver credential');
    bl('Understand what makes a route eligible for planning');
    bl('Generate a plan and interpret every section of the result');
    bl('Review charging reservations against the grid power cap');
    bl('Review the driver roster for coverage');
    bl('Interpret uncovered duties and the reasons given');
    bl('Publish a plan and understand what publication means operationally');
    bl('Review planning alerts and act on them');

    b.push(L.h2(d, 'Understanding Readiness'));
    p('Operators are trained on the readiness states the delivered system produces. Attention is drawn during training to the fact that these differ from the states described in the original specification, so that an operator reading the specification is not confused.');
    const t41 = L.tableCaption(d, 'Readiness States and Operator Action');
    b.push(t41.paragraph);
    b.push(L.table(
      ['State', 'Meaning', 'Operator Action'],
      [
        ['Ready', 'A recent submission shows sufficient charge, no critical fault and a driver judgement of ready', 'None. The bus can be assigned'],
        ['Caution', 'A recent submission shows either a driver judgement of caution, a low state of charge, or reduced battery health', 'Review the reason. Decide whether to charge, repair or operate'],
        ['Not ready', 'The driver judged the bus not ready, or a critical fault was recorded', 'Remove from service until resolved. The planner will not assign it'],
        ['Charging', 'The bus is connected to a charger', 'None. Expect the state to change when charging completes'],
        ['In service', 'The bus is currently operating a duty', 'None'],
        ['Unknown', 'No submission exists, or the most recent submission is older than the trusted window', 'Obtain a current submission before relying on this bus in a plan'],
      ],
      [1600, 4200, 3800],
    ));
    p('Operators are taught to read the reasoning shown alongside each classification rather than the state alone. The reasoning states which rule produced the result, and it is the reasoning that tells the operator what to do.');

    b.push(L.h2(d, 'Route Eligibility for Planning'));
    p('A route participates in planning only when it is fully specified. This is the most common cause of a plan that omits an expected service, and operators are trained to check it first when a route is missing from a plan.');
    const t42 = L.tableCaption(d, 'Route Planning Eligibility Requirements');
    b.push(t42.paragraph);
    b.push(L.table(
      ['Requirement', 'Effect If Missing'],
      [
        ['A service window with a start and end time', 'No trips are generated for the route'],
        ['A headway defining the interval between departures', 'No trips are generated for the route'],
        ['A destination location', 'The route cannot be planned'],
        ['At least two stops with recorded locations', 'The route cannot be planned'],
        ['Computed road geometry', 'Travel times fall back to estimates and plan quality is reduced'],
      ],
      [4000, 5600],
    ));

    b.push(L.h2(d, 'Generating and Reviewing a Plan'));
    p('Operators are trained to treat plan generation as a proposal to be reviewed rather than an instruction to be executed. The engine optimises within the constraints it is given, and it cannot know about circumstances that were never entered into the system.');
    const t43 = L.tableCaption(d, 'Plan Review Checklist');
    b.push(t43.paragraph);
    b.push(L.table(
      ['Section', 'What to Check', 'Action If Wrong'],
      [
        ['Trips', 'The expected services appear for every operating route', 'Check route eligibility in Table 4.2 and regenerate'],
        ['Assignments', 'Every trip has a bus, and no bus is assigned beyond its charge capability', 'Review uncovered trips and their stated reason'],
        ['Charging', 'Reservations fit within depot opening and do not conflict with operational needs', 'Cancel and regenerate, or adjust the planning configuration'],
        ['Grid', 'No interval breaches the power cap and few approach it', 'Escalate to the depot manager if intervals are marked as breaching'],
        ['Drivers', 'Every duty has a driver and no driver is over committed', 'Check driver availability records and regenerate'],
        ['Alerts', 'Every alert raised has been read and understood', 'Act on each alert before publishing'],
      ],
      [1600, 4400, 3600],
    ));
    p('Only one plan run may be active at a time. An attempt to start a second run while one is in progress is refused. Operators are trained to wait for completion rather than to repeat the request.');

    b.push(L.h2(d, 'Publication'));
    p('Publication is the point at which a plan becomes operationally real. Once published, drivers see their duties on their own devices and will act on them. Operators are trained to complete the review checklist in Table 4.3 before publishing, and to inform the depot directly if a plan is withdrawn after publication, because a driver who has already seen a duty will not necessarily check again.');

    b.push(L.h2(d, 'Operator Competency Assessment'));
    const t44 = L.tableCaption(d, 'Operator Competency Checklist');
    b.push(t44.paragraph);
    b.push(L.table(
      ['Competency', 'Demonstrated', 'Assessor Initials'],
      [
        ['Interprets each readiness state and its stated reasoning', '', ''],
        ['Creates a depot, a bus model and a bus unaided', '', ''],
        ['Creates a route that is eligible for planning', '', ''],
        ['Diagnoses why a route was omitted from a plan', '', ''],
        ['Creates a driver record with a linked account', '', ''],
        ['Resets a driver credential', '', ''],
        ['Generates a plan and reviews all six sections', '', ''],
        ['Explains why a duty was left uncovered', '', ''],
        ['Reviews charging against the grid cap', '', ''],
        ['Publishes a plan and confirms driver visibility', '', ''],
        ['States correctly what to do if a plan is withdrawn after publication', '', ''],
      ],
      [5400, 2200, 2000],
    ));

    // ---------------------------------------------------------------- 5
    b.push(L.h1(d, 'System Administrator Module'));
    p('Delivered in addition to the operator module to those holding the highest privilege level. Administrators hold capabilities that cannot be undone.');

    b.push(L.h2(d, 'Additional Responsibilities'));
    const t51 = L.tableCaption(d, 'Administrator Responsibilities');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Responsibility', 'Requirement'],
      [
        ['Account creation', 'Create accounts only on a recorded request from the Operations Manager, and assign the lowest role that permits the work'],
        ['Account removal', 'Disable accounts on the same working day that a holder changes role or leaves'],
        ['Permanent deletion', 'Permanent deletion of an account cannot be reversed. Use it only where a record was created in error, and never as a substitute for disabling'],
        ['Separation of duties', 'Hold a separate non administrative account for routine daily work and use the administrative account only when the privilege is required'],
        ['Audit review', 'Review the audit trail of privileged actions weekly and record the review'],
        ['Configuration changes', 'Record every planning configuration change with the reason, since these change how future plans are produced'],
      ],
      [2800, 6800],
    ));

    b.push(L.h2(d, 'Interim Controls'));
    p('Administrators are trained explicitly on the compensating controls that apply while multi factor authentication is not implemented, as recorded in the information security review. These controls are the substitute for a second factor and administrators are accountable for following them.');
    bl('Administrative passwords are at least sixteen characters and are generated rather than chosen');
    bl('Administrative accounts are never used for routine daily work');
    bl('Administrative access is used only from the operational network');
    bl('The weekly audit review of privileged actions is completed and recorded without exception');

    // ---------------------------------------------------------------- 6
    b.push(L.h1(d, 'Training Delivery Record'));
    p('Completed by the trainer for each session and retained by Operations for the duration of employment plus three years.');
    const t61 = L.tableCaption(d, 'Training Delivery Record');
    b.push(t61.paragraph);
    b.push(L.plainTable(
      ['Field', 'Entry'],
      [
        ['Session date', ''],
        ['Module delivered', ''],
        ['Trainer name', ''],
        ['Attendees, names and roles', ''],
        ['Competency assessment completed', ''],
        ['Attendees assessed as competent', ''],
        ['Attendees requiring further training', ''],
        ['Follow up date where required', ''],
        ['Trainer signature and date', ''],
      ],
      [3600, 6000],
    ));

    b.push(L.h2(d, 'Refresher Training'));
    const t62 = L.tableCaption(d, 'Refresher Training Triggers');
    b.push(t62.paragraph);
    b.push(L.table(
      ['Trigger', 'Module', 'Timing'],
      [
        ['A release changes a workflow the user performs', 'The affected module only', 'Before the release reaches production'],
        ['A user changes role', 'The module for the new role', 'Before the new access is granted'],
        ['A user has not accessed the system for three months', 'Full module for the role', 'Before access is restored'],
        ['A user error contributes to a severity one or severity two incident', 'The affected module', 'Within five working days'],
        ['Routine refresher', 'Full module for the role', 'Every twelve months'],
      ],
      [3400, 3200, 3000],
    ));

    // ---------------------------------------------------------------- 7
    b.push(L.h1(d, 'Acknowledgement of System Use Responsibilities'));
    p('This section is completed and signed individually by every user before access is granted. The signed page is retained by Operations.');

    b.push(L.h2(d, 'Declaration'));
    p('I confirm that I have received training on the Velo Electric Bus Fleet Operations Planning System appropriate to my role, that I have had the opportunity to ask questions, and that I understand and accept the responsibilities set out below.');

    b.push(L.h2(d, 'Responsibilities Accepted'));
    const t71 = L.tableCaption(d, 'Responsibilities Accepted by the User');
    b.push(t71.paragraph);
    b.push(L.table(
      ['Responsibility', 'Initials'],
      [
        ['I will use my own account only, and I will not share my credentials with any other person for any reason', ''],
        ['I will not use another person account, or ask another person to act in the system on my behalf', ''],
        ['I understand that every action I take is recorded against my identity and cannot be deleted', ''],
        ['I will enter information accurately, and I will not enter an estimate where an actual reading is required', ''],
        ['I will report faults and defects honestly, including where doing so takes a vehicle out of service', ''],
        ['I will report a suspected credential compromise on the same day that I suspect it', ''],
        ['I will sign out when I leave a shared workstation', ''],
        ['I will not copy, photograph or remove driver personal information from the system', ''],
        ['I will use only the functions my role provides, and I will not attempt to reach functions I am not authorised to use', ''],
        ['I will follow the operating procedures I have been trained on, and I will ask when I am unsure rather than proceed', ''],
        ['I understand that a plan I publish will be acted upon by drivers and depot staff', ''],
        ['I understand that misuse of the system may result in withdrawal of access and disciplinary action', ''],
      ],
      [8200, 1400],
    ));

    b.push(L.h2(d, 'User Signature'));
    b.push(L.spacer());
    const t72 = L.tableCaption(d, 'User Acknowledgement');
    b.push(t72.paragraph);
    b.push(L.plainTable(
      ['Field', 'Entry'],
      [
        ['Full name', ''],
        ['Employee number', ''],
        ['Role', ''],
        ['System role granted', ''],
        ['Training module completed', ''],
        ['Date of training', ''],
        ['User signature', ''],
        ['Date signed', ''],
      ],
      [3400, 6200],
    ));

    b.push(L.spacer());
    const t73 = L.tableCaption(d, 'Authorisation of Access');
    b.push(t73.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Trainer', '', '', ''],
        ['Line manager', '', '', ''],
        ['Operations Manager authorising access', '', '', ''],
        ['System administrator granting access', '', '', ''],
      ],
      [3600, 2200, 2400, 1400],
    ));

    return b;
  },
};
