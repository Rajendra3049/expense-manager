import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");

const moneyString = z
  .string()
  .min(1, "Required")
  .transform((s) => s.replace(",", ".").trim())
  .refine((s) => {
    const n = Number.parseFloat(s);
    return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
  }, "Enter a value greater than 0")
  .transform((s) => Number.parseFloat(s));

export const emiFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(200)
      .transform((s) => s.trim()),
    totalAmount: moneyString,
    monthlyAmount: moneyString,
    dueDate: dateString,
    note: z
      .string()
      .max(2000)
      .optional()
      .default("")
      .transform((s) => (s ?? "").trim()),
  })
  .refine((d) => d.monthlyAmount <= d.totalAmount, {
    message: "Monthly EMI cannot exceed total amount",
    path: ["monthlyAmount"],
  });

export type EmiFormInput = z.input<typeof emiFormSchema>;
export type EmiFormValues = z.output<typeof emiFormSchema>;
