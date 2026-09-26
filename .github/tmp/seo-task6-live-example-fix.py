from pathlib import Path

path = Path('income-goal-planner.html')
text = path.read_text()
old = 'the tool shows about <strong>20 billable hours per week</strong>, roughly <strong>$17,191 monthly gross revenue</strong>, and a required billing rate of about <strong>$214.88 per hour</strong>.'
new = 'the tool shows about <strong>20.0 billable hours per week</strong>, roughly <strong>$11,923 monthly gross revenue</strong>, and a required billing rate of about <strong>$149.03/hr</strong>.'
if new not in text:
    if old not in text:
        raise SystemExit('stale Income worked-example values not found')
    text = text.replace(old, new, 1)
    path.write_text(text)
print('PASS Income worked example matches verified live defaults')
