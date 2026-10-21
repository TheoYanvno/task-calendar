import test from 'node:test';
import assert from 'node:assert';
import { describe, forecastUrl, parsePlace, pickPlace, readCurrent, isFresh } from '../src/weather.js';

test('weather codes become an emoji and a label, with night versions', () => {
  assert.deepStrictEqual(describe(0), { emoji: '☀️', label: 'Clear' });
  assert.deepStrictEqual(describe(0, false), { emoji: '🌙', label: 'Clear' });
  assert.strictEqual(describe(63).label, 'Rain');
  assert.strictEqual(describe(75).label, 'Snow');
  assert.strictEqual(describe(95).emoji, '⛈️');
  assert.strictEqual(describe(1234).label, 'Weather');
});

test('reads the API response', () => {
  const json = { current: { temperature_2m: 69.5, weather_code: 2, is_day: 1 }, current_units: { temperature_2m: '°F' } };
  assert.deepStrictEqual(readCurrent(json), { temp: 70, unit: '°F', emoji: '⛅', label: 'Partly cloudy' });
  assert.throws(() => readCurrent({}), /No weather data/);
  assert.ok(forecastUrl(40.7128, -74.006).includes('latitude=40.713&longitude=-74.006'));
  assert.ok(forecastUrl(1, 2).includes('temperature_unit=fahrenheit'));
});

test('typed places pick the right city', () => {
  const springfields = [
    { name: 'Springfield', admin1: 'Missouri', country_code: 'US', country: 'United States', latitude: 37.2, longitude: -93.3 },
    { name: 'Springfield', admin1: 'Illinois', country_code: 'US', country: 'United States', latitude: 39.8, longitude: -89.6 },
  ];
  assert.deepStrictEqual(parsePlace(' Springfield , IL '), { name: 'Springfield', hint: 'il' });
  assert.strictEqual(pickPlace(springfields, 'il').name, 'Springfield, Illinois');
  assert.strictEqual(pickPlace(springfields, 'illinois').lat, 39.8);
  assert.strictEqual(pickPlace(springfields).name, 'Springfield, Missouri');
  const paris = [{ name: 'Paris', admin1: 'Île-de-France', country_code: 'FR', country: 'France', latitude: 48.9, longitude: 2.3 },
    { name: 'Paris', admin1: 'Texas', country_code: 'US', country: 'United States', latitude: 33.7, longitude: -95.6 }];
  assert.strictEqual(pickPlace(paris).name, 'Paris, Texas', 'prefers US');
  assert.strictEqual(pickPlace(paris, 'france').name, 'Paris, France');
  assert.strictEqual(pickPlace([]), null);
});

test('weather is refreshed every 15 minutes', () => {
  const now = Date.now();
  assert.ok(isFresh({ at: now - 60_000 }, now));
  assert.ok(!isFresh({ at: now - 16 * 60_000 }, now));
  assert.ok(!isFresh(null, now));
});
