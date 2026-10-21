// A color theme for each month, based on its best-known US holiday (or season, for August).
// accent: buttons and highlights in light mode (white text sits on it), tint: today / header wash,
// night: accent in dark mode (dark text sits on it).
export const THEMES = [
  { month: 'January', holiday: "New Year's", emoji: '🎆', accent: '#1d4ed8', tint: '#e0e7ff', night: '#facc15' },
  { month: 'February', holiday: "Valentine's Day", emoji: '❤️', accent: '#be123c', tint: '#ffe4e6', night: '#fb7185' },
  { month: 'March', holiday: "St. Patrick's Day", emoji: '☘️', accent: '#15803d', tint: '#dcfce7', night: '#4ade80' },
  { month: 'April', holiday: 'Easter', emoji: '🐣', accent: '#7c3aed', tint: '#f3e8ff', night: '#c4b5fd' },
  { month: 'May', holiday: "Mother's Day", emoji: '💐', accent: '#a21caf', tint: '#fae8ff', night: '#f0abfc' },
  { month: 'June', holiday: 'Juneteenth', emoji: '✊🏾', accent: '#a16207', tint: '#fef9c3', night: '#fde047' },
  { month: 'July', holiday: 'Independence Day', emoji: '🎇', accent: '#b91c1c', tint: '#dbeafe', night: '#f87171' },
  { month: 'August', holiday: 'Summer break', emoji: '🏖️', accent: '#0e7490', tint: '#cffafe', night: '#67e8f9' },
  { month: 'September', holiday: 'Labor Day', emoji: '🛠️', accent: '#0369a1', tint: '#e0f2fe', night: '#7dd3fc' },
  { month: 'October', holiday: 'Halloween', emoji: '🎃', accent: '#c2410c', tint: '#ffedd5', night: '#fb923c' },
  { month: 'November', holiday: 'Thanksgiving', emoji: '🦃', accent: '#92400e', tint: '#fef3c7', night: '#fbbf24' },
  { month: 'December', holiday: 'Christmas', emoji: '🎄', accent: '#b91c1c', tint: '#dcfce7', night: '#86efac' },
];

/** The theme for a month (0 = January). */
export const themeFor = (month) => THEMES[((month % 12) + 12) % 12];

/** Relative luminance (WCAG), for checking that text stays readable on each theme. */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
