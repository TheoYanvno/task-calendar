import test from 'node:test';
import assert from 'node:assert';
import { THEMES, themeFor, contrast } from '../src/themes.js';

test('every month has a holiday theme', () => {
  assert.strictEqual(THEMES.length, 12);
  assert.strictEqual(themeFor(9).holiday, 'Halloween');
  assert.strictEqual(themeFor(10).holiday, 'Thanksgiving');
  assert.strictEqual(themeFor(11).holiday, 'Christmas');
  assert.strictEqual(themeFor(12).month, 'January', 'wraps around');
  assert.strictEqual(themeFor(-1).month, 'December');
});

test('text stays readable on every theme (WCAG AA, 4.5:1)', () => {
  for (const t of THEMES) {
    assert.ok(contrast('#ffffff', t.accent) >= 4.5, `${t.month}: white on ${t.accent}`);
    assert.ok(contrast('#1f2937', t.tint) >= 4.5, `${t.month}: text on ${t.tint}`);
    assert.ok(contrast('#0f172a', t.night) >= 4.5, `${t.month}: dark text on ${t.night}`);
    assert.ok(contrast('#1e293b', t.night) >= 4.5, `${t.month}: ${t.night} on the dark panel`);
  }
});
