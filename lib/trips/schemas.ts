import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");

export const tripFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(200)
      .transform((s) => s.trim()),
    startDate: dateString,
    endDate: z.union([z.literal(""), dateString]).optional().default(""),
    note: z
      .string()
      .max(2000)
      .optional()
      .default("")
      .transform((s) => (s ?? "").trim()),
    budget: z
      .string()
      .min(1, "Opening budget is required")
      .transform((s) => s.replace(",", ".").trim())
      .refine((s) => {
        const n = Number.parseFloat(s);
        return !Number.isNaN(n) && Number.isFinite(n) && n >= 0;
      }, "Enter budget 0 or more")
      .transform((s) => Number.parseFloat(s)),
  })
  .refine(
    (d) => {
      if (!d.endDate || d.endDate.length === 0) return true;
      return d.endDate >= d.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  );

export type TripFormInput = z.input<typeof tripFormSchema>;
export type TripFormValues = z.output<typeof tripFormSchema>;

export const tripRenameSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200)
    .transform((s) => s.trim()),
});

export const tripBudgetAdjustmentSchema = z.object({
  tripId: z.string().uuid("Select a trip"),
  direction: z.enum(["credit", "debit"]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .transform((s) => s.replace(",", ".").trim())
    .refine((s) => {
      const n = Number.parseFloat(s);
      return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0")
    .transform((s) => Number.parseFloat(s)),
  effectiveDate: dateString,
  note: z
    .string()
    .max(2000)
    .optional()
    .default("")
    .transform((s) => (s ?? "").trim()),
});

export type TripRenameInput = z.input<typeof tripRenameSchema>;
export type TripRenameValues = z.output<typeof tripRenameSchema>;
export type TripBudgetAdjustmentInput = z.input<typeof tripBudgetAdjustmentSchema>;
export type TripBudgetAdjustmentValues = z.output<typeof tripBudgetAdjustmentSchema>;
