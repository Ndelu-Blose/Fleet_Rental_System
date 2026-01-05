import { z } from "zod"

export const createMaintenanceSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  scheduledAt: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Scheduled date must be a valid date"),
  odometerKm: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || val >= 0, "Odometer reading must be a positive number"),
  estimatedCostCents: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || val >= 0, "Estimated cost must be a positive number"),
})

export const updateMaintenanceSchema = z.object({
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  scheduledAt: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Scheduled date must be a valid date"),
  completedAt: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Completed date must be a valid date"),
  odometerKm: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || val >= 0, "Odometer reading must be a positive number"),
  estimatedCostCents: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || val >= 0, "Estimated cost must be a positive number"),
  actualCostCents: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || val >= 0, "Actual cost must be a positive number"),
})

