"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useCategoriesQuery,
  useInsertCategoryMutation,
} from "@/features/expenses/use-expense-data";
import {
  normalizeCategoryName,
  toCategoryDisplayName,
} from "@/lib/expenses/category-name";
import {
  type CategoryFormValues,
  categoryFormSchema,
} from "@/lib/expenses/schemas";

export function AddCategoryForm() {
  const insertCategory = useInsertCategoryMutation();
  const { data: categories = [] } = useCategoriesQuery();
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
      toast.error(`"${displayName}" already exists.`);
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
            placeholder="e.g. Groceries"
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
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {insertCategory.isPending ? "Adding…" : "Add category"}
        </button>
      </form>
    </section>
  );
}
