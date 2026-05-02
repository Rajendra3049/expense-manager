import { z } from "zod";

export const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120)
    .transform((s) => s.trim()),
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

export type AccountFormInput = z.input<typeof accountFormSchema>;
export type AccountFormValues = z.output<typeof accountFormSchema>;
