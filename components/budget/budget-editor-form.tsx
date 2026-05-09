"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSaveBudgetMutation } from "@/features/budget/use-budget-data";
import type { CategoryRow } from "@/lib/expenses/types";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

function num(v: string | number): number {
  const parsed = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(parsed) ? parsed : 0;
}

type BudgetEditorFormProps = {
  year: number;
  month: number;
  initialTotal: string;
  initialCategoryLimits: Record<string, string>;
  expenseCategories: CategoryRow[];
};

export function BudgetEditorForm({
  year,
  month,
  initialTotal,
  initialCategoryLimits,
  expenseCategories,
}: BudgetEditorFormProps) {
  const [totalInput, setTotalInput] = useState(initialTotal);
  const [categoryInputs, setCategoryInputs] = useState(initialCategoryLimits);
  const [validationMessage, setValidationMessage] = useState("");

  const saveBudget = useSaveBudgetMutation();

  const mergedCategoryInputs = useMemo(() => {
    const next = { ...categoryInputs };
    for (const cat of expenseCategories) {
      if (next[cat.id] === undefined) next[cat.id] = "";
    }
    return next;
  }, [categoryInputs, expenseCategories]);

  function onSave() {
    const totalLimit = Math.max(0, num(totalInput));
    const categoryLimits: Record<string, number> = {};
    let totalCategoryLimit = 0;
    for (const [id, raw] of Object.entries(mergedCategoryInputs)) {
      const v = Math.max(0, num(raw));
      if (v > 0) categoryLimits[id] = v;
      totalCategoryLimit += v;
    }

    if (totalCategoryLimit > totalLimit) {
      setValidationMessage(
        "Total of category limits cannot exceed monthly total budget.",
      );
      return;
    }

    setValidationMessage("");
    saveBudget.mutate(
      {
        year,
        month,
        totalLimit,
        categoryLimits,
      },
      {
        onSuccess: () => {
          toast.success("Budget saved successfully.");
        },
      },
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Edit budget
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Saving updates the monthly total and replaces all category limits for
        this month.
      </p>

      <div className="mt-4 max-w-xs">
        <label
          htmlFor="budget-total"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Monthly total budget
        </label>
        <input
          id="budget-total"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={totalInput}
          onChange={(e) => setTotalInput(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Category limits (optional)
        </h3>
        {expenseCategories.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Add expense categories on the Expenses page first.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {expenseCategories.map((cat) => (
              <li
                key={cat.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
              >
                <label
                  className="min-w-[8rem] text-sm text-zinc-700 dark:text-zinc-300"
                  htmlFor={`cap-${cat.id}`}
                >
                  {cat.name}
                </label>
                <input
                  id={`cap-${cat.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0 = no cap"
                  value={mergedCategoryInputs[cat.id] ?? ""}
                  onChange={(e) =>
                    setCategoryInputs((prev) => ({
                      ...prev,
                      [cat.id]: e.target.value,
                    }))
                  }
                  className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saveBudget.isPending}
          onClick={() => void onSave()}
          className="cursor-pointer rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saveBudget.isPending ? "Saving…" : "Save budget"}
        </button>
      </div>

      <p className="mt-3 min-h-5 text-sm text-red-600" role="alert">
        {validationMessage ||
          (saveBudget.isError
            ? getSupabaseRequestErrorMessage(saveBudget.error)
            : "")}
      </p>
    </section>
  );
}
