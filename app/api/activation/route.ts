import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { sendActivationEmail } from "@/lib/mail"
import { createDriverSchema } from "@/lib/validations/user"
import { logger, getRequestContext } from "@/lib/logger"
import { emailConfig } from "@/lib/email/config"
import { getFriendlyEmailError } from "@/lib/email/errorMessages"
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
    let emailErrorDetails: any = null
    
    try {
      const emailResult = await sendActivationEmail(normalizedEmail, name || "Driver", activationToken)
      emailSent = true
      logger.info("Activation email sent successfully", {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
        resendId: (emailResult as any)?.id || null,
      })
    } catch (err) {
      emailError = err instanceof Error ? err : new Error(String(err))
      emailErrorDetails = (err as any)?.details || null
      
      logger.error("Failed to send activation email", emailError, {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
        error: String(err),
        errorDetails: emailErrorDetails,
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

    // Convert technical error to friendly message for admin UI
    const friendlyError = emailError 
      ? getFriendlyEmailError(emailError.message)
      : null

    // Log technical error details (for debugging)
    if (emailError) {
      logger.error("Activation email failed (technical details)", emailError, {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
        technicalError: emailError.message,
        errorDetails: emailErrorDetails,
      })
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      activationLink,
      emailSent,
      // Send friendly message to admin UI (not technical details)
      emailError: friendlyError?.friendlyMessage || null,
      // Keep technical error in details for support/debugging
      // Include full error details for debugging
      emailErrorTechnical: emailError 
        ? (emailError.message || 
           (emailError as any)?.response?.data?.message || 
           JSON.stringify(emailError, null, 2))
        : null,
      emailErrorDetails: emailErrorDetails || null,
      // Include raw error object for debugging (in dev mode)
      emailErrorRaw: process.env.NODE_ENV === 'development' && emailError 
        ? {
            message: emailError.message,
            name: emailError.name,
            stack: emailError.stack,
            details: emailErrorDetails,
          }
        : null,
      message: emailSent 
        ? "Driver created and activation email sent successfully" 
        : "Driver created successfully. Use the activation link below to share with the driver.",
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
    
    const errorMessage = error?.message || "An unexpected error occurred"
    const errorDetails = (error as any)?.details || {}
    
    return NextResponse.json(
      { 
        error: "Failed to create driver", 
        message: errorMessage,
        errorType: errorDetails.type || (error instanceof Error ? error.name : 'UnknownError'),
        details: errorDetails,
        originalError: error instanceof Error ? error.message : String(error),
      }, 
      { status: 500 }
    )
  }
}
