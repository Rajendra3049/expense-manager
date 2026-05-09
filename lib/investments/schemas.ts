import { z } from "zod";

const moneyString = z
  .string()
  .min(1, "Amount is required")
  .transform((s) => s.replace(",", ".").trim())
  .refine((s) => {
    const n = Number.parseFloat(s);
    return !Number.isNaN(n) && Number.isFinite(n) && n >= 0;
  }, "Enter a valid amount (0 or more)")
  .transform((s) => Number.parseFloat(s));

export const investmentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200)
    .transform((s) => s.trim()),
  type: z.enum(["stock", "mutual_fund", "fd", "crypto", "other"]),
  currentValue: moneyString,
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim()),
});

export type InvestmentFormInput = z.input<typeof investmentFormSchema>;
export type InvestmentFormValues = z.output<typeof investmentFormSchema>;
