import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { sendActivationEmail } from "@/lib/mail"
import { createDriverSchema } from "@/lib/validations/user"
import { logger, getRequestContext } from "@/lib/logger"
import { emailConfig } from "@/lib/email/config"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  let normalizedEmail: string | null = null
  
  try {
    await requireAdmin()

    const body = await req.json()
    
    // Validate input
    const validationResult = createDriverSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      return NextResponse.json(
        { 
          error: "Validation failed", 
          message: errorMessages,
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { email, name, phone } = validationResult.data

    // Normalize email (lowercase, trim) - store for potential cleanup
    normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      // Check if user is unverified (has activation token) - might be an orphaned record
      const isUnverified = existing.activationToken && !existing.isEmailVerified
      return NextResponse.json(
        { 
          error: "User already exists", 
          message: `A driver with email ${normalizedEmail} already exists. ${isUnverified ? "This appears to be an unverified account. You can delete it and try again, or use 'Resend Activation Email' if needed." : "Use 'Resend Activation Email' if needed."}`,
          userId: existing.id,
          isUnverified,
        }, 
        { status: 400 }
      )
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString("hex")
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create user and driver profile using a transaction
    // This ensures atomicity - if anything fails, everything rolls back
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          phone: phone?.trim() || null,
          role: "DRIVER",
          activationToken,
          activationExpires,
          isEmailVerified: false,
          driverProfile: {
            create: {},
          },
        },
        include: {
          driverProfile: true,
        },
      })
      return newUser
    })

    // Send activation email via Resend (outside transaction - email is not critical)
    let emailSent = false
    let emailError: Error | null = null
    try {
      await sendActivationEmail(normalizedEmail, name || "Driver", activationToken)
      emailSent = true
      logger.info("Activation email sent successfully", {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
      })
    } catch (err) {
      emailError = err instanceof Error ? err : new Error(String(err))
      logger.error("Failed to send activation email", emailError, {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
        error: String(err),
        stack: emailError.stack,
      })
      // Continue even if email fails - activation link is still returned
      // But log the error so we can debug email delivery issues
    }
    
    // Use emailConfig.baseUrl which supports both AUTH_URL and NEXTAUTH_URL
    const activationLink = `${emailConfig.baseUrl}/activate/${activationToken}`
    logger.info("Driver activation created", {
      ...getRequestContext(req),
      email: normalizedEmail,
      userId: user.id,
      activationLink,
      emailSent,
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
      activationLink,
      emailSent,
      message: emailSent 
        ? "Driver created and activation email sent successfully" 
        : `Driver created but activation email failed to send: ${emailError?.message || "Unknown error"}. Use 'Resend Activation Email' to send it manually.`,
      ...(emailError && process.env.NODE_ENV === "development" && { emailError: emailError.message }),
    })
  } catch (error: any) {
    // Re-throw Next.js redirect errors (they're special and should propagate)
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    
    logger.error("Failed to create driver", error, {
      ...getRequestContext(req),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // Handle specific Prisma errors
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "User already exists", message: "A driver with this email already exists." },
        { status: 400 }
      )
    }
    
    // If user was partially created (shouldn't happen with transaction, but just in case)
    // Try to clean up any orphaned records
    if (normalizedEmail) {
      try {
        const orphanedUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { driverProfile: true },
        })
        // Only delete if user was just created (has activation token but not verified)
        if (orphanedUser && orphanedUser.activationToken && !orphanedUser.isEmailVerified) {
          await prisma.user.delete({
            where: { id: orphanedUser.id },
          })
          logger.info("Cleaned up orphaned user record", {
            ...getRequestContext(req),
            email: normalizedEmail,
            userId: orphanedUser.id,
          })
        }
      } catch (cleanupError) {
        // Ignore cleanup errors - logging is enough
        logger.error("Failed to cleanup orphaned user", cleanupError, getRequestContext(req))
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create driver", 
        message: error?.message || "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      }, 
      { status: 500 }
    )
  }
}
