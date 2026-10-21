import test from 'node:test';
import assert from 'node:assert';
import { holidaysFor, holidaysOn, isDayOff, easter, nthWeekday } from '../src/holidays.js';
import { toKey } from '../src/tasks.js';

const names = (key) => holidaysOn(key).map((h) => h.name);

test('floating federal holidays land on the right weekday', () => {
  assert.deepStrictEqual(names('2026-01-19'), ['Martin Luther King Jr. Day']); // 3rd Monday
  assert.deepStrictEqual(names('2026-02-16'), ["Presidents' Day"]);
  assert.deepStrictEqual(names('2026-05-25'), ['Memorial Day']);               // last Monday
  assert.deepStrictEqual(names('2026-09-07'), ['Labor Day']);
  assert.deepStrictEqual(names('2026-11-26'), ['Thanksgiving']);               // 4th Thursday
  assert.deepStrictEqual(names('2027-11-25'), ['Thanksgiving']);
});

test('weekend holidays get an observed weekday', () => {
  // July 4, 2026 is a Saturday: observed Friday the 3rd
  assert.deepStrictEqual(names('2026-07-03'), ['Independence Day (observed)']);
  assert.ok(isDayOff('2026-07-03'));
  // Christmas 2027 is a Saturday: observed Friday Dec 24, alongside Christmas Eve
  assert.deepStrictEqual(names('2027-12-24').sort(), ['Christmas Day (observed)', 'Christmas Eve']);
  // New Year's Day 2028 is a Saturday: observed Friday Dec 31, 2027
  assert.ok(names('2027-12-31').includes("New Year's Day (observed)"));
  // Juneteenth 2027 is a Saturday
  assert.deepStrictEqual(names('2027-06-18'), ['Juneteenth (observed)']);
});

test('Easter for known years', () => {
  assert.strictEqual(toKey(easter(2024)), '2024-03-31');
  assert.strictEqual(toKey(easter(2026)), '2026-04-05');
  assert.strictEqual(toKey(easter(2027)), '2027-03-28');
  assert.strictEqual(toKey(easter(2038)), '2038-04-25');
});

test("Mother's and Father's Day, Halloween and others are listed but not days off", () => {
  assert.deepStrictEqual(names('2026-05-10'), ["Mother's Day"]);
  assert.deepStrictEqual(names('2026-06-21'), ["Father's Day"]);
  assert.deepStrictEqual(names('2026-10-31'), ['Halloween']);
  assert.ok(!isDayOff('2026-10-31'));
  assert.ok(!isDayOff('2026-10-20'));
});

test('a year has the 11 federal holidays', () => {
  const federal = holidaysFor(2026).filter((h) => h.federal && !h.observed);
  assert.strictEqual(federal.length, 11);
  assert.strictEqual(holidaysFor(2020).filter((h) => h.name === 'Juneteenth').length, 0, 'federal from 2021');
});

test('nth weekday helper', () => {
  assert.strictEqual(toKey(nthWeekday(2026, 9, 1, 2)), '2026-10-12');  // 2nd Monday of October
  assert.strictEqual(toKey(nthWeekday(2026, 4, 1, -1)), '2026-05-25'); // last Monday of May
});
