import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { sendActivationEmail } from "@/lib/mail"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "DRIVER") {
      return NextResponse.json({ error: "User is not a driver" }, { status: 400 })
    }

    // Generate new activation token
    const activationToken = crypto.randomBytes(32).toString("hex")
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Update user with new token
    await prisma.user.update({
      where: { id: userId },
      data: {
        activationToken,
        activationExpires,
        isEmailVerified: false,
      },
    })

    // Send activation email
    try {
      await sendActivationEmail(user.email, user.name || "Driver", activationToken)
    } catch (emailError: any) {
      const errorMessage = 
        emailError?.message ||
        emailError?.response?.data?.message ||
        emailError?.error?.message ||
        String(emailError)
      
      console.error("[Resend Activation] Failed to send email:", errorMessage, emailError)
      return NextResponse.json(
        { 
          error: "Failed to send activation email", 
          details: errorMessage,
          // Include full error for debugging
          errorRaw: process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            name: emailError?.name,
            stack: emailError?.stack,
          } : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Activation email sent successfully",
    })
  } catch (error) {
    console.error("[Resend Activation] Error:", error)
    return NextResponse.json({ error: "Failed to resend activation email" }, { status: 500 })
  }
}

