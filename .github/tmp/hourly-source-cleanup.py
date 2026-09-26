#!/usr/bin/env python3
from pathlib import Path
import re
import sys

TEST = Path('tests/seo-structure-regression.test.js')
HOURLY = Path('hourly-rate-calculator.html')

TEST_MARKER = "hourly source excludes hidden legacy home shell"
TEST_BLOCK = r'''
check('hourly source excludes hidden legacy home shell', () => {
  assert.ok(!/<section\s+class=["']site-home["']/i.test(hourlyHtml), 'hidden legacy Home section must not remain in Hourly source');
  assert.ok(!/<div\s+class=["']home-calc-lead["']/i.test(hourlyHtml), 'hidden legacy Home-to-Hourly transition block must not remain');
  assert.ok(!/From this point onward, the page shifts from toolkit hub/i.test(hourlyHtml), 'implementation-style transition copy must not remain in semantic source');
});
'''

ANCHOR = r'''check('hourly contextual link to Tax Estimator', () => {
  assert.match(hourlyHtml, /href=["']tax-estimator\.html["'][^>]*>[^<]*Tax[^<]*<\/a>/i);
});
'''


def add_test():
    text = TEST.read_text()
    if TEST_MARKER in text:
        return False
    if ANCHOR not in text:
        raise SystemExit('Could not find Hourly test insertion anchor')
    text = text.replace(ANCHOR, ANCHOR + '\n' + TEST_BLOCK, 1)
    TEST.write_text(text)
    return True


def remove_between(text, start, end, label):
    s = text.find(start)
    if s < 0:
        raise SystemExit(f'Could not find {label} start marker')
    e = text.find(end, s)
    if e < 0:
        raise SystemExit(f'Could not find {label} end marker')
    return text[:s] + end + text[e + len(end):]


def apply_product_cleanup():
    text = HOURLY.read_text()

    # Remove the hidden legacy Home shell that is not part of the dedicated Hourly page.
    text = remove_between(
        text,
        '    <section class="site-home" aria-label="Homepage overview">',
        '<section class="hourly-seo-intro" aria-labelledby="hourlyPageTitle">',
        'hidden Home shell',
    )

    # Remove the hidden implementation-style transition block immediately before the calculator.
    text = remove_between(
        text,
        '    <div class="home-calc-lead">',
        '    <div id="mainCard">',
        'hidden Home-to-Hourly transition block',
    )

    # Remove the now-obsolete hide rule for those deleted blocks. Other historical Home CSS is left
    # alone deliberately to keep this cleanup minimal and avoid unrelated visual changes.
    text = text.replace(
        '        .hourly-tool-page .site-home,\n        .hourly-tool-page .home-calc-lead{display:none}\n',
        '',
        1,
    )

    if '<section class="site-home"' in text:
        raise SystemExit('Legacy site-home markup still present after cleanup')
    if '<div class="home-calc-lead"' in text:
        raise SystemExit('Legacy home-calc-lead markup still present after cleanup')
    if 'From this point onward, the page shifts from toolkit hub' in text:
        raise SystemExit('Legacy transition copy still present after cleanup')
    if '<section class="hourly-seo-intro" aria-labelledby="hourlyPageTitle">' not in text:
        raise SystemExit('Dedicated Hourly SEO intro was accidentally removed')
    if '<div id="mainCard">' not in text:
        raise SystemExit('Hourly calculator mainCard was accidentally removed')

    HOURLY.write_text(text)


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in {'red', 'apply'}:
        raise SystemExit('Usage: hourly-source-cleanup.py red|apply')
    add_test()
    if sys.argv[1] == 'apply':
        apply_product_cleanup()


if __name__ == '__main__':
    main()
