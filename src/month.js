// "This month" panel: the important things in the month on screen, in date order.
// Important = holidays plus high-priority tasks. A repeating task is listed once, on its first
// day in the month, with how many times it comes up.
import { tasksOn, toKey } from './tasks.js';
import { holidaysFor } from './holidays.js';

export function monthHighlights(tasks, year, month) {
  const holidays = holidaysFor(year)
    .filter((h) => h.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .map((h) => ({ key: h.date, type: 'holiday', name: h.name, emoji: h.emoji, federal: h.federal }));

  const seen = new Map();
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const key = toKey(new Date(year, month, d));
    for (const t of tasksOn(tasks, key)) {
      if (t.priority !== 'high') continue;
      if (seen.has(t.id)) seen.get(t.id).times++;
      else seen.set(t.id, { key, type: 'task', task: t, times: 1 });
    }
  }
  return [...holidays, ...seen.values()]
    .sort((a, b) => a.key.localeCompare(b.key) || (a.type === b.type ? 0 : a.type === 'holiday' ? -1 : 1));
}
