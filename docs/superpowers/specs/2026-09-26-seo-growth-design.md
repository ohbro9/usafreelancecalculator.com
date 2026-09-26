# USA Freelance Calculator SEO Growth Design

**Date:** 2026-09-26  
**Repository:** `ohbro9/usafreelancecalculator.com`  
**Primary market:** US freelancers  
**Status:** Implemented on `feat/seo-growth-v1`; PR review pending

## Goal

Increase relevant US organic visibility and calculator-page clicks by giving every core page a distinct search role, strengthening useful on-page content and trust, fixing factual/technical SEO gaps, and connecting calculator pages to a focused blog strategy without redesigning the product or changing calculator formulas.

## Global Constraints

- Preserve the current visual design; no redesign project.
- Do not merge or reuse `feat/website-shell-branding-v1`.
- Do not intentionally change calculator formulas/business logic for SEO.
- Preserve cross-tool handoff, reverse modes, export/share behavior, cents/precision, sponsorship behavior, and Android release values.
- No direct edits to `main`.
- Work on one fresh SEO branch from the latest `main`.
- No AdSense, fake traffic, bot traffic, bought/spam links, doorway pages, cloaking, keyword stuffing, or mass low-value AI pages.
- Current platform-fee and tax claims must be verified against authoritative sources before publication.

## Page Ownership

| URL | Primary role | Primary search intent |
|---|---|---|
| `/` | Toolkit hub | Freelance Calculator / USA Freelance Calculator |
| `/budget-planner.html` | Budget tool | Freelance Budget Calculator |
| `/hourly-rate-calculator.html` | Rate tool | Freelance Hourly Rate Calculator |
| `/platform-fee-calculator.html` | Fee/take-home tool | Freelance Platform Fee Calculator |
| `/tax-estimator.html` | Tax tool | Freelance Tax Calculator 2026 / Estimated Tax Calculator |
| `/income-goal-planner.html` | Reverse income planning | Freelance Income Goal Calculator |
| `/app/` | Branded app/download page | USA Freelance Calculator Android App |
| Blog | Informational support | How-to, examples, explanations, comparisons |

Home and Hourly must no longer present the same search purpose. Income Goal must not aggressively target “hourly rate calculator”; it owns desired take-home → required gross revenue.

## Approved Metadata Direction

- Home title: `Freelance Calculator for US Freelancers | 5 Connected Tools`
- Budget title: `Freelance Budget Calculator for Irregular Income | Free Tool`
- Hourly title: `Freelance Hourly Rate Calculator | Calculate What to Charge`
- Platform title: `Freelance Platform Fee Calculator | See What You Keep`
- Tax title: `Freelance Tax Calculator 2026 | Estimate Taxes & Take-Home`
- Income title: `Freelance Income Goal Calculator | Find Your Required Rate`

Approved H1s:
- Home: `5 Connected Freelance Calculators for Rates, Fees, Taxes, Goals & Budgeting`
- Budget: `Freelance Budget Calculator`
- Hourly: `Freelance Hourly Rate Calculator`
- Platform: `Freelance Platform Fee Calculator`
- Tax: `Freelance Tax Calculator for US Freelancers`
- Income: `Freelance Income Goal Calculator`

Every core page gets a unique intent-focused description. Meta keywords are not part of the ranking strategy.

## Supporting Content Framework

Keep the calculator primary and fast. Supporting content belongs below/around it, not as a giant article above it.

- Budget: how it works, irregular-income example, tax reserve, expenses/savings/runway, FAQs, related tools/guides.
- Hourly: formula, billable hours, unpaid time off, expenses/taxes, worked example, FAQs.
- Platform: how it works, take-home impact, worked example, current assumptions/sources, why actual fees differ, FAQs.
- Tax: estimator methodology, SE tax, federal/state assumptions, quarterly estimates, worked example, IRS sources, FAQs.
- Income Goal: take-home vs gross, taxes/fees/expenses, target revenue, billable hours/rate, worked example, methodology, FAQs.
- Home: compact tool chooser, connected workflow, goal-based entry points, selected guides.

## Trust / Accuracy

### Platform Fee
- Remove universal/flat fee claims that are no longer universally true.
- Clearly distinguish illustrative/default preset values from account-specific actual fees.
- Tell users to use the fee shown in their account/contract when available.
- Add a visible “last reviewed” date, assumptions, and official source links.
- Preserve calculation math; SEO v1 must not silently rewrite fee formulas.

### Tax
- Make tax year visible.
- Add methodology/assumptions, IRS sources, last-reviewed date, and estimate/not-tax-advice wording.
- Verify every year-specific threshold/rule before publication.

Remove public-facing internal implementation commentary from all pages.

## Internal Linking

Natural workflow: Home → Hourly → Platform Fee → Tax → Income Goal → Budget, with independent direct access preserved.

Each core calculator should expose:
- Home/toolkit access
- a related calculator
- a logical next calculator
- 2–3 relevant blog links as they become available

Use descriptive anchor text.

## Blog Strategy

Calculators own transactional/tool intent; blog owns informational intent.

Initial candidate cluster:
1. How to Budget as a Freelancer With Irregular Income
2. Freelance Budget Example: A Practical Monthly Plan
3. How to Calculate Your Freelance Hourly Rate
4. Billable vs Non-Billable Hours for Freelancers
5. Salary to Freelance Rate: Why the Numbers Are Different
6. Freelance Platform Fees Explained
7. Upwork Freelancer Fees — current-year guide
8. Fiverr Freelancer Fees — current-year guide
9. Freelance Taxes in 2026
10. Quarterly Estimated Taxes for Freelancers
11. How Much Should Freelancers Set Aside for Taxes?
12. How Much Do I Need to Earn to Take Home $X?

First month: roughly 6–8 strong articles, not a bulk publish. Platform/tax posts require fresh authoritative verification.

## Technical SEO

- Core pages remain indexable with self-canonicals.
- Keep `404.html` noindex; make its navigation root-safe.
- Audit/update `sitemap.xml`; include `/app/` if it remains intentionally indexable.
- Use accurate `lastmod` only when genuinely maintainable.
- Keep CSS/JS crawlable.
- Validate existing application structured data rather than adding schema spam.
- Add consistent social metadata and one branded default share image if technically practical.
- Audit broken links, orphan pages, malformed anchors, URL consistency, mobile overflow, render-blocking assets, heavy export libraries, and Core Web Vitals risk.
- Preserve usability and calculator speed over arbitrary Lighthouse-score chasing.

## Android App Page

Keep `/app/` as a supporting branded page:
- unique title/meta/H1/canonical
- intentionally indexable
- included in sitemap
- current version/package/checksum/download facts preserved
- social metadata and valid app schema where supportable
- crawlable internal links

## Implementation Priority

A. Platform fee factual/trust cleanup + public dev-copy cleanup  
B. Budget quick win  
C. Home/Hourly separation  
D. Platform + Tax SEO depth/trust  
E. Income Goal + app/technical cleanup  
Then blog publishing/distribution

## QA / Release Gate

No implementation batch is complete until:
- title/meta/H1/canonical/indexability are correct
- links/schema/source copy are correct
- existing calculator outputs and precision are unchanged
- cross-tool handoffs/reverse modes/exports/share remain intact
- sponsor behavior is unaffected
- mobile and desktop layouts remain usable
- no public dev/internal copy remains
- current platform/tax facts are sourced
- automated regression tests pass
- browser QA passes

## Measurement

Primary KPI: US organic clicks to calculator pages.

Secondary:
- US calculator impressions
- target-query positions
- query-level CTR
- new relevant queries
- blog impressions/clicks
- calculator-page clicks
- blog → calculator traffic where measurable

Planning baseline (rolling last 28 days at 2026-09-26): 13 clicks, 305 impressions, ~4.26% CTR, avg position ~30.0; US: 1 click, 218 impressions, ~0.46% CTR, avg position ~33.9.

## Out of Scope for SEO v1

Website redesign, new calculator types, formula rewrites, sponsorship redesign, Android feature development, paid advertising, mass programmatic SEO, paid link schemes, blog-subdomain migration, and unrelated refactors.
