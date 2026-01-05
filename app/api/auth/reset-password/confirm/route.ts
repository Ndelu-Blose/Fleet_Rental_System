import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const confirmResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const validationResult = confirmResetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    // Check if token expired
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    })

    return NextResponse.json({ success: true, message: "Password has been reset successfully" })
  } catch (error) {
    console.error("[v0] Confirm password reset error:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}

