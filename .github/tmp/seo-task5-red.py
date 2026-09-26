from pathlib import Path
p=Path('tests/seo-structure-regression.test.js')
s=p.read_text()
anchor="""check('platform links official PeoplePerHour source', () => {\n  assert.ok(platformHtml.includes('https://support.peopleperhour.com/hc/en-us/articles/205218337-Freelancer-commission-fees'));\n});\n\n"""
block=r"""check('platform description owns fee take-home intent', () => {
  const description = metaContent(platformHtml, 'description');
  assert.match(description, /platform\s+fee/i);
  assert.match(description, /keep|take-home|client/i);
});
check('platform supporting heading: how it works', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*How (?:the )?Freelance Platform Fee Calculator Works[^<]*<\/h2>/i);
});
check('platform supporting heading: worked example', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*Platform Fee Worked Example[^<]*<\/h2>/i);
});
check('platform supporting heading: fee differences', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*(?:Why Fees Differ|Actual Fees May Differ)[^<]*<\/h2>/i);
});
check('platform supporting heading: assumptions and sources', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*Assumptions (?:&|and) Official Sources[^<]*<\/h2>/i);
});
check('platform supporting heading: FAQ', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*Platform Fee FAQ[^<]*<\/h2>/i);
});
check('platform supports both forward and reverse planning intents', () => {
  assert.match(platformHtml, /Client Pays/i);
  assert.match(platformHtml, /I Want to Keep/i);
});

const taxHtml = pages.get('tax').html;
check('tax description owns 2026 freelancer tax intent', () => {
  const description = metaContent(taxHtml, 'description');
  assert.match(description, /2026/);
  assert.match(description, /self-employment/i);
  assert.match(description, /quarterly/i);
  assert.match(description, /take-home/i);
});
check('tax supporting heading: how it works', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*How (?:the )?Freelance Tax Calculator Works[^<]*<\/h2>/i);
});
check('tax supporting heading: self-employment tax', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Self-Employment Tax[^<]*<\/h2>/i);
});
check('tax supporting heading: quarterly estimates', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Quarterly Estimated Taxes[^<]*<\/h2>/i);
});
check('tax supporting heading: worked example', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Freelance Tax Worked Example[^<]*<\/h2>/i);
});
check('tax supporting heading: methodology and IRS sources', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Methodology (?:&|and) IRS Sources[^<]*<\/h2>/i);
});
check('tax shows reviewed date and estimate disclaimer', () => {
  assert.match(taxHtml, /Last reviewed:\s*(?:<[^>]+>\s*)*September 26, 2026/i);
  assert.match(taxHtml, /estimate[^.]{0,120}not tax advice|not tax advice[^.]{0,120}estimate/i);
});
check('tax links current IRS sources', () => {
  assert.ok(taxHtml.includes('https://www.irs.gov/publications/p505'));
  assert.ok(taxHtml.includes('https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center'));
  assert.ok(taxHtml.includes('https://www.irs.gov/taxtopics/tc554'));
});
check('tax supporting heading: FAQ', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Freelance Tax FAQ[^<]*<\/h2>/i);
});

"""
if block.strip() not in s:
    if anchor not in s: raise SystemExit('anchor missing')
    s=s.replace(anchor,anchor+block,1)
p.write_text(s)
print('Task 5 RED assertions staged')
