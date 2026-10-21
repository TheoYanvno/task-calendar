// Pure task + date logic (no DOM): easy to test in Node.
// Dates are stored as 'YYYY-MM-DD' strings in local time to avoid time-zone surprises.

export const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (key, n) => { const d = fromKey(key); d.setDate(d.getDate() + n); return toKey(d); };
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);

/** 6x7 grid of date keys for a month view, starting on Sunday. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => toKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

/** Does a (possibly repeating) task fall on this day? */
export function occursOn(task, key) {
  if (key < task.date) return false;
  if (task.until && key > task.until) return false;
  switch (task.repeat) {
    case 'daily': return true;
    case 'weekdays': { const day = fromKey(key).getDay(); return day > 0 && day < 6; }
    case 'weekly': return daysBetween(task.date, key) % 7 === 0;
    case 'monthly': {
      const start = fromKey(task.date), d = fromKey(key);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return d.getDate() === Math.min(start.getDate(), lastDay);   // the 31st becomes the 30th/28th in short months
    }
    default: return key === task.date;
  }
}

export const isDone = (task, key) => (task.repeat && task.repeat !== 'none' ? (task.doneDates ?? []).includes(key) : Boolean(task.done));

/** All tasks on one day, sorted: unfinished first, then by time, then priority. */
export function tasksOn(tasks, key) {
  const rank = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter((t) => occursOn(t, key))
    .map((t) => ({ ...t, occurrence: key, completed: isDone(t, key) }))
    .sort((a, b) => a.completed - b.completed || (a.time || '99').localeCompare(b.time || '99') || rank[a.priority] - rank[b.priority]);
}

/** Toggle complete. Repeating tasks are completed one day at a time. */
export function toggle(task, key) {
  if (task.repeat && task.repeat !== 'none') {
    const set = new Set(task.doneDates ?? []);
    set.has(key) ? set.delete(key) : set.add(key);
    return { ...task, doneDates: [...set].sort() };
  }
  return { ...task, done: !task.done };
}

/** Unfinished one-off tasks from before today. */
export const overdue = (tasks, today) =>
  tasks.filter((t) => (!t.repeat || t.repeat === 'none') && !t.done && t.date < today).sort((a, b) => a.date.localeCompare(b.date));

/** Each day from today through the next n days that has tasks. */
export function upcoming(tasks, today, days = 7) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const key = addDays(today, i);
    const list = tasksOn(tasks, key);
    if (list.length) out.push({ key, list });
  }
  return out;
}

export function newTask({ title, date, time = '', priority = 'medium', repeat = 'none', notes = '', location = '' }) {
  if (!title?.trim()) throw new Error('A task needs a title');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('A task needs a date');
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  return { id, title: title.trim(), date, time, priority, repeat, notes: notes.trim(), location: location.trim().slice(0, 200), done: false, doneDates: [] };
}

/** Export to iCalendar (.ics) so tasks can be imported into Google, Apple or Outlook calendars. */
export function toIcs(tasks) {
  const esc = (s) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const rule = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY' };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Task Calendar//EN'];
  for (const t of tasks) {
    const day = t.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${t.id}@task-calendar`, `SUMMARY:${esc(t.title)}`);
    if (t.time) lines.push(`DTSTART:${day}T${t.time.replace(':', '')}00`);
    else lines.push(`DTSTART;VALUE=DATE:${day}`);
    if (rule[t.repeat]) lines.push(`RRULE:${rule[t.repeat]}`);
    if (t.notes) lines.push(`DESCRIPTION:${esc(t.notes)}`);
    if (t.location) lines.push(`LOCATION:${esc(t.location)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** A Google Maps search link for a task's location (works for addresses, places and businesses). */
export const mapLink = (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
