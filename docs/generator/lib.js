/*
 * Shared .docx builder for the Velo governance documents.
 *
 * Enforces the KMC house style mechanically so no document can drift:
 *   Times New Roman, 12pt body, black only, justified, indentation 0,
 *   bold numbered multilevel headings, TOC + List of Figures + List of Tables,
 *   table captions above / figure captions below with chapter scoped numbers,
 *   captions 9pt italic, table text 10pt, real numbered S/N column,
 *   REF-field cross references, no page number on page 1.
 *
 * Content rules the callers must respect: no em dashes, no ";" used to
 * separate points. assertClean() fails the build if either appears.
 *
 * Contents lists are produced by a two pass build (see build.js). LibreOffice
 * does not import a docx-js TOC field as an index, and Word leaves such a field
 * blank until the reader refreshes it, so the entries and page numbers are
 * resolved from a first render and written as linked text in the second.
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, LevelSuffix, WidthType, BorderStyle,
  Footer, PageNumber, SimpleField, Bookmark, InternalHyperlink, ShadingType,
  VerticalAlign, PageBreak, Tab, TabStopType, LeaderType, ImageRun, LineRuleType,
} = require('docx');

const FONT = 'Times New Roman';
const BODY = 24;      // 12pt in half-points
const TABLE = 20;     // 10pt
const CAPTION = 18;   // 9pt
const BLACK = '000000';

// ---------------------------------------------------------------------------
// Content guards
// ---------------------------------------------------------------------------

function assertClean(text, where) {
  if (typeof text !== 'string') return text;
  if (text.includes('—') || text.includes('–')) {
    throw new Error(`dash character found in ${where}: "${text.slice(0, 80)}"`);
  }
  if (text.includes(';')) {
    throw new Error(`";" found in ${where}: "${text.slice(0, 80)}"`);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Document state. Tracks heading numbers and caption numbers so the contents
// lists can be generated and so captions are chapter scoped.
// ---------------------------------------------------------------------------

function newDoc() {
  return {
    h: [0, 0, 0],   // heading counters per level
    table: 0,
    figure: 0,
    outline: [],    // {level, number, title, bookmark}
    tables: [],     // {number, title, bookmark}
    figures: [],
    body: [],
  };
}

function bmk(prefix, n) { return `${prefix}_${n}`; }

// ---------------------------------------------------------------------------
// Runs and paragraphs
// ---------------------------------------------------------------------------

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size || BODY,
    bold: !!opts.bold,
    italics: !!opts.italics,
    color: BLACK,
  });
}

function para(text, opts = {}) {
  assertClean(text, 'body paragraph');
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 276, lineRule: LineRuleType.AUTO },
    indent: { left: 0, right: 0, firstLine: 0 },
    children: [run(text, opts)],
  });
}

/**
 * Paragraph from mixed segments so a sentence can embed a live cross reference.
 * Segments: "plain", {b:"bold"}, {ref:"bookmarkId", cached:"Table 3.1"}.
 */
function richPara(segments) {
  const children = [];
  for (const seg of segments) {
    if (typeof seg === 'string') {
      assertClean(seg, 'rich paragraph');
      children.push(run(seg));
    } else if (seg.b !== undefined) {
      assertClean(seg.b, 'rich paragraph');
      children.push(run(seg.b, { bold: true }));
    } else if (seg.ref !== undefined) {
      children.push(new SimpleField(`REF ${seg.ref} \\h`, seg.cached || seg.ref));
    }
  }
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 276, lineRule: LineRuleType.AUTO },
    indent: { left: 0, right: 0, firstLine: 0 },
    children,
  });
}

function bullet(text) {
  assertClean(text, 'bullet');
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100, line: 276, lineRule: LineRuleType.AUTO },
    numbering: { reference: 'velo-bullets', level: 0 },
    children: [run(text)],
  });
}

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

const HEADING_LEVEL = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

function heading(d, level, text) {
  assertClean(text, 'heading');
  const idx = level - 1;
  d.h[idx] += 1;
  for (let i = idx + 1; i < d.h.length; i += 1) d.h[i] = 0;
  if (level === 1) { d.table = 0; d.figure = 0; }

  const number = d.h.slice(0, level).join('.');
  const id = bmk('h', d.outline.length + 1);
  d.outline.push({ level, number, title: text, bookmark: id });

  return new Paragraph({
    heading: HEADING_LEVEL[idx],
    numbering: { reference: 'velo-headings', level: idx },
    alignment: AlignmentType.LEFT,
    spacing: { before: 300 - idx * 30, after: 170 - idx * 20 },
    indent: { left: 0, right: 0, firstLine: 0 },
    children: [new Bookmark({ id, children: [run(text, { bold: true })] })],
  });
}

const h1 = (d, t) => heading(d, 1, t);
const h2 = (d, t) => heading(d, 2, t);
const h3 = (d, t) => heading(d, 3, t);

function frontHeading(text) {
  assertClean(text, 'front heading');
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 200 },
    children: [run(text, { bold: true })],
  });
}

// ---------------------------------------------------------------------------
// Captions. Only the "Table 3.1" label sits inside the bookmark, so a REF
// cross reference in the body resolves to the label and not the whole title.
// ---------------------------------------------------------------------------

function caption(d, kind) {
  const isTable = kind === 'table';
  const styleId = isTable ? 'TableCaption' : 'FigureCaption';
  const counterKey = isTable ? 'table' : 'figure';
  d[counterKey] += 1;
  const chapter = d.h[0];
  const number = `${chapter}.${d[counterKey]}`;
  const word = isTable ? 'Table' : 'Figure';
  const id = bmk(isTable ? 'tbl' : 'fig', number.replace('.', '_'));
  return { styleId, number, word, id };
}

function captionParagraph(meta, title) {
  assertClean(title, 'caption');
  return new Paragraph({
    style: meta.styleId,
    alignment: AlignmentType.LEFT,
    spacing: { before: 120, after: 120 },
    indent: { left: 0, right: 0, firstLine: 0 },
    children: [
      new Bookmark({
        id: meta.id,
        children: [run(`${meta.word} ${meta.number}`, { size: CAPTION, italics: true })],
      }),
      run(`: ${title}`, { size: CAPTION, italics: true }),
    ],
  });
}

/** Table caption. Emit ABOVE the table. */
function tableCaption(d, title) {
  const meta = caption(d, 'table');
  d.tables.push({ number: meta.number, title, bookmark: meta.id });
  return {
    ref: meta.id,
    label: `${meta.word} ${meta.number}`,
    paragraph: captionParagraph(meta, title),
  };
}

/** Figure caption. Emit BELOW the figure. */
function figureCaption(d, title) {
  const meta = caption(d, 'figure');
  d.figures.push({ number: meta.number, title, bookmark: meta.id });
  return {
    ref: meta.id,
    label: `${meta.word} ${meta.number}`,
    paragraph: captionParagraph(meta, title),
  };
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const THIN = { style: BorderStyle.SINGLE, size: 4, color: BLACK };
const CELL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const USABLE = 9746; // A4 width minus 1080 DXA margins each side

function cell(text, opts = {}) {
  const lines = String(text).split('\n');
  return new TableCell({
    borders: CELL_BORDERS,
    shading: opts.header
      ? { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    width: { size: opts.width, type: WidthType.DXA },
    children: lines.map((line) => {
      assertClean(line, 'table cell');
      return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240, lineRule: LineRuleType.AUTO },
        indent: { left: 0, right: 0, firstLine: 0 },
        children: [run(line, { size: TABLE, bold: !!opts.header })],
      });
    }),
  });
}

/**
 * Table with an auto numbered S/N first column.
 * headers/rows/widths describe the columns AFTER S/N.
 */
function table(headers, rows, widths) {
  const SN = 620;
  let cols = widths;
  if (!cols) {
    const each = Math.floor((USABLE - SN) / headers.length);
    cols = headers.map(() => each);
  }
  const scale = (USABLE - SN) / cols.reduce((a, b) => a + b, 0);
  cols = cols.map((w) => Math.floor(w * scale));
  const columnWidths = [SN, ...cols];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell('S/N', { header: true, width: SN }),
      ...headers.map((h, i) => cell(h, { header: true, width: cols[i] })),
    ],
  });
  const bodyRows = rows.map((r, idx) => new TableRow({
    children: [
      cell(String(idx + 1), { width: SN }),
      ...r.map((c, i) => cell(c, { width: cols[i] })),
    ],
  }));
  return new Table({
    columnWidths,
    width: { size: USABLE, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows],
  });
}

/** Table without an S/N column, for signature blocks and metadata sheets. */
function plainTable(headers, rows, widths) {
  let cols = widths || headers.map(() => Math.floor(USABLE / headers.length));
  const scale = USABLE / cols.reduce((a, b) => a + b, 0);
  cols = cols.map((w) => Math.floor(w * scale));
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { header: true, width: cols[i] })),
  });
  const bodyRows = rows.map((r) => new TableRow({
    children: r.map((c, i) => cell(c, { width: cols[i] })),
  }));
  return new Table({
    columnWidths: cols,
    width: { size: USABLE, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows],
  });
}

/**
 * Embeds a figure and its caption. The caption goes BELOW the image, per the
 * house style, and callers cannot reverse that because both are emitted here.
 * Returns an array to be spread into the body.
 */
function figure(d, name, title, targetWidth) {
  const fs = require('fs');
  const path = require('path');
  const file = path.join(__dirname, 'figs', `${name}.png`);
  const data = fs.readFileSync(file);
  // PNG header carries the intrinsic dimensions at a fixed offset.
  const iw = data.readUInt32BE(16);
  const ih = data.readUInt32BE(20);
  const w = targetWidth || 620;
  const h = Math.round(w * (ih / iw));
  const cap = figureCaption(d, title);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60, line: 240, lineRule: LineRuleType.AUTO },
      children: [new ImageRun({ type: 'png', data, transformation: { width: w, height: h } })],
    }),
    cap.paragraph,
  ];
}

function spacer() { return new Paragraph({ children: [run('')] }); }
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// ---------------------------------------------------------------------------
// Front matter
// ---------------------------------------------------------------------------

function titleBlock(meta) {
  // The system line comes from the document rather than being fixed here, so
  // that one generator can serve more than one KMC system. It defaults to Velo
  // because the documents written before this change do not set it.
  const system = meta.system || 'VELO ELECTRIC BUS FLEET OPERATIONS PLANNING SYSTEM';
  const rows = [
    ['Document name', meta.title],
    ['Reference number', meta.reference],
    ['Document description', meta.description],
    ['Prepared by', meta.preparedBy],
    ['Issue date', meta.issueDate],
    ['Version', meta.version],
    ['Classification', meta.classification],
  ];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 240 },
      children: [run('KIIRA MOTORS CORPORATION', { bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 700 },
      children: [run(system, { bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 900 },
      children: [run(meta.title.toUpperCase(), { bold: true })],
    }),
    plainTable(['Field', 'Detail'], rows, [2600, 7146]),
    pageBreak(),
  ];
}

/**
 * One contents line: text, dot leader, right aligned page number, hyperlinked
 * to its bookmark. Uses a classic right tab stop with a dot leader rather than
 * a positional tab, because positional tabs are not honoured outside Word.
 */
function contentsLine(text, bookmark, page, indentLeft) {
  assertClean(text, 'contents line');
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60, line: 260, lineRule: LineRuleType.AUTO },
    indent: { left: indentLeft || 0, right: 0, firstLine: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: USABLE, leader: LeaderType.DOT }],
    children: [
      new InternalHyperlink({
        anchor: bookmark,
        children: [
          run(text),
          new TextRun({ font: FONT, size: BODY, color: BLACK, children: [new Tab()] }),
          run(String(page)),
        ],
      }),
    ],
  });
}

/**
 * Builds Table of Contents, List of Figures and List of Tables.
 * pages maps bookmark id to page number. Pass 1 supplies zeros.
 */
function frontMatter(d, pages) {
  const out = [];
  const at = (b) => (pages && pages[b] !== undefined ? pages[b] : 0);

  out.push(frontHeading('Table of Contents'));
  for (const e of d.outline) {
    out.push(contentsLine(`${e.number} ${e.title}`, e.bookmark, at(e.bookmark), (e.level - 1) * 280));
  }
  out.push(pageBreak());

  out.push(frontHeading('List of Figures'));
  if (d.figures.length === 0) {
    out.push(para('No figures are used in this document.'));
  } else {
    for (const f of d.figures) {
      out.push(contentsLine(`Figure ${f.number}: ${f.title}`, f.bookmark, at(f.bookmark), 0));
    }
  }
  out.push(spacer());

  out.push(frontHeading('List of Tables'));
  for (const t of d.tables) {
    out.push(contentsLine(`Table ${t.number}: ${t.title}`, t.bookmark, at(t.bookmark), 0));
  }
  out.push(pageBreak());

  return out;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function buildDocument(meta, children) {
  return new Document({
    creator: meta.preparedBy,
    title: meta.title,
    description: meta.description,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY, color: BLACK },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 160, line: 276, lineRule: LineRuleType.AUTO },
            indent: { left: 0, right: 0, firstLine: 0 },
          },
        },
        heading1: { run: { font: FONT, size: BODY, bold: true, color: BLACK }, paragraph: { indent: { left: 0 } } },
        heading2: { run: { font: FONT, size: BODY, bold: true, color: BLACK }, paragraph: { indent: { left: 0 } } },
        heading3: { run: { font: FONT, size: BODY, bold: true, color: BLACK }, paragraph: { indent: { left: 0 } } },
        hyperlink: { run: { font: FONT, size: BODY, color: BLACK, underline: undefined } },
      },
      paragraphStyles: ['TableCaption', 'FigureCaption'].map((id) => ({
        id,
        name: id === 'TableCaption' ? 'Table Caption' : 'Figure Caption',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { font: FONT, size: CAPTION, italics: true, color: BLACK },
        paragraph: {
          alignment: AlignmentType.LEFT,
          spacing: { before: 120, after: 120 },
          indent: { left: 0, right: 0, firstLine: 0 },
        },
      })),
    },
    numbering: {
      config: [
        {
          reference: 'velo-headings',
          levels: [0, 1, 2].map((lvl) => ({
            level: lvl,
            format: LevelFormat.DECIMAL,
            text: ['%1', '%1.%2', '%1.%2.%3'][lvl],
            alignment: AlignmentType.LEFT,
            suffix: LevelSuffix.SPACE,
            style: { paragraph: { indent: { left: 0, hanging: 0 } } },
          })),
        },
        {
          reference: 'velo-bullets',
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360, hanging: 220 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        titlePage: true,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
        },
      },
      footers: {
        first: new Footer({ children: [new Paragraph({ children: [run('')] })] }),
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              children: [PageNumber.CURRENT], font: FONT, size: BODY, color: BLACK,
            })],
          })],
        }),
      },
      children,
    }],
  });
}

async function toBuffer(meta, children) {
  return Packer.toBuffer(buildDocument(meta, children));
}

module.exports = {
  newDoc, para, richPara, bullet, h1, h2, h3, frontHeading,
  tableCaption, figureCaption, table, plainTable, cell,
  titleBlock, frontMatter, spacer, pageBreak, toBuffer, assertClean, run, figure,
};
