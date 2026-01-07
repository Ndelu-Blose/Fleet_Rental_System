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
    
    let body;
    try {
      body = await req.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

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

    // Verify password (match login behavior exactly - no trimming first)
    let isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    // If password doesn't match, try trimmed version (handles whitespace issues)
    if (!isPasswordValid) {
      const trimmedPassword = currentPassword.trim()
      if (trimmedPassword !== currentPassword) {
        isPasswordValid = await bcrypt.compare(trimmedPassword, user.password)
        if (isPasswordValid) {
          console.warn("[Change Email] Password matched after trimming - whitespace issue detected")
        }
      }
    }
    
    if (!isPasswordValid) {
      console.error("[Change Email] Password validation failed", {
        userId: user.id,
        userEmail: user.email,
        passwordLength: currentPassword.length,
        hasPassword: !!user.password,
      })
      return NextResponse.json({ 
        error: "Current password is incorrect",
        message: "The password you entered does not match your current password. If you recently changed your password, please use the new password."
      }, { status: 401 })
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
      // Rollback the token/expiry if email fails
      await prisma.user.update({
        where: { id: user.id },
        data: {
          activationToken: null,
          activationExpires: null,
          emailChangePending: null,
        },
      })
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
      const errorDetails = (emailError as any)?.details || {}
      
      return NextResponse.json(
        { 
          error: "Failed to send verification email. Please try again.",
          message: errorMessage,
          errorType: errorDetails.type || (emailError instanceof Error ? emailError.name : 'UnknownError'),
          details: errorDetails,
          // Include original error message for debugging
          originalError: emailError instanceof Error ? emailError.message : String(emailError),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent to new address. Please check your email.",
    })
  } catch (error) {
    console.error("[Admin] Change email error:", error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for Prisma errors
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 400 }
        )
      }
      if (error.message.includes("Record to update not found")) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to initiate email change. Please try again." },
      { status: 500 }
    )
  }
}

