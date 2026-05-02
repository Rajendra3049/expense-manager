export type BudgetWarningLevel = "ok" | "warn" | "over";

/** Returns warning when spent is at or over 80% of limit, over when >= 100%. */
export function budgetWarningLevel(
  spent: number,
  limit: number,
): BudgetWarningLevel {
  if (limit <= 0) return "ok";
  const ratio = spent / limit;
  if (ratio >= 1) return "over";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

export function formatBudgetPercent(spent: number, limit: number): string {
  if (limit <= 0) return spent > 0 ? "—" : "0%";
  return `${Math.min(999, Math.round((spent / limit) * 100))}%`;
}
