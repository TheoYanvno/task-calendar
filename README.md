# Task Calendar

A to-do list and a calendar in one. Plan tasks on a month view, check them off, set them to repeat, drag them to a new day, and export everything to your phone's calendar.

**Tech:** JavaScript (ES modules) · HTML/CSS · Drag and Drop API · `localStorage` · iCalendar (.ics) · `node:test` · no frameworks

| Desktop | Phone, dark mode |
|---|---|
| ![Desktop](docs/desktop.png) | ![Phone in dark mode](docs/mobile-dark.png) |

## Features

- **Month calendar** with color-coded task chips on each day (red = high, amber = medium, green = low priority)
- **Day panel**: click any day to see its tasks and add new ones with an optional time, priority and repeat rule
- **Repeating tasks**: daily, weekdays, weekly or monthly. Monthly tasks on the 31st land on the last day of shorter months. Checking off a repeating task completes only that day.
- **Drag and drop** a one-time task onto another day to reschedule it
- **Next 7 days** and **Overdue** views, with an overdue badge
- **Export .ics** to import your tasks (including repeat rules) into Google Calendar, Apple Calendar or Outlook
- Dark mode (follows your system setting, with a toggle), works on phones, and saves automatically in your browser

## How it works

| File | What it does |
|---|---|
| [`src/tasks.js`](src/tasks.js) | Pure date and task logic: month grid, repeat rules, sorting, overdue/upcoming, completion, iCalendar export |
| [`src/app.js`](src/app.js) | Rendering, adding and completing tasks, drag and drop, views, theme and saving |

Dates are stored as `YYYY-MM-DD` strings in local time, which avoids the classic bug where a task shifts a day because of time zones.

## Run it

```bash
python3 -m http.server 8000      # then open http://localhost:8000
npm test                         # 7 tests for the date and repeat logic
```

Built with help from AI coding tools for planning, code review and tests.
