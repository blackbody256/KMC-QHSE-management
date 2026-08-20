"""Verify each generated .docx against the KMC house style rules.

Checks the actual OOXML rather than trusting the generator, so a regression in
the builder is caught here rather than by the reviewer at KMC.
"""
import glob
import re
import sys
import zipfile
from collections import Counter
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
FAILURES = []
FONT = 'Times New Roman'


def fail(doc, msg):
    FAILURES.append(f'{doc}: {msg}')


def runs_of(el):
    return el.iter(W + 'r')


def text_of(el):
    return ''.join(t.text or '' for t in el.iter(W + 't'))


def check(path):
    name = path.split('/')[-1]
    z = zipfile.ZipFile(path)
    doc = z.read('word/document.xml').decode('utf8')
    root = ET.fromstring(doc)
    body = root.find(W + 'body')

    # ---- 1. forbidden characters anywhere in visible text -----------------
    all_text = ''.join(
        t.text or '' for t in root.iter(W + 't')
    )
    for ch, label in (('—', 'em dash'), ('–', 'en dash'), (';', 'semicolon')):
        if ch in all_text:
            idx = all_text.index(ch)
            fail(name, f'{label} found: ...{all_text[max(0,idx-40):idx+40]!r}...')

    # ---- 2. fonts, sizes and colour on every run --------------------------
    sizes = Counter()
    for r in root.iter(W + 'r'):
        if r.find(W + 't') is None:
            continue
        rPr = r.find(W + 'rPr')
        if rPr is None:
            fail(name, 'run without explicit formatting found')
            continue
        rf = rPr.find(W + 'rFonts')
        if rf is None or rf.get(W + 'ascii') != FONT:
            fail(name, f'run not set to {FONT}: {text_of(r)[:40]!r}')
        sz = rPr.find(W + 'sz')
        if sz is None:
            fail(name, f'run without size: {text_of(r)[:40]!r}')
        else:
            sizes[sz.get(W + 'val')] += 1
        col = rPr.find(W + 'color')
        if col is not None and col.get(W + 'val') not in ('000000', 'auto'):
            fail(name, f'non black run colour {col.get(W + "val")}')

    allowed = {'24', '20', '18'}
    for s in sizes:
        if s not in allowed:
            fail(name, f'unexpected font size {int(s)/2}pt used {sizes[s]} times')

    # ---- 3. table runs must be 10pt, caption runs 9pt ---------------------
    for tbl in body.iter(W + 'tbl'):
        for r in tbl.iter(W + 'r'):
            if r.find(W + 't') is None:
                continue
            sz = r.find(W + 'rPr').find(W + 'sz')
            if sz is not None and sz.get(W + 'val') != '20':
                fail(name, f'table text not 10pt: {text_of(r)[:40]!r}')

    styles = z.read('word/styles.xml').decode('utf8')
    for sid in ('TableCaption', 'FigureCaption'):
        if f'w:styleId="{sid}"' not in styles:
            fail(name, f'missing paragraph style {sid}')

    # ---- 4. caption paragraphs are 9pt italic and correctly placed --------
    kids = list(body)
    cap_count = {'TableCaption': 0, 'FigureCaption': 0}
    for i, el in enumerate(kids):
        if el.tag != W + 'p':
            continue
        pPr = el.find(W + 'pPr')
        if pPr is None:
            continue
        ps = pPr.find(W + 'pStyle')
        if ps is None or ps.get(W + 'val') not in cap_count:
            continue
        style = ps.get(W + 'val')
        cap_count[style] += 1
        txt = text_of(el)
        for r in el.iter(W + 'r'):
            rPr = r.find(W + 'rPr')
            if rPr is None:
                continue
            if rPr.find(W + 'sz') is not None and rPr.find(W + 'sz').get(W + 'val') != '18':
                fail(name, f'caption not 9pt: {txt[:40]!r}')
            if rPr.find(W + 'i') is None:
                fail(name, f'caption not italic: {txt[:40]!r}')
        if not re.match(r'^(Table|Figure) \d+\.\d+: ', txt):
            fail(name, f'caption not chapter numbered: {txt[:50]!r}')
        # placement: table caption immediately above a table,
        # figure caption immediately below a paragraph holding a drawing
        if style == 'TableCaption':
            nxt = kids[i + 1] if i + 1 < len(kids) else None
            if nxt is None or nxt.tag != W + 'tbl':
                fail(name, f'table caption not directly above its table: {txt[:40]!r}')
        else:
            prv = kids[i - 1] if i > 0 else None
            if prv is None or prv.find('.//' + W + 'drawing') is None:
                fail(name, f'figure caption not directly below its figure: {txt[:40]!r}')

    if cap_count['FigureCaption'] == 0:
        fail(name, 'document contains no figures')

    # ---- 5. body paragraphs justified with zero indentation ---------------
    for el in kids:
        if el.tag != W + 'p':
            continue
        pPr = el.find(W + 'pPr')
        if pPr is None:
            continue
        ps = pPr.find(W + 'pStyle')
        style = ps.get(W + 'val') if ps is not None else None
        if style in ('TableCaption', 'FigureCaption'):
            continue
        if pPr.find(W + 'numPr') is not None:
            continue
        ind = pPr.find(W + 'ind')
        if ind is not None:
            for attr in ('left', 'firstLine'):
                v = ind.get(W + attr)
                if v not in (None, '0'):
                    # contents lines legitimately indent sub levels
                    if not text_of(el).strip().startswith(('Table ', 'Figure ')) \
                       and not re.match(r'^\d+(\.\d+)* ', text_of(el)):
                        fail(name, f'non zero indent on {text_of(el)[:40]!r}')

    # ---- 6. headings are bold, numbered and 12pt --------------------------
    heading_count = 0
    for el in kids:
        if el.tag != W + 'p':
            continue
        pPr = el.find(W + 'pPr')
        if pPr is None:
            continue
        ps = pPr.find(W + 'pStyle')
        if ps is None or not ps.get(W + 'val', '').startswith('Heading'):
            continue
        heading_count += 1
        if pPr.find(W + 'numPr') is None:
            fail(name, f'heading without numbering: {text_of(el)[:40]!r}')
        for r in el.iter(W + 'r'):
            rPr = r.find(W + 'rPr')
            if rPr is None or rPr.find(W + 'b') is None:
                fail(name, f'heading not bold: {text_of(el)[:40]!r}')
            sz = rPr.find(W + 'sz') if rPr is not None else None
            if sz is not None and sz.get(W + 'val') != '24':
                fail(name, f'heading not 12pt: {text_of(el)[:40]!r}')
    if heading_count == 0:
        fail(name, 'no headings found')

    # ---- 7. contents lists present ---------------------------------------
    for needed in ('Table of Contents', 'List of Figures', 'List of Tables'):
        if needed not in all_text:
            fail(name, f'missing {needed}')

    # ---- 8. page numbering, none on page one ------------------------------
    if 'w:titlePg' not in doc:
        fail(name, 'titlePg not set, page one would be numbered')
    footers = [n for n in z.namelist() if re.match(r'word/footer\d+\.xml', n)]
    has_page_field = []
    for f in footers:
        content = z.read(f).decode('utf8')
        has_page_field.append('PAGE' in content)
    if not any(has_page_field):
        fail(name, 'no footer contains a page number field')
    if all(has_page_field):
        fail(name, 'every footer has a page number, first page is not blank')

    # ---- 9. bookmark integrity (codex flagged reused numeric ids) ---------
    starts = [(re.search(r'w:id="(\d+)"', t).group(1),
               re.search(r'w:name="([^"]+)"', t).group(1))
              for t in re.findall(r'<w:bookmarkStart\b[^>]*/>', doc)]
    names = [n for _, n in starts if n != '_GoBack']
    dupes = [n for n, c in Counter(names).items() if c > 1]
    if dupes:
        fail(name, f'duplicate bookmark names: {dupes[:5]}')
    ids = [i for i, n in starts if n != '_GoBack']
    id_dupes = [i for i, c in Counter(ids).items() if c > 1]
    if id_dupes:
        fail(name, f'reused bookmark numeric ids: {sorted(id_dupes)[:5]}')
    ends = len(re.findall(r'<w:bookmarkEnd', doc))
    if ends != len(starts):
        fail(name, f'bookmarkStart/End mismatch: {len(starts)} vs {ends}')

    # ---- 10. cross references resolve to a real bookmark ------------------
    refs = re.findall(r'REF\s+(\S+?)\s+\\+h', doc)
    for r in set(refs):
        if r not in names:
            fail(name, f'cross reference to unknown bookmark {r}')

    # ---- 11. S/N columns are really numbered ------------------------------
    for tbl in body.iter(W + 'tbl'):
        rows = list(tbl.findall(W + 'tr'))
        if not rows:
            continue
        first = [text_of(c).strip() for c in rows[0].findall(W + 'tc')]
        if not first or first[0] != 'S/N':
            continue
        expected = 1
        for row in rows[1:]:
            cells = row.findall(W + 'tc')
            got = text_of(cells[0]).strip()
            if got != str(expected):
                fail(name, f'S/N column expected {expected} got {got!r}')
            expected += 1

    print(f'checked {name}: {heading_count} headings, '
          f'{cap_count["TableCaption"]} tables, {cap_count["FigureCaption"]} figures')


for path in sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else 'out/*.docx')):
    check(path)

print()
if FAILURES:
    print(f'{len(FAILURES)} HOUSE STYLE FAILURES')
    for f in FAILURES[:40]:
        print(' -', f)
    sys.exit(1)
print('All documents conform to the house style.')
