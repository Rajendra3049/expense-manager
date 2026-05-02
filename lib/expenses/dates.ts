export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

/** Advance a local calendar `YYYY-MM-DD` by one period for recurring rules. */
export function advanceRecurringNextDate(
  ymd: string,
  frequency: RecurringFrequency,
): string {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  switch (frequency) {
    case "daily":
      dt.setDate(dt.getDate() + 1);
      break;
    case "weekly":
      dt.setDate(dt.getDate() + 7);
      break;
    case "monthly":
      dt.setMonth(dt.getMonth() + 1);
      break;
    case "yearly":
      dt.setFullYear(dt.getFullYear() + 1);
      break;
    default:
      break;
  }
  return toLocalDateString(dt);
}

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

/** `month` is 1–12 (calendar month). */
export function localMonthBoundsFromParts(
  year: number,
  month: number,
): { start: string; end: string; label: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
    label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}
