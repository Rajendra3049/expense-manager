"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useInsertCategoryMutation } from "@/features/expenses/use-expense-data";
import {
  type CategoryFormValues,
  categoryFormSchema,
} from "@/lib/expenses/schemas";

export function AddCategoryForm() {
  const insertCategory = useInsertCategoryMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", type: "expense" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await insertCategory.mutateAsync({
      name: values.name,
      type: values.type,
    });
    reset({ name: "", type: values.type });
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
        className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="cat-name" className="sr-only">
            Category name
          </label>
          <input
            id="cat-name"
            placeholder="e.g. Groceries"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("name")}
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.name.message}
            </p>
          ) : null}
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
      {insertCategory.isError ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {insertCategory.error instanceof Error
            ? insertCategory.error.message
            : "Could not add category."}
        </p>
      ) : null}
    </section>
  );
}
