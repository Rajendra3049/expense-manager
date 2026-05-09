"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  useCategoriesQuery,
  useDeleteCategoryMutation,
  useInsertCategoryMutation,
  useUpdateCategoryMutation,
} from "@/features/expenses/use-expense-data";
import {
  normalizeCategoryName,
  toCategoryDisplayName,
} from "@/lib/expenses/category-name";
import {
  type CategoryFormValues,
  categoryFormSchema,
} from "@/lib/expenses/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

export function AddCategoryForm() {
  const confirm = useConfirm();
  const insertCategory = useInsertCategoryMutation();
  const updateCategory = useUpdateCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();
  const { data: categories = [] } = useCategoriesQuery();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", type: "expense" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const normalizedInput = normalizeCategoryName(values.name);
    const displayName = toCategoryDisplayName(values.name);

    const duplicateExists = categories.some(
      (category) =>
        category.type === values.type &&
        normalizeCategoryName(category.name) === normalizedInput,
    );
    if (duplicateExists) {
      setError("name", {
        type: "manual",
        message: "Category already exists (case-insensitive).",
      });
      return;
    }

    clearErrors("name");
    try {
      await insertCategory.mutateAsync({
        name: displayName,
        type: values.type,
      });
      toast.success(
        `${values.type === "expense" ? "Expense" : "Income"} category "${displayName}" added.`,
      );
      reset({ name: "", type: values.type });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not add category.";
      toast.error(message);
    }
  });

  const groupedCategories = useMemo(
    () => ({
      expense: categories.filter((c) => c.type === "expense"),
      income: categories.filter((c) => c.type === "income"),
    }),
    [categories],
  );

  function startEdit(id: string, name: string) {
    setEditingCategoryId(id);
    setEditName(name);
  }

  function cancelEdit() {
    setEditingCategoryId(null);
    setEditName("");
  }

  async function submitEdit(category: { id: string; name: string; type: "expense" | "income" }) {
    const normalizedInput = normalizeCategoryName(editName);
    const displayName = toCategoryDisplayName(editName);
    if (normalizedInput.length === 0) {
      toast.error("Category name is required.");
      return;
    }

    const duplicateExists = categories.some(
      (existing) =>
        existing.id !== category.id &&
        existing.type === category.type &&
        normalizeCategoryName(existing.name) === normalizedInput,
    );
    if (duplicateExists) {
      toast.error(`"${displayName}" already exists.`);
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: displayName,
        type: category.type,
      });
      toast.success(`Category renamed to "${displayName}".`);
      cancelEdit();
    } catch (error) {
      toast.error(getSupabaseRequestErrorMessage(error));
    }
  }

  async function removeCategory(category: { id: string; name: string }) {
    const ok = await confirm({
      title: `Delete category "${category.name}"?`,
      description:
        "This may fail if the category is currently used in records.",
      confirmText: "Delete",
      cancelText: "Cancel",
      intent: "danger",
    });
    if (!ok) return;
    try {
      await deleteCategory.mutateAsync({ id: category.id });
      toast.success(`Deleted "${category.name}".`);
      if (editingCategoryId === category.id) cancelEdit();
    } catch (error) {
      toast.error(getSupabaseRequestErrorMessage(error));
    }
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
      aria-labelledby="add-category-heading"
    >
      <h2
        id="add-category-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        New category
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Add at least one expense category before recording expenses.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-3 grid gap-3 sm:grid-cols-[minmax(260px,360px)_auto_auto] sm:items-start sm:justify-start"
      >
        <div className="min-w-0">
          <label htmlFor="cat-name" className="sr-only">
            Category name
          </label>
          <input
            id="cat-name"
            placeholder="e.g. Household Groceries"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("name")}
          />
          <p
            className={`mt-1 min-h-4 text-xs ${
              errors.name ? "text-red-600" : "invisible"
            }`}
            role={errors.name ? "alert" : undefined}
            aria-live="polite"
          >
            {errors.name?.message ?? "Name is required"}
          </p>
        </div>
        <div>
          <label htmlFor="cat-type" className="sr-only">
            Type
          </label>
          <select
            id="cat-type"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-auto"
            {...register("type")}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || insertCategory.isPending}
          className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {insertCategory.isPending ? "Adding…" : "Add category"}
        </button>
      </form>
      <div className="mt-4 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Existing categories
        </h3>
        {categories.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No categories yet.
          </p>
        ) : (
          <div className="space-y-4">
            {(["expense", "income"] as const).map((type) => (
              <div key={type}>
                <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {type === "expense" ? "Expense" : "Income"}
                </p>
                {groupedCategories[type].length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    No {type} categories.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {groupedCategories[type].map((category) => {
                      const isEditing = editingCategoryId === category.id;
                      const disableActions =
                        updateCategory.isPending || deleteCategory.isPending;

                      return (
                        <li
                          key={category.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {isEditing ? (
                            <>
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="min-w-[180px] flex-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                              />
                              <button
                                type="button"
                                disabled={disableActions}
                                onClick={() => void submitEdit(category)}
                                className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={disableActions}
                                onClick={cancelEdit}
                                className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-100">
                                {category.name}
                              </span>
                              <button
                                type="button"
                                disabled={disableActions}
                                onClick={() => startEdit(category.id, category.name)}
                                className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={disableActions}
                                onClick={() => void removeCategory(category)}
                                className="cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
