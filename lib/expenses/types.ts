export type CategoryRow = {
  id: string;
  name: string;
  type: "expense" | "income";
};

type NamedRef = { id: string; name: string } | { id: string; name: string }[] | null;

export type ExpenseListRow = {
  id: string;
  amount: string | number;
  date: string;
  note: string;
  created_at: string;
  category_id: string;
  account_id: string | null;
  trip_id: string | null;
  emi_id: string | null;
  investment_id: string | null;
  debt_account_id: string | null;
  emi_reduction_applied: string | number | null;
  tags: string[] | null;
  archived_at: string | null;
  categories: NamedRef;
  accounts: NamedRef;
  trips: NamedRef;
  emis: NamedRef;
  investments: NamedRef;
  debt_accounts: NamedRef;
};

export function expenseCategoryName(row: ExpenseListRow): string {
  const c = row.categories;
  if (!c) return "—";
  const first = Array.isArray(c) ? c[0] : c;
  return first?.name ?? "—";
}

export function expenseAccountName(row: ExpenseListRow): string {
  const a = row.accounts;
  if (!a) return "—";
  const first = Array.isArray(a) ? a[0] : a;
  return first?.name ?? "—";
}

export function expenseTripName(row: ExpenseListRow): string {
  const t = row.trips;
  if (!t) return "—";
  const first = Array.isArray(t) ? t[0] : t;
  return first?.name ?? "—";
}

function firstRelationName(rel: NamedRef): string | null {
  if (!rel) return null;
  const first = Array.isArray(rel) ? rel[0] : rel;
  const n = first?.name?.trim();
  return n && n.length > 0 ? n : null;
}

/** Single user-facing label for trip / EMI / investment / debt link (at most one). */
export function expenseEntityLinkLabel(row: ExpenseListRow): string {
  if (row.trip_id) {
    const n = firstRelationName(row.trips);
    return n ? `Trip: ${n}` : "Trip";
  }
  if (row.emi_id) {
    const n = firstRelationName(row.emis);
    return n ? `EMI: ${n}` : "EMI";
  }
  if (row.investment_id) {
    const n = firstRelationName(row.investments);
    return n ? `Investment: ${n}` : "Investment";
  }
  if (row.debt_account_id) {
    const n = firstRelationName(row.debt_accounts);
    return n ? `Debt: ${n}` : "Debt";
  }
  return "—";
}

export function expenseTagsList(row: ExpenseListRow): string[] {
  const t = row.tags;
  if (!Array.isArray(t)) return [];
  return t.filter((x): x is string => typeof x === "string");
}
