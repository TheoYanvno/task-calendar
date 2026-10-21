// US holidays for any year, computed (no list to keep up to date).
// Federal holidays follow 5 U.S.C. 6103, including the "observed" day when a fixed date falls on a weekend.
import { toKey } from './tasks.js';

const day = (y, m, d) => new Date(y, m, d);

/** The nth weekday of a month (weekday 0 = Sunday). n = -1 means the last one. */
export function nthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = day(year, month, 1);
    return day(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
  }
  const last = day(year, month + 1, 0);
  return day(year, month, last.getDate() - ((last.getDay() - weekday + 7) % 7));
}

/** Easter Sunday (Western), using the anonymous Gregorian algorithm. */
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), date = ((h + l - 7 * m + 114) % 31) + 1;
  return day(year, month - 1, date);
}

/** Saturday holidays are observed on Friday, Sunday ones on Monday. */
function observed(date) {
  const wd = date.getDay();
  if (wd === 6) return day(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  if (wd === 0) return day(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return null;
}

/** Every holiday in a year: { date: 'YYYY-MM-DD', name, emoji, federal, observed? }, sorted by date. */
export function holidaysFor(year) {
  const list = [];
  const add = (date, name, emoji, federal = false, extra = {}) => list.push({ date: toKey(date), name, emoji, federal, ...extra });
  const fixedFederal = (month, d, name, emoji) => {
    const date = day(year, month, d);
    add(date, name, emoji, true);
    const obs = observed(date);
    if (obs && obs.getFullYear() === year) add(obs, `${name} (observed)`, emoji, true, { observed: true });
  };

  fixedFederal(0, 1, "New Year's Day", '🎆');
  add(nthWeekday(year, 0, 1, 3), 'Martin Luther King Jr. Day', '✊', true);
  add(day(year, 1, 2), 'Groundhog Day', '🦫');
  add(day(year, 1, 14), "Valentine's Day", '❤️');
  add(nthWeekday(year, 1, 1, 3), "Presidents' Day", '🇺🇸', true);
  add(day(year, 2, 17), "St. Patrick's Day", '☘️');
  add(easter(year), 'Easter', '🐣');
  add(nthWeekday(year, 4, 0, 2), "Mother's Day", '💐');
  add(nthWeekday(year, 4, 1, -1), 'Memorial Day', '🎖️', true);
  add(nthWeekday(year, 5, 0, 3), "Father's Day", '👔');
  if (year >= 2021) fixedFederal(5, 19, 'Juneteenth', '✊🏾');
  fixedFederal(6, 4, 'Independence Day', '🎇');
  add(nthWeekday(year, 8, 1, 1), 'Labor Day', '🛠️', true);
  add(nthWeekday(year, 9, 1, 2), "Columbus Day / Indigenous Peoples' Day", '🧭', true);
  add(day(year, 9, 31), 'Halloween', '🎃');
  fixedFederal(10, 11, 'Veterans Day', '🎖️');
  add(nthWeekday(year, 10, 4, 4), 'Thanksgiving', '🦃', true);
  add(day(year, 11, 24), 'Christmas Eve', '🎄');
  fixedFederal(11, 25, 'Christmas Day', '🎄');
  add(day(year, 11, 31), "New Year's Eve", '🥂');
  // Next year's New Year's Day on a Saturday is observed on Friday, Dec 31 of this year
  if (day(year + 1, 0, 1).getDay() === 6) add(day(year, 11, 31), "New Year's Day (observed)", '🎆', true, { observed: true });

  return list.sort((a, b) => a.date.localeCompare(b.date) || b.federal - a.federal);
}

const cache = new Map();
/** Holidays on one day ('YYYY-MM-DD'). */
export function holidaysOn(key) {
  const year = Number(key.slice(0, 4));
  if (!cache.has(year)) {
    const byDay = new Map();
    for (const h of holidaysFor(year)) byDay.set(h.date, [...(byDay.get(h.date) ?? []), h]);
    cache.set(year, byDay);
  }
  return cache.get(year).get(key) ?? [];
}

/** True when federal offices (and many workplaces) are closed. */
export const isDayOff = (key) => holidaysOn(key).some((h) => h.federal);
