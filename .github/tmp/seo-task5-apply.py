from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def insert_once(text, anchor, block, marker, label):
    if marker in text:
        return text
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(anchor, block + anchor, 1)


platform_path = Path('platform-fee-calculator.html')
platform = platform_path.read_text(encoding='utf-8')
platform = replace_once(platform,
    '<title>USA Freelance Platform Fee Calculator | Free Tool</title>',
    '<title>Freelance Platform Fee Calculator | See What You Keep</title>',
    'platform title')
platform = replace_once(platform,
    '<meta name="description" content="Free USA freelance platform fee calculator. Compare platform, payment, and payout fees to see what you actually keep before tax."/>',
    '<meta name="description" content="Calculate freelance platform fees to see what you keep when a client pays, or how much a client should pay for your target take-home, with editable fee assumptions."/>',
    'platform description')
platform = replace_once(platform,
    '<meta property="og:title" content="USA Freelance Platform Fee Calculator"/>',
    '<meta property="og:title" content="Freelance Platform Fee Calculator | See What You Keep"/>',
    'platform og title')
platform = replace_once(platform,
    '<meta property="og:description" content="See how much you keep after platform fees, processing fees, payouts, and optional tax assumptions."/>',
    '<meta property="og:description" content="Compare Client Pays and I Want to Keep scenarios with editable platform, payment, payout, and optional tax assumptions."/>',
    'platform og description')
platform = replace_once(platform,
    '<meta name="twitter:title" content="USA Freelance Platform Fee Calculator"/>',
    '<meta name="twitter:title" content="Freelance Platform Fee Calculator | See What You Keep"/>',
    'platform twitter title')
platform = replace_once(platform,
    '<meta name="twitter:description" content="Free tool for Upwork, Fiverr, Freelancer, payment fees, and retained earnings planning."/>',
    '<meta name="twitter:description" content="See what you keep after freelance platform fees or reverse-calculate what a client should pay."/>',
    'platform twitter description')
platform = replace_once(platform,
    '"name": "USA Freelance Platform Fee Calculator",',
    '"name": "Freelance Platform Fee Calculator",',
    'platform schema name')
platform = replace_once(platform,
    '"description": "Free platform fee calculator for US freelancers to compare what they keep after fees and payouts.",',
    '"description": "Freelance platform fee calculator for forward Client Pays and reverse I Want to Keep planning with editable fee assumptions.",',
    'platform schema description')
platform = replace_once(platform,
    '<h1 class="pfc-brand-h1">USA Freelance Platform<br class="pfc-h1-br"> Fee Calculator</h1>',
    '<h1 class="pfc-brand-h1">Freelance Platform Fee Calculator</h1>',
    'platform h1')
platform = replace_once(platform,
    '<p class="pfc-brand-sub">See exactly what you keep after platform fees, payment processing, withdrawals, and taxes — instantly.</p>',
    '<p class="pfc-brand-sub">See what you keep after editable platform and payout fees, or reverse-calculate what a client should pay for your target amount.</p>',
    'platform subtitle')

platform_css = '''\n  /* TASK 5 — supporting SEO/trust content below the calculator */\n  .pfc-seo-guide{max-width:1140px;margin:22px auto 0;padding:0 0 10px;}\n  .pfc-seo-guide-inner{display:grid;gap:14px;}\n  .pfc-seo-card{background:var(--pfc-shell);border:1px solid var(--pfc-line);border-radius:22px;padding:18px;box-shadow:var(--pfc-shadow-sm);}\n  .dark .pfc-seo-card{background:#162032;border-color:#334155;}\n  .pfc-seo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}\n  .pfc-seo-card h2{margin:0 0 9px;font-size:clamp(19px,2.5vw,25px);line-height:1.15;letter-spacing:-.03em;color:var(--pfc-text);}\n  .pfc-seo-card h3{margin:14px 0 5px;font-size:15px;line-height:1.3;color:var(--pfc-text);}\n  .pfc-seo-card p,.pfc-seo-card li{color:var(--pfc-muted);font-size:13px;line-height:1.65;}\n  .pfc-seo-card ul,.pfc-seo-card ol{margin:9px 0 0 20px;display:grid;gap:6px;}\n  .pfc-seo-card a{color:var(--pfc-blue2);font-weight:800;text-underline-offset:3px;}\n  .pfc-seo-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--pfc-muted2);font-weight:900;margin-bottom:7px;}\n  .pfc-seo-example{font-variant-numeric:tabular-nums;}\n  .pfc-seo-source-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}\n  .pfc-seo-source-list a{display:inline-flex;min-height:34px;align-items:center;padding:7px 10px;border-radius:999px;border:1px solid var(--pfc-line);background:var(--pfc-panel);font-size:11px;text-decoration:none;}\n  @media(max-width:720px){.pfc-seo-guide{margin-top:16px}.pfc-seo-grid{grid-template-columns:1fr}.pfc-seo-card{padding:15px;border-radius:18px;}}\n'''
platform = insert_once(platform,
    '  </style>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>',
    platform_css,
    'TASK 5 — supporting SEO/trust content below the calculator',
    'platform css')

platform_section = '''\n  <section class="pfc-seo-guide" aria-label="Platform fee calculator guide">\n    <div class="pfc-seo-guide-inner">\n      <article class="pfc-seo-card">\n        <div class="pfc-seo-kicker">Freelancer fee planning</div>\n        <h2>How the Freelance Platform Fee Calculator Works</h2>\n        <p><strong>Client Pays</strong> starts with the project amount and subtracts the editable platform fee plus any payment, payout, or optional tax assumptions you turn on. <strong>I Want to Keep</strong> works in reverse: enter the amount you want to retain and the calculator estimates the client charge needed to support that target under the same fee setup.</p>\n        <ol>\n          <li>Enter the client amount or your target keep amount.</li>\n          <li>Use a preset only as a starting point, or choose Custom and enter the fee shown in your own account or contract.</li>\n          <li>Add only the processor, payout, or tax assumptions that actually apply to your situation.</li>\n          <li>Review the live result, comparison, and next-tool handoff before using the number in a quote or plan.</li>\n        </ol>\n      </article>\n\n      <div class="pfc-seo-grid">\n        <article class="pfc-seo-card pfc-seo-example">\n          <h2>Platform Fee Worked Example</h2>\n          <p><strong>Client Pays example:</strong> with a $1,000.55 project amount, an illustrative 10% platform fee, and no extra processor, payout, or tax deductions, the calculator keeps cent-level line-item rounding and shows <strong>$900.49</strong> retained.</p>\n          <p style="margin-top:8px;"><strong>I Want to Keep example:</strong> under the same illustrative 10% fee and no extras, a $1,000.55 keep target requires a client charge of <strong>$1,111.72</strong>.</p>\n          <p style="margin-top:8px;">These are calculator examples, not claims that every platform charges 10%.</p>\n        </article>\n\n        <article class="pfc-seo-card">\n          <h2>Why Fees Differ</h2>\n          <p>Actual freelancer fees can vary by platform, contract, account, program, payout method, location, and currency. Upwork currently documents a freelancer service fee that can range from 0% to 15% per contract, while Fiverr's earnings guidance generally describes freelancer earnings as 80% of the completed order amount. Your own account or contract is the source of truth for the rate that applies to you.</p>\n          <p style="margin-top:8px;">That is why this tool keeps platform rates editable instead of treating one preset as a universal fee.</p>\n        </article>\n      </div>\n\n      <article class="pfc-seo-card">\n        <h2>Assumptions &amp; Official Sources</h2>\n        <p><strong>Last reviewed: September 26, 2026.</strong> Presets are illustrative starting points. The calculator only includes processor, payout, tax, or other deductions that you select, and special programs or account-specific terms can change the real result.</p>\n        <div class="pfc-seo-source-list" aria-label="Official platform fee sources">\n          <a href="https://support.upwork.com/hc/en-us/articles/211062538-Learn-about-the-Freelancer-Service-Fee" target="_blank" rel="noopener noreferrer">Upwork fee guidance</a>\n          <a href="https://help.fiverr.com/hc/en-us/articles/9234443621137-Your-earnings-page" target="_blank" rel="noopener noreferrer">Fiverr earnings</a>\n          <a href="https://www.freelancer.com/feesandcharges" target="_blank" rel="noopener noreferrer">Freelancer.com fees</a>\n          <a href="https://www.toptal.com/freelance-jobs/faq" target="_blank" rel="noopener noreferrer">Toptal freelancer FAQ</a>\n          <a href="https://www.guru.com/help/freelancer/about-guru-freelancer/fees/job-fee" target="_blank" rel="noopener noreferrer">Guru job fee</a>\n          <a href="https://support.peopleperhour.com/hc/en-us/articles/205218337-Freelancer-commission-fees" target="_blank" rel="noopener noreferrer">PeoplePerHour commission</a>\n        </div>\n      </article>\n\n      <article class="pfc-seo-card">\n        <h2>Platform Fee FAQ</h2>\n        <h3>Should I use a preset or my exact account fee?</h3>\n        <p>Use the exact fee shown in your account or contract when you have it. Presets are faster for scenarios, but they are not universal platform rates.</p>\n        <h3>What does I Want to Keep calculate?</h3>\n        <p>It reverses the fee setup to estimate the client charge needed for your chosen keep target. This is useful when you know the amount you need to retain after selected fees.</p>\n        <h3>Does the result include taxes automatically?</h3>\n        <p>No. Tax planning is optional on this page. For a fuller US freelancer tax estimate, send the pre-tax amount to the <a href="tax-estimator.html">Freelance Tax Calculator</a>.</p>\n      </article>\n    </div>\n  </section>\n\n'''
platform = insert_once(platform,
    '  <div id="toast" class="toast"></div>\n</div>\n<!-- COPY MODAL -->',
    platform_section,
    'How the Freelance Platform Fee Calculator Works',
    'platform guide')
platform_path.write_text(platform, encoding='utf-8')


tax_path = Path('tax-estimator.html')
tax = tax_path.read_text(encoding='utf-8')
tax = replace_once(tax,
    '<title>USA Freelance Tax Estimator | Free Freelancer Tax Calculator</title>',
    '<title>Freelance Tax Calculator 2026 | Estimate Taxes &amp; Take-Home</title>',
    'tax title')
tax = replace_once(tax,
    '<meta name="description" content="Free USA freelance tax estimator. Calculate self-employment tax, federal tax, quarterly estimates, and real take-home pay."/>',
    '<meta name="description" content="Estimate 2026 freelance taxes including self-employment tax, federal tax, quarterly payments, and take-home pay for US freelancers."/>',
    'tax description')
tax = replace_once(tax,
    '<meta property="og:title"       content="USA Freelance Tax Estimator"/>',
    '<meta property="og:title"       content="Freelance Tax Calculator 2026 | Estimate Taxes &amp; Take-Home"/>',
    'tax og title')
tax = replace_once(tax,
    '<meta property="og:description" content="Know exactly what you keep. Free live tax estimate for US freelancers — SE tax, federal, state, quarterly payments. No sign-up."/>',
    '<meta property="og:description" content="Estimate 2026 self-employment tax, federal tax, quarterly payments, optional state tax, and take-home for US freelancers."/>',
    'tax og description')
tax = replace_once(tax,
    '<meta name="twitter:title"       content="USA Freelance Tax Estimator"/>',
    '<meta name="twitter:title"       content="Freelance Tax Calculator 2026 | Estimate Taxes &amp; Take-Home"/>',
    'tax twitter title')
tax = replace_once(tax,
    '<meta name="twitter:description" content="Know exactly what you keep. Free live tax estimate — no sign-up needed."/>',
    '<meta name="twitter:description" content="Estimate 2026 freelancer self-employment tax, quarterly payments, and take-home with editable assumptions."/>',
    'tax twitter description')
tax = replace_once(tax,
    '"name": "USA Freelance Tax Estimator",',
    '"name": "Freelance Tax Calculator for US Freelancers",',
    'tax schema name')
tax = replace_once(tax,
    '"description": "Free freelancer tax estimator for US self-employed income, self-employment tax, and take-home planning.",',
    '"description": "2026 freelance tax calculator for US self-employed income, self-employment tax, quarterly estimates, and take-home planning.",',
    'tax schema description')
tax = replace_once(tax,
    '<h1>USA Freelance Tax <span class="h1-nowrap">Estimator <em>(2025–2026)</em></span></h1>',
    '<h1>Freelance Tax Calculator for US Freelancers</h1>',
    'tax h1')
tax = replace_once(tax,
    '<p>Estimate your take-home after federal, self-employment, and optional state taxes.</p>',
    '<p>Estimate 2026 take-home, self-employment tax, federal tax, quarterly payments, and optional state tax; switch to 2025 when needed.</p>',
    'tax subtitle')
tax = replace_once(tax,
    '<p class="tool-share-description">This keeps the end of the estimator clean on both mobile and desktop while still giving users a native share action, direct link copy, and compact social shortcuts.</p>',
    '<p class="tool-share-description">Use the share or copy-link options to send the live estimator quickly on mobile or desktop.</p>',
    'tax share copy')

tax_css = '''\n  /* TASK 5 — supporting SEO/trust content below the calculator */\n  .tax-seo-guide{position:relative;z-index:1;max-width:920px;margin:0 auto 18px;padding:0 14px;}\n  .tax-seo-guide-inner{display:grid;gap:13px;}\n  .tax-seo-card{background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.012)),var(--card);border:1px solid var(--border);border-radius:22px;padding:18px;box-shadow:0 14px 34px rgba(0,0,0,.20);}\n  .tax-seo-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;}\n  .tax-seo-card h2{margin:0 0 9px;font-size:clamp(19px,2.7vw,25px);line-height:1.16;letter-spacing:-.03em;color:var(--text);}\n  .tax-seo-card h3{margin:14px 0 5px;font-size:15px;line-height:1.3;color:var(--text);}\n  .tax-seo-card p,.tax-seo-card li{color:var(--muted);font-size:13px;line-height:1.65;}\n  .tax-seo-card ul,.tax-seo-card ol{margin:9px 0 0 20px;display:grid;gap:6px;}\n  .tax-seo-card a{color:var(--gold2);font-weight:800;text-underline-offset:3px;}\n  .tax-seo-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted2);font-weight:900;margin-bottom:7px;}\n  .tax-seo-sources{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}\n  .tax-seo-sources a{display:inline-flex;align-items:center;min-height:34px;padding:7px 10px;border-radius:999px;border:1px solid var(--border2);background:rgba(255,255,255,.025);font-size:11px;text-decoration:none;}\n  @media(max-width:720px){.tax-seo-grid{grid-template-columns:1fr}.tax-seo-card{padding:15px;border-radius:18px;}}\n'''
tax = insert_once(tax,
    '</style>\n</head>',
    tax_css,
    'TASK 5 — supporting SEO/trust content below the calculator',
    'tax css')

tax_section = '''\n<section class="tax-seo-guide" aria-label="Freelance tax calculator guide">\n  <div class="tax-seo-guide-inner">\n    <article class="tax-seo-card">\n      <div class="tax-seo-kicker">2026 US freelancer tax planning</div>\n      <h2>How the Freelance Tax Calculator Works</h2>\n      <p>Start with annual or monthly freelance income, subtract business expenses, choose filing status, and then adjust only the options that apply to you. The estimator models federal income tax and self-employment tax separately, can add an optional state estimate, and shows take-home plus a quarterly planning amount.</p>\n      <ol>\n        <li>Enter gross freelance income and business expenses.</li>\n        <li>Select 2026 or 2025, filing status, and any relevant advanced assumptions.</li>\n        <li>Review self-employment tax, federal tax, deductions or credits, and estimated take-home.</li>\n        <li>Use the quarterly section as a planning estimate, then verify filing decisions against your own records and current IRS guidance.</li>\n      </ol>\n    </article>\n\n    <div class="tax-seo-grid">\n      <article class="tax-seo-card">\n        <h2>Self-Employment Tax</h2>\n        <p>Self-employment tax is separate from federal income tax. IRS guidance describes it as Social Security and Medicare tax for people who work for themselves. This calculator uses the selected tax year's Social Security wage base, Medicare component, and Additional Medicare rules where applicable, while keeping the deductible half-SE calculation separate from Additional Medicare Tax.</p>\n      </article>\n\n      <article class="tax-seo-card">\n        <h2>Quarterly Estimated Taxes</h2>\n        <p>Federal income tax is pay-as-you-go. Self-employed people may need estimated payments when withholding does not cover enough tax. The estimator can show a quarterly planning amount and supports prior-year tax, prior-year AGI, and withholding inputs for its safe-harbor comparison. Actual required payments depend on your full tax situation.</p>\n      </article>\n    </div>\n\n    <article class="tax-seo-card">\n      <h2>Freelance Tax Worked Example</h2>\n      <p><strong>Scenario:</strong> 2026, Single, $100,000 gross freelance income, $20,000 business expenses, federal only, no W-2 income, no dependents, with the QBI estimate left on. The calculator begins with <strong>$80,000 of business profit</strong>, then applies its current self-employment-tax, half-SE-deduction, deduction, QBI, federal-bracket, and quarterly-planning logic before showing estimated take-home.</p>\n      <p style="margin-top:8px;">Changing filing status, state settings, retirement contributions, dependents, W-2 wages, itemized deductions, withholding, or prior-year safe-harbor inputs can materially change the result, so the example is a walkthrough rather than a universal tax outcome.</p>\n    </article>\n\n    <article class="tax-seo-card">\n      <h2>Methodology &amp; IRS Sources</h2>\n      <p><strong>Last reviewed: September 26, 2026.</strong> This calculator is an estimate for planning and is not tax advice. It uses the selected year's tax data and the assumptions shown in the interface; some state, entity, credit, deduction, and multi-state situations remain simplified.</p>\n      <div class="tax-seo-sources" aria-label="IRS sources">\n        <a href="https://www.irs.gov/publications/p505" target="_blank" rel="noopener noreferrer">IRS Publication 505 (2026)</a>\n        <a href="https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center" target="_blank" rel="noopener noreferrer">IRS Self-Employed Tax Center</a>\n        <a href="https://www.irs.gov/taxtopics/tc554" target="_blank" rel="noopener noreferrer">IRS Topic 554: Self-Employment Tax</a>\n        <a href="https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes" target="_blank" rel="noopener noreferrer">IRS Estimated Taxes</a>\n      </div>\n    </article>\n\n    <article class="tax-seo-card">\n      <h2>Freelance Tax FAQ</h2>\n      <h3>Does this calculator include self-employment tax?</h3>\n      <p>Yes. It estimates self-employment tax separately from federal income tax and reflects the selected year's Social Security wage base and Medicare-related rules used by the tool.</p>\n      <h3>Is the quarterly amount the exact payment I must send?</h3>\n      <p>No. It is a planning estimate based on the information you enter. Withholding, prior-year tax, prior-year AGI, income changes, credits, and other tax facts can change what you actually need to pay.</p>\n      <h3>Can I use the result as tax advice?</h3>\n      <p>No. Use it for planning and scenario comparison. Verify important filing, entity, state, and payment decisions with current IRS guidance or a qualified tax professional.</p>\n      <h3>What should I do after estimating take-home?</h3>\n      <p>You can continue to the <a href="income-goal-planner.html">Freelance Income Goal Calculator</a> to translate take-home needs into a revenue target, then use the Budget Planner for cash planning.</p>\n    </article>\n  </div>\n</section>\n\n'''
tax = insert_once(tax,
    '</div><!-- /wrap -->\n\n<section class="tool-share-section tool-share-section--gold"',
    tax_section,
    'How the Freelance Tax Calculator Works',
    'tax guide')
tax_path.write_text(tax, encoding='utf-8')

print('Task 5 product patch applied or already present.')
