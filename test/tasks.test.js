import test from 'node:test';
import assert from 'node:assert';
import { monthGrid, occursOn, tasksOn, toggle, overdue, upcoming, newTask, toIcs, addDays, mapLink } from '../src/tasks.js';

const t = (o) => ({ id: o.title, done: false, doneDates: [], priority: 'medium', repeat: 'none', time: '', notes: '', ...o });

test('month grid starts on Sunday and covers the month', () => {
  const g = monthGrid(2026, 9);          // October 2026 starts on a Thursday
  assert.strictEqual(g.length, 42);
  assert.strictEqual(g[0], '2026-09-27');
  assert.ok(g.includes('2026-10-01') && g.includes('2026-10-31'));
});

test('repeat rules', () => {
  assert.ok(occursOn(t({ date: '2026-10-14', repeat: 'weekly' }), '2026-10-28'));
  assert.ok(!occursOn(t({ date: '2026-10-14', repeat: 'weekly' }), '2026-10-27'));
  assert.ok(!occursOn(t({ date: '2026-10-14', repeat: 'daily' }), '2026-10-13'));
  assert.ok(occursOn(t({ date: '2026-10-12', repeat: 'weekdays' }), '2026-10-16'));    // Friday
  assert.ok(!occursOn(t({ date: '2026-10-12', repeat: 'weekdays' }), '2026-10-17'));   // Saturday
  assert.ok(occursOn(t({ date: '2026-01-31', repeat: 'monthly' }), '2026-02-28'));     // short month
  assert.ok(occursOn(t({ date: '2026-01-31', repeat: 'monthly' }), '2026-03-31'));
});

test('completing a repeating task only marks that day', () => {
  const gym = t({ title: 'Gym', date: '2026-10-12', repeat: 'daily' });
  const after = toggle(gym, '2026-10-14');
  assert.ok(tasksOn([after], '2026-10-14')[0].completed);
  assert.ok(!tasksOn([after], '2026-10-15')[0].completed);
});

test('overdue and upcoming', () => {
  const tasks = [t({ title: 'Old', date: '2026-10-01' }), t({ title: 'Soon', date: '2026-10-16' }), t({ title: 'Done', date: '2026-10-02', done: true })];
  assert.deepStrictEqual(overdue(tasks, '2026-10-14').map((x) => x.title), ['Old']);
  assert.deepStrictEqual(upcoming(tasks, '2026-10-14').map((d) => d.key), ['2026-10-16']);
});

test('sorting puts unfinished, timed, high-priority first', () => {
  const day = '2026-10-14';
  const list = tasksOn([
    t({ title: 'c', date: day, priority: 'low' }), t({ title: 'a', date: day, time: '09:00' }),
    t({ title: 'd', date: day, done: true, time: '07:00' }), t({ title: 'b', date: day, priority: 'high' }),
  ], day);
  assert.deepStrictEqual(list.map((x) => x.title), ['a', 'b', 'c', 'd']);
});

test('validation and helpers', () => {
  assert.throws(() => newTask({ title: ' ', date: '2026-10-14' }));
  assert.strictEqual(newTask({ title: ' Call mom ', date: '2026-10-14' }).title, 'Call mom');
  assert.strictEqual(addDays('2026-12-31', 1), '2027-01-01');
});

test('iCalendar export', () => {
  const ics = toIcs([t({ id: 'x', title: 'Standup, daily', date: '2026-10-14', time: '09:30', repeat: 'weekdays' })]);
  assert.match(ics, /DTSTART:20261014T093000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR/);
  assert.match(ics, /SUMMARY:Standup\\, daily/);
});

test('tasks can have a location, exported to .ics and linked to Google Maps', () => {
  const task = newTask({ title: 'Dentist', date: '2026-10-22', time: '09:30', location: '  12 Main St, Springfield; Suite 4 ' });
  assert.strictEqual(task.location, '12 Main St, Springfield; Suite 4');
  assert.ok(toIcs([task]).includes('LOCATION:12 Main St\\, Springfield\\; Suite 4'));
  assert.strictEqual(mapLink('Central Park, NY'), 'https://www.google.com/maps/search/?api=1&query=Central%20Park%2C%20NY');
  assert.strictEqual(newTask({ title: 'x', date: '2026-10-22' }).location, '');
});
