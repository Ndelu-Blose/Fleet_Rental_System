import { z } from "zod"

export const createDriverSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  name: z.string().max(100, "Name is too long").optional().nullable(),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
})

export const activateAccountSchema = z.object({
  token: z.string().min(1, "Activation token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
})

export const updateProfileSchema = z.object({
  name: z.string().max(100, "Name is too long").optional().nullable(),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
  idNumber: z.string().max(20, "ID number is too long").optional().nullable(),
  addressLine1: z.string().max(200, "Address line 1 is too long").optional().nullable(),
  addressLine2: z.string().max(200, "Address line 2 is too long").optional().nullable(),
  city: z.string().max(100, "City is too long").optional().nullable(),
  province: z.string().max(100, "Province is too long").optional().nullable(),
  postalCode: z.string().max(10, "Postal code is too long").optional().nullable(),
})

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  longitude: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  accuracy: z.number().positive().optional().nullable(),
})

