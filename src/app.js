import { toKey, fromKey, monthGrid, tasksOn, toggle, overdue, upcoming, newTask, toIcs } from './tasks.js';

const $ = (id) => document.getElementById(id);
const KEY = 'task-calendar';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? null; } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch { /* storage unavailable */ } };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const todayKey = toKey(new Date());
let selected = todayKey;
let viewYear = new Date().getFullYear(), viewMonth = new Date().getMonth();
let view = 'upcoming';

// A few example tasks on first visit so the calendar isn't empty
let tasks = load() ?? [
  newTask({ title: 'Welcome! Click a day to add tasks', date: todayKey, priority: 'high' }),
  newTask({ title: 'Morning workout', date: todayKey, time: '06:30', repeat: 'weekdays', priority: 'low' }),
  newTask({ title: 'Review the week', date: toKey(new Date(Date.now() + 2 * 86400000)), repeat: 'weekly' }),
];

const fmtDay = (key, opts = { weekday: 'long', month: 'long', day: 'numeric' }) => fromKey(key).toLocaleDateString(undefined, opts);
const fmtTime = (t) => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '');
const repeatLabel = { daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every week', monthly: 'Every month' };

function renderCalendar() {
  $('monthLabel').textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  $('grid').innerHTML = monthGrid(viewYear, viewMonth).map((key) => {
    const list = tasksOn(tasks, key);
    const d = fromKey(key);
    const cls = ['day', d.getMonth() !== viewMonth && 'other', key === todayKey && 'today', key === selected && 'selected'].filter(Boolean).join(' ');
    const chips = list.slice(0, 3).map((t) => {
      const draggable = t.repeat === 'none' ? 'draggable="true"' : '';
      return `<span class="chip ${t.priority} ${t.completed ? 'done' : ''}" ${draggable} data-id="${t.id}" title="${esc(t.title)}">${esc(t.title)}</span>`;
    }).join('');
    const more = list.length > 3 ? `<span class="more">+${list.length - 3} more</span>` : '';
    return `<button class="${cls}" data-key="${key}" aria-label="${fmtDay(key)}, ${list.length} tasks"><span class="num">${d.getDate()}</span>${chips}${more}</button>`;
  }).join('');
}

const taskItem = (t, key, showDate = false) => `
  <li class="task ${t.priority} ${t.completed ? 'completed' : ''}">
    <input type="checkbox" ${t.completed ? 'checked' : ''} data-toggle="${t.id}" data-key="${key}" aria-label="Done: ${esc(t.title)}">
    <span class="t-body">
      <span class="t-title">${esc(t.title)}</span>
      <span class="t-meta">${[showDate && fmtDay(key, { weekday: 'short', month: 'short', day: 'numeric' }), fmtTime(t.time), repeatLabel[t.repeat]].filter(Boolean).join(' · ')}</span>
    </span>
    <button class="del" data-del="${t.id}" aria-label="Delete ${esc(t.title)}">✕</button>
  </li>`;

function renderDay() {
  $('dayLabel').textContent = selected === todayKey ? `Today, ${fmtDay(selected, { month: 'long', day: 'numeric' })}` : fmtDay(selected);
  const list = tasksOn(tasks, selected);
  $('dayTasks').innerHTML = list.map((t) => taskItem(t, selected)).join('') || '<li class="empty">No tasks. Enjoy the free time, or add one above.</li>';
}

function renderView() {
  const late = overdue(tasks, todayKey);
  $('overdueCount').textContent = late.length || '';
  document.querySelectorAll('.views button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  if (view === 'overdue') {
    $('viewList').innerHTML = late.length ? `<ul class="tasks">${late.map((t) => taskItem({ ...t, completed: false }, t.date, true)).join('')}</ul>` : '<p class="empty">Nothing overdue. Nice work!</p>';
  } else {
    const days = upcoming(tasks, todayKey, 7);
    $('viewList').innerHTML = days.map(({ key, list }) => `
      <div class="group"><h3>${key === todayKey ? 'Today' : fmtDay(key, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
      <ul class="tasks">${list.map((t) => taskItem(t, key)).join('')}</ul></div>`).join('') || '<p class="empty">Nothing planned this week.</p>';
  }
}

function render() { renderCalendar(); renderDay(); renderView(); save(); }

// ---- Events ----
$('grid').addEventListener('click', (e) => {
  const day = e.target.closest('.day');
  if (!day) return;
  selected = day.dataset.key;
  const d = fromKey(selected);
  if (d.getMonth() !== viewMonth) { viewMonth = d.getMonth(); viewYear = d.getFullYear(); }
  render();
  $('title').focus({ preventScroll: true });
});

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  tasks.push(newTask({ title: $('title').value, date: selected, time: $('time').value, priority: $('priority').value, repeat: $('repeat').value }));
  $('title').value = ''; $('time').value = ''; $('repeat').value = 'none';
  render();
});

document.addEventListener('change', (e) => {
  const id = e.target.dataset.toggle;
  if (!id) return;
  tasks = tasks.map((t) => (t.id === id ? toggle(t, e.target.dataset.key) : t));
  render();
});

document.addEventListener('click', (e) => {
  const id = e.target.dataset.del;
  if (!id) return;
  const task = tasks.find((t) => t.id === id);
  if (task.repeat !== 'none' && !confirmDeleteSeries(task)) return;
  tasks = tasks.filter((t) => t.id !== id);
  render();
});
// Deleting a repeating task removes the whole series; ask first (inline, no browser dialog needed for one-offs)
const confirmDeleteSeries = (task) => window.confirm(`"${task.title}" repeats. Delete every occurrence?`);

// Drag and drop to reschedule one-off tasks
let dragId = null;
$('grid').addEventListener('dragstart', (e) => { dragId = e.target.dataset.id; e.dataTransfer.effectAllowed = 'move'; });
$('grid').addEventListener('dragover', (e) => { const day = e.target.closest('.day'); if (day && dragId) { e.preventDefault(); day.classList.add('drop'); } });
$('grid').addEventListener('dragleave', (e) => e.target.closest('.day')?.classList.remove('drop'));
$('grid').addEventListener('drop', (e) => {
  const day = e.target.closest('.day');
  if (!day || !dragId) return;
  e.preventDefault();
  tasks = tasks.map((t) => (t.id === dragId ? { ...t, date: day.dataset.key } : t));
  dragId = null;
  render();
});

$('prevMonth').onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); };
$('nextMonth').onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(); };
$('today').onclick = () => { selected = todayKey; viewYear = new Date().getFullYear(); viewMonth = new Date().getMonth(); render(); };
document.querySelectorAll('.views button').forEach((b) => (b.onclick = () => { view = b.dataset.view; renderView(); }));

$('export').onclick = () => {
  const blob = new Blob([toIcs(tasks)], { type: 'text/calendar' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'tasks.ics' });
  a.click();
  URL.revokeObjectURL(a.href);
};

const setTheme = (dark) => { document.documentElement.classList.toggle('dark', dark); $('theme').textContent = dark ? '☀️' : '🌙'; try { localStorage.setItem('tc-theme', dark ? 'dark' : 'light'); } catch {} };
let savedTheme = null; try { savedTheme = localStorage.getItem('tc-theme'); } catch {}
setTheme(savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
$('theme').onclick = () => setTheme(!document.documentElement.classList.contains('dark'));

render();
