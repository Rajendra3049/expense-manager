/** `YYYY-MM-DD` in local calendar for a Date (for `<input type="date">`). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** First and last day of the month containing `d`, as local `YYYY-MM-DD`. */
export function localMonthBounds(d: Date): {
  start: string;
  end: string;
  label: string;
} {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
    label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}
