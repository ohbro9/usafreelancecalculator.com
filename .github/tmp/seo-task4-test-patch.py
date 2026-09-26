from pathlib import Path

path = Path('tests/seo-structure-regression.test.js')
text = path.read_text()
anchor = """check('home and hourly H1 are distinct', () => {\n  assert.notEqual(tagText(pages.get('home').html, 'h1'), tagText(pages.get('hourly').html, 'h1'));\n});\n"""
if anchor not in text:
    raise SystemExit('Task 4 test anchor not found')
if "home includes all five calculator links" in text:
    print('Task 4 checks already present')
else:
    addition = r'''

const homeHtml = pages.get('home').html;
check('home description owns five-tool hub intent', () => {
  const description = metaContent(homeHtml, 'description');
  assert.match(description, /5\s+connected/i);
  assert.match(description, /US\s+freelancers/i);
});
check('home includes all five calculator links', () => {
  for (const href of [
    'hourly-rate-calculator.html',
    'platform-fee-calculator.html',
    'tax-estimator.html',
    'income-goal-planner.html',
    'budget-planner.html',
  ]) {
    assert.match(homeHtml, new RegExp(`href=["']${href.replace('.', '\\.')}(?:[?#][^"']*)?["']`, 'i'));
  }
});
check('home supporting heading: choose calculator', () => {
  assert.match(homeHtml, /<h2\b[^>]*>[^<]*Choose the Right Calculator[^<]*<\/h2>/i);
});
check('home supporting heading: connected workflow', () => {
  assert.match(homeHtml, /<h2\b[^>]*>[^<]*How the 5 Tools Work Together[^<]*<\/h2>/i);
});
check('home supporting heading: goal entry points', () => {
  assert.match(homeHtml, /<h2\b[^>]*>[^<]*Start With Your Goal[^<]*<\/h2>/i);
});
check('home does not duplicate hourly SEO guide', () => {
  assert.ok(!/How to Calculate Your Freelance Hourly Rate/i.test(homeHtml));
});

const hourlyHtml = pages.get('hourly').html;
check('hourly description owns rate intent', () => {
  const description = metaContent(hourlyHtml, 'description');
  assert.match(description, /freelance\s+hourly\s+rate/i);
  assert.match(description, /billable|charge|rate/i);
});
check('hourly supporting heading: how to calculate', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*How to Calculate Your Freelance Hourly Rate[^<]*<\/h2>/i);
});
check('hourly supporting heading: formula or methodology', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*(?:Formula|Methodology)[^<]*<\/h2>/i);
});
check('hourly supporting heading: billable hours', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*Billable(?:\s+vs\.?\s+Non-Billable)? Hours[^<]*<\/h2>/i);
});
check('hourly supporting heading: time off expenses taxes', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*(?:Time Off|Expenses|Taxes)[^<]*<\/h2>/i);
});
check('hourly supporting heading: worked example', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*Worked Example[^<]*<\/h2>/i);
});
check('hourly supporting heading: FAQ', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*FAQ[^<]*<\/h2>/i);
});
check('hourly supporting heading: related tools', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*Related (?:Freelance )?(?:Tools|Calculators)[^<]*<\/h2>/i);
});
check('hourly contextual link to Platform Fee Calculator', () => {
  assert.match(hourlyHtml, /href=["']platform-fee-calculator\.html["'][^>]*>[^<]*(?:Platform|Fee)[^<]*<\/a>/i);
});
check('hourly contextual link to Tax Estimator', () => {
  assert.match(hourlyHtml, /href=["']tax-estimator\.html["'][^>]*>[^<]*Tax[^<]*<\/a>/i);
});
'''
    text = text.replace(anchor, anchor + addition, 1)
    path.write_text(text)
    print('Task 4 structural assertions inserted')
