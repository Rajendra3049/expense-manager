import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");

const moneyString = z
  .string()
  .min(1, "Amount is required")
  .transform((s) => s.replace(",", ".").trim())
  .refine((s) => {
    const n = Number.parseFloat(s);
    return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
  }, "Enter an amount greater than 0")
  .transform((s) => Number.parseFloat(s));

export const recurringExpenseFormSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(200)
    .transform((s) => s.trim()),
  amount: moneyString,
  categoryId: z.string().uuid("Select a category"),
  accountId: z
    .string()
    .min(1, "Select an account")
    .uuid("Select an account"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextDate: dateString,
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim()),
});

export type RecurringExpenseFormInput = z.input<
  typeof recurringExpenseFormSchema
>;
export type RecurringExpenseFormValues = z.output<
  typeof recurringExpenseFormSchema
>;
