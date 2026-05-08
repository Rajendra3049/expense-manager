import { z } from "zod";

export const debtAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200)
    .transform((s) => s.trim()),
  type: z.enum(["given", "taken"]),
  openingAmount: z
    .string()
    .min(1, "Opening amount is required")
    .transform((s) => s.replace(",", ".").trim())
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0")
    .transform((s) => Number.parseFloat(s)),
  dueDate: z
    .string()
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim())
    .refine(
      (s) => {
        if (!s) return true;
        return !Number.isNaN(new Date(s).getTime());
      },
      "Enter a valid due date",
    ),
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim()),
});

export const debtEntrySchema = z.object({
  debtAccountId: z.string().uuid("Select a debt account"),
  entryType: z.enum(["borrow", "payment"]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .transform((s) => s.replace(",", ".").trim())
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0")
    .transform((s) => Number.parseFloat(s)),
  happenedOn: z
    .string()
    .min(1, "Date is required")
    .refine((s) => !Number.isNaN(new Date(s).getTime()), "Enter a valid date"),
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim()),
});

export type DebtAccountInput = z.input<typeof debtAccountSchema>;
export type DebtAccountValues = z.output<typeof debtAccountSchema>;
export type DebtEntryInput = z.input<typeof debtEntrySchema>;
export type DebtEntryValues = z.output<typeof debtEntrySchema>;
