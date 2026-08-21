const SYSTEM = 'HEALTH AND WELLNESS MANAGEMENT SYSTEM';

module.exports = {
  slug: 'hwms-access-request',
  filename: 'HWMS Request for Deployment Access.docx',
  meta: {
    system: SYSTEM,
    title: 'Request for deployment access, user acceptance testing',
    reference: 'KMC.DQHSE.08/26-FM012',
    description: 'Formal request to KMC ICT for a hosted environment and the access required to conduct user acceptance testing of the Health and Wellness Management System with synthetic data',
    preparedBy: 'Akanga Andrew, Software Engineering Intern, Department of Quality, Health, Safety and Environment',
    issueDate: '21/08/2026',
    version: '002',
    classification: 'Internal, Restricted to KMC ICT, the data protection owner and departmental management',
  },

  build(d, L) {
    const b = [];
    const p = (t) => b.push(L.para(t));
    const bl = (t) => b.push(L.bullet(t));

    // ------------------------------------------------------------------ 1
    b.push(L.h1(d, 'The request'));

    b.push(L.h2(d, 'What is requested'));
    p('The Department of Quality, Health, Safety and Environment requests that KMC ICT provide a hosted environment on Corporation controlled infrastructure, and the access described in Section 4, so that the Health and Wellness Management System can be tested by the people who will use it.');
    p('The request is for user acceptance testing only. It is not a request to place the system into service, and it is not a request to process any real clinical record. Both of those are separate requests which the Department will make when the conditions in Section 7 have been met.');

    b.push(L.h2(d, 'What is not requested'));
    p('The following are deliberately outside this request, so that approving it commits the Corporation to nothing beyond a controlled test.');
    bl('Authority to enter, import or process any real patient record.');
    bl('Authority to place the system into operational service.');
    bl('Connection to the Human Resource portal or any other Corporation system.');
    bl('Any external or internet facing exposure of the environment.');
    bl('Permanent allocation of infrastructure beyond the testing period.');

    b.push(L.h2(d, 'Why an environment is needed'));
    p('The system has so far been demonstrated on a development machine. A demonstration answers whether the workflow looks right. It cannot answer whether the officer can complete a visit in the time a real clinic allows, whether the manager can administer accounts without assistance, or whether the roles hold when three people use the system at once.');
    p('Those questions can only be answered by the people who do the work, using the system on Corporation infrastructure, on the network they will actually use. That is what this request is for.');

    // ------------------------------------------------------------------ 2
    b.push(L.h1(d, 'The system being tested'));

    b.push(L.h2(d, 'Purpose'));
    p('The system records the operational work of the Health and Wellness division and derives the divisional performance report from those records. Its scope is the Occupational Health, Ergonomics and Wellness, and Industrial Hygiene units. It replaces a paper process, and it is not connected to any other Corporation system.');

    b.push(L.h2(d, 'What is built'));
    const t22 = L.tableCaption(d, 'Functions available for testing');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Function', 'Status'],
      [
        ['Sign-in through Keycloak on the KMC theme, with three application roles', 'Built, awaiting user testing'],
        ['KMC-branded signed-in shell with the active role displayed', 'Built, awaiting user testing'],
        ['Account administration by the manager', 'Built, awaiting user testing'],
        ['Patient registry, clinic visits, laboratory and consolidated patient history', 'Built, awaiting user testing'],
        ['Patient history summary download containing signed visits only', 'Built. Separate export auditing is not built'],
        ['Medical referral on KMC.DQHSE.02/26-FM004 through drafted, authorised, issued, returned and reviewed', 'Built, with DEC-024 management access open'],
        ['Ergonomic assessments with corrective actions', 'Built, awaiting user testing'],
        ['Industrial hygiene events and readings evaluated against the limit in force on the reading date', 'Built, awaiting user testing'],
        ['Occupational plan and monthly return entry with retained corrections', 'Built, awaiting user testing'],
        ['Nine-indicator dashboard leading with off-target and approaching exceptions', 'Built, with year-to-date semantics open at DEC-032'],
      ],
      [6200, 3400],
    ));

    b.push(L.h2(d, 'Technical summary'));
    const t23 = L.tableCaption(d, 'Technical summary of the system');
    b.push(t23.paragraph);
    b.push(L.table(
      ['Item', 'Detail'],
      [
        ['Application services', 'Six Go services: gateway, identity, clinical, admin, occupational and metrics'],
        ['Browser interface', 'A separate web origin serving the React interface and proxying authenticated calls to the gateway'],
        ['Identity', 'Keycloak, holding accounts and roles'],
        ['Data', 'Two PostgreSQL instances. The shared instance holds separate Keycloak, identity, admin, occupational and metrics databases. The clinical database is on the second instance with separate credentials'],
        ['Packaging', 'Container images. The whole system starts from one composed definition'],
        ['External dependencies', 'None. The system calls no Corporation system and no internet service'],
        ['Interfaces used', 'The browser interface only'],
      ],
      [2400, 7200],
    ));

    // ------------------------------------------------------------------ 3
    b.push(L.h1(d, 'Data handling during testing'));

    b.push(L.h2(d, 'Synthetic data only'));
    p('No real patient record, and no record about any identifiable person, is entered into the testing environment at any point. Every patient, visit, laboratory requisition, referral, assessment, monitoring event and monthly return used in testing is invented for the purpose. Participants are instructed not to use the name of any real colleague, and not to describe any real medical event.');
    p('This is stated as an absolute rather than as an intention because it is the control most easily eroded by convenience. It is the single condition on which the rest of this request rests, and if it cannot be held then the request should be refused.');

    b.push(L.h2(d, 'Why this matters'));
    p('Data concerning health is special personal data under the Data Protection and Privacy Act, 2019. Entering a real record into a testing environment would be a disclosure of that data regardless of the intention behind it, and would place obligations on the Corporation that a test environment is not built to meet.');

    b.push(L.h2(d, 'Handling and disposal'));
    const t33 = L.tableCaption(d, 'Data handling undertakings');
    b.push(t33.paragraph);
    b.push(L.table(
      ['Undertaking', 'Detail'],
      [
        ['Synthetic content only', 'Verified before each testing session rather than assumed'],
        ['No real-data export', 'Only laboratory forms, referral forms and patient history summaries containing synthetic test content may be copied out for review'],
        ['No production copy', 'Nothing from this environment is copied into any future production environment'],
        ['Destruction', 'The environment and its data are destroyed within ten working days of the testing period closing'],
        ['Incident handling', 'If a real record is entered by mistake, testing halts, the record is destroyed and the data protection owner is informed the same day'],
      ],
      [2600, 7000],
    ));

    // ------------------------------------------------------------------ 4
    b.push(L.h1(d, 'Access requested'));

    b.push(L.h2(d, 'Infrastructure'));
    const t41 = L.tableCaption(d, 'Infrastructure requested');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Item', 'Requested', 'Reason'],
      [
        ['Host', 'One Corporation controlled host able to run containers', 'The system is delivered as container images'],
        ['Processor and memory', 'Four processor cores and eight gigabytes of memory', 'Six application services, a web origin, an identity provider and two PostgreSQL instances'],
        ['Storage', 'Fifty gigabytes', 'Databases, container images and logs for the testing period'],
        ['Network exposure', 'Plant network only, no external route', 'Testing does not require access from outside the plant'],
        ['Name and certificate', 'One internal host name with a certificate', 'Required to serve the system over an encrypted connection'],
        ['Duration', 'The testing period plus ten working days', 'Allows findings to be reproduced before the environment is destroyed'],
      ],
      [2000, 3400, 4200],
    ));

    b.push(L.h2(d, 'Access for people'));
    p('Two kinds of access are requested. Access to the host, which is technical and requested for one named person, and access to the application, which is requested for the testing participants and is created inside the application by the manager rather than by ICT.');
    const t42 = L.tableCaption(d, 'Access requested for named people');
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

    b.push(L.h2(d, 'What ICT is asked to do'));
    const t43 = L.tableCaption(d, 'Actions requested of KMC ICT');
    b.push(t43.paragraph);
    b.push(L.table(
      ['Action', 'Detail'],
      [
        ['Provide the host', 'With the specification in Table 4.1'],
        ['Terminate encryption', 'Provide the internal name and certificate, and terminate the encrypted connection at the ingress'],
        ['Issue credentials', 'Generate the database, identity provider, OIDC client and internal metrics ingest secrets from a controlled source. The Department will not supply them'],
        ['Restrict the console', 'Limit the identity provider administrative console to an administrative network'],
        ['Resolve the clinical database connection', 'If k3s is used, provide PostgreSQL server TLS configuration matching the required clinical database URL, or approve a different connection policy. The clinical service cannot connect as the manifests currently stand'],
        ['Review this request', 'Confirm that the arrangement is acceptable, or return conditions'],
      ],
      [2600, 7000],
    ));

    // ------------------------------------------------------------------ 5
    b.push(L.h1(d, 'Approval route'));
    p('This request requires three approvals. They are sought in the order shown so that a refusal at any point stops the work before the next party spends time on it.');
    b.push(...L.figure(d, 'hwms-uat-access', 'Approval and provisioning route'));
    b.push(L.richPara([
      'Where the request is refused, the route in ',
      { ref: 'fig_5_1', cached: 'Figure 5.1' },
      ' returns the conditions to the Department, which resubmits when they are met.',
    ]));

    const t51 = L.tableCaption(d, 'Approvals required');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Approver', 'Approving what', 'Basis'],
      [
        ['Head of Department, Quality, Health, Safety and Environment', 'That the testing is wanted and the participants are released to take part', 'Business need'],
        ['Data protection owner', 'That synthetic data only is sufficient protection for a test of this kind', 'Data Protection and Privacy Act, 2019'],
        ['KMC ICT', 'That the environment, the network exposure and the credential handling are acceptable', 'Corporation infrastructure standards'],
      ],
      [3000, 4200, 2400],
    ));

    // ------------------------------------------------------------------ 6
    b.push(L.h1(d, 'Testing plan'));

    b.push(L.h2(d, 'Participants'));
    const t61 = L.tableCaption(d, 'Testing participants and their role in the test');
    b.push(t61.paragraph);
    b.push(L.plainTable(
      ['Participant role', 'Name', 'What they test', 'Time required'],
      [
        ['Health and Wellness Officer', '', 'Clinical workflow, referral, ergonomics, hygiene, occupational plan and monthly return', 'Four sessions of one hour'],
        ['Health and Wellness Manager', '', 'Account administration, operational read-only views, dashboard and absence of clinical access', 'Two sessions of one hour'],
        ['Nominated Director', '', 'Executive view and the absence of clinical content in it', 'One session of one hour'],
        ['Departmental engineer', '', 'Deployment, defect reproduction and environment destruction', 'Throughout'],
      ],
      [2400, 2000, 3600, 1600],
    ));

    b.push(L.h2(d, 'What will be tested'));
    const t62 = L.tableCaption(d, 'Acceptance criteria for user testing');
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
        ['UAT-07', 'The patient record shows visits, laboratory work and referrals together, in one place, and the summary download excludes unsigned visits'],
        ['UAT-08', 'The manager creates an officer account, and that creation appears in the audit trail'],
        ['UAT-09', 'The manager and the director cannot reach any patient, visit, laboratory or referral record by any route'],
        ['UAT-10', 'Every retrieval of a record by the officer appears in the access log'],
        ['UAT-11', 'Indicators with no underlying records read no data rather than zero'],
        ['UAT-12', 'Every status remains distinguishable when colour is removed from the display'],
        ['UAT-13', 'A referral derives patient identity and vital signs from its visit, advances through all five states and produces a recognisable form'],
        ['UAT-14', 'Returned referral leave reaches absenteeism once and is shown separately from the manually entered lost days'],
        ['UAT-15', 'An ergonomic assessment creates corrective actions and the dashboard counts actions against their due month'],
        ['UAT-16', 'A hygiene reading uses the limit in force on its reading date, shows the copied limit and retains the same result after a later limit is introduced'],
        ['UAT-17', 'Correcting an occupational plan or monthly return requires a reason and leaves the former values available'],
        ['UAT-18', 'The dashboard shows nine indicators, leads with exceptions and treats missing months as gaps rather than zero'],
      ],
      [1600, 8000],
    ));
    p('Criterion UAT-09 is the acceptance gate for the confidentiality design and is tested deliberately rather than incidentally. A participant will be asked to attempt to reach a clinical record from the manager and director accounts, including by entering an address directly.');

    b.push(L.h2(d, 'Recording and outcome'));
    p('Findings are recorded against the criterion they relate to, with the participant, the date and what was observed. At the close of testing the Department issues a report stating which criteria passed, which failed and what will be done about each. That report, and not this document, is what supports any later request to place the system into service.');

    // ------------------------------------------------------------------ 7
    b.push(L.h1(d, 'Conditions and undertakings'));

    b.push(L.h2(d, 'Undertakings by the department'));
    p('In making this request the Department undertakes the following for the duration of the testing period.');
    bl('No real clinical record will be entered into the environment.');
    bl('Access will be limited to the named participants in Table 6.1.');
    bl('Accounts will be disabled and the environment destroyed within ten working days of the close of testing.');
    bl('Any defect that exposes a record across roles will halt testing until it is closed.');
    bl('Any accidental entry of real data will be reported to the data protection owner the same day.');

    b.push(L.h2(d, 'Before any later request'));
    p('The Department acknowledges that a later request to process real clinical records will require the following, and that none of it is granted by approving this request.');
    const t72 = L.tableCaption(d, 'Conditions for any later operational request');
    b.push(t72.paragraph);
    b.push(L.table(
      ['Condition', 'Owner'],
      [
        ['Multi factor authentication for the clinical and administrative roles', 'KMC ICT'],
        ['A separate audit boundary with insert-only access for the clinical service', 'KMC ICT and development'],
        ['A distinct clinical audit event for patient history export', 'Development and data protection owner'],
        ['A scoped service account replacing the shared clinical to metrics secret', 'KMC ICT'],
        ['Clinical PostgreSQL TLS configuration matching the connection policy', 'KMC ICT'],
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
    const t81 = L.tableCaption(d, 'Requesting party');
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
    const t82 = L.tableCaption(d, 'Approving parties');
    b.push(t82.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Approved or conditions', 'Signature', 'Date'],
      [
        ['Head of Department, Quality, Health, Safety and Environment', '', '', '', ''],
        ['Data Protection Owner', '', '', '', ''],
        ['KMC ICT', '', '', '', ''],
      ],
      [3000, 1800, 2400, 1600, 1200],
    ));

    b.push(L.spacer());
    const t83 = L.tableCaption(d, 'Provisioning record, completed by KMC ICT');
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
