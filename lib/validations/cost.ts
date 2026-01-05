import { z } from "zod"

export const createCostSchema = z.object({
  type: z.enum(["LICENSE", "SERVICE", "REPAIR", "TYRES", "INSURANCE", "FUEL", "FINES", "OTHER"], {
    errorMap: () => ({ message: "Invalid cost type" }),
  }),
  title: z.string().max(200, "Title is too long").optional().nullable(),
  amountCents: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? Number.parseInt(val, 10) : val))
    .refine((val) => !Number.isNaN(val) && val > 0, "Amount must be a positive number"),
  occurredAt: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return new Date()
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => !Number.isNaN(val.getTime()), "Occurred date must be a valid date"),
  vendor: z.string().max(100, "Vendor name is too long").optional().nullable(),
  notes: z.string().max(1000, "Notes are too long").optional().nullable(),
  receiptUrl: z.string().url("Receipt URL must be a valid URL").optional().nullable(),
})

