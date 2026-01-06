import { z } from "zod"

export const createContractSchema = z.object({
  driverProfileId: z.string().min(1, "Driver profile ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  feeAmountCents: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? Number.parseInt(val, 10) : val))
    .refine((val) => !Number.isNaN(val) && val > 0, "Fee amount must be a positive number"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"], {
    errorMap: () => ({ message: "Frequency must be DAILY, WEEKLY, or MONTHLY" }),
  }),
  dueWeekday: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || (val >= 0 && val <= 6), "Due weekday must be 0-6 (Sunday-Saturday)"),
  dueDayOfMonth: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || (val >= 1 && val <= 28), "Due day of month must be 1-28"),
  startDate: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .refine((val) => !Number.isNaN(val.getTime()), "Start date must be a valid date"),
})

export const updateContractSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
  endDate: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "End date must be a valid date"),
})

