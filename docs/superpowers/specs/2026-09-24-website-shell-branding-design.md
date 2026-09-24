# Website Shell + Branding V1 Design

## Goal
Bring the public website shell up to the production quality of the Android app without changing calculator math, sponsorship behavior, or doing the final SEO pass yet.

## Scope
This phase covers shared website branding, navigation, header, mobile overflow menu, footer consistency, theme behavior, and the minimum reusable shell code needed to apply those pieces consistently across the public website.

Target public pages:
- `/` (`index.html`)
- `/hourly-rate-calculator.html`
- `/platform-fee-calculator.html`
- `/tax-estimator.html`
- `/income-goal-planner.html`
- `/budget-planner.html`
- `/about.html`
- `/privacy.html`
- `/terms.html`
- `/contact.html`
- `/app/` where compatible with the public shell

## Locked product intent
The website should feel like the same product family as the Android app: compact, professional, mobile-first, finance/productivity oriented, and easy to move through without hiding the five calculators.

The final website shell must improve polish without destabilizing the calculators. Existing calculation engines, connected-tool handoff, export logic, and other calculator-specific behavior are protected surfaces in this phase.

## Branding
Use the approved USA Freelance Calculator production identity:
- Deep navy base: `#0A1728`
- Orange focal color: `#FF7A00`
- Near-white modules: `#F8FBFF`
- Primary symbol: compact asymmetric stepped workflow mark made from exactly five rounded modules, four near-white and one orange.
- Flat visual treatment. No gradients inside the mark, no dollar sign, calculator keypad, chart, circular network nodes, crypto-style symbol, or UF/UFC monogram.

The website favicon/header brand mark should be aligned to this identity. Existing unrelated legacy favicon/mark treatment should not remain as the primary brand mark after this phase.

## Shared header
All calculator pages and the main landing experience should use one consistent header language.

Desktop behavior:
- Brand mark and `USA Freelance Calculator` identity remain visible.
- The five primary tools remain directly discoverable; do not hide the core calculator navigation inside an overflow menu on desktop.
- Android App remains a visible product destination where space allows.
- Secondary informational actions may live in the overflow menu and/or footer.

Mobile behavior:
- Compact brand mark + short readable product title.
- Theme control remains easy to reach.
- A top-right `⋮` overflow control opens the secondary navigation surface.
- The header must not overlap calculator content or force horizontal scrolling.

## Mobile overflow menu
The `⋮` menu is a navigation/secondary-actions surface, not a dumping ground for calculator controls.

Menu destinations:
- All Tools / tool navigation
- Android App
- Share
- About
- Contact
- Privacy
- Terms

Behavior requirements:
- Current page/tool is visually identifiable.
- Menu opens and closes reliably by button, close affordance, backdrop tap, and Escape on keyboard-capable devices.
- Focus should move into the menu when opened and return to the trigger when closed where practical.
- Background interaction should not accidentally activate page controls while the menu is open.
- The browser back action on mobile should not leave the user in a broken overlay state.
- No calculator-specific reset/clear actions move into this menu.

## Primary tool navigation
The five tools remain first-class destinations:
1. Hourly Rate Calculator
2. Platform Fee Calculator
3. Freelancer Tax Estimator
4. Income Goal Planner
5. Budget Planner

Desktop may retain a visible primary nav/pill treatment, but it should be visually integrated with the new shell rather than appear as a separate unrelated strip.

On mobile, navigation should remain compact and usable without requiring users to horizontally scroll through a long uncontrolled pill row.

## Footer
Use a consistent shared footer language across Home, calculators, and legal/info pages.

Footer groups should support:
- Product/tools navigation
- Android App
- About
- Contact
- Privacy
- Terms

The footer should retain any page-specific legal/disclaimer content required by the calculator while avoiding repeated, visually conflicting footer blocks.

## Theme behavior
The shared shell must support both existing light and dark experiences.

Requirements:
- Header, menu, navigation, and footer remain readable in both themes.
- Focus states remain visible.
- The brand mark remains legible in both themes.
- Theme switching must not reset calculator inputs/results or connected-tool state.
- No flash or layout jump that materially interferes with calculator use.

## Responsive behavior
Priority breakpoints are phone widths first, then tablet and desktop.

Must avoid:
- horizontal page overflow
- clipped title/logo
- menu content outside viewport
- overlapping fixed/sticky UI
- tiny touch targets
- tool nav wrapping into visually broken rows

Interactive controls should target roughly 44px minimum touch height where practical.

## Accessibility
- Header and menu controls use semantic buttons/links.
- Overflow trigger has an accessible name and expanded state.
- Menu has understandable landmark/dialog semantics as appropriate.
- Keyboard focus is visible.
- Escape closes the open menu on keyboard-capable devices.
- Text/icon contrast remains sufficient in light and dark themes.
- Navigation must not depend on emoji alone for meaning.

## Reusable architecture
Prefer a small shared shell layer rather than copying new header/menu/footer logic independently into every large HTML file.

Expected responsibility split:
- Shared shell CSS: header, nav, overflow, footer, responsive/theme states.
- Shared shell JS: menu open/close/focus behavior and page-aware active-state handling only.
- Brand asset(s): production SVG favicon/mark.
- Existing `assets/js/toolkit-core.js`: keep focused on connected-tool state/handoff; do not fold unrelated shell behavior into it unless a tiny shared page-detection helper is clearly safer than duplication.

Do not perform a broad calculator refactor just to make the shell reusable.

## Protected behavior / non-regression requirements
This phase must not intentionally alter:
- tax formulas
- self-employment tax logic
- Additional Medicare logic
- platform fee calculations
- hourly forward/reverse calculations
- income goal calculations
- budget calculations
- cent precision/handoff behavior
- PDF/PNG export calculations
- calculator reset semantics
- Android APK/update release files

Existing canonical URLs, indexability, sitemap/robots references, and meaningful page titles/descriptions must not be accidentally removed while final SEO work remains deferred.

## Explicit non-goals for this phase
- No sponsorship implementation yet.
- No final SEO/content rewrite yet.
- No redesign of calculator math.
- No broad HTML/CSS rewrite unrelated to the shared shell.
- No deployment/merge until review and QA pass.

## Validation gates
Before this phase can merge, verify at minimum:

### Shared shell
- Header visible and stable on all target pages.
- Correct active tool/page state.
- Mobile `⋮` menu open/close/backdrop/Escape behavior.
- All menu links route correctly.
- No horizontal overflow at representative mobile widths.
- Light/dark shell readability.

### Calculator regression smoke checks
On all five calculators:
- page loads
- key inputs remain editable
- a representative calculation still updates
- connected-tool navigation/handoff remains available
- no obvious result/export control disappears behind the shell

### Public-page checks
- About, Privacy, Terms, Contact, and Android App destinations remain reachable.
- Favicon/brand mark resolves without broken assets.
- Existing canonical/meta basics remain present.

## Release discipline
- Work only on `feat/website-shell-branding-v1` for this phase.
- Do not modify `main` directly.
- Do not merge until code review + browser/mobile QA pass.
- Keep sponsorship and final SEO work for later dedicated phases.
