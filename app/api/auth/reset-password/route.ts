import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/mail"
import { withRateLimit } from "@/lib/rate-limit"
import crypto from "crypto"
import { z } from "zod"

const requestResetSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
})

export async function POST(req: NextRequest) {
  // Apply rate limiting (3 requests per hour)
  const rateLimitResponse = await withRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 })(req)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await req.json()

    // Validate input
    const validationResult = requestResetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    })

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, user.name || "User", resetToken)
    } catch (emailError) {
      console.error("[v0] Failed to send password reset email:", emailError)
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    })
  } catch (error) {
    console.error("[v0] Request password reset error:", error)
    return NextResponse.json({ error: "Failed to process password reset request" }, { status: 500 })
  }
}

