"""Post-process generated .docx files to correct two docx-js output defects.

1. docx-js emits w:id="1" on every bookmarkStart and bookmarkEnd. Word pairs a
   bookmark start with its end by that numeric id, so reusing one value across
   every bookmark is invalid and makes cross reference resolution fragile.
   Bookmarks here are non overlapping and strictly sequential, so each start is
   paired with the next end and both are given a fresh unique id.

2. The cached result run inside a field (the text a reader sees before fields
   are refreshed) is emitted with no run properties, so it falls back to the
   document default instead of carrying the font explicitly. The house style
   requires every run to be Times New Roman, 12 point, black.
"""
import re
import shutil
import sys
import zipfile

RPR = (
    '<w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" '
    'w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/>'
    '<w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'
)


def fix_bookmarks(xml):
    out = []
    pos = 0
    next_id = 100
    stack = []
    pattern = re.compile(r'<w:bookmark(Start|End)\b[^>]*/>')
    for m in pattern.finditer(xml):
        out.append(xml[pos:m.start()])
        tag = m.group(0)
        if m.group(1) == 'Start':
            name = re.search(r'w:name="([^"]+)"', tag)
            if name and name.group(1) == '_GoBack':
                out.append(tag)
            else:
                stack.append(next_id)
                out.append(re.sub(r'w:id="\d+"', f'w:id="{next_id}"', tag))
                next_id += 1
        else:
            if stack:
                bid = stack.pop()
                out.append(re.sub(r'w:id="\d+"', f'w:id="{bid}"', tag))
            else:
                out.append(tag)
        pos = m.end()
    out.append(xml[pos:])
    return ''.join(out)


def fix_bare_runs(xml):
    """Give run properties to any run that carries text but has none."""
    def repl(m):
        inner = m.group(1)
        if '<w:rPr>' in inner:
            return m.group(0)
        if '<w:t' not in inner:
            return m.group(0)
        return f'<w:r>{RPR}{inner}</w:r>'
    return re.sub(r'<w:r>((?:(?!</w:r>).)*?)</w:r>', repl, xml, flags=re.S)


def process(path):
    tmp = path + '.tmp'
    src = zipfile.ZipFile(path)
    changed = 0
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename == 'word/document.xml':
                xml = data.decode('utf8')
                before = xml
                xml = fix_bookmarks(xml)
                xml = fix_bare_runs(xml)
                if xml != before:
                    changed = 1
                data = xml.encode('utf8')
            dst.writestr(item, data)
    src.close()
    shutil.move(tmp, path)
    return changed


for p in sys.argv[1:]:
    process(p)
    print(f'post-processed {p.split("/")[-1]}')
