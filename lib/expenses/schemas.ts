import { z } from "zod";

const MAX_EXPENSE_AMOUNT = 99_999_999.99;
const MAX_TAGS = 40;
const MAX_TAG_LENGTH = 48;

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
    }, "Enter an amount greater than 0")
    .refine((s) => {
      const n = Number.parseFloat(s);
      return n <= MAX_EXPENSE_AMOUNT;
    }, "Enter a smaller amount (maximum 99,999,999.99)."),
  categoryId: z.string().uuid("Select a category"),
  accountId: z.union([z.literal(""), z.string().uuid()]).default(""),
  tripId: z.union([z.literal(""), z.string().uuid()]).default(""),
  date: dateString,
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => s.trim()),
  tags: z
    .string()
    .optional()
    .default("")
    .transform((s) =>
      (s ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, MAX_TAGS),
    )
    .refine(
      (tags) => tags.every((t) => t.length <= MAX_TAG_LENGTH),
      `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.`,
    ),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/** Parse validated expense amount string to a number. */
export function parseExpenseAmount(amount: string): number {
  return Number.parseFloat(amount.replace(",", ".").trim());
}

export const categoryFormSchema = z.object({
  name: z
    .string()
    .max(120)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, "Name is required"),
  type: z.enum(["expense", "income"]),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
