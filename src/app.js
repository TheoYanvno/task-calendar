import { toKey, fromKey, monthGrid, tasksOn, toggle, overdue, upcoming, newTask, toIcs, mapLink, googleCalendarUrl } from './tasks.js';
import { holidaysOn } from './holidays.js';
import { themeFor } from './themes.js';
import { forecastUrl, geocodeUrl, parsePlace, pickPlace, readCurrent, isFresh, STALE_AFTER } from './weather.js';

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

// Seasonal theme: colors follow the month on screen (January fireworks, October pumpkins…)
let seasonal = true; try { seasonal = localStorage.getItem('tc-seasonal') !== 'off'; } catch {}
function applySeasonal() {
  const t = themeFor(viewMonth);
  const root = document.documentElement;
  root.classList.toggle('seasonal', seasonal);
  root.style.setProperty('--theme-accent', t.accent);
  root.style.setProperty('--theme-tint', t.tint);
  root.style.setProperty('--theme-night', t.night);
  document.querySelector('.calendar').dataset.emoji = t.emoji;
  root.style.setProperty('--theme-pattern', `url("${emojiTile(t.emoji)}")`);
  $('themeBadge').hidden = !seasonal;
  $('themeBadge').textContent = `${t.emoji} ${t.holiday}`;
  $('themeBadge').title = `${t.month} theme: ${t.holiday}`;
  $('seasonal').setAttribute('aria-pressed', String(seasonal));
  $('seasonal').title = seasonal ? 'Turn off the monthly holiday theme' : 'Turn on the monthly holiday theme';
}

// A tile with the month's emoji, repeated across the calendar background (two per tile, offset like wallpaper)
function emojiTile(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">`
    + `<text x="18" y="44" font-size="30">${emoji}</text><text x="78" y="104" font-size="30">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function renderCalendar() {
  applySeasonal();
  $('monthLabel').textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  $('grid').innerHTML = monthGrid(viewYear, viewMonth).map((key) => {
    const list = tasksOn(tasks, key);
    const d = fromKey(key);
    const hols = holidaysOn(key);
    const cls = ['day', d.getMonth() !== viewMonth && 'other', key === todayKey && 'today', key === selected && 'selected', hols.some((h) => h.federal) && 'dayoff'].filter(Boolean).join(' ');
    const holiday = hols.length ? `<span class="holiday" title="${esc(hols.map((h) => h.name).join(', '))}"><span aria-hidden="true">${hols[0].emoji}</span><span class="h-name"> ${esc(hols[0].name)}</span></span>` : '';
    const chips = list.slice(0, 3).map((t) => {
      const draggable = t.repeat === 'none' ? 'draggable="true"' : '';
      return `<span class="chip ${t.priority} ${t.completed ? 'done' : ''}" ${draggable} data-id="${t.id}" title="${esc(t.title + (t.location ? ` · ${t.location}` : ''))}">${esc(t.title)}</span>`;
    }).join('');
    const more = list.length > 3 ? `<span class="more">+${list.length - 3} more</span>` : '';
    const holidayLabel = hols.length ? `, ${hols.map((h) => h.name).join(', ')}` : '';
    return `<button class="${cls}" data-key="${key}" aria-label="${fmtDay(key)}${esc(holidayLabel)}, ${list.length} tasks"><span class="num">${d.getDate()}</span>${holiday}${chips}${more}</button>`;
  }).join('');
}

const taskItem = (t, key, showDate = false) => `
  <li class="task ${t.priority} ${t.completed ? 'completed' : ''}">
    <input type="checkbox" ${t.completed ? 'checked' : ''} data-toggle="${t.id}" data-key="${key}" aria-label="Done: ${esc(t.title)}">
    <span class="t-body">
      <span class="t-title">${esc(t.title)}</span>
      <span class="t-meta">${[showDate && fmtDay(key, { weekday: 'short', month: 'short', day: 'numeric' }), fmtTime(t.time), repeatLabel[t.repeat]].filter(Boolean).join(' · ')}</span>
      ${t.location ? `<a class="t-loc" href="${esc(mapLink(t.location))}" target="_blank" rel="noopener" title="Open in Google Maps">📍 ${esc(t.location)}</a>` : ''}
    </span>
    <a class="mail" href="${esc(googleCalendarUrl(t, key))}" target="_blank" rel="noopener" title="Email me a reminder (adds it to Google Calendar)" aria-label="Email me a reminder for ${esc(t.title)}">✉️</a>
    <button class="del" data-del="${t.id}" aria-label="Delete ${esc(t.title)}">✕</button>
  </li>`;

function renderDay() {
  $('dayLabel').textContent = selected === todayKey ? `Today, ${fmtDay(selected, { month: 'long', day: 'numeric' })}` : fmtDay(selected);
  const hols = holidaysOn(selected);
  $('dayHoliday').hidden = !hols.length;
  $('dayHoliday').textContent = hols.map((h) => `${h.emoji} ${h.name}${h.federal ? ' · federal holiday' : ''}`).join('  ·  ');
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
      <div class="group"><h3>${key === todayKey ? 'Today' : fmtDay(key, { weekday: 'long', month: 'short', day: 'numeric' })}${holidaysOn(key).map((h) => ` <span class="h-tag">${h.emoji} ${esc(h.name)}</span>`).join('')}</h3>
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
  tasks.push(newTask({ title: $('title').value, date: selected, time: $('time').value, priority: $('priority').value, repeat: $('repeat').value, location: $('location').value }));
  $('title').value = ''; $('time').value = ''; $('repeat').value = 'none'; $('location').value = '';
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
$('seasonal').onclick = () => { seasonal = !seasonal; try { localStorage.setItem('tc-seasonal', seasonal ? 'on' : 'off'); } catch {} applySeasonal(); };

// ---- Clock and weather (top corner) ----
function tickClock() {
  const now = new Date();
  $('clockTime').textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  $('clockDate').textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (toKey(now) !== todayKey) location.reload();   // past midnight: "today" moves on
}
tickClock();
setInterval(tickClock, 15_000);

const WX = 'tc-weather';
let wx = {}; try { wx = JSON.parse(localStorage.getItem(WX)) ?? {}; } catch {}
const saveWx = () => { try { localStorage.setItem(WX, JSON.stringify(wx)); } catch {} };
const wxMsg = (text) => { $('wxMsg').textContent = text; };

function showWeather() {
  const d = wx.last?.data;
  $('wxPlace').textContent = wx.place ? `Showing weather for ${wx.place.name}` : 'Show the weather where you are.';
  if (!wx.place) { $('wxIcon').textContent = '🌡️'; $('wxText').textContent = 'Add weather'; return; }
  if (!d) { $('wxIcon').textContent = '⏳'; $('wxText').textContent = 'Loading…'; return; }
  $('wxIcon').textContent = d.emoji;
  $('wxText').textContent = `${d.temp}${d.unit}`;
  $('weatherBtn').title = `${d.label}, ${d.temp}${d.unit} in ${wx.place.name}`;
}

async function loadWeather(force = false) {
  if (!wx.place) return showWeather();
  if (!force && isFresh(wx.last) && wx.last.unit === (wx.unit ?? 'fahrenheit')) return showWeather();
  showWeather();
  try {
    const res = await fetch(forecastUrl(wx.place.lat, wx.place.lon, wx.unit ?? 'fahrenheit'));
    if (!res.ok) throw new Error(res.statusText);
    wx.last = { at: Date.now(), unit: wx.unit ?? 'fahrenheit', data: readCurrent(await res.json()) };
    saveWx();
  } catch {
    if (!wx.last) { $('wxIcon').textContent = '⚠️'; $('wxText').textContent = 'No weather'; return; }
  }
  showWeather();
}

function setPlace(place) {
  wx.place = place; wx.last = null; saveWx();
  wxMsg(''); loadWeather(true);
}

$('weatherBtn').onclick = () => {
  const open = $('wxPanel').hidden;
  $('wxPanel').hidden = !open;
  $('weatherBtn').setAttribute('aria-expanded', String(open));
  if (open) $('wxCity').focus();
};
document.addEventListener('click', (e) => {
  if (!$('wxPanel').hidden && !e.target.closest('.wx-wrap')) { $('wxPanel').hidden = true; $('weatherBtn').setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('wxPanel').hidden) { $('wxPanel').hidden = true; $('weatherBtn').focus(); } });

$('wxLocate').onclick = () => {
  if (!navigator.geolocation) return wxMsg('Your browser can’t share its location. Type a city instead.');
  wxMsg('Asking your browser for your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => setPlace({ name: 'your location', lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => wxMsg('Location wasn’t shared. Type a city instead.'),
    { timeout: 10_000, maximumAge: 30 * 60_000 },
  );
};

$('wxForm').onsubmit = async (e) => {
  e.preventDefault();
  const { name, hint } = parsePlace($('wxCity').value);
  if (!name) return;
  wxMsg('Looking it up…');
  try {
    const res = await fetch(geocodeUrl(name));
    const place = pickPlace((await res.json()).results, hint);
    if (!place) return wxMsg(`Couldn’t find “${name}”. Try adding the state, e.g. “Springfield, IL”.`);
    $('wxCity').value = '';
    setPlace(place);
  } catch {
    wxMsg('Couldn’t look that up right now. Check your connection.');
  }
};

document.querySelectorAll('input[name=wxUnit]').forEach((r) => {
  r.checked = r.value === (wx.unit ?? 'fahrenheit');
  r.onchange = () => { wx.unit = r.value; saveWx(); loadWeather(true); };
});

loadWeather();
setInterval(() => loadWeather(), STALE_AFTER);

render();
