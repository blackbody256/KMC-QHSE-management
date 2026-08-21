const SYSTEM = 'HEALTH AND WELLNESS MANAGEMENT SYSTEM';

module.exports = {
  slug: 'hwms-srs',
  filename: 'HWMS Software Requirements Specification.docx',
  meta: {
    system: SYSTEM,
    title: 'Software requirements specification',
    reference: 'KMC.DQHSE.08/26-SP001',
    description: 'Requirements for the Health and Wellness Management System covering the patient registry, clinic visits, laboratory requisitions, medical referrals and divisional performance reporting',
    preparedBy: 'Akanga Andrew, Software Engineering Intern, Department of Quality, Health, Safety and Environment',
    issueDate: '21/08/2026',
    version: '004',
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
    const t13 = L.tableCaption(d, 'Terms used in this specification');
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
    const t14 = L.tableCaption(d, 'Source documents and their status');
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
    b.push(L.h1(d, 'Users and access'));

    b.push(L.h2(d, 'User roles'));
    p('The system has three roles. The separation between them is the most consequential design decision in this specification and it is treated as a requirement rather than a configuration choice.');
    const t21 = L.tableCaption(d, 'Roles and what each may do');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Role', 'May see', 'May enter', 'Clinical access'],
      [
        ['Health and Wellness Officer', 'Everything except account administration and reference changes', 'Patients, visits, laboratory, referrals, monitoring, occupational plans and monthly returns', 'Yes, and each retrieval is logged'],
        ['Manager', 'Dashboard, unit pages, monthly returns, reference data and accounts', 'Accounts, KPI targets and exposure limits through the API', 'None'],
        ['Director', 'Dashboard and summary reports', 'Nothing', 'None'],
      ],
      [2400, 3000, 2600, 1400],
    ));
    p('The Director sees less than the Manager. That reflects the oversight task rather than lesser authority, and it is recorded here because it inverts the usual hierarchy and would otherwise be read as a defect.');

    b.push(L.h2(d, 'The clinical access rule'));
    p('An individual clinical record is accessible to the Health and Wellness Officer alone. No other role may retrieve one. Not the Manager, not the Director, not a system administrator, not a report generator, and not a background job.');
    p('This is the standard occupational health separation and it protects three parties at once. It protects the employee from employment consequences flowing from a medical disclosure. It protects the officer from pressure to disclose. It protects the Corporation from liability under the Data Protection and Privacy Act, 2019, under which data concerning health is special personal data.');
    b.push(...L.figure(d, 'hwms-clinical-access', 'Where the clinical access rule is enforced'));
    b.push(L.richPara([
      'The arrangement in ',
      { ref: 'fig_2_1', cached: 'Figure 2.1' },
      ' is deliberate repetition. Any one of the four layers refuses the request on its own, so no single mistake in configuration, routing or code removes the protection.',
    ]));

    const t22 = L.tableCaption(d, 'Access requirements');
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
    b.push(L.h1(d, 'Patient registry'));
    p('The registry identifies any person eligible to attend the clinic, whether or not they are an employee. It is keyed on a patient identifier and not on a staff number, because a registry that demanded a staff number would force clinical staff either to turn a patient away or to invent an identifier under time pressure. Neither is acceptable.');
    const t31 = L.tableCaption(d, 'Patient registry requirements');
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
    b.push(L.h1(d, 'Clinic visits'));

    b.push(L.h2(d, 'Structure of the record'));
    p('The visit record follows the order of the paper form the clinic already uses. Clinical staff have muscle memory for that sequence and reordering it for interface convenience would cost more than it saves.');
    p('The full form is rarely completed. A patient presenting with a minor complaint will have no systemic examination and no occupational history recorded, and that is a clinical judgement rather than an omission. Each section therefore carries an explicit state.');
    const t41 = L.tableCaption(d, 'Section states and what each means');
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

    b.push(L.h2(d, 'Visit requirements'));
    const t42 = L.tableCaption(d, 'Clinic visit requirements');
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
    const t51 = L.tableCaption(d, 'Investigations offered on the requisition form');
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

    const t52 = L.tableCaption(d, 'Laboratory requirements');
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
    p('The referral reproduces form KMC.DQHSE.02/26-FM004. It is implemented in the clinical service and in the signed-in interface. A referral is raised from a visit, passes through infirmary clearance and authorisation, is issued to the receiving facility, and is closed when the facility responds and the clinic reviews that response.');
    p('Patient identity and vital signs are derived by the service from a database join between the patient and visit. The join also proves that the visit belongs to the stated patient. This prevents a stale browser tab from filing one person\'s identity and vital signs against another person\'s attendance.');
    const t61 = L.tableCaption(d, 'Referral requirements and implementation position');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement', 'Position at issue'],
      [
        ['REF-01', 'A referral is raised from a visit. Patient identity and vital signs are derived server side from records joined on the patient and visit', 'Built'],
        ['REF-02', 'The referral records clinical features, findings, general examination and past medical history as the form sets them out', 'Built'],
        ['REF-03', 'The referral records the occupational consideration and the reason for referral', 'Built'],
        ['REF-04', 'The referral carries a lifecycle of drafted, authorised, issued, returned and reviewed, moving forward one state at a time', 'Built'],
        ['REF-05', 'The receiving facility response records diagnosis, treatment, follow up and any recommended sick leave. A correction keeps the referral reviewed and increments its version', 'Built'],
        ['REF-06', 'Recommended sick leave reaches health related absenteeism through a transactional outbox without carrying patient identity or clinical narrative', 'Built'],
        ['REF-07', 'A referral is downloadable as a document reproducing the printed form', 'Built in the browser'],
        ['REF-08', 'The duplicate Section E labels, missing Section D and older role wording remain as printed until Document Control authorises a revision', 'Built, with DEC-025 and DEC-026 open'],
        ['REF-09', 'No management role may retrieve a referral or its authorisation summary until DEC-024 resolves the conflict between the form and the clinical access rule', 'Built as officer-only access'],
      ],
      [1300, 6100, 2200],
    ));
    p('Requirement REF-06 matters more than it appears. Without it the referral is a document store rather than a part of the system, and the absenteeism figure loses a source it should have.');

    p('Section C still requires a decision. The printed form asks the Head of Division and the Chief of Staff to sign a document containing a provisional diagnosis, HIV status and mental health condition. That cannot stand alongside the rule in Section 2.2 that no management role sees an individual clinical record. The service can assemble a minimum-disclosure summary, but that route is officer-only and no management role can open referral content while DEC-024 remains unresolved.');

    // ------------------------------------------------------------------ 7
    b.push(L.h1(d, 'Patient history'));
    p('An officer meeting a patient asks one question before any other, which is what has happened to this person. Answering it from three separate registers, one for visits, one for laboratory and one for referrals, requires the officer to filter each and hold the join in their head. The records are already related, because a requisition and a referral are each raised from a visit, and presenting them as unrelated lists throws that relationship away at the moment it matters.');
    b.push(...L.figure(d, 'hwms-patient-record', 'Organisation of the patient record'));
    b.push(L.richPara([
      'The organisation in ',
      { ref: 'fig_7_1', cached: 'Figure 7.1' },
      ' takes the visit as the unit of the record, because that is how the clinical work actually happened.',
    ]));
    const t71 = L.tableCaption(d, 'Patient history requirements and implementation position');
    b.push(t71.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement', 'Position at issue'],
      [
        ['HIS-01', 'One patient record shows identity, what is outstanding, how much history exists, and the history itself', 'Built'],
        ['HIS-02', 'History is presented newest first, with one entry per visit', 'Built'],
        ['HIS-03', 'Requisitions and referrals appear inside the visit they were raised from', 'Built'],
        ['HIS-04', 'Each visit entry quotes the presenting complaint, the impression and the treatment', 'Built'],
        ['HIS-05', 'Outstanding items are shown only when something is outstanding', 'Built'],
        ['HIS-06', 'A requisition or referral whose visit is outside the loaded range is listed separately rather than omitted', 'Built'],
        ['HIS-07', 'Opening a patient record writes one entry to the access log, not one per register consulted', 'Built'],
        ['HIS-08', 'The officer may download a patient history summary containing signed visits only and a filename containing no patient name or identifier', 'Built in the browser'],
        ['HIS-09', 'A patient history download creates a distinct export access event before the file is generated', 'Not built, DEC-037 is open'],
      ],
      [1300, 6100, 2200],
    ));
    p('Requirement HIS-05 exists because a permanent banner reading that nothing is outstanding teaches people to stop reading banners, and the one occasion it matters is the occasion it is scrolled past.');

    // ------------------------------------------------------------------ 8
    b.push(L.h1(d, 'Divisional performance'));
    p('The operational registers and the dashboard are implemented. The dashboard presents the indicators the division reports for the selected month and for the year to date. Every figure states its provenance, because a figure that cannot be traced to a record or an attributed return cannot be defended when it is questioned.');

    b.push(L.h2(d, 'Effective-dated reference data'));
    p('KPI targets and industrial hygiene limits are held by the admin service as dated rows. A new value closes the row it replaces and opens another from its effective date. The target or limit itself is not overwritten, because doing so would make a historical report change when it is run again.');
    const t81 = L.tableCaption(d, 'Reference data requirements and implementation position');
    b.push(t81.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement', 'Position at issue'],
      [
        ['ADM-01', 'A KPI target records its value, comparison, direction, approaching boundary, source, approval state and effective period', 'Built'],
        ['ADM-02', 'An industrial hygiene limit records its parameter, context, value, unit, averaging period, standard, source, approval state and effective period', 'Built'],
        ['ADM-03', 'Consumers resolve the row in force on the date being evaluated, rather than the row current today', 'Built'],
        ['ADM-04', 'Superseding reference data closes the current row and creates a new dated row, so prior values remain available', 'Built'],
        ['ADM-05', 'The authorised owner may change reference data without a code release', 'API built for the manager. Ownership and a screen remain open at DEC-035'],
      ],
      [1300, 6100, 2200],
    ));

    b.push(L.h2(d, 'Ergonomics and wellness'));
    p('Ergonomic assessments and their corrective actions are implemented in the occupational service and in the interface. The dashboard measures follow-through rather than the assessment outcome, because finding a problem is not the same as closing the action raised from it.');
    const t82 = L.tableCaption(d, 'Ergonomics requirements and implementation position');
    b.push(t82.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement', 'Position at issue'],
      [
        ['ERG-01', 'An assessment records its date, workstation, work type, assessor, outcome and findings', 'Built'],
        ['ERG-02', 'The outcome is compliant, partially compliant or non-compliant, because the middle position is a distinct assessment result', 'Built'],
        ['ERG-03', 'An assessment may create corrective actions with a description, owner and due date', 'Built'],
        ['ERG-04', 'An action records open, implemented or closed status, and a closed action records its closure date and evidence', 'Built'],
        ['ERG-05', 'Ergonomic risk control is actions closed on or before their due date divided by actions due in the reporting month', 'Built. Formula and target remain confirmation-pending'],
        ['ERG-06', 'The officer writes the register and the manager reads it without write access', 'Built'],
      ],
      [1300, 6100, 2200],
    ));

    b.push(L.h2(d, 'Industrial hygiene'));
    p('Monitoring events and readings are implemented in the occupational service and in the interface. Completeness is kept separate from compliance, because a unit must not appear more compliant merely by performing less monitoring.');
    const t83 = L.tableCaption(d, 'Industrial hygiene requirements and implementation position');
    b.push(t83.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement', 'Position at issue'],
      [
        ['HYG-01', 'A monitoring event records the month, date, location, instrument, notes and whether it was performed', 'Built'],
        ['HYG-02', 'An event not performed records a reason and cannot receive readings', 'Built'],
        ['HYG-03', 'A reading records the parameter, value, monitoring context and the date on which it was taken', 'Built'],
        ['HYG-04', 'The service resolves the limit in force on the reading date and copies the reference identifier, value, unit, averaging period and standard onto the reading', 'Built'],
        ['HYG-05', 'The compliance result is written from that copied limit and a database trigger prevents later changes to the measurement, snapshot or result', 'Built'],
        ['HYG-06', 'A reading outside the monitoring plan remains in the register but may be excluded from the KPI denominator', 'Built'],
        ['HYG-07', 'The officer writes the register and the manager reads it without write access', 'Built'],
      ],
      [1300, 6100, 2200],
    ));

    b.push(L.h2(d, 'Monthly returns'));
    p('The monthly occupational plan and the attributed return are implemented on one monthly returns page because the officer must see the operational counts, Human Resources figures, safety figures and linked referral leave together before reviewing the resulting rates. They remain separate records and each correction keeps its former value and the reason.');
    const t84 = L.tableCaption(d, 'Monthly return requirements and implementation position');
    b.push(t84.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement', 'Position at issue'],
      [
        ['RET-01', 'The occupational plan records planned hygiene events, planned ergonomic assessments and confirmed occupational disease cases for the month', 'Built. Placement and ownership remain open at DEC-036'],
        ['RET-02', 'The return records other health related lost days, month-end headcount, surveillance scheduled and completed, and the source of those figures', 'Built'],
        ['RET-03', 'Fatalities, recordable incidents, recordable injuries and reportable near misses are optional attributed figures with a named source. Blank means No data', 'Built. Authoritative ownership remains open at DEC-027'],
        ['RET-04', 'Correcting a plan or return requires a reason and keeps the prior row with who corrected it and when', 'Built'],
        ['RET-05', 'The entry page computes absenteeism and surveillance rates while figures are typed, while the dashboard recomputes from stored inputs', 'Built'],
        ['RET-06', 'Linked referral leave is shown separately and is not re-keyed into the return', 'Built'],
        ['RET-07', 'No workplace safety incident register is provided while the authoritative system and owner are unresolved', 'Built as an intentional absence'],
        ['RET-08', 'The officer writes the return and the manager reads it without write access', 'Built'],
      ],
      [1300, 6100, 2200],
    ));

    b.push(L.h2(d, 'KPI dashboard'));
    const t85 = L.tableCaption(d, 'Nine dashboard indicators');
    b.push(t85.paragraph);
    b.push(L.table(
      ['Identifier', 'Indicator', 'Current stored target', 'Direction', 'Source'],
      [
        ['OH1', 'Surveillance compliance', '100 per cent', 'Higher is better', 'Monthly return'],
        ['OH2', 'Occupational disease cases', 'Zero', 'Lower is better', 'Occupational plan'],
        ['OH3', 'Industrial hygiene compliance', 'At least 95 per cent', 'Higher is better', 'Eligible readings'],
        ['OH4', 'Ergonomic risk control', 'At least 95 per cent', 'Higher is better', 'Actions due'],
        ['S1', 'Fatality', 'Zero', 'Lower is better', 'Attributed return'],
        ['S2', 'Total recordable incidents', 'Zero', 'Lower is better', 'Attributed return'],
        ['S3', 'Total recordable injuries', 'Zero', 'Lower is better', 'Attributed return'],
        ['S4', 'Reportable near misses', 'At least 200', 'Higher is better', 'Attributed return'],
        ['S5', 'Health related absenteeism', 'Under 0.5 days per person', 'Lower is better', 'Monthly return plus referral leave'],
      ],
      [900, 2600, 2200, 1700, 2200],
    ));
    p('The safety indicator set and directions come from the client dashboard. The current database rows also carry values from the reviewed prototype. They are marked confirmation-pending rather than approved, because review of a prototype did not authorise a threshold or assign its owner.');
    p('Two properties of this indicator set are easy to get wrong and are stated as requirements. Fatalities and injuries count people, while recordable incidents and near misses count events, because one event injuring three people is one incident and three injuries. Reportable near misses is the one indicator where a rising number is good, because more near miss reports mean people are reporting, and a dashboard that appears to punish reporting will be given silence.');

    const t86 = L.tableCaption(d, 'Dashboard requirements');
    b.push(t86.paragraph);
    b.push(L.table(
      ['Reference', 'Requirement'],
      [
        ['DSH-01', 'Every indicator is shown with its value for the month, its year-to-date value, its target and its status'],
        ['DSH-02', 'Every indicator states its provenance'],
        ['DSH-03', 'An indicator with no underlying data reads no data, and never zero'],
        ['DSH-04', 'No data is presented as a distinct state and never styled as a failure'],
        ['DSH-05', 'The direction of each indicator is labelled, including where a rising number is good'],
        ['DSH-06', 'A target whose owner has not approved it is labelled proposed'],
        ['DSH-07', 'No status is conveyed by colour alone'],
        ['DSH-08', 'Figures derived from clinical records are aggregates only and never identify a patient'],
        ['DSH-09', 'A complete year-to-date history totals count indicators and recomputes rate indicators from summed numerators and denominators. An incomplete history shows no figure'],
        ['DSH-10', 'The selected month leads with off-target and approaching exceptions, while missing data is counted separately as entry outstanding'],
        ['DSH-11', 'Each indicator shows its monthly trend from January, and a missing month breaks the trend rather than being interpolated'],
      ],
      [1600, 8000],
    ));
    p('Requirement DSH-03 is the reason the system exists. A dashboard that shows zero where it means it does not know is worse than one that shows nothing, because the reader acts on it.');
    p('Requirement DSH-09 records the implementation, but it is not yet a settled client requirement. The current requirements draft calls every year-to-date cell a monthly average. The client-reviewed prototype totals OH2 and S1 to S4, then recomputes OH1, OH3, OH4 and S5 from summed inputs. The implementation follows the prototype because counts accumulate and rates should preserve their denominators. These are two client-facing positions with different meanings, so the Health and Wellness division must resolve DEC-032 before either wording is treated as approved.');

    // ------------------------------------------------------------------ 9
    b.push(L.h1(d, 'Non-functional requirements'));
    const t91 = L.tableCaption(d, 'Non-functional requirements');
    b.push(t91.paragraph);
    b.push(L.table(
      ['Area', 'Requirement'],
      [
        ['Security', 'All traffic encrypted in transit. The clinical database encrypted at rest with a key distinct from other data'],
        ['Privacy', 'Clinical data is special personal data and does not leave KMC controlled infrastructure'],
        ['Privacy', 'Non production environments contain synthetic data only and never a real clinical record'],
        ['Privacy', 'Ordinary request and panic logs record a route template rather than a concrete clinical path, so record identifiers do not enter service logs'],
        ['Availability', 'Loss of the system must not prevent clinical treatment. A printable form and retrospective entry are available'],
        ['Recovery', 'Nightly encrypted backup, with a restore tested and recorded quarterly'],
        ['Usability', 'A user familiar with the paper form completes a routine visit after one orientation session'],
        ['Usability', 'An error message states the corrective action rather than only reporting failure'],
        ['Accessibility', 'The interface is operable by keyboard, with visible focus and labelled fields'],
        ['Maintainability', 'Limits, targets and reference data are changeable without a code release'],
        ['Maintainability', 'Database changes are applied through versioned migrations held in source control'],
        ['Auditability', 'Every reported figure is traceable to the records or the return that produced it'],
        ['Branding', 'The identity provider sign-in pages and the signed-in shell carry KMC branding, while the final product name remains open at DEC-028'],
      ],
      [2200, 7400],
    ));

    // ------------------------------------------------------------------ 10
    b.push(L.h1(d, 'Decisions required'));
    p('The following decisions remain open in the stakeholder decision register. The current posture is stated because it explains the implementation, but it is not client approval. Confirmed decisions DEC-018 to DEC-023, DEC-030 and DEC-031 are reflected in the requirements above and are not repeated as approval requests.');
    const t101 = L.tableCaption(d, 'Open decisions and current posture');
    b.push(t101.paragraph);
    b.push(L.table(
      ['Reference', 'Decision required', 'Current posture', 'Owner'],
      [
        ['DEC-024', 'May management authorisers see individual referral content', 'No management route exists. The minimum-disclosure summary is officer-only', 'Accountable sponsor and Data Protection Officer'],
        ['DEC-025', 'Should the referral form section numbering be corrected', 'The duplicate Section E labels and missing Section D are reproduced and flagged', 'Document Control and Health and Wellness Officer'],
        ['DEC-026', 'Should the printed infirmary officer title be replaced', 'The printed wording is retained pending a controlled form revision', 'Document Control and Health and Wellness Officer'],
        ['DEC-027', 'Who owns the four Workplace Safety figures and their authoritative system', 'Optional attributed monthly figures are accepted. No incident register is built', 'Benard Okanyakure, Workplace Safety and KMC ICT'],
        ['DEC-028', 'What is the final product name', 'The signed-in shell currently says QHSE Management System and does not mark the name as proposed', 'Benard Okanyakure and accountable executive sponsor'],
        ['DEC-029', 'Does the laboratory require structured units, ranges and abnormality flags beyond the supplied form', 'Results remain free text with no automatic abnormality flag', 'Laboratory Lead and Health and Wellness Officer'],
        ['DEC-032', 'What does each year-to-date value mean', 'Complete counts are totalled and rates are recomputed from summed inputs. Incomplete histories show no figure', 'Health and Wellness division, named owner unknown'],
        ['DEC-033', 'Which month receives referral leave spanning a month end', 'The full value is assigned to the month in which leave begins', 'Health and Wellness division and Human Resources, named owner unknown'],
        ['DEC-034', 'How clinical authenticates to the metrics ingest route', 'A shared secret is used on an internal route. A scoped service account is required before production', 'KMC ICT and information security owner, named individual unknown'],
        ['DEC-035', 'Who may change KPI targets and hygiene limits', 'The manager may write through the API. There is no reference administration screen', 'Accountable sponsor and KMC ICT, named business owner unknown'],
        ['DEC-036', 'Where and by whom the monthly occupational plan is recorded', 'The officer enters it on Monthly returns and the manager reads it. Confirmed disease placement remains to be agreed', 'Health and Wellness Manager and Officer'],
        ['DEC-037', 'Must a patient history download create a distinct audit event', 'The browser download creates no event beyond the earlier detail read', 'Data Protection Officer and KMC ICT'],
      ],
      [1300, 2900, 3500, 1900],
    ));

    b.push(L.h2(d, 'Approval'));
    p('Approval of this specification means that the requirements stated here are agreed as the basis for build and for acceptance. It does not authorise the processing of real clinical records, which is requested separately.');
    b.push(L.spacer());
    const t102 = L.tableCaption(d, 'Specification sign-off');
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
