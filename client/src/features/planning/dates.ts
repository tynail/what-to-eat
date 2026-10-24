/**
 * Returns the Monday on or before `value` as a local-calendar YYYY-MM-DD string.
 * Defaults to today and leaves the supplied Date unchanged.
 */
export function monday(value = new Date()) {
  const date = new Date(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Formats a YYYY-MM-DD date in English with a full month, day, and year, using local noon. */
export function pretty(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
