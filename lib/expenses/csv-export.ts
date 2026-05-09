import type { ExpenseListRow } from "@/lib/expenses/types";
import {
  expenseAccountName,
  expenseCategoryName,
  expenseEntityLinkLabel,
} from "@/lib/expenses/types";

function csvEscape(value: string): string {
  const s = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatTags(row: ExpenseListRow): string {
  const t = row.tags;
  if (!t || !Array.isArray(t) || t.length === 0) return "";
  return t.join("; ");
}

function formatAmount(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? String(n) : "";
}

/** RFC 4180-style CSV for spreadsheet import (UTF-8). */
export function buildExpensesCsv(rows: ExpenseListRow[]): string {
  const headers = [
    "date",
    "category",
    "account",
    "linked_to",
    "tags",
    "note",
    "amount",
    "archived",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const archived = row.archived_at ? "yes" : "no";
    lines.push(
      [
        csvEscape(row.date),
        csvEscape(expenseCategoryName(row)),
        csvEscape(expenseAccountName(row)),
        csvEscape(expenseEntityLinkLabel(row)),
        csvEscape(formatTags(row)),
        csvEscape(row.note ?? ""),
        csvEscape(formatAmount(row.amount)),
        csvEscape(archived),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export function downloadExpensesCsv(rows: ExpenseListRow[], filename: string) {
  const csv = buildExpensesCsv(rows);
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
