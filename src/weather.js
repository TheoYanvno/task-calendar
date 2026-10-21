// Current weather from Open-Meteo (free, no API key, works from the browser).
// Pure helpers here; the fetching and the widget live in app.js.

/** WMO weather codes → an emoji and a short description. */
const CODES = [
  [[0], '☀️', '🌙', 'Clear'],
  [[1], '🌤️', '🌙', 'Mostly clear'],
  [[2], '⛅', '☁️', 'Partly cloudy'],
  [[3], '☁️', '☁️', 'Cloudy'],
  [[45, 48], '🌫️', '🌫️', 'Fog'],
  [[51, 53, 55, 56, 57], '🌦️', '🌧️', 'Drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', '🌧️', 'Rain'],
  [[71, 73, 75, 77, 85, 86], '🌨️', '🌨️', 'Snow'],
  [[95, 96, 99], '⛈️', '⛈️', 'Thunderstorm'],
];

export function describe(code, isDay = true) {
  const row = CODES.find(([codes]) => codes.includes(code));
  if (!row) return { emoji: '🌡️', label: 'Weather' };
  return { emoji: isDay ? row[1] : row[2], label: row[3] };
}

export const forecastUrl = (lat, lon, unit = 'fahrenheit') =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
  `&current=temperature_2m,weather_code,is_day&temperature_unit=${unit}&timezone=auto`;

/** "Springfield, IL" or "Springfield, Illinois" → the name to search, plus the state/country hint. */
export function parsePlace(text) {
  const [name, ...rest] = String(text).split(',').map((s) => s.trim()).filter(Boolean);
  return { name: name ?? '', hint: rest.join(' ').toLowerCase() };
}

export const geocodeUrl = (name) =>
  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;

const STATES = { al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california', co: 'colorado', ct: 'connecticut', de: 'delaware',
  fl: 'florida', ga: 'georgia', hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa', ks: 'kansas', ky: 'kentucky', la: 'louisiana',
  me: 'maine', md: 'maryland', ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi', mo: 'missouri', mt: 'montana', ne: 'nebraska',
  nv: 'nevada', nh: 'new hampshire', nj: 'new jersey', nm: 'new mexico', ny: 'new york', nc: 'north carolina', nd: 'north dakota', oh: 'ohio',
  ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania', ri: 'rhode island', sc: 'south carolina', sd: 'south dakota', tn: 'tennessee', tx: 'texas',
  ut: 'utah', vt: 'vermont', va: 'virginia', wa: 'washington', wv: 'west virginia', wi: 'wisconsin', wy: 'wyoming', dc: 'district of columbia' };

/** Picks the best geocoding result: matching state/country if one was typed, otherwise the first US match, otherwise the first. */
export function pickPlace(results, hint = '') {
  if (!results?.length) return null;
  const want = STATES[hint] ?? hint;
  const match = want && results.find((r) => [r.admin1, r.country, r.country_code].some((v) => v && v.toLowerCase() === want));
  const r = match || results.find((x) => x.country_code === 'US') || results[0];
  const region = r.country_code === 'US' ? r.admin1 : r.country;
  return { name: region ? `${r.name}, ${region}` : r.name, lat: r.latitude, lon: r.longitude };
}

/** Turns the API response into what the widget shows. */
export function readCurrent(json) {
  const c = json?.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new Error('No weather data');
  const { emoji, label } = describe(c.weather_code, c.is_day !== 0);
  return { temp: Math.round(c.temperature_2m), unit: json.current_units?.temperature_2m ?? '°F', emoji, label };
}

export const STALE_AFTER = 15 * 60 * 1000;   // Open-Meteo updates current conditions every 15 minutes
export const isFresh = (saved, now = Date.now()) => Boolean(saved && now - saved.at < STALE_AFTER);
