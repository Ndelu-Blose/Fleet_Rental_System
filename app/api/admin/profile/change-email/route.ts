import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { changeEmailSchema } from "@/lib/validations/admin"
import { sendEmailChangeVerificationEmail } from "@/lib/mail"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()

    // Validate input
    const validationResult = changeEmailSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { currentPassword, newEmail } = validationResult.data

    // Verify current password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, password: true },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    // Check if email is different
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "New email must be different from current email" },
        { status: 400 }
      )
    }

    // Check if new email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email address is already in use" }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store pending email change
    await prisma.user.update({
      where: { id: user.id },
      data: {
        activationToken: verificationToken,
        activationExpires: verificationExpires,
        emailChangePending: newEmail.toLowerCase(),
      },
    })

    // Send verification email to new address
    try {
      await sendEmailChangeVerificationEmail(
        newEmail,
        user.name || "Admin",
        verificationToken
      )
    } catch (emailError) {
      console.error("[Admin] Failed to send email verification:", emailError)
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent to new address. Please check your email.",
    })
  } catch (error) {
    console.error("[Admin] Change email error:", error)
    return NextResponse.json({ error: "Failed to initiate email change" }, { status: 500 })
  }
}

