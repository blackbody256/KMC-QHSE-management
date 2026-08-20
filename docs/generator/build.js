/*
 * Two pass document build.
 *
 * Pass 1 renders the document with placeholder page numbers, converts it to PDF
 * and reads back which page each heading and caption landed on. Pass 2 rebuilds
 * with the real numbers. Layout is identical between passes because the
 * contents lines already exist in pass 1 with the same wording, so the page
 * mapping stays valid.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib');

const OUT = process.argv[2] || path.join(__dirname, 'out');
// Which documents to build. Pass a comma separated list of slugs as the second
// argument to build a subset, which keeps the edit and check loop short while
// a single document is being written.
const ALL = [
  require('./content/production-readiness'),
  require('./content/information-security'),
  require('./content/backup-dr'),
  require('./content/uat-signoff'),
  require('./content/deployment-support'),
  require('./content/user-training'),
  require('./content/hwms-srs'),
  require('./content/hwms-architecture'),
  require('./content/hwms-security'),
  require('./content/hwms-access-request'),
];
const only = (process.argv[3] || '').split(',').filter(Boolean);
const DOCS = only.length ? ALL.filter((m) => only.includes(m.slug)) : ALL;

function assemble(mod, pages) {
  const d = L.newDoc();
  const body = mod.build(d, L);
  return {
    d,
    children: [...L.titleBlock(mod.meta), ...L.frontMatter(d, pages), ...body],
  };
}

/** Search strings that identify where each bookmark physically appears. */
function probes(d) {
  const out = [];
  for (const e of d.outline) out.push({ bookmark: e.bookmark, text: `${e.number} ${e.title}` });
  for (const t of d.tables) out.push({ bookmark: t.bookmark, text: `Table ${t.number}: ${t.title}` });
  for (const f of d.figures) out.push({ bookmark: f.bookmark, text: `Figure ${f.number}: ${f.title}` });
  return out;
}

/** Collapse runs of whitespace so PDF line wrapping does not defeat matching. */
function flatten(s) { return s.replace(/\s+/g, ' ').trim(); }

function pageMap(pdfPath, probeList) {
  const raw = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' });
  const pages = raw.split('\f').map(flatten);
  const map = {};
  for (const p of probeList) {
    const needle = flatten(p.text);
    // The body occurrence is always after the contents listing, so take the
    // last page the string appears on.
    for (let i = 0; i < pages.length; i += 1) {
      if (pages[i].includes(needle)) map[p.bookmark] = i + 1;
    }
    if (map[p.bookmark] === undefined) map[p.bookmark] = 1;
  }
  return map;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, '.pass1');
  fs.mkdirSync(tmp, { recursive: true });

  const built = [];
  for (const mod of DOCS) {
    const first = assemble(mod, {});
    const p1 = path.join(tmp, `${mod.slug}.docx`);
    fs.writeFileSync(p1, await L.toBuffer(mod.meta, first.children));
    built.push({ mod, p1, d: first.d });
  }

  // One LibreOffice invocation for all pass 1 files.
  execFileSync('soffice', [
    '--headless', '--norestore', '--nologo', '--convert-to', 'pdf',
    '--outdir', tmp, ...built.map((b) => b.p1),
  ], { stdio: 'ignore', timeout: 300000 });

  for (const b of built) {
    const pdf = path.join(tmp, `${b.mod.slug}.pdf`);
    const map = pageMap(pdf, probes(b.d));
    const second = assemble(b.mod, map);
    const final = path.join(OUT, `${b.mod.filename}`);
    fs.writeFileSync(final, await L.toBuffer(b.mod.meta, second.children));
    console.log(`built ${b.mod.filename}  (${second.d.outline.length} headings, ` +
      `${second.d.tables.length} tables, ${second.d.figures.length} figures)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
