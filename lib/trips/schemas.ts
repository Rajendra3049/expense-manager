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
