/*
 * Figure definitions. Each figure is authored as SVG at a large pixel size and
 * converted to PNG at build time, then embedded scaled down so it stays sharp.
 * Everything is black, white and grey, because the house style permits no colour.
 */

const W = 1600;
const S = {
  stroke: '#000000',
  fill: '#FFFFFF',
  shade: '#E4E4E4',
  dark: '#BFBFBF',
  font: 'Times New Roman, Liberation Serif, serif',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Box with centred, optionally wrapped, label. */
function box(x, y, w, h, lines, opts = {}) {
  const fill = opts.shade ? S.shade : (opts.dark ? S.dark : S.fill);
  const dash = opts.dashed ? ' stroke-dasharray="10 8"' : '';
  const size = opts.size || 26;
  const arr = Array.isArray(lines) ? lines : [lines];
  const total = arr.length * (size + 6) - 6;
  let ty = y + h / 2 - total / 2 + size * 0.8;
  let text = '';
  for (const line of arr) {
    text += `<text x="${x + w / 2}" y="${ty}" font-family="${S.font}" font-size="${size}" ` +
      `fill="#000000" text-anchor="middle"${opts.bold ? ' font-weight="bold"' : ''}>${esc(line)}</text>`;
    ty += size + 6;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${S.stroke}" ` +
    `stroke-width="3"${dash} rx="6"/>${text}`;
}

function label(x, y, t, opts = {}) {
  const size = opts.size || 24;
  return `<text x="${x}" y="${y}" font-family="${S.font}" font-size="${size}" fill="#000000" ` +
    `text-anchor="${opts.anchor || 'start'}"${opts.bold ? ' font-weight="bold"' : ''}` +
    `${opts.italic ? ' font-style="italic"' : ''}>${esc(t)}</text>`;
}

function arrow(x1, y1, x2, y2, opts = {}) {
  const dash = opts.dashed ? ' stroke-dasharray="10 8"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S.stroke}" ` +
    `stroke-width="3"${dash} marker-end="url(#ah)"/>`;
}

/** Orthogonal connector through the given points, arrowhead on the last leg. */
function elbow(points, opts = {}) {
  const dash = opts.dashed ? ' stroke-dasharray="10 8"' : '';
  const pts = points.map((p) => p.join(',')).join(' ');
  return `<polyline points="${pts}" fill="none" stroke="${S.stroke}" stroke-width="3"${dash} ` +
    `marker-end="url(#ah)"/>`;
}

function svg(height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">` +
    `<defs><marker id="ah" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">` +
    `<path d="M0,0 L10,4 L0,8 z" fill="#000000"/></marker></defs>` +
    `<rect width="${W}" height="${height}" fill="#FFFFFF"/>${body}</svg>`;
}

// ---------------------------------------------------------------------------

const figures = {};

/** Service topology and request path. */
figures['architecture'] = svg(900, [
  label(20, 40, 'Client tier', { bold: true }),
  box(60, 60, 420, 90, ['Operator portal', 'browser']),
  box(560, 60, 420, 90, ['Driver application', 'device']),
  arrow(270, 150, 270, 225),
  arrow(770, 150, 770, 225),

  label(20, 210, 'Edge', { bold: true }),
  box(60, 230, 1060, 100, ['API gateway, port 8000', 'authenticate, authorise, route, audit'], { shade: true, bold: true }),

  label(20, 425, 'Domain services', { bold: true }),
  box(60, 445, 320, 110, ['fleet-service', 'port 8001']),
  box(420, 445, 320, 110, ['planning-service', 'port 8003']),
  box(780, 445, 320, 110, ['audit-service', 'port 8006']),
  arrow(220, 330, 220, 445),
  arrow(580, 330, 580, 445),
  arrow(940, 330, 940, 445),

  // fleet-service reaches the two supporting systems through the clear
  // corridor between the edge and the domain service rows.
  elbow([[130, 445], [130, 395], [1370, 395], [1370, 445]], { dashed: true }),
  elbow([[130, 445], [130, 395], [1575, 395], [1575, 635], [1566, 635]], { dashed: true }),
  box(1180, 445, 380, 100, ['Juza charger platform', 'external'], { dashed: true, size: 24 }),
  box(1180, 585, 380, 100, ['OSRM routing engine', 'internal only'], { dashed: true, size: 24 }),

  label(20, 720, 'Data tier', { bold: true }),
  box(60, 740, 1100, 110, ['PostgreSQL with PostGIS, one database and one role per service', 'velo_gateway, velo_fleet, velo_planning, velo_audit, velo_energy, velo_alert, velo_notification'], { shade: true, size: 24 }),
  arrow(220, 555, 220, 740),
  arrow(580, 555, 580, 740),
  arrow(940, 555, 940, 740),

  box(1180, 740, 180, 110, ['Kafka'], { dark: true, size: 24 }),
  box(1380, 740, 180, 110, ['Redis'], { dark: true, size: 24 }),

  label(20, 890, 'Dashed border and dashed connector indicate a supporting system reached only by fleet-service', { italic: true, size: 22 }),
].join(''));

/** Trust boundaries and the controls at each crossing. */
figures['trust-boundaries'] = svg(760, [
  box(40, 60, 1520, 640, [], { dashed: true }),
  label(60, 100, 'Deployment boundary', { bold: true, size: 26 }),

  box(90, 140, 420, 100, ['Untrusted zone', 'operator browser, driver device'], { size: 24 }),
  label(560, 175, 'Boundary 1', { bold: true, size: 24 }),
  label(560, 210, 'bearer token validated,', { size: 22 }),
  label(560, 240, 'role checked per route', { size: 22 }),
  arrow(510, 190, 1060, 190),

  box(1080, 140, 420, 100, ['API gateway', 'trusted issuer of identity'], { shade: true, size: 24 }),
  arrow(1290, 240, 1290, 330),
  label(1330, 295, 'Boundary 2, identity headers stripped', { size: 22 }),
  label(1330, 325, 'and reissued, internal secret required', { size: 22 }),

  box(1080, 330, 420, 100, ['Domain services', 'no local authorisation'], { size: 24 }),
  arrow(1290, 430, 1290, 520),
  label(1330, 485, 'Boundary 3, one least privilege', { size: 22 }),
  label(1330, 515, 'database role per service', { size: 22 }),

  box(1080, 520, 420, 100, ['Databases', 'no cross schema access'], { shade: true, size: 24 }),

  box(90, 330, 420, 100, ['Juza charger platform', 'long lived interface key'], { dashed: true, size: 24 }),
  box(90, 520, 420, 100, ['OSRM routing engine', 'not exposed to the host'], { dashed: true, size: 24 }),
  arrow(1080, 380, 512, 380, { dashed: true }),
  arrow(1080, 570, 512, 570, { dashed: true }),
].join(''));

/** Which runbook applies to which failure. */
figures['recovery-decision'] = svg(900, [
  box(560, 40, 480, 90, ['Failure detected'], { shade: true, bold: true }),
  arrow(800, 130, 800, 200),
  box(560, 200, 480, 90, ['Is the database intact?']),

  arrow(560, 245, 380, 245),
  label(400, 225, 'No', { size: 24 }),
  box(60, 200, 300, 90, ['Runbook C', 'restore database'], { shade: true }),

  arrow(800, 290, 800, 360),
  label(820, 335, 'Yes', { size: 24 }),
  box(560, 360, 480, 90, ['Is the host reachable?']),

  arrow(560, 405, 380, 405),
  label(400, 385, 'No', { size: 24 }),
  box(60, 360, 300, 90, ['Runbook D', 'full recovery'], { shade: true }),

  arrow(800, 450, 800, 520),
  label(820, 495, 'Yes', { size: 24 }),
  box(560, 520, 480, 90, ['Did a deployment precede it?']),

  arrow(1040, 565, 1240, 565),
  label(1090, 545, 'Yes', { size: 24 }),
  box(1260, 520, 300, 90, ['Runbook B', 'roll back'], { shade: true }),

  arrow(800, 610, 800, 680),
  label(820, 655, 'No', { size: 24 }),
  box(560, 680, 480, 90, ['Which component failed?']),

  arrow(560, 725, 380, 725),
  box(60, 680, 300, 90, ['Runbook A', 'single service'], { shade: true }),
  arrow(1040, 725, 1240, 725),
  box(1260, 680, 300, 90, ['Runbooks E and F', 'backbone or graph'], { shade: true }),

  label(20, 860, 'Runbook G applies independently whenever a secret is known or suspected to be exposed', { italic: true, size: 22 }),
].join(''));

/** Acceptance testing process. */
figures['uat-process'] = svg(560, [
  box(40, 60, 280, 110, ['Entry criteria', 'confirmed'], { shade: true }),
  arrow(320, 115, 400, 115),
  box(400, 60, 280, 110, ['Test cases', 'executed']),
  arrow(680, 115, 760, 115),
  box(760, 60, 280, 110, ['Defects', 'raised and classified']),
  arrow(1040, 115, 1120, 115),
  box(1120, 60, 300, 110, ['Blocker or major', 'defects open?']),

  arrow(1270, 170, 1270, 280),
  label(1300, 235, 'Yes', { size: 24 }),
  box(1120, 280, 300, 110, ['Correct', 'and retest'], { shade: true }),
  arrow(1120, 335, 560, 335),
  arrow(540, 335, 540, 175),

  arrow(1420, 115, 1500, 115),
  label(1360, 90, 'No', { size: 24 }),
  box(400, 420, 640, 110, ['Operations acceptance signed', 'Section 7'], { shade: true, bold: true }),
  arrow(1500, 170, 1050, 460),

  label(20, 545, 'A major defect may instead be accepted with a documented workaround recorded in Section 6.1', { italic: true, size: 22 }),
].join(''));

/** Environment promotion and rollback. */
figures['promotion-path'] = svg(520, [
  box(60, 80, 360, 120, ['Development', 'feature work', 'unit tests']),
  arrow(420, 140, 540, 140),
  box(540, 80, 360, 120, ['Staging', 'integration and acceptance', 'change rehearsed']),
  arrow(900, 140, 1020, 140),
  box(1020, 80, 360, 120, ['Production', 'live fleet operation'], { shade: true, bold: true }),

  label(430, 65, 'same image promoted', { italic: true, size: 22 }),
  label(910, 65, 'same image promoted', { italic: true, size: 22 }),

  box(540, 320, 840, 110, ['Rollback to the previously running image, identified by build commit'], { dashed: true }),
  arrow(1200, 200, 1200, 320),
  arrow(600, 320, 600, 210),

  label(20, 480, 'An image is never rebuilt for production, because a rebuild produces a different artefact from the one verified', { italic: true, size: 22 }),
].join(''));

/** Incident severity and escalation. */
figures['escalation'] = svg(700, [
  box(560, 40, 480, 90, ['Incident logged'], { shade: true, bold: true }),
  arrow(800, 130, 800, 200),
  box(560, 200, 480, 90, ['Severity assigned by', 'operational impact']),

  arrow(560, 245, 300, 320),
  arrow(1040, 245, 1300, 320),
  arrow(800, 290, 800, 320),

  box(60, 320, 460, 110, ['Severity one', 'fleet operation prevented', 'response within thirty minutes'], { shade: true, size: 22 }),
  box(580, 320, 440, 110, ['Severity two', 'major function unavailable', 'response within two hours'], { size: 22 }),
  box(1080, 320, 460, 110, ['Severity three and four', 'degraded or minor', 'next working day or later'], { size: 22 }),

  arrow(290, 430, 290, 510),
  box(60, 510, 460, 110, ['Platform owner immediately', 'Operations Manager and Director', 'within one hour'], { size: 22 }),

  arrow(800, 430, 800, 510),
  box(580, 510, 440, 110, ['Platform owner', 'within two hours'], { size: 22 }),

  arrow(1310, 430, 1310, 510),
  box(1080, 510, 460, 110, ['Operations Manager', 'if target is exceeded'], { size: 22 }),

  label(20, 675, 'Every severity one requires a post incident review within five working days', { italic: true, size: 22 }),
].join(''));

/** Training and access authorisation flow. */
figures['training-flow'] = svg(560, [
  box(40, 70, 300, 110, ['Access requested', 'by line manager'], { shade: true }),
  arrow(340, 125, 420, 125),
  box(420, 70, 300, 110, ['Common module', 'delivered']),
  arrow(720, 125, 800, 125),
  box(800, 70, 300, 110, ['Role module', 'delivered']),
  arrow(1100, 125, 1180, 125),
  box(1180, 70, 360, 110, ['Competency', 'assessed']),

  arrow(1360, 180, 1360, 290),
  box(1180, 290, 360, 110, ['Competent?']),

  arrow(1180, 345, 900, 345),
  label(1000, 325, 'No', { size: 24 }),
  box(560, 290, 320, 110, ['Further training', 'scheduled'], { shade: true }),
  arrow(720, 290, 640, 190),

  arrow(1360, 400, 1360, 450),
  label(1390, 435, 'Yes', { size: 24 }),
  box(700, 450, 660, 90, ['Acknowledgement signed, then access granted'], { shade: true, bold: true }),
  arrow(1180, 495, 1370, 495),
].join(''));

// ---------------------------------------------------------------------------
// Health and Wellness Management System
// ---------------------------------------------------------------------------

/** Service topology and the request path through it. */
figures['hwms-architecture'] = svg(880, [
  label(20, 40, 'Client', { bold: true }),
  box(480, 60, 640, 90, ['Browser', 'holds an opaque session cookie, never a token']),
  arrow(800, 150, 800, 215),

  label(20, 205, 'Edge', { bold: true }),
  box(200, 230, 1200, 110, ['Web origin and gateway',
    'completes the sign in exchange, holds tokens server side, proxies the interface'],
    { shade: true, bold: true }),

  label(20, 395, 'Services', { bold: true }),
  box(80, 415, 380, 120, ['Keycloak', 'identity provider', 'roles and password policy'], { dashed: true }),
  box(560, 415, 380, 120, ['identity-service', 'account administration', 'audit trail']),
  box(1040, 415, 460, 120, ['clinical-service', 'patients, visits, laboratory',
    'sole holder of clinical credentials'], { shade: true }),

  arrow(600, 340, 380, 415),
  arrow(760, 340, 740, 415),
  arrow(1000, 340, 1220, 415),

  label(20, 620, 'Data', { bold: true }),
  box(80, 640, 860, 130, ['PostgreSQL', 'keycloak and identity databases',
    'one database and one role per service']),
  box(1040, 640, 460, 130, ['PostgreSQL, separate instance',
    'clinical database', 'separate credentials and key'], { shade: true }),

  arrow(280, 535, 280, 640),
  arrow(740, 535, 600, 640),
  arrow(1270, 535, 1270, 640),

  label(20, 830, 'The clinical database is a separate instance. No other service holds a credential for it', { italic: true, size: 22 }),
].join(''));

/** The four independent places the clinical access rule is enforced. */
figures['hwms-clinical-access'] = svg(820, [
  box(420, 40, 760, 90, ['A request for an individual clinical record'], { bold: true }),
  arrow(800, 130, 800, 180),

  box(300, 180, 1000, 100, ['1. Identity provider', 'only the officer role carries the clinical role'], { shade: true }),
  arrow(800, 280, 800, 320),
  box(300, 320, 1000, 100, ['2. Route table', 'clinical routes are not offered to any other role'], { shade: true }),
  arrow(800, 420, 800, 460),
  box(300, 460, 1000, 100, ['3. Service', 'checked in the handler, then again in the service layer'], { shade: true }),
  arrow(800, 560, 800, 600),
  box(300, 600, 1000, 100, ['4. Deployment', 'only this service holds the clinical database credential'], { shade: true }),

  arrow(300, 650, 180, 650),
  box(40, 600, 140, 100, ['Refused'], { dark: true, size: 24 }),
  label(1330, 230, 'Any layer', { size: 24 }),
  label(1330, 265, 'may refuse', { size: 24 }),
  label(1330, 300, 'on its own', { size: 24 }),

  arrow(800, 700, 800, 740),
  box(420, 740, 760, 70, ['Record returned, and the retrieval written to the access log first'], { bold: true, size: 24 }),
].join(''));

/** How one patient's history is organised on screen. */
figures['hwms-patient-record'] = svg(880, [
  box(40, 40, 1520, 90, ['Patient identity, one line, with the action to start a visit'], { shade: true, bold: true }),

  box(40, 160, 1520, 80, ['Needs attention, shown only when something is outstanding'], { dashed: true }),
  box(40, 270, 1520, 80, ['Visits recorded, first seen, last seen, recorded work related']),

  label(40, 400, 'History, newest first', { bold: true }),

  box(120, 420, 1440, 190, [], {}),
  label(150, 460, 'Visit, with date, type and signed or draft state', { bold: true, size: 24 }),
  label(150, 500, 'Complaint, impression and treatment quoted from the record', { size: 23 }),
  box(200, 520, 1300, 70, ['Laboratory requisition raised from this visit, with its status'], { shade: true, size: 23 }),

  box(120, 640, 1440, 190, [], {}),
  label(150, 680, 'Earlier visit', { bold: true, size: 24 }),
  label(150, 720, 'Complaint, impression and treatment quoted from the record', { size: 23 }),
  box(200, 740, 1300, 70, ['Referral raised from this visit, with its status'], { shade: true, size: 23 }),

  // The rail down the left of the stream.
  `<line x1="80" y1="420" x2="80" y2="830" stroke="#000000" stroke-width="3"/>`,
  `<circle cx="80" cy="470" r="14" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>`,
  `<circle cx="80" cy="690" r="14" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>`,

  label(20, 865, 'The visit is the unit of the record. What was raised from a visit is nested inside it', { italic: true, size: 22 }),
].join(''));

/** Request, approval and provisioning of the user testing environment. */
figures['hwms-uat-access'] = svg(640, [
  box(40, 50, 320, 110, ['Access requested', 'by the division'], { shade: true }),
  arrow(360, 105, 430, 105),
  box(430, 50, 330, 110, ['Data protection', 'owner reviews']),
  arrow(760, 105, 830, 105),
  box(830, 50, 320, 110, ['ICT reviews', 'hosting and network']),
  arrow(1150, 105, 1220, 105),
  box(1220, 50, 340, 110, ['Approved?'], { bold: true }),

  // Approved. Down, then right to left along the second row.
  arrow(1390, 160, 1390, 240),
  label(1410, 210, 'Yes', { size: 24 }),
  box(1220, 240, 340, 110, ['Environment', 'provisioned']),
  arrow(1220, 295, 1040, 295),
  box(690, 240, 340, 110, ['Accounts created', 'by the manager'], { shade: true }),
  arrow(690, 295, 490, 295),
  box(120, 240, 360, 110, ['Testing proceeds', 'synthetic data only'], { shade: true }),

  // Refused. Conditions return to the division, which resubmits. The return
  // leg runs up the left margin so that it crosses no box on the way.
  elbow([[1390, 160], [1390, 460], [1000, 460]], { dashed: true }),
  label(1150, 440, 'No', { size: 24 }),
  box(560, 410, 440, 100, ['Conditions returned', 'to the division'], { dashed: true, size: 23 }),
  elbow([[560, 460], [70, 460], [70, 170]], { dashed: true }),

  label(20, 600, 'No real clinical record enters this environment at any point', { italic: true, size: 22 }),
].join(''));

/** Separation between the user testing environment and any future production. */
figures['hwms-uat-environment'] = svg(700, [
  box(40, 50, 720, 600, [], { dashed: true }),
  label(70, 95, 'User testing environment', { bold: true, size: 26 }),
  box(90, 130, 620, 90, ['KMC controlled host', 'reachable on the plant network only'], { size: 23 }),
  box(90, 250, 620, 90, ['Synthetic patients, visits and requisitions'], { shade: true, size: 23 }),
  box(90, 370, 620, 90, ['Named test participants only'], { size: 23 }),
  box(90, 490, 620, 90, ['Data destroyed at the end of testing'], { size: 23 }),

  box(840, 50, 720, 600, [], { dashed: true }),
  label(870, 95, 'Production, not yet requested', { bold: true, size: 26 }),
  box(890, 130, 620, 90, ['Hosting decided by ICT after review'], { dashed: true, size: 23 }),
  box(890, 250, 620, 90, ['Real clinical records'], { dashed: true, size: 23 }),
  box(890, 370, 620, 90, ['Retention and backup policy approved first'], { dashed: true, size: 23 }),
  box(890, 490, 620, 90, ['Named owners appointed first'], { dashed: true, size: 23 }),

  label(800, 350, 'No', { bold: true, size: 26, anchor: 'middle' }),
  label(800, 385, 'copy', { bold: true, size: 26, anchor: 'middle' }),

  label(20, 685, 'Nothing crosses from the left to the right without the approvals named in this document', { italic: true, size: 22 }),
].join(''));

module.exports = { figures };
