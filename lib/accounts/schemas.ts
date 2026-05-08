import { z } from "zod";

export const accountFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120),
  type: z.enum(["cash", "bank", "wallet"]),
  balance: z
    .string()
    .optional()
    .default("0")
    .transform((s) => (s ?? "").replace(",", ".").trim() || "0")
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n);
    }, "Enter a valid balance")
    .transform((s) => Number.parseFloat(s)),
});

export const accountRenameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export const accountAdjustmentSchema = z.object({
  accountId: z.string().uuid("Select an account"),
  direction: z.enum(["credit", "debit"]),
  amount: z
    .string()
    .optional()
    .default("0")
    .transform((s) => (s ?? "").replace(",", ".").trim() || "0")
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0")
    .transform((s) => Number.parseFloat(s)),
  note: z.string().trim().max(200).optional().default(""),
});

export const recurringAccountAdjustmentSchema = z.object({
  accountId: z.string().uuid("Select an account"),
  direction: z.enum(["credit", "debit"]),
  amount: z
    .string()
    .optional()
    .default("0")
    .transform((s) => (s ?? "").replace(",", ".").trim() || "0")
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0")
    .transform((s) => Number.parseFloat(s)),
  dayOfMonth: z
    .string()
    .optional()
    .default("1")
    .transform((s) => Number.parseInt((s ?? "1").trim(), 10))
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 28, {
      message: "Day must be between 1 and 28",
    }),
  note: z.string().trim().max(200).optional().default(""),
});

export type AccountFormInput = z.input<typeof accountFormSchema>;
export type AccountFormValues = z.output<typeof accountFormSchema>;
export type AccountRenameInput = z.input<typeof accountRenameSchema>;
export type AccountRenameValues = z.output<typeof accountRenameSchema>;
export type AccountAdjustmentInput = z.input<typeof accountAdjustmentSchema>;
export type AccountAdjustmentValues = z.output<typeof accountAdjustmentSchema>;
export type RecurringAccountAdjustmentInput = z.input<
  typeof recurringAccountAdjustmentSchema
>;
export type RecurringAccountAdjustmentValues = z.output<
  typeof recurringAccountAdjustmentSchema
>;
