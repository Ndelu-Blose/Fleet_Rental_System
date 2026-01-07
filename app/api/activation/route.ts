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
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { email, name, phone } = validationResult.data

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString("hex")
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create user and driver profile
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
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
    try {
      await sendActivationEmail(email, name || "Driver", activationToken)
    } catch (emailError) {
      logger.error("Failed to send activation email", emailError, {
        ...getRequestContext(req),
        email,
        userId: user.id,
      })
      // Continue even if email fails - activation link is still returned
    }
    
    // Use emailConfig.baseUrl which supports both AUTH_URL and NEXTAUTH_URL
    const activationLink = `${emailConfig.baseUrl}/activate/${activationToken}`
    logger.info("Driver activation created", {
      ...getRequestContext(req),
      email,
      userId: user.id,
      activationLink,
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
      activationLink,
    })
  } catch (error) {
    logger.error("Failed to create driver", error, getRequestContext(req))
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 })
  }
}
