from pathlib import Path

path = Path('budget-planner.html')
text = path.read_text()


def replace_idempotent(old, new, label):
    global text
    if new in text:
        print(f'already updated: {label}')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old match, found {count}')
    text = text.replace(old, new, 1)
    print(f'updated: {label}')


replace_idempotent(
    '<title>USA Freelance Budget Planner | Free Budget Calculator</title>',
    '<title>Freelance Budget Calculator for Irregular Income | Free Tool</title>',
    'title',
)
replace_idempotent(
    '<meta name="description" content="Free USA freelance budget planner. Track income, expenses, tax reserve, runway, and export a polished budget report."/>',
    '<meta name="description" content="Plan irregular freelance income with a free budget calculator for tax reserves, business and personal expenses, savings, and cash runway."/>',
    'meta description',
)
replace_idempotent(
    '<meta property="og:title" content="USA Freelance Budget Planner"/>',
    '<meta property="og:title" content="Freelance Budget Calculator for Irregular Income"/>',
    'og title',
)
replace_idempotent(
    '<meta property="og:description" content="Plan your freelance budget with tax reserve, runway, expense tracking, and share-ready exports."/>',
    '<meta property="og:description" content="Budget irregular freelance income, plan tax reserves and expenses, and measure savings and cash runway."/>',
    'og description',
)
replace_idempotent(
    '<meta name="twitter:title" content="USA Freelance Budget Planner"/>',
    '<meta name="twitter:title" content="Freelance Budget Calculator for Irregular Income"/>',
    'twitter title',
)
replace_idempotent(
    '<meta name="twitter:description" content="Free budget planner for freelancers with runway, reserve, and export-ready reporting."/>',
    '<meta name="twitter:description" content="Plan irregular freelance income with tax reserves, expenses, savings, and cash runway in one free calculator."/>',
    'twitter description',
)
replace_idempotent(
    '  "name": "USA Freelance Budget Planner",',
    '  "name": "Freelance Budget Calculator",',
    'schema name',
)
replace_idempotent(
    '  "description": "Free budget planner for US freelancers with income, expenses, reserve planning, and export tools.",',
    '  "description": "Free budget calculator for US freelancers planning irregular income, expenses, tax reserves, savings, and cash runway.",',
    'schema description',
)
replace_idempotent(
    '    <h1>Freelance <span>Budget</span><br>Planner</h1>\n    <p class="subtitle">Plan smart. Protect runway. Export with confidence.</p>',
    '    <h1>Freelance <span>Budget</span> Calculator</h1>\n    <p class="subtitle">Plan irregular freelance income, separate tax reserves and expenses, build savings, and monitor cash runway.</p>',
    'visible heading and intro',
)

css = r'''

  /* ── BUDGET SEO SUPPORTING CONTENT ── */
  .budget-seo-section {
    position: relative;
    max-width: 1160px;
    margin: 0 auto 30px;
    padding: 0 24px;
  }
  .budget-seo-shell {
    background: var(--surface);
    border: 1px solid var(--border-gold);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.2);
  }
  .budget-seo-kicker {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }
  .budget-seo-section h2 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.05rem, 2.4vw, 1.35rem);
    line-height: 1.25;
    color: var(--gold-light);
    margin: 0 0 10px;
  }
  .budget-seo-section p {
    color: var(--text-dim);
    line-height: 1.7;
    margin: 0;
  }
  .budget-seo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 16px;
  }
  .budget-seo-card,
  .budget-seo-faq,
  .budget-seo-related {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 17px;
  }
  .budget-seo-note {
    margin-top: 9px !important;
    color: var(--text-muted) !important;
    font-size: 12px;
  }
  .budget-seo-faq,
  .budget-seo-related {
    margin-top: 14px;
  }
  .budget-seo-faq details {
    border-top: 1px solid var(--border);
    padding: 11px 0;
  }
  .budget-seo-faq details:first-of-type {
    border-top: 0;
    padding-top: 2px;
  }
  .budget-seo-faq summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 600;
  }
  .budget-seo-faq details p {
    margin-top: 7px;
  }
  .budget-seo-related-links {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 12px;
  }
  .budget-seo-related-links a {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 7px 11px;
    border: 1px solid var(--border-gold);
    border-radius: 999px;
    color: var(--gold-light);
    text-decoration: none;
    background: rgba(201,168,76,0.05);
  }
  .budget-seo-related-links a:hover {
    border-color: var(--gold-dim);
  }
  @media(max-width: 700px) {
    .budget-seo-section { padding: 0 18px; margin-bottom: 24px; }
    .budget-seo-shell { padding: 18px 15px; }
    .budget-seo-grid { grid-template-columns: 1fr; }
    .budget-seo-card, .budget-seo-faq, .budget-seo-related { padding: 15px; }
  }
'''

if '/* ── BUDGET SEO SUPPORTING CONTENT ── */' not in text:
    marker = '</style>\n</head>'
    if text.count(marker) != 1:
        raise SystemExit(f'style marker: expected one match, found {text.count(marker)}')
    text = text.replace(marker, css + '\n</style>\n</head>', 1)
    print('inserted: supporting styles')
else:
    print('already updated: supporting styles')

supporting = r'''
<section class="budget-seo-section" aria-label="Freelance budget planning guide">
  <div class="budget-seo-shell">
    <div class="budget-seo-kicker">Budget Planning Guide</div>
    <h2>How the Freelance Budget Calculator Works</h2>
    <p>Use the calculator above as the working area: enter a representative income amount, separate personal and business costs, choose the tax-reserve approach that fits your planning scenario, add savings and cash reserves, then review the resulting surplus, reserve health, and runway. For irregular income, use a realistic average or a conservative month instead of relying only on your best month.</p>

    <div class="budget-seo-grid">
      <article class="budget-seo-card">
        <h2>Irregular-Income Worked Example</h2>
        <p>Suppose three freelance months bring in $4,000, $8,000, and $6,000. That is $18,000 across the quarter, or a $6,000 monthly average. For one planning example, a 25% manual tax reserve would set aside $1,500; $900 of business costs, $2,600 of personal costs, and $500 of savings would leave $500 before any other budget items. A lower-income scenario can also be tested to see how the plan holds up when work slows.</p>
        <p class="budget-seo-note">The 25% reserve in this example is an illustration, not a recommended tax rate or tax advice.</p>
      </article>

      <article class="budget-seo-card">
        <h2>Tax Reserve for Freelancers</h2>
        <p>Treat tax-reserve money as unavailable for normal spending. The planner lets you compare its Smart estimate with manual reserve scenarios, while the exact amount you may owe depends on your full tax situation. For a dedicated estimate, use the <a href="tax-estimator.html">Freelance Tax Estimator</a> and then carry a practical reserve into your budget.</p>
      </article>

      <article class="budget-seo-card">
        <h2>Runway, Savings, and Flexible Expenses</h2>
        <p>Cash runway helps show how long your reserve may support the budget under the current plan. The calculator uses your cash reserve and planned outflows; when the budget is in deficit, it also reflects the rate at which cash is being used. Keeping essential expenses, flexible spending, and savings visible makes it easier to test a slower month before it happens.</p>
      </article>

      <article class="budget-seo-card">
        <h2>Budget Around the Rate You Actually Need</h2>
        <p>A budget is more useful when it connects back to your pricing. If your planned expenses and savings require more revenue than your current schedule supports, open the <a href="hourly-rate-calculator.html">Freelance Hourly Rate Calculator</a> to estimate a rate from billable hours, working time, and your income target.</p>
      </article>
    </div>

    <div class="budget-seo-faq">
      <h2>Freelance Budget FAQ</h2>
      <details>
        <summary>How should I budget when freelance income changes every month?</summary>
        <p>Start with a recent average or another representative amount, then run a lower-income scenario. Keeping fixed costs visible makes it easier to see which flexible expenses can change when revenue is below normal.</p>
      </details>
      <details>
        <summary>Should tax reserves be counted as spendable cash?</summary>
        <p>For planning, it is clearer to separate money reserved for taxes from money available for expenses or savings. The calculator keeps that reserve visible so it does not disappear inside a general spending total.</p>
      </details>
      <details>
        <summary>What does cash runway mean in this planner?</summary>
        <p>Runway is a planning signal based on your available cash reserve and the current budget. It helps you compare how long reserves may last under positive-cash-flow or deficit scenarios; it is not a guarantee of future income or expenses.</p>
      </details>
      <details>
        <summary>Can I use this calculator after setting an income goal?</summary>
        <p>Yes. Budget Planner can work on its own or receive a connected toolkit handoff, so you can compare a target gross amount with tax reserve, business costs, personal costs, savings, and runway.</p>
      </details>
    </div>

    <div class="budget-seo-related">
      <h2>Related Freelance Calculators</h2>
      <p>Move between pricing, taxes, goals, and budgeting without rethinking the same numbers from scratch.</p>
      <div class="budget-seo-related-links">
        <a href="hourly-rate-calculator.html">Freelance Hourly Rate Calculator</a>
        <a href="tax-estimator.html">Freelance Tax Estimator</a>
        <a href="income-goal-planner.html">Freelance Income Goal Planner</a>
        <a href="platform-fee-calculator.html">Freelance Platform Fee Calculator</a>
      </div>
    </div>
  </div>
</section>
'''

if '<section class="budget-seo-section"' not in text:
    marker = '</div><!-- /.wrapper -->\n\n<section class="tool-share-section'
    if text.count(marker) != 1:
        raise SystemExit(f'content marker: expected one match, found {text.count(marker)}')
    text = text.replace(
        marker,
        '</div><!-- /.wrapper -->\n\n' + supporting + '\n<section class="tool-share-section',
        1,
    )
    print('inserted: supporting content')
else:
    print('already updated: supporting content')

required = [
    '<title>Freelance Budget Calculator for Irregular Income | Free Tool</title>',
    '<h1>Freelance <span>Budget</span> Calculator</h1>',
    'How the Freelance Budget Calculator Works',
    'Irregular-Income Worked Example',
    'Tax Reserve for Freelancers',
    'Runway, Savings, and Flexible Expenses',
    'Freelance Budget FAQ',
    'Related Freelance Calculators',
    'href="hourly-rate-calculator.html">Freelance Hourly Rate Calculator</a>',
    'href="tax-estimator.html">Freelance Tax Estimator</a>',
]
for item in required:
    if item not in text:
        raise SystemExit(f'missing required Task 3 content: {item}')

path.write_text(text)
print('Task 3 apply script: PASS')
