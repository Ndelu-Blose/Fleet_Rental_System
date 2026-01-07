import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { sendActivationEmail } from "@/lib/mail"
import { createDriverSchema } from "@/lib/validations/user"
import { logger, getRequestContext } from "@/lib/logger"
import { emailConfig } from "@/lib/email/config"
import crypto from "crypto"

export async function POST(req: NextRequest) {
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

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { 
          error: "User already exists", 
          message: `A driver with email ${normalizedEmail} already exists. Use "Resend Activation Email" if needed.`
        }, 
        { status: 400 }
      )
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString("hex")
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create user and driver profile
    const user = await prisma.user.create({
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

    // Send activation email via Resend
    let emailSent = false
    try {
      await sendActivationEmail(normalizedEmail, name || "Driver", activationToken)
      emailSent = true
      logger.info("Activation email sent successfully", {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
      })
    } catch (emailError) {
      logger.error("Failed to send activation email", emailError, {
        ...getRequestContext(req),
        email: normalizedEmail,
        userId: user.id,
        error: String(emailError),
      })
      // Continue even if email fails - activation link is still returned
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
        : "Driver created but activation email failed to send. Use 'Resend Activation Email' to send it manually.",
    })
  } catch (error: any) {
    logger.error("Failed to create driver", error, getRequestContext(req))
    
    // Handle specific Prisma errors
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "User already exists", message: "A driver with this email already exists." },
        { status: 400 }
      )
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
