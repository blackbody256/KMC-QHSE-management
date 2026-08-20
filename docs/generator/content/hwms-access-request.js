const SYSTEM = 'HEALTH AND WELLNESS MANAGEMENT SYSTEM';

module.exports = {
  slug: 'hwms-access-request',
  filename: 'HWMS Request for Deployment Access.docx',
  meta: {
    system: SYSTEM,
    title: 'Request for Deployment Access, User Acceptance Testing',
    reference: 'KMC.DQHSE.08/26-FM012',
    description: 'Formal request to KMC ICT for a hosted environment and the access required to conduct user acceptance testing of the Health and Wellness Management System with synthetic data',
    preparedBy: 'Akanga Andrew, Software Engineering Intern, Department of Quality, Health, Safety and Environment',
    issueDate: '11/08/2026',
    version: '001',
    classification: 'Internal, Restricted to KMC ICT, the data protection owner and departmental management',
  },

  build(d, L) {
    const b = [];
    const p = (t) => b.push(L.para(t));
    const bl = (t) => b.push(L.bullet(t));

    // ------------------------------------------------------------------ 1
    b.push(L.h1(d, 'The Request'));

    b.push(L.h2(d, 'What Is Requested'));
    p('The Department of Quality, Health, Safety and Environment requests that KMC ICT provide a hosted environment on Corporation controlled infrastructure, and the access described in Section 4, so that the Health and Wellness Management System can be tested by the people who will use it.');
    p('The request is for user acceptance testing only. It is not a request to place the system into service, and it is not a request to process any real clinical record. Both of those are separate requests which the Department will make when the conditions in Section 7 have been met.');

    b.push(L.h2(d, 'What Is Not Requested'));
    p('The following are deliberately outside this request, so that approving it commits the Corporation to nothing beyond a controlled test.');
    bl('Authority to enter, import or process any real patient record.');
    bl('Authority to place the system into operational service.');
    bl('Connection to the Human Resource portal or any other Corporation system.');
    bl('Any external or internet facing exposure of the environment.');
    bl('Permanent allocation of infrastructure beyond the testing period.');

    b.push(L.h2(d, 'Why an Environment Is Needed'));
    p('The system has so far been demonstrated on a development machine. A demonstration answers whether the workflow looks right. It cannot answer whether the officer can complete a visit in the time a real clinic allows, whether the manager can administer accounts without assistance, or whether the roles hold when three people use the system at once.');
    p('Those questions can only be answered by the people who do the work, using the system on Corporation infrastructure, on the network they will actually use. That is what this request is for.');

    // ------------------------------------------------------------------ 2
    b.push(L.h1(d, 'The System Being Tested'));

    b.push(L.h2(d, 'Purpose'));
    p('The system records the operational work of the Health and Wellness division and derives the divisional performance report from those records. Its scope is the Occupational Health, Ergonomics and Wellness, and Industrial Hygiene units. It replaces a paper process, and it is not connected to any other Corporation system.');

    b.push(L.h2(d, 'What Is Built'));
    const t22 = L.tableCaption(d, 'Functions Available for Testing');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Function', 'Status'],
      [
        ['Sign in through the identity provider, with three roles', 'Built and testable'],
        ['Account administration by the manager', 'Built and testable'],
        ['Patient registry with search', 'Built and testable'],
        ['Clinic visit with section states, vital signs and signing', 'Built and testable'],
        ['Laboratory requisition on form KMC.DQHSE.05/26-FM008, with results and a printable form', 'Built and testable'],
        ['Consolidated patient record showing visits and laboratory work together', 'Built and testable'],
        ['Referral on form KMC.DQHSE.02/26-FM004', 'Specified, not built'],
        ['Ergonomics, industrial hygiene and monthly returns', 'Specified, not built'],
        ['Divisional performance indicators', 'Displayed with no data until the underlying records exist'],
      ],
      [6200, 3400],
    ));

    b.push(L.h2(d, 'Technical Summary'));
    const t23 = L.tableCaption(d, 'Technical Summary of the System');
    b.push(t23.paragraph);
    b.push(L.table(
      ['Item', 'Detail'],
      [
        ['Application', 'Go services behind a single gateway, with a browser interface'],
        ['Identity', 'Keycloak, holding accounts and roles'],
        ['Data', 'PostgreSQL. The clinical data sits on a separate instance with separate credentials'],
        ['Packaging', 'Container images. The whole system starts from one composed definition'],
        ['External dependencies', 'None. The system calls no Corporation system and no internet service'],
        ['Interfaces used', 'The browser interface only'],
      ],
      [2400, 7200],
    ));

    // ------------------------------------------------------------------ 3
    b.push(L.h1(d, 'Data Handling During Testing'));

    b.push(L.h2(d, 'Synthetic Data Only'));
    p('No real patient record, and no record about any identifiable person, is entered into the testing environment at any point. Every patient, visit and laboratory requisition used in testing is invented for the purpose. Participants are instructed not to use the name of any real colleague, and not to describe any real medical event.');
    p('This is stated as an absolute rather than as an intention because it is the control most easily eroded by convenience. It is the single condition on which the rest of this request rests, and if it cannot be held then the request should be refused.');

    b.push(L.h2(d, 'Why This Matters'));
    p('Data concerning health is special personal data under the Data Protection and Privacy Act, 2019. Entering a real record into a testing environment would be a disclosure of that data regardless of the intention behind it, and would place obligations on the Corporation that a test environment is not built to meet.');

    b.push(L.h2(d, 'Handling and Disposal'));
    const t33 = L.tableCaption(d, 'Data Handling Undertakings');
    b.push(t33.paragraph);
    b.push(L.table(
      ['Undertaking', 'Detail'],
      [
        ['Synthetic content only', 'Verified before each testing session rather than assumed'],
        ['No export', 'No data is copied out of the environment except the printable forms produced during testing, which carry synthetic content'],
        ['No production copy', 'Nothing from this environment is copied into any future production environment'],
        ['Destruction', 'The environment and its data are destroyed within ten working days of the testing period closing'],
        ['Incident handling', 'If a real record is entered by mistake, testing halts, the record is destroyed and the data protection owner is informed the same day'],
      ],
      [2600, 7000],
    ));

    // ------------------------------------------------------------------ 4
    b.push(L.h1(d, 'Access Requested'));

    b.push(L.h2(d, 'Infrastructure'));
    const t41 = L.tableCaption(d, 'Infrastructure Requested');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Item', 'Requested', 'Reason'],
      [
        ['Host', 'One Corporation controlled host able to run containers', 'The system is delivered as container images'],
        ['Processor and memory', 'Four processor cores and eight gigabytes of memory', 'Six services, an identity provider and two databases'],
        ['Storage', 'Fifty gigabytes', 'Databases, container images and logs for the testing period'],
        ['Network exposure', 'Plant network only, no external route', 'Testing does not require access from outside the plant'],
        ['Name and certificate', 'One internal host name with a certificate', 'Required to serve the system over an encrypted connection'],
        ['Duration', 'The testing period plus ten working days', 'Allows findings to be reproduced before the environment is destroyed'],
      ],
      [2000, 3400, 4200],
    ));

    b.push(L.h2(d, 'Access for People'));
    p('Two kinds of access are requested. Access to the host, which is technical and requested for one named person, and access to the application, which is requested for the testing participants and is created inside the application by the manager rather than by ICT.');
    const t42 = L.tableCaption(d, 'Access Requested for Named People');
    b.push(t42.paragraph);
    b.push(L.table(
      ['Access', 'For', 'Purpose', 'Duration'],
      [
        ['Host administrative access', 'One named engineer from the Department', 'Deploy the system, apply fixes during testing and destroy the environment afterwards', 'Testing period plus ten working days'],
        ['Application manager account', 'Health and Wellness manager', 'Create the accounts used in testing and exercise account administration', 'Testing period'],
        ['Application officer account', 'Health and Wellness Officer', 'Exercise the clinical workflow', 'Testing period'],
        ['Application director account', 'Nominated director', 'Confirm that the executive view carries no clinical content', 'Testing period'],
      ],
      [2400, 2400, 3400, 1400],
    ));
    p('Application accounts are created by the manager inside the system, not by ICT. That is deliberate. Account creation inside the application is recorded in the audit trail, whereas an account created out of band is not, and the audit trail is one of the things being tested.');

    b.push(L.h2(d, 'What ICT Is Asked To Do'));
    const t43 = L.tableCaption(d, 'Actions Requested of KMC ICT');
    b.push(t43.paragraph);
    b.push(L.table(
      ['Action', 'Detail'],
      [
        ['Provide the host', 'With the specification in Table 4.1'],
        ['Terminate encryption', 'Provide the internal name and certificate, and terminate the encrypted connection at the ingress'],
        ['Issue credentials', 'Generate the database and identity provider secrets from a controlled source. The Department will not supply them'],
        ['Restrict the console', 'Limit the identity provider administrative console to an administrative network'],
        ['Review this request', 'Confirm that the arrangement is acceptable, or return conditions'],
      ],
      [2600, 7000],
    ));

    // ------------------------------------------------------------------ 5
    b.push(L.h1(d, 'Approval Route'));
    p('This request requires three approvals. They are sought in the order shown so that a refusal at any point stops the work before the next party spends time on it.');
    b.push(...L.figure(d, 'hwms-uat-access', 'Approval and Provisioning Route'));
    b.push(L.richPara([
      'Where the request is refused, the route in ',
      { ref: 'fig_5_1', cached: 'Figure 5.1' },
      ' returns the conditions to the Department, which resubmits when they are met.',
    ]));

    const t51 = L.tableCaption(d, 'Approvals Required');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Approver', 'Approving What', 'Basis'],
      [
        ['Head of Department, Quality, Health, Safety and Environment', 'That the testing is wanted and the participants are released to take part', 'Business need'],
        ['Data protection owner', 'That synthetic data only is sufficient protection for a test of this kind', 'Data Protection and Privacy Act, 2019'],
        ['KMC ICT', 'That the environment, the network exposure and the credential handling are acceptable', 'Corporation infrastructure standards'],
      ],
      [3000, 4200, 2400],
    ));

    // ------------------------------------------------------------------ 6
    b.push(L.h1(d, 'Testing Plan'));

    b.push(L.h2(d, 'Participants'));
    const t61 = L.tableCaption(d, 'Testing Participants and Their Role in the Test');
    b.push(t61.paragraph);
    b.push(L.plainTable(
      ['Participant Role', 'Name', 'What They Test', 'Time Required'],
      [
        ['Health and Wellness Officer', '', 'Registry, clinic visit, laboratory requisition, patient record', 'Four sessions of one hour'],
        ['Health and Wellness Manager', '', 'Account administration, dashboard, absence of clinical access', 'Two sessions of one hour'],
        ['Nominated Director', '', 'Executive view and the absence of clinical content in it', 'One session of one hour'],
        ['Departmental engineer', '', 'Deployment, defect reproduction and environment destruction', 'Throughout'],
      ],
      [2400, 2000, 3600, 1600],
    ));

    b.push(L.h2(d, 'What Will Be Tested'));
    const t62 = L.tableCaption(d, 'Acceptance Criteria for User Testing');
    b.push(t62.paragraph);
    b.push(L.table(
      ['Reference', 'Criterion'],
      [
        ['UAT-01', 'The officer registers a patient and records a visit without assistance after one orientation'],
        ['UAT-02', 'A minimal walk in visit is completed in under two minutes'],
        ['UAT-03', 'A section marked not clinically indicated is distinguishable from one nobody has touched'],
        ['UAT-04', 'A signed visit cannot be edited'],
        ['UAT-05', 'A laboratory requisition is raised from a visit without retyping patient information'],
        ['UAT-06', 'The printed requisition is recognised by a person who uses the paper form'],
        ['UAT-07', 'The patient record shows visits and laboratory work together, in one place'],
        ['UAT-08', 'The manager creates an officer account, and that creation appears in the audit trail'],
        ['UAT-09', 'The manager and the director cannot reach any patient, visit or laboratory record by any route'],
        ['UAT-10', 'Every retrieval of a record by the officer appears in the access log'],
        ['UAT-11', 'Indicators with no underlying records read no data rather than zero'],
        ['UAT-12', 'Every status remains distinguishable when colour is removed from the display'],
      ],
      [1600, 8000],
    ));
    p('Criterion UAT-09 is the acceptance gate for the confidentiality design and is tested deliberately rather than incidentally. A participant will be asked to attempt to reach a clinical record from the manager and director accounts, including by entering an address directly.');

    b.push(L.h2(d, 'Recording and Outcome'));
    p('Findings are recorded against the criterion they relate to, with the participant, the date and what was observed. At the close of testing the Department issues a report stating which criteria passed, which failed and what will be done about each. That report, and not this document, is what supports any later request to place the system into service.');

    // ------------------------------------------------------------------ 7
    b.push(L.h1(d, 'Conditions and Undertakings'));

    b.push(L.h2(d, 'Undertakings by the Department'));
    p('In making this request the Department undertakes the following for the duration of the testing period.');
    bl('No real clinical record will be entered into the environment.');
    bl('Access will be limited to the named participants in Table 6.1.');
    bl('Accounts will be disabled and the environment destroyed within ten working days of the close of testing.');
    bl('Any defect that exposes a record across roles will halt testing until it is closed.');
    bl('Any accidental entry of real data will be reported to the data protection owner the same day.');

    b.push(L.h2(d, 'Before Any Later Request'));
    p('The Department acknowledges that a later request to process real clinical records will require the following, and that none of it is granted by approving this request.');
    const t72 = L.tableCaption(d, 'Conditions for Any Later Operational Request');
    b.push(t72.paragraph);
    b.push(L.table(
      ['Condition', 'Owner'],
      [
        ['Multi factor authentication for the clinical and administrative roles', 'KMC ICT'],
        ['Tamper evidence on the clinical access log', 'KMC ICT'],
        ['Nightly encrypted backup with a tested restore', 'KMC ICT'],
        ['Lawful basis, privacy notice and retention policy', 'Data protection owner'],
        ['Resolution of the referral authorisation conflict recorded in the security review', 'Division and data protection owner'],
        ['Named business owner, technical owner, data owner and support contact', 'Department and ICT'],
        ['Appended amendment of a signed clinical record', 'Development'],
      ],
      [6600, 3000],
    ));
    p('The last item in this table is a release blocker rather than a preference. The system was built during a student attachment that is ending, and it should not hold clinical records with nobody named as responsible for it.');

    // ------------------------------------------------------------------ 8
    b.push(L.h1(d, 'Authorisation'));
    p('By signing below, each party approves the request within their own area of responsibility. The request takes effect when all three signatures are present, and it lapses if the environment has not been provisioned within thirty days of the last signature.');
    b.push(L.spacer());
    const t81 = L.tableCaption(d, 'Requesting Party');
    b.push(t81.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Requested by, Software Engineering Intern', '', '', ''],
        ['Endorsed by, Health and Wellness Manager', '', '', ''],
      ],
      [4200, 2000, 2200, 1400],
    ));

    b.push(L.spacer());
    const t82 = L.tableCaption(d, 'Approving Parties');
    b.push(t82.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Approved or Conditions', 'Signature', 'Date'],
      [
        ['Head of Department, Quality, Health, Safety and Environment', '', '', '', ''],
        ['Data Protection Owner', '', '', '', ''],
        ['KMC ICT', '', '', '', ''],
      ],
      [3000, 1800, 2400, 1600, 1200],
    ));

    b.push(L.spacer());
    const t83 = L.tableCaption(d, 'Provisioning Record, Completed by KMC ICT');
    b.push(t83.paragraph);
    b.push(L.plainTable(
      ['Item', 'Detail'],
      [
        ['Environment address', ''],
        ['Date provisioned', ''],
        ['Provisioned by', ''],
        ['Agreed destruction date', ''],
        ['Date destroyed and confirmed by', ''],
      ],
      [3400, 6346],
    ));

    return b;
  },
};
