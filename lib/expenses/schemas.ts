import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");

export const expenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .transform((s) => s.replace(",", ".").trim())
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0"),
  categoryId: z.string().uuid("Select a category"),
  accountId: z.union([z.literal(""), z.string().uuid()]).default(""),
  tripId: z.union([z.literal(""), z.string().uuid()]).default(""),
  date: dateString,
  note: z.string().max(2000).optional().default(""),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/** Parse validated expense amount string to a number. */
export function parseExpenseAmount(amount: string): number {
  return Number.parseFloat(amount.replace(",", ".").trim());
}

export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120)
    .transform((s) => s.trim()),
  type: z.enum(["expense", "income"]),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
