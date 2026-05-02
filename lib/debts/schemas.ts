import { z } from "zod";

export const debtFormSchema = z.object({
  counterparty: z
    .string()
    .min(1, "Who is required")
    .max(200)
    .transform((s) => s.trim()),
  type: z.enum(["give", "take"]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .transform((s) => s.replace(",", ".").trim())
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0")
    .transform((s) => Number.parseFloat(s)),
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim()),
});

export type DebtFormInput = z.input<typeof debtFormSchema>;
export type DebtFormValues = z.output<typeof debtFormSchema>;
