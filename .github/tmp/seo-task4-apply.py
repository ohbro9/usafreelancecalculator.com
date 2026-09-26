from pathlib import Path


def update_file(path_name, replacements, insertions):
    path = Path(path_name)
    text = path.read_text()

    for old, new, label in replacements:
        if new in text:
            print(f'{path_name}: already updated {label}')
            continue
        count = text.count(old)
        if count != 1:
            raise SystemExit(f'{path_name}: {label}: expected one old anchor, found {count}')
        text = text.replace(old, new, 1)
        print(f'{path_name}: updated {label}')

    for marker, block, label in insertions:
        if block.strip() in text:
            print(f'{path_name}: already inserted {label}')
            continue
        count = text.count(marker)
        if count != 1:
            raise SystemExit(f'{path_name}: {label}: expected one marker, found {count}')
        text = text.replace(marker, block + '\n' + marker, 1)
        print(f'{path_name}: inserted {label}')

    path.write_text(text)


home_replacements = [
    (
        '<title>USA Freelance Calculator Toolkit — 5 Connected Tools for Freelancers</title>',
        '<title>Freelance Calculator for US Freelancers | 5 Connected Tools</title>',
        'title',
    ),
    (
        '<meta name="description" content="Premium USA Freelance Calculator Toolkit with 5 connected tools: hourly rate, platform fees, tax estimator, income goal planner, and budget planner. Use each tool separately or as one workflow.">',
        '<meta name="description" content="Use 5 connected freelance calculators for US freelancers to plan hourly rates, platform fees, taxes, income goals, and budgets with no signup or ads.">',
        'meta description',
    ),
    (
        '<meta property="og:title" content="USA Freelance Calculator Toolkit">',
        '<meta property="og:title" content="Freelance Calculator for US Freelancers | 5 Connected Tools">',
        'og title',
    ),
    (
        '<meta property="og:description" content="5 connected premium tools for US freelancers: hourly rate, platform fees, tax, income goal, and budget planning.">',
        '<meta property="og:description" content="Use five connected freelance calculators for hourly rates, platform fees, taxes, income goals, and budgeting.">',
        'og description',
    ),
    (
        '<meta name="twitter:title" content="USA Freelance Calculator Toolkit">',
        '<meta name="twitter:title" content="Freelance Calculator for US Freelancers | 5 Connected Tools">',
        'twitter title',
    ),
    (
        '<meta name="twitter:description" content="Premium toolkit for US freelancers with 5 connected tools and standalone direct access.">',
        '<meta name="twitter:description" content="Five connected freelance calculators for rates, fees, taxes, income goals, and budgets, with direct access to every tool.">',
        'twitter description',
    ),
    (
        '        "name": "USA Freelance Calculator Toolkit",',
        '        "name": "USA Freelance Calculator",',
        'schema name',
    ),
    (
        '        "description": "Premium toolkit for US freelancers with connected hourly rate, fees, tax, income goal, and budget planning tools.",',
        '        "description": "Five connected finance calculators for US freelancers covering hourly rates, platform fees, taxes, income goals, and budgeting.",',
        'schema description',
    ),
    (
        '<h1 class="home-headline">One premium toolkit for freelance rates, fees, tax, goals, and budgeting.</h1>',
        '<h1 class="home-headline">5 Connected Freelance Calculators for Rates, Fees, Taxes, Goals &amp; Budgeting</h1>',
        'H1',
    ),
    (
        '<p class="home-sub">Use each tool separately or move through one connected workflow. Start with the hourly calculator below, or jump directly into the exact tool you need.</p>',
        '<p class="home-sub">Choose the calculator that matches your goal, use it on its own, or move through the connected workflow from rate planning to budgeting.</p>',
        'hero intro',
    ),
    (
        '<h2 class="home-panel-title">Open any tool directly, or stay in the guided sequence.</h2>',
        '<h2 class="home-panel-title">Start With Your Goal</h2>',
        'goal heading',
    ),
    (
        '<p class="home-panel-copy">Quick links keep every tool within reach, while the first full tool is ready below when you want to get started.</p>',
        '<p class="home-panel-copy">Pick the result you need first: set a rate, check fees, estimate taxes, reverse-plan an income target, or build a budget.</p>',
        'goal copy',
    ),
    (
        '<div class="title" style="margin-top:4px;">Use every tool directly</div>',
        '<h2 class="title" style="margin-top:4px;">Choose the Right Calculator</h2>',
        'chooser heading',
    ),
    (
        '<div class="title" style="margin-top:4px;">How the toolkit works together</div>',
        '<h2 class="title" style="margin-top:4px;">How the 5 Tools Work Together</h2>',
        'workflow heading',
    ),
    (
        '<div class="eyebrow">Why This Feels Premium</div>\n                    <div class="title" style="margin-top:4px;">Clear trust signals without bloating the experience</div>',
        '<div class="eyebrow">Connected Toolkit</div>\n                    <h2 class="title" style="margin-top:4px;">Why Use the Connected Toolkit?</h2>',
        'why toolkit heading',
    ),
    (
        '<div class="home-section-copy">The toolkit stays light on GitHub Pages, keeps state in the browser, and gives direct exports without forcing signups or cluttering the flow.</div>',
        '<div class="home-section-copy">Use a single calculator when that is all you need, or carry the relevant amount into the next step so rates, fees, taxes, goals, and budgets stay connected.</div>',
        'why toolkit copy',
    ),
    (
        '<div class="eyebrow">Toolkit Start Point</div>\n            <div class="title" style="margin-top:4px;">Open the first full tool below</div>\n            <p class="home-calc-copy">From this point onward, the page shifts from toolkit hub into the full Hourly Rate Calculator. The toolkit landing stays above; the detailed first tool starts here.</p>',
        '<div class="eyebrow">Quick Start</div>\n            <div class="title" style="margin-top:4px;">Want to calculate a rate now?</div>\n            <p class="home-calc-copy">Use the hourly calculator below as a quick starting point, or open its dedicated page when you want the full rate-specific guide and examples.</p>',
        'embedded hourly lead copy',
    ),
]
update_file('index.html', home_replacements, [])

hourly_css = r'''
        /* TASK 4: DEDICATED HOURLY SEARCH INTENT */
        .hourly-seo-intro,
        .hourly-seo-section{
            max-width:1240px;
            margin:18px auto 0;
        }
        .hourly-seo-intro-card,
        .hourly-seo-shell{
            background:var(--surface);
            border:1px solid var(--line);
            border-radius:24px;
            box-shadow:var(--shadow-sm);
        }
        .hourly-seo-intro-card{padding:24px}
        .hourly-seo-kicker{
            color:var(--accent2);
            font-size:11px;
            font-weight:900;
            letter-spacing:.12em;
            text-transform:uppercase;
        }
        .hourly-seo-intro h1{
            margin:9px 0 10px;
            color:var(--text);
            font-size:clamp(32px,4.5vw,52px);
            line-height:1;
            letter-spacing:-.045em;
        }
        .hourly-seo-intro p,
        .hourly-seo-section p{
            margin:0;
            color:var(--muted);
            font-size:14px;
            line-height:1.65;
        }
        .hourly-seo-shell{padding:22px}
        .hourly-seo-section h2{
            margin:0 0 8px;
            color:var(--text);
            font-size:21px;
            line-height:1.2;
            letter-spacing:-.025em;
        }
        .hourly-seo-grid{
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:12px;
            margin-top:14px;
        }
        .hourly-seo-card,
        .hourly-seo-faq,
        .hourly-seo-related{
            padding:17px;
            background:var(--surface-3);
            border:1px solid var(--line);
            border-radius:18px;
        }
        .hourly-seo-example{
            margin-top:10px;
            padding:12px;
            border-radius:14px;
            background:var(--surface-2);
            border:1px solid var(--line-soft);
            color:var(--text);
            font-size:13px;
            line-height:1.65;
        }
        .hourly-seo-note{margin-top:8px!important;font-size:12px!important;color:var(--muted2)!important}
        .hourly-seo-faq,
        .hourly-seo-related{margin-top:12px}
        .hourly-seo-faq details{padding:10px 0;border-top:1px solid var(--line)}
        .hourly-seo-faq details:first-of-type{border-top:0;padding-top:2px}
        .hourly-seo-faq summary{cursor:pointer;color:var(--text);font-weight:800}
        .hourly-seo-faq details p{margin-top:6px}
        .hourly-seo-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
        .hourly-seo-links a{
            display:inline-flex;
            align-items:center;
            min-height:38px;
            padding:7px 11px;
            border:1px solid var(--line);
            border-radius:999px;
            background:var(--surface-2);
            color:var(--text);
            font-size:12px;
            font-weight:800;
            text-decoration:none;
        }
        @media(max-width:760px){
            .hourly-seo-intro-card,.hourly-seo-shell{padding:18px}
            .hourly-seo-grid{grid-template-columns:1fr}
            .hourly-seo-intro h1{font-size:34px}
        }
'''

hourly_intro = r'''
<section class="hourly-seo-intro" aria-labelledby="hourlyPageTitle">
    <div class="hourly-seo-intro-card">
        <div class="hourly-seo-kicker">Freelance Rate Planning</div>
        <h1 id="hourlyPageTitle">Freelance Hourly Rate Calculator</h1>
        <p>Calculate what to charge from your hourly rate, working schedule, weeks off, and realistic billable time. Use forward mode to estimate earnings or reverse mode to work backward from an income target.</p>
    </div>
</section>
'''

hourly_support = r'''
<section class="hourly-seo-section" aria-label="Freelance hourly rate guide">
    <div class="hourly-seo-shell">
        <h2>How to Calculate Your Freelance Hourly Rate</h2>
        <p>Start with the time you can realistically sell to clients rather than treating every working hour as billable. The calculator above combines your hourly rate, hours per day, days per week, weeks per year, and billable percentage to estimate earning capacity. Reverse mode uses the same work-capacity inputs to estimate the rate needed for a chosen income target.</p>

        <div class="hourly-seo-grid">
            <article class="hourly-seo-card">
                <h2>Freelance Hourly Rate Formula</h2>
                <p>For the forward calculation, billable hours per year equal hours per day × days per week × weeks per year × billable percentage. Estimated yearly gross equals hourly rate × billable hours per year. When Average Monthly is selected, the monthly estimate is yearly gross ÷ 12.</p>
            </article>

            <article class="hourly-seo-card">
                <h2>Billable vs Non-Billable Hours</h2>
                <p>Billable time is paid client work. Non-billable time can include proposals, admin, invoicing, learning, marketing, and other work that does not directly produce client revenue. Using a billable percentage keeps the rate calculation tied to the hours you realistically expect to sell.</p>
            </article>

            <article class="hourly-seo-card">
                <h2>Time Off, Expenses, and Taxes</h2>
                <p>Weeks per year lets you account for unpaid time off or other weeks you do not expect to bill. Expenses and tax estimates are separate planning layers, so a gross hourly rate is not automatically the same as take-home pay. Use the dedicated tax tool for a fuller tax estimate instead of treating one percentage as universal.</p>
            </article>

            <article class="hourly-seo-card">
                <h2>Freelance Hourly Rate Worked Example</h2>
                <p><strong>Example assumptions:</strong> $50.01 per hour, 8 hours per day, 5 days per week, 48 working weeks per year, 70% billable time, and Average Monthly view.</p>
                <div class="hourly-seo-example">Billable hours per year = 8 × 5 × 48 × 70% = 1,344 hours. Estimated yearly gross = $50.01 × 1,344 = $67,213.44. Average monthly gross = $67,213.44 ÷ 12 = $5,601.12.</div>
                <p class="hourly-seo-note">This example illustrates the calculator’s gross-income method. Taxes, platform fees, expenses, and actual client demand can change take-home results.</p>
            </article>
        </div>

        <div class="hourly-seo-faq">
            <h2>Freelance Hourly Rate FAQ</h2>
            <details>
                <summary>Why does billable percentage affect the rate?</summary>
                <p>If only part of your working time can be charged to clients, the sellable hours available to produce your target income are lower. Reverse mode reflects that by spreading the target across the billable hours you entered.</p>
            </details>
            <details>
                <summary>How should I account for unpaid time off?</summary>
                <p>Use Weeks per Year to model the number of weeks you realistically expect to work and bill. A lower working-week count reduces annual earning capacity at the same hourly rate.</p>
            </details>
            <details>
                <summary>Is the calculated hourly rate my take-home rate?</summary>
                <p>Not necessarily. Gross client revenue can still be reduced by platform or payment fees, business expenses, and taxes. The connected tools let you model those stages separately.</p>
            </details>
            <details>
                <summary>Can I start with an income goal instead of an hourly rate?</summary>
                <p>Yes. Switch to Income Goal → Hourly Rate to work backward from a weekly, monthly, or yearly target using your selected schedule and billable-time assumptions.</p>
            </details>
        </div>

        <div class="hourly-seo-related">
            <h2>Related Freelance Calculators</h2>
            <p>Continue from gross earning capacity into fees, taxes, income goals, or budgeting when those steps are relevant to your plan.</p>
            <div class="hourly-seo-links">
                <a href="platform-fee-calculator.html">Freelance Platform Fee Calculator</a>
                <a href="tax-estimator.html">Freelance Tax Estimator</a>
                <a href="income-goal-planner.html">Freelance Income Goal Planner</a>
                <a href="budget-planner.html">Freelance Budget Calculator</a>
                <a href="index.html">All 5 Freelance Calculators</a>
            </div>
        </div>
    </div>
</section>
'''

hourly_replacements = [
    (
        '<title>Hourly Rate Calculator | USA Freelance Calculator Toolkit</title>',
        '<title>Freelance Hourly Rate Calculator | Calculate What to Charge</title>',
        'title',
    ),
    (
        '<meta name="description" content="Premium Hourly Rate Calculator for US freelancers. Estimate daily, weekly, monthly, and yearly earnings, compare after-tax take-home, and hand off directly into the connected toolkit.">',
        '<meta name="description" content="Use a freelance hourly rate calculator to estimate what to charge from billable hours, working weeks, time off, expenses, taxes, and income goals.">',
        'meta description',
    ),
    (
        '<meta property="og:title" content="Hourly Rate Calculator | USA Freelance Calculator Toolkit">',
        '<meta property="og:title" content="Freelance Hourly Rate Calculator | Calculate What to Charge">',
        'og title',
    ),
    (
        '<meta property="og:description" content="Calculate freelance hourly earnings, take-home estimates, and required rates with a premium no-signup tool built for US freelancers.">',
        '<meta property="og:description" content="Calculate freelance hourly earnings or work backward from an income goal using billable time, working weeks, and rate assumptions.">',
        'og description',
    ),
    (
        '<meta name="twitter:title" content="Hourly Rate Calculator | USA Freelance Calculator Toolkit">',
        '<meta name="twitter:title" content="Freelance Hourly Rate Calculator | Calculate What to Charge">',
        'twitter title',
    ),
    (
        '<meta name="twitter:description" content="Premium hourly rate calculator with forward earnings, reverse goal planning, exports, and connected toolkit handoff.">',
        '<meta name="twitter:description" content="Estimate what to charge from billable hours and working time, or reverse-plan the hourly rate needed for an income target.">',
        'twitter description',
    ),
    (
        '        "name": "Hourly Rate Calculator",',
        '        "name": "Freelance Hourly Rate Calculator",',
        'schema name',
    ),
    (
        '        "description": "Premium hourly rate calculator for US freelancers with take-home planning and connected toolkit handoff.",',
        '        "description": "Hourly rate calculator for freelancers using work schedule, billable time, income targets, and connected fee and tax planning.",',
        'schema description',
    ),
    (
        '<h1 class="home-headline">One premium toolkit for freelance rates, fees, tax, goals, and budgeting.</h1>',
        '<div class="home-headline" aria-hidden="true">Hourly Rate Calculator</div>',
        'neutralize hidden home H1',
    ),
]

hourly_insertions = [
    (
        '        /* UTILITY */',
        hourly_css,
        'dedicated hourly styles',
    ),
    (
        '    <div class="home-calc-lead">',
        hourly_intro,
        'visible hourly intro',
    ),
    (
        '<section class="tool-share-section tool-share-section--light" data-share-title="Hourly Rate Calculator" data-share-text="Try this premium hourly rate calculator from USA Freelance Calculator Toolkit.">',
        hourly_support,
        'hourly supporting guide',
    ),
]
update_file('hourly-rate-calculator.html', hourly_replacements, hourly_insertions)

print('Task 4 implementation patch: PASS')
