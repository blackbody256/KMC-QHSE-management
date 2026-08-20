const SYSTEM = 'HEALTH AND WELLNESS MANAGEMENT SYSTEM';

module.exports = {
  slug: 'hwms-srs',
  filename: 'HWMS Software Requirements Specification.docx',
  meta: {
    system: SYSTEM,
    title: 'Software Requirements Specification',
    reference: 'KMC.DQHSE.08/26-SP001',
    description: 'Requirements for the Health and Wellness Management System covering the patient registry, clinic visits, laboratory requisitions, medical referrals and divisional performance reporting',
    preparedBy: 'Akanga Andrew, Software Engineering Intern, Department of Quality, Health, Safety and Environment',
    issueDate: '11/08/2026',
    version: '003',
    classification: 'Internal, Restricted to KMC Health and Wellness Division and ICT',
  },

  build(d, L) {
    const b = [];
    const p = (t) => b.push(L.para(t));
    const bl = (t) => b.push(L.bullet(t));

    // ------------------------------------------------------------------ 1
    b.push(L.h1(d, 'Introduction'));

    b.push(L.h2(d, 'Purpose'));
    p('This Software Requirements Specification defines what the Health and Wellness Management System must do. It is written for the Health and Wellness Division who will use the system, for the Department of Quality, Health, Safety and Environment who own it, and for KMC ICT who will host and later maintain it.');
    p('The Division originally asked for a dashboard into which staff would type summary figures at the end of each working day. This specification proposes something different, and the difference is the central idea of the system. A dashboard fed by end of day typing is a second manual process running alongside the first. It inherits every weakness of the paper it replaces, namely transcription error, delay, and no verifiable link between a reported figure and the event that produced it. The system therefore captures each operational event where it happens, and derives the dashboard from those records. The dashboard is a consequence of the system rather than a component of it.');

    b.push(L.h2(d, 'Scope'));
    p('The system covers the Health and Wellness division of the department. That division comprises three units, which are Occupational Health, Ergonomics and Wellness, and Industrial Hygiene. Occupational Health covers clinic attendance and laboratory testing.');
    p('Quality Inspection and Testing, Workplace Safety, and Environment and Sustainability are outside scope. The client established after the review of 4 August 2026 that those divisions already operate their own systems. Occupational health and safety indicators that the division itself reports remain in scope, because they appear on the divisional performance dashboard the client supplied.');

    b.push(L.h2(d, 'Definitions'));
    const t13 = L.tableCaption(d, 'Terms Used in This Specification');
    b.push(t13.paragraph);
    b.push(L.table(
      ['Term', 'Meaning'],
      [
        ['Officer', 'Health and Wellness Officer. The clinical role. The only role that may retrieve an individual clinical record'],
        ['Manager', 'Health and Wellness manager. Reviews performance and administers user accounts. Holds no clinical access'],
        ['Director', 'Executive consumer of the dashboard. Holds no clinical access and no entry rights'],
        ['Visit', 'One attendance at the clinic by one patient. Called an encounter internally'],
        ['Requisition', 'A laboratory request on form KMC.DQHSE.05/26-FM008, together with the results written against it'],
        ['Referral', 'A referral to an external medical facility on form KMC.DQHSE.02/26-FM004'],
        ['Section state', 'Whether a part of the visit record is not recorded, partial, complete, or not clinically indicated'],
        ['Provenance', 'Whether a reported figure was derived from records, entered from an external source, or is a proposal awaiting approval'],
      ],
      [2400, 7000],
    ));

    b.push(L.h2(d, 'Sources'));
    p('Every requirement in this document derives from one of four sources. Where a requirement derives from none of them it is marked as a proposal and named as such, so that a reader can tell what KMC asked for from what was suggested.');
    const t14 = L.tableCaption(d, 'Source Documents and Their Status');
    b.push(t14.paragraph);
    b.push(L.table(
      ['Source', 'Contribution', 'Status'],
      [
        ['KVP Infirmary Medical Form', 'The structure and order of the clinic visit record', 'Supplied by the division'],
        ['KMC.DQHSE.02/26-FM004', 'The referral to an external facility, field by field', 'Supplied by the division'],
        ['KMC.DQHSE.05/26-FM008', 'The laboratory requisition and its seven investigations', 'Supplied by the division'],
        ['Divisional performance dashboard', 'The indicator set, targets and directions', 'Supplied by the division'],
        ['Requirements interviews and reviews', 'Roles, workflow and the decisions in Section 8', 'Recorded in the decision register'],
      ],
      [3000, 4600, 1800],
    ));

    // ------------------------------------------------------------------ 2
    b.push(L.h1(d, 'Users and Access'));

    b.push(L.h2(d, 'User Roles'));
    p('The system has three roles. The separation between them is the most consequential design decision in this specification and it is treated as a requirement rather than a configuration choice.');
    const t21 = L.tableCaption(d, 'Roles and What Each May Do');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Role', 'May See', 'May Enter', 'Clinical Access'],
      [
        ['Health and Wellness Officer', 'Everything except account administration', 'Patients, visits, laboratory, referrals, monitoring, monthly returns', 'Yes, and it is logged'],
        ['Manager', 'Dashboard, unit pages, monthly returns, accounts', 'Accounts only', 'None'],
        ['Director', 'Dashboard and summary reports', 'Nothing', 'None'],
      ],
      [2400, 3000, 2600, 1400],
    ));
    p('The Director sees less than the Manager. That reflects the oversight task rather than lesser authority, and it is recorded here because it inverts the usual hierarchy and would otherwise be read as a defect.');

    b.push(L.h2(d, 'The Clinical Access Rule'));
    p('An individual clinical record is accessible to the Health and Wellness Officer alone. No other role may retrieve one. Not the Manager, not the Director, not a system administrator, not a report generator, and not a background job.');
    p('This is the standard occupational health separation and it protects three parties at once. It protects the employee from employment consequences flowing from a medical disclosure. It protects the officer from pressure to disclose. It protects the Corporation from liability under the Data Protection and Privacy Act, 2019, under which data concerning health is special personal data.');
    b.push(...L.figure(d, 'hwms-clinical-access', 'Where the Clinical Access Rule Is Enforced'));
    b.push(L.richPara([
      'The arrangement in ',
      { ref: 'fig_2_1', cached: 'Figure 2.1' },
      ' is deliberate repetition. Any one of the four layers refuses the request on its own, so no single mistake in configuration, routing or code removes the protection.',
    ]));

    const t22 = L.tableCaption(d, 'Access Requirements');
    b.push(t22.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['ACC-01', 'Every user is authenticated before any function is available'],
        ['ACC-02', 'Only the officer role may retrieve an individual clinical record'],
        ['ACC-03', 'Authorisation is enforced by the service and not only by hiding controls in the interface'],
        ['ACC-04', 'Every retrieval of an individual clinical record is written to an access log before the record is returned'],
        ['ACC-05', 'The access log is append only and readable by the data protection owner alone'],
        ['ACC-06', 'Every creation, change and deletion of a user account is written to the audit log'],
        ['ACC-07', 'The manager creates officer and director accounts. The manager cannot grant the manager role'],
        ['ACC-08', 'A session ends after a period of inactivity, set conservatively because clinic workstations are shared'],
        ['ACC-09', 'An account holding no role is refused at sign in and told who assigns roles'],
      ],
      [1600, 8000],
    ));

    // ------------------------------------------------------------------ 3
    b.push(L.h1(d, 'Patient Registry'));
    p('The registry identifies any person eligible to attend the clinic, whether or not they are an employee. It is keyed on a patient identifier and not on a staff number, because a registry that demanded a staff number would force clinical staff either to turn a patient away or to invent an identifier under time pressure. Neither is acceptable.');
    const t31 = L.tableCaption(d, 'Patient Registry Requirements');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['PAT-01', 'A patient is registered with name, age, sex, phone contact, department, division, unit and job title'],
        ['PAT-02', 'A patient carries a category of employee, intern or other'],
        ['PAT-03', 'The staff number is optional for every category'],
        ['PAT-04', 'Incomplete organisational detail does not prevent registration, because urgent presentation must never be blocked by data entry'],
        ['PAT-05', 'The registry is searchable by name, staff number and department'],
        ['PAT-06', 'Searching the registry is itself recorded in the access log, because a search reveals who attends'],
        ['PAT-07', 'A patient record is removed by soft deletion only'],
      ],
      [1600, 8000],
    ));

    // ------------------------------------------------------------------ 4
    b.push(L.h1(d, 'Clinic Visits'));

    b.push(L.h2(d, 'Structure of the Record'));
    p('The visit record follows the order of the paper form the clinic already uses. Clinical staff have muscle memory for that sequence and reordering it for interface convenience would cost more than it saves.');
    p('The full form is rarely completed. A patient presenting with a minor complaint will have no systemic examination and no occupational history recorded, and that is a clinical judgement rather than an omission. Each section therefore carries an explicit state.');
    const t41 = L.tableCaption(d, 'Section States and What Each Means');
    b.push(t41.paragraph);
    b.push(L.table(
      ['State', 'Meaning'],
      [
        ['Not recorded', 'Nothing has been entered and no decision has been taken about the section'],
        ['Partial', 'Entry has begun and is not finished'],
        ['Complete', 'The section has been completed'],
        ['Not clinically indicated', 'The officer has decided the section does not apply to this visit'],
      ],
      [3000, 6600],
    ));
    p('The distinction between not recorded and not clinically indicated is the whole purpose of holding a section state. A blank field on paper cannot tell the two apart, and recording the difference is what makes a partially completed record auditable rather than merely tolerated.');

    b.push(L.h2(d, 'Visit Requirements'));
    const t42 = L.tableCaption(d, 'Clinic Visit Requirements');
    b.push(t42.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['VIS-01', 'A visit records the patient, date, time in and a visit type of walk in, referred by supervisor, emergency or follow up'],
        ['VIS-02', 'The record is divided into the twelve sections of the paper form, in the order of that form'],
        ['VIS-03', 'Each section carries one of the four states in Table 4.1'],
        ['VIS-04', 'The number of sections carrying a clinical decision is shown against the visit'],
        ['VIS-05', 'Whether the condition is work related is recorded as yes, no or unsure'],
        ['VIS-06', 'Vital signs are recorded with their units, and body mass index is derived rather than entered'],
        ['VIS-07', 'A vital sign outside the usual range produces a warning and is recorded as entered'],
        ['VIS-08', 'Entry in one section is not lost when the officer moves to another'],
        ['VIS-09', 'Signing locks the visit. A signed visit cannot be edited'],
        ['VIS-10', 'A correction to a signed visit is an appended amendment that preserves the original'],
        ['VIS-11', 'A minimal walk in visit is recordable in under two minutes'],
        ['VIS-12', 'The system records what the officer decided. It does not diagnose, recommend treatment or suggest a clinical action'],
      ],
      [1600, 8000],
    ));
    p('Requirement VIS-07 deserves its reasoning. A genuinely abnormal reading is exactly the reading that matters clinically, and a system that refuses to record it is worse than paper. The interface warns and the service accepts.');

    // ------------------------------------------------------------------ 5
    b.push(L.h1(d, 'Laboratory'));
    p('The laboratory requisition reproduces form KMC.DQHSE.05/26-FM008. The clinic offers seven investigations in four groups. An earlier draft of this system carried a generic occupational health panel including liver function, lipid profile, audiometry and spirometry. None of that appears on the form the clinic uses, and it has been removed.');
    const t51 = L.tableCaption(d, 'Investigations Offered on the Requisition Form');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Group', 'Investigation', 'Note'],
      [
        ['Malaria and parasitology', 'Blood smear for malaria parasites', ''],
        ['Malaria and parasitology', 'Malaria rapid diagnostic test', ''],
        ['Gastrointestinal and serology', 'Typhoid antigen test', ''],
        ['Gastrointestinal and serology', 'Helicobacter pylori stool antigen', ''],
        ['Hematology', 'Complete blood count', ''],
        ['Blood glucose monitoring', 'Random blood sugar', ''],
        ['Blood glucose monitoring', 'Fasting blood sugar', 'Requires 8 to 12 hours of fasting'],
      ],
      [3000, 4400, 2200],
    ));

    p('Two properties of the form drive the design and both differ from what a laboratory module is usually assumed to do. The results column sits beside the requested investigations column, so a result belongs to a requested investigation on one sheet rather than to a separate analyte record. The form carries no units and no reference ranges, so a result is recorded exactly as the laboratory reported it.');
    p('There is therefore no automatic abnormality flag. Deciding that a value is abnormal requires a reference range that KMC has not defined, and inventing one would place a clinical judgement in the software. Whether the laboratory wishes to supply structured ranges is recorded as an open decision in Section 8 rather than answered here.');

    const t52 = L.tableCaption(d, 'Laboratory Requirements');
    b.push(t52.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['LAB-01', 'A requisition is raised from a visit, and patient information is carried across rather than typed again'],
        ['LAB-02', 'Patient information on the requisition is a snapshot taken when the requisition is raised'],
        ['LAB-03', 'The officer selects one or more of the seven investigations printed on the form'],
        ['LAB-04', 'The fasting instruction printed against fasting blood sugar is shown wherever that investigation appears'],
        ['LAB-05', 'The requisition records a clinical summary and the authorising officer'],
        ['LAB-06', 'The laboratory records the specimen collected, who collected it and the time of collection'],
        ['LAB-07', 'A result is recorded against the investigation it was requested for, as written by the laboratory'],
        ['LAB-08', 'The status of a requisition follows what has been recorded, so it cannot disagree with the form'],
        ['LAB-09', 'A requisition is downloadable as a document reproducing the printed form'],
        ['LAB-10', 'An investigation not printed on the form is refused'],
      ],
      [1600, 8000],
    ));

    // ------------------------------------------------------------------ 6
    b.push(L.h1(d, 'Referrals'));
    p('The referral reproduces form KMC.DQHSE.02/26-FM004. A referral is raised from a visit, passes through infirmary clearance and authorisation, is issued to the receiving facility, and is closed when the facility responds and the clinic reviews that response.');
    const t61 = L.tableCaption(d, 'Referral Requirements');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['REF-01', 'A referral is raised from a visit and pre filled from it'],
        ['REF-02', 'The referral records clinical features, findings, general examination and past medical history as the form sets them out'],
        ['REF-03', 'The referral records the occupational consideration and the reason for referral'],
        ['REF-04', 'The referral carries a lifecycle of drafted, authorised, issued, returned and reviewed'],
        ['REF-05', 'The receiving facility response records diagnosis, treatment, follow up and any recommended sick leave'],
        ['REF-06', 'Recommended sick leave from a returned referral feeds health related absenteeism'],
        ['REF-07', 'A referral is downloadable as a document reproducing the printed form'],
      ],
      [1600, 8000],
    ));
    p('Requirement REF-06 matters more than it appears. Without it the referral is a document store rather than a part of the system, and the absenteeism figure loses a source it should have.');

    p('One property of the printed form requires a decision before it is implemented as drawn. Section C of the form requires the Head of Division and the Chief of Staff to sign a document that contains a provisional diagnosis, HIV status and mental health condition. That cannot stand alongside the rule in Section 2.2 that no management role sees an individual clinical record. The decision is recorded in Section 8 and the authorisation view is not built until it is settled.');

    // ------------------------------------------------------------------ 7
    b.push(L.h1(d, 'Patient History'));
    p('An officer meeting a patient asks one question before any other, which is what has happened to this person. Answering it from three separate registers, one for visits, one for laboratory and one for referrals, requires the officer to filter each and hold the join in their head. The records are already related, because a requisition and a referral are each raised from a visit, and presenting them as unrelated lists throws that relationship away at the moment it matters.');
    b.push(...L.figure(d, 'hwms-patient-record', 'Organisation of the Patient Record'));
    b.push(L.richPara([
      'The organisation in ',
      { ref: 'fig_7_1', cached: 'Figure 7.1' },
      ' takes the visit as the unit of the record, because that is how the clinical work actually happened.',
    ]));
    const t71 = L.tableCaption(d, 'Patient History Requirements');
    b.push(t71.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['HIS-01', 'One patient record shows identity, what is outstanding, how much history exists, and the history itself'],
        ['HIS-02', 'History is presented newest first, with one entry per visit'],
        ['HIS-03', 'Requisitions and referrals appear inside the visit they were raised from'],
        ['HIS-04', 'Each visit entry quotes the presenting complaint, the impression and the treatment'],
        ['HIS-05', 'Outstanding items are shown only when something is outstanding'],
        ['HIS-06', 'A requisition whose visit is outside the loaded range is listed separately rather than omitted'],
        ['HIS-07', 'Opening a patient record writes one entry to the access log, not one per register consulted'],
      ],
      [1600, 8000],
    ));
    p('Requirement HIS-05 exists because a permanent banner reading that nothing is outstanding teaches people to stop reading banners, and the one occasion it matters is the occasion it is scrolled past.');

    // ------------------------------------------------------------------ 8
    b.push(L.h1(d, 'Divisional Performance'));
    p('The dashboard presents the indicators the division reports, for the reporting month and for the year to date. Every figure states its provenance, which is whether it was derived from records held in this system, entered from a named external source, or is a proposal awaiting approval.');
    const t81 = L.tableCaption(d, 'Occupational Health and Safety Indicators');
    b.push(t81.paragraph);
    b.push(L.table(
      ['Indicator', 'Target', 'Direction', 'Source'],
      [
        ['Fatalities', 'Zero', 'Lower is better', 'Counts people'],
        ['Workplace injuries', 'Zero', 'Lower is better', 'Counts people, banded by severity'],
        ['Total recordable incidents', 'No target set', 'Informational', 'Counts events'],
        ['Reportable near misses', 'At least 200', 'Higher is better', 'Counts events'],
        ['Health related absenteeism', 'Under 0.5 days per person per month', 'Lower is better', 'Monthly return'],
        ['Occupational health surveillance compliance', '100 per cent', 'Higher is better', 'Monthly return'],
        ['Occupational disease cases', 'Zero confirmed', 'Lower is better', 'Confirmed cases'],
        ['Industrial hygiene compliance', 'At least 95 per cent', 'Higher is better', 'Readings within limit'],
        ['Ergonomic risk control', 'At least 95 per cent', 'Higher is better', 'Actions closed on time'],
      ],
      [3400, 2400, 2000, 1800],
    ));

    p('Two properties of this indicator set are easy to get wrong and are stated as requirements. Fatalities and injuries count people, while recordable incidents and near misses count events, because one event injuring three people is one incident and three injuries. Reportable near misses is the one indicator where a rising number is good, because more near miss reports mean people are reporting, and a dashboard that appears to punish reporting will be given silence.');

    const t82 = L.tableCaption(d, 'Dashboard Requirements');
    b.push(t82.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['DSH-01', 'Every indicator is shown with its value for the month, its year to date value, its target and its status'],
        ['DSH-02', 'Every indicator states its provenance'],
        ['DSH-03', 'An indicator with no underlying data reads no data, and never zero'],
        ['DSH-04', 'No data is presented as a distinct state and never styled as a failure'],
        ['DSH-05', 'The direction of each indicator is labelled, including where a rising number is good'],
        ['DSH-06', 'An indicator without an approved target is shown as informational rather than against an invented one'],
        ['DSH-07', 'No status is conveyed by colour alone'],
        ['DSH-08', 'Figures derived from clinical records are aggregates only and never identify a patient'],
      ],
      [1600, 8000],
    ));
    p('Requirement DSH-03 is the reason the system exists. A dashboard that shows zero where it means it does not know is worse than one that shows nothing, because the reader acts on it.');

    // ------------------------------------------------------------------ 9
    b.push(L.h1(d, 'Non Functional Requirements'));
    const t91 = L.tableCaption(d, 'Non Functional Requirements');
    b.push(t91.paragraph);
    b.push(L.table(
      ['Area', 'Requirement'],
      [
        ['Security', 'All traffic encrypted in transit. The clinical database encrypted at rest with a key distinct from other data'],
        ['Privacy', 'Clinical data is special personal data and does not leave KMC controlled infrastructure'],
        ['Privacy', 'Non production environments contain synthetic data only and never a real clinical record'],
        ['Availability', 'Loss of the system must not prevent clinical treatment. A printable form and retrospective entry are available'],
        ['Recovery', 'Nightly encrypted backup, with a restore tested and recorded quarterly'],
        ['Usability', 'A user familiar with the paper form completes a routine visit after one orientation session'],
        ['Usability', 'An error message states the corrective action rather than only reporting failure'],
        ['Accessibility', 'The interface is operable by keyboard, with visible focus and labelled fields'],
        ['Maintainability', 'Limits, targets and reference data are changeable without a code release'],
        ['Maintainability', 'Database changes are applied through versioned migrations held in source control'],
        ['Auditability', 'Every reported figure is traceable to the records or the return that produced it'],
      ],
      [2200, 7400],
    ));

    // ------------------------------------------------------------------ 10
    b.push(L.h1(d, 'Decisions Required'));
    p('The following decisions are not settled. Each carries a proposed answer which the system implements unless the responsible owner directs otherwise. They are recorded here so that they are agreed deliberately rather than contested later.');
    const t101 = L.tableCaption(d, 'Open Decisions and Proposed Answers');
    b.push(t101.paragraph);
    b.push(L.table(
      ['Reference', 'Decision Required', 'Proposed Answer', 'Owner'],
      [
        ['DEC-01', 'Referral authorisation requires management signatures on a document containing diagnosis and HIV status', 'The authorisation view exposes patient, destination and reason only. Clinical detail stays with the officer and the receiving facility', 'Division and data protection owner'],
        ['DEC-02', 'Does the laboratory want structured reference ranges and abnormality flagging', 'Not implemented. Results are recorded as reported until the laboratory supplies ranges', 'Laboratory'],
        ['DEC-03', 'Which leave categories count as health related absence', 'Certified sick leave and clinic referred absence only', 'Human resources and the division'],
        ['DEC-04', 'Is absenteeism reported monthly or cumulatively', 'Monthly lost days divided by month end headcount, with the year to date shown separately', 'Division'],
        ['DEC-05', 'Who owns the fatality, injury and near miss figures now that Workplace Safety is separate', 'Entered as attributed monthly returns until that division confirms whether it holds them', 'Department'],
        ['DEC-06', 'How long are clinical records retained', 'To be set by KMC policy and legal advice. No period is assumed', 'Legal and data protection owner'],
        ['DEC-07', 'The referral form has two sections labelled E and no section D', 'Followed as printed. The correction is proposed to the form owner', 'Division'],
        ['DEC-08', 'The forms name the role as infirmary officer, which has been renamed', 'Printed wording retained until the forms are reissued', 'Division'],
      ],
      [1400, 3000, 3600, 1600],
    ));

    b.push(L.h2(d, 'Approval'));
    p('Approval of this specification means that the requirements stated here are agreed as the basis for build and for acceptance. It does not authorise the processing of real clinical records, which is requested separately.');
    b.push(L.spacer());
    const t102 = L.tableCaption(d, 'Specification Sign Off');
    b.push(t102.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Prepared by, Software Engineering Intern', '', '', ''],
        ['Reviewed by, Health and Wellness Officer', '', '', ''],
        ['Reviewed by, Health and Wellness Manager', '', '', ''],
        ['Approved by, Head of Department, Quality, Health, Safety and Environment', '', '', ''],
      ],
      [4200, 2000, 2200, 1400],
    ));

    return b;
  },
};
