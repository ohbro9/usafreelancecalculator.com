from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: target not found')
    return text.replace(old, new, 1)

# Income Goal page: metadata + user-facing support only. Do not touch calculator JS.
p = Path('income-goal-planner.html')
t = p.read_text()
t = replace_once(t,
    '<title>USA Freelance Income Goal Planner | Free Goal Calculator</title>',
    '<title>Freelance Income Goal Calculator | Find Your Required Rate</title>',
    'income title')
t = replace_once(t,
    '<meta name="description" content="Plan your freelance income goals with taxes, fees, utilization, and required rate targets. Free USA income goal planner." />',
    '<meta name="description" content="Turn your desired freelance take-home into the gross revenue, hourly rate, and billable hours you may need after taxes, fees, and business expenses." />',
    'income description')
t = replace_once(t,
    '<meta property="og:title" content="USA Freelance Income Goal Planner" />',
    '<meta property="og:title" content="Freelance Income Goal Calculator | Find Your Required Rate" />',
    'income og title')
t = replace_once(t,
    '<meta property="og:description" content="Turn your income target into required rates, billable hours, and planning assumptions." />',
    '<meta property="og:description" content="Turn a freelance take-home target into required gross revenue, billable hours, and an hourly rate using editable planning assumptions." />',
    'income og description')
t = replace_once(t,
    '<meta name="twitter:title" content="USA Freelance Income Goal Planner" />',
    '<meta name="twitter:title" content="Freelance Income Goal Calculator | Find Your Required Rate" />',
    'income twitter title')
t = replace_once(t,
    '<meta name="twitter:description" content="Free goal planner for freelancers who want to translate income targets into workable numbers." />',
    '<meta name="twitter:description" content="Estimate the gross revenue, billable hours, and rate needed to reach a freelance take-home income goal." />',
    'income twitter description')
t = replace_once(t,
    '"name": "USA Freelance Income Goal Planner",',
    '"name": "Freelance Income Goal Calculator",',
    'income schema name')
t = replace_once(t,
    '"description": "Free income goal planner for freelancers with tax, expense, fee, and utilization assumptions.",',
    '"description": "Freelance income goal calculator that estimates required gross revenue, hourly rate, and billable hours from a desired take-home target and editable planning assumptions.",',
    'income schema description')
t = replace_once(t,
    '<h1 class="hero-title">USA Freelance Income Goal Planner</h1>',
    '<h1 class="hero-title">Freelance Income Goal Calculator</h1>',
    'income h1')
t = replace_once(t,
    '<p class="hero-subtitle">\n\t          Set your take-home target and see your required billing rate, hours plan, and advanced planning insights.\n\t        </p>',
    '<p class="hero-subtitle">\n\t          Start with the take-home income you want, then estimate the gross revenue, billable hours, and freelance rate your plan may require.\n\t        </p>',
    'income subtitle')

css_marker = '    /* PREMIUM MODAL */'
css_block = '''    /* TASK 6 — INCOME GOAL SEARCH SUPPORT */
    .income-seo-support{
      width:min(100%, var(--shell-w));
      margin:22px auto 0;
      display:grid;
      gap:14px;
    }
    .income-seo-card{
      padding:20px;
      border:1px solid var(--line);
      border-radius:var(--radius-lg);
      background:linear-gradient(180deg, rgba(255,255,255,.028), rgba(255,255,255,.014)), var(--panel);
      box-shadow:var(--shadow-sm);
    }
    .income-seo-card h2{
      margin:0;
      color:var(--text);
      font-size:1.12rem;
      line-height:1.25;
      letter-spacing:-.02em;
    }
    .income-seo-card p{
      margin:9px 0 0;
      color:var(--text-2);
      font-size:.94rem;
      line-height:1.68;
    }
    .income-seo-card ul{
      margin:10px 0 0;
      padding-left:20px;
      color:var(--text-2);
      font-size:.92rem;
      line-height:1.65;
    }
    .income-seo-links{
      display:flex;
      flex-wrap:wrap;
      gap:9px;
      margin-top:12px;
    }
    .income-seo-links a{
      display:inline-flex;
      align-items:center;
      min-height:40px;
      padding:0 12px;
      border-radius:999px;
      border:1px solid var(--line-blue);
      color:#d9e8ff;
      background:var(--blue-soft);
      font-size:.82rem;
      font-weight:800;
      text-decoration:none;
    }

'''
if 'TASK 6 — INCOME GOAL SEARCH SUPPORT' not in t:
    if css_marker not in t:
        raise SystemExit('income css marker not found')
    t = t.replace(css_marker, css_block + css_marker, 1)

support_marker = '      <!-- FOOTER -->'
support_block = '''      <section class="income-seo-support" aria-label="Freelance income goal calculator guide">
        <article class="income-seo-card">
          <h2>Take-Home vs Gross Revenue</h2>
          <p>Your take-home goal is the amount you want left for yourself after the costs you choose to model. Gross revenue is the larger amount your freelance business may need to bill before taxes, platform or payment fees, business expenses, and any planning buffer are accounted for.</p>
        </article>

        <article class="income-seo-card">
          <h2>Taxes, Fees, and Expenses Change the Revenue Target</h2>
          <p>The calculator works backward from your desired take-home. Higher modeled taxes, marketplace or payment fees, business expenses, or a safety buffer can increase the gross revenue required. Use your own assumptions where possible; presets are planning shortcuts, not guaranteed rates or tax advice.</p>
        </article>

        <article class="income-seo-card">
          <h2>Income Goal Worked Example</h2>
          <p>The calculator's current default planning scenario starts with a <strong>$10,000 monthly take-home goal</strong>, a 40-hour workweek, 48 working weeks per year, and 50% billable utilization. With the displayed default expense, buffer, tax, and fee assumptions, the tool shows about <strong>20 billable hours per week</strong>, roughly <strong>$17,191 monthly gross revenue</strong>, and a required billing rate of about <strong>$214.88 per hour</strong>. Change any assumption and the live result recalculates.</p>
        </article>

        <article class="income-seo-card">
          <h2>Income Goal Methodology</h2>
          <p>The planner starts with your take-home target, models the selected expenses, fees, taxes, and buffer, then estimates the gross revenue needed. It combines that gross target with your work schedule and billable utilization to estimate billable hours and a required rate. Results are planning estimates and should not replace professional tax, legal, or accounting advice.</p>
        </article>

        <article class="income-seo-card">
          <h2>Income Goal FAQ</h2>
          <ul>
            <li><strong>Is take-home the same as gross revenue?</strong> No. Take-home is your target after the modeled costs; gross is the revenue needed before those modeled costs.</li>
            <li><strong>What if my platform fee or tax situation is different?</strong> Edit the assumptions instead of treating a preset as universal.</li>
            <li><strong>How is this different from the Hourly Rate Calculator?</strong> This tool starts from desired take-home and works toward gross revenue, hours, and rate; the Hourly Rate Calculator focuses directly on rate planning from income and available billable time.</li>
          </ul>
          <div class="income-seo-links" aria-label="Related freelance calculators">
            <a href="hourly-rate-calculator.html">Freelance Hourly Rate Calculator</a>
            <a href="platform-fee-calculator.html">Freelance Platform Fee Calculator</a>
            <a href="tax-estimator.html">Freelance Tax Calculator</a>
            <a href="budget-planner.html">Next: Freelance Budget Calculator</a>
          </div>
        </article>
      </section>

'''
if 'Income Goal Worked Example' not in t:
    if support_marker not in t:
        raise SystemExit('income support marker not found')
    t = t.replace(support_marker, support_block + support_marker, 1)
p.write_text(t)

# App page: keep release facts unchanged, add discoverability/social/schema and crawlable toolkit links.
p = Path('app/index.html')
t = p.read_text()
head_anchor = '  <link rel="canonical" href="https://usafreelancecalculator.com/app/" />\n'
head_extra = '''  <link rel="canonical" href="https://usafreelancecalculator.com/app/" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="USA Freelance Calculator" />
  <meta property="og:title" content="USA Freelance Calculator Android App" />
  <meta property="og:description" content="Download the official USA Freelance Calculator Android APK and verify the current version, package id, and SHA-256 checksum." />
  <meta property="og:url" content="https://usafreelancecalculator.com/app/" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="USA Freelance Calculator Android App" />
  <meta name="twitter:description" content="Official Android APK download for the connected USA Freelance Calculator toolkit, with version and checksum details." />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "USA Freelance Calculator Android App",
    "operatingSystem": "Android",
    "applicationCategory": "FinanceApplication",
    "softwareVersion": "1.0.1",
    "url": "https://usafreelancecalculator.com/app/",
    "downloadUrl": "https://usafreelancecalculator.com/downloads/usafreelancecalculator-installable.apk",
    "identifier": "com.usafreelancecalculator.toolkit",
    "description": "Official Android app for the USA Freelance Calculator toolkit."
  }
  </script>
'''
if '<meta property="og:title" content="USA Freelance Calculator Android App" />' not in t:
    if head_anchor not in t:
        raise SystemExit('app head anchor not found')
    t = t.replace(head_anchor, head_extra, 1)
t = replace_once(t,
    '<h1>USA Freelance Calculator APK</h1>',
    '<h1>USA Freelance Calculator Android App</h1>',
    'app h1')
app_notes_anchor = '''      <section class="notes">
        <h2>What this page is for</h2>'''
app_links_block = '''      <section class="notes">
        <h2>Explore the connected freelancer toolkit</h2>
        <ul>
          <li><a href="/hourly-rate-calculator.html">Freelance Hourly Rate Calculator</a></li>
          <li><a href="/platform-fee-calculator.html">Freelance Platform Fee Calculator</a></li>
          <li><a href="/tax-estimator.html">Freelance Tax Calculator</a></li>
          <li><a href="/income-goal-planner.html">Freelance Income Goal Calculator</a></li>
          <li><a href="/budget-planner.html">Freelance Budget Calculator</a></li>
        </ul>
      </section>

'''
if 'Explore the connected freelancer toolkit' not in t:
    if app_notes_anchor not in t:
        raise SystemExit('app notes anchor not found')
    t = t.replace(app_notes_anchor, app_links_block + app_notes_anchor, 1)
p.write_text(t)

# Sitemap: add indexed canonical app URL without fake lastmod.
p = Path('sitemap.xml')
t = p.read_text()
if '<loc>https://usafreelancecalculator.com/app/</loc>' not in t:
    anchor = '  <url>\n    <loc>https://usafreelancecalculator.com/about.html</loc>\n  </url>'
    app_entry = '  <url>\n    <loc>https://usafreelancecalculator.com/app/</loc>\n  </url>\n'
    if anchor not in t:
        raise SystemExit('sitemap anchor not found')
    t = t.replace(anchor, app_entry + anchor, 1)
p.write_text(t)

# 404: root-safe links work from nested missing paths.
p = Path('404.html')
t = p.read_text()
t = replace_once(t, 'href="index.html"', 'href="/"', '404 home')
t = replace_once(t, 'href="platform-fee-calculator.html"', 'href="/platform-fee-calculator.html"', '404 platform')
p.write_text(t)

# Budget social titles should reflect the same page title users/search engines see.
p = Path('budget-planner.html')
t = p.read_text()
t = replace_once(t,
    '<meta property="og:title" content="Freelance Budget Calculator for Irregular Income"/>',
    '<meta property="og:title" content="Freelance Budget Calculator for Irregular Income | Free Tool"/>',
    'budget og title')
t = replace_once(t,
    '<meta name="twitter:title" content="Freelance Budget Calculator for Irregular Income"/>',
    '<meta name="twitter:title" content="Freelance Budget Calculator for Irregular Income | Free Tool"/>',
    'budget twitter title')
p.write_text(t)

print('Task 6 product patch applied or already present.')
