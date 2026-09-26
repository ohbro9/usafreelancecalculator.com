from pathlib import Path

path = Path('tests/seo-structure-regression.test.js')
text = path.read_text()
marker = "const forbiddenVisitorCopy = ["
block = r'''

const incomeHtml = pages.get('income').html;
check('income description owns take-home goal intent', () => {
  const description = metaContent(incomeHtml, 'description');
  assert.match(description, /take-home|income goal/i);
  assert.match(description, /gross|revenue|required/i);
});
check('income supporting heading: take-home vs gross', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Take-Home (?:vs\.?|and) Gross Revenue[^<]*<\/h2>/i);
});
check('income supporting heading: taxes fees expenses', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*(?:Taxes|Fees|Expenses)[^<]*<\/h2>/i);
});
check('income supporting heading: worked example', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Income Goal Worked Example[^<]*<\/h2>/i);
});
check('income supporting heading: methodology', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Income Goal Methodology[^<]*<\/h2>/i);
});
check('income supporting heading: FAQ', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Income Goal FAQ[^<]*<\/h2>/i);
});
check('income links to related calculators', () => {
  for (const href of ['hourly-rate-calculator.html','platform-fee-calculator.html','tax-estimator.html','budget-planner.html']) {
    assert.match(incomeHtml, new RegExp(`href=["']${href.replace('.', '\\.')}(?:[?#][^"']*)?["']`, 'i'));
  }
});

function propertyMetaContent(html, property) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    if ((attrs.property || '').toLowerCase() === property.toLowerCase()) return (attrs.content || '').trim();
  }
  return '';
}

const socialSpecs = [
  ...pageSpecs.map(spec => ({ key: spec.key, html: pages.get(spec.key).html, canonical: spec.canonical, title: spec.title })),
  { key: 'app', html: appHtml, canonical: `${SITE}/app/`, title: tagText(appHtml, 'title') },
];
for (const item of socialSpecs) {
  check(`${item.key} social metadata`, () => {
    assert.equal(propertyMetaContent(item.html, 'og:title'), item.title);
    assert.ok(propertyMetaContent(item.html, 'og:description').length > 0, 'og:description is present');
    assert.equal(propertyMetaContent(item.html, 'og:url'), item.canonical);
    assert.ok(metaContent(item.html, 'twitter:card').length > 0, 'twitter:card is present');
    assert.equal(metaContent(item.html, 'twitter:title'), item.title);
    assert.ok(metaContent(item.html, 'twitter:description').length > 0, 'twitter:description is present');
  });
}

check('app description is Android download-specific', () => {
  const description = metaContent(appHtml, 'description');
  assert.match(description, /Android/i);
  assert.match(description, /download|APK/i);
});
check('app has supportable Android software schema', () => {
  assert.match(appHtml, /"@type"\s*:\s*"SoftwareApplication"/i);
  assert.match(appHtml, /"operatingSystem"\s*:\s*"Android"/i);
  assert.match(appHtml, /"softwareVersion"\s*:\s*"1\.0\.1"/i);
});

check('sitemap contains every canonical core URL', () => {
  const expected = [...pageSpecs.map(spec => spec.canonical), `${SITE}/app/`];
  for (const url of expected) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap contains ${url}`);
  }
});
'''

if 'income description owns take-home goal intent' in text:
    print('Task 6 assertions already present')
elif marker not in text:
    raise SystemExit('Insertion marker not found')
else:
    text = text.replace(marker, block + '\n' + marker, 1)
    path.write_text(text)
    print('Task 6 assertions inserted')
