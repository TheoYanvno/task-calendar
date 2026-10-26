import test from 'node:test';
import assert from 'node:assert';
import { monthHighlights } from '../src/month.js';
import { newTask } from '../src/tasks.js';

test('holidays and high-priority tasks for the month, in date order', () => {
  const tasks = [
    newTask({ title: 'Dentist', date: '2026-10-20', priority: 'high' }),
    newTask({ title: 'Groceries', date: '2026-10-05', priority: 'medium' }),
    newTask({ title: 'Costume party', date: '2026-10-31', priority: 'high' }),
    newTask({ title: 'November thing', date: '2026-11-02', priority: 'high' }),
  ];
  const list = monthHighlights(tasks, 2026, 9);
  const labels = list.map((x) => (x.type === 'holiday' ? x.name : x.task.title));
  assert.deepStrictEqual(labels, ["Columbus Day / Indigenous Peoples' Day", 'Dentist', 'Halloween', 'Costume party']);
  assert.strictEqual(list[0].federal, true);
  assert.ok(!labels.includes('Groceries'), 'medium priority is left out');
});

test('a repeating task is listed once with how often it comes up', () => {
  const weekly = newTask({ title: 'Team meeting', date: '2026-10-01', priority: 'high', repeat: 'weekly' });
  const [item] = monthHighlights([weekly], 2026, 9).filter((x) => x.type === 'task');
  assert.strictEqual(item.key, '2026-10-01');
  assert.strictEqual(item.times, 5);                      // Oct 1, 8, 15, 22, 29
});

test('a month with no holidays or high-priority tasks is empty', () => {
  assert.deepStrictEqual(monthHighlights([], 2026, 7).filter((x) => x.type === 'task'), []);
});
