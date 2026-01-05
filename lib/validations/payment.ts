import { z } from "zod"

export const createCheckoutSessionSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
})

export const reviewDocumentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], {
    errorMap: () => ({ message: "Status must be APPROVED or REJECTED" }),
  }),
  reviewNote: z.string().max(500, "Review note is too long").optional().nullable(),
})

export const finalizeVerificationSchema = z.object({
  driverProfileId: z.string().min(1, "Driver profile ID is required"),
  status: z.enum(["VERIFIED", "REJECTED"], {
    errorMap: () => ({ message: "Status must be VERIFIED or REJECTED" }),
  }),
  verificationNote: z.string().max(500, "Verification note is too long").optional().nullable(),
})

