from pathlib import Path

path = Path('tests/seo-structure-regression.test.js')
text = path.read_text()
old = "if ((attrs.name || '').toLowerCase() === name.toLowerCase()) return (attrs.content || '').trim();"
new = "if ((attrs.name || '').toLowerCase() === name.toLowerCase()) return normalizeText(attrs.content || '');"
if new not in text:
    if old not in text:
        raise SystemExit('metaContent target not found')
    text = text.replace(old, new, 1)
old2 = "if ((attrs.property || '').toLowerCase() === property.toLowerCase()) return (attrs.content || '').trim();"
new2 = "if ((attrs.property || '').toLowerCase() === property.toLowerCase()) return normalizeText(attrs.content || '');"
if new2 not in text:
    if old2 not in text:
        raise SystemExit('propertyMetaContent target not found')
    text = text.replace(old2, new2, 1)
path.write_text(text)
print('PASS metadata assertions now decode HTML entities consistently')
