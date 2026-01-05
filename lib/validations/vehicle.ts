import { z } from "zod"

export const createVehicleSchema = z.object({
  type: z.enum(["CAR", "BIKE"], {
    errorMap: () => ({ message: "Vehicle type must be CAR or BIKE" }),
  }),
  reg: z.string().min(1, "Registration number is required").max(20, "Registration number is too long"),
  make: z.string().min(1, "Make is required").max(50, "Make is too long"),
  model: z.string().min(1, "Model is required").max(50, "Model is too long"),
  year: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || (val >= 1900 && val <= new Date().getFullYear() + 1), {
      message: "Year must be between 1900 and next year",
    }),
  notes: z.string().max(1000, "Notes are too long").optional().nullable(),
  licenseExpiry: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "License expiry must be a valid date"),
  insuranceExpiry: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Insurance expiry must be a valid date"),
  roadworthyExpiry: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Roadworthy expiry must be a valid date"),
})

export const updateVehicleSchema = z.object({
  type: z.enum(["CAR", "BIKE"]).optional(),
  reg: z.string().min(1).max(20).optional(),
  make: z.string().min(1).max(50).optional(),
  model: z.string().min(1).max(50).optional(),
  year: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      const num = typeof val === "string" ? Number.parseInt(val, 10) : val
      return Number.isNaN(num) ? null : num
    })
    .refine((val) => val === null || (val >= 1900 && val <= new Date().getFullYear() + 1), {
      message: "Year must be between 1900 and next year",
    }),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"]).optional(),
  notes: z.string().max(1000).optional().nullable(),
  licenseExpiry: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "License expiry must be a valid date"),
  insuranceExpiry: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Insurance expiry must be a valid date"),
  roadworthyExpiry: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null
      return typeof val === "string" ? new Date(val) : val
    })
    .refine((val) => val === null || !Number.isNaN(val.getTime()), "Roadworthy expiry must be a valid date"),
})

