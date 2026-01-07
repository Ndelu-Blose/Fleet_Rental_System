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

    // Send activation email (non-blocking - token is already updated)
    let emailSent = false
    let emailError: string | null = null
    
    try {
      await sendActivationEmail(user.email, user.name || "Driver", activationToken)
      emailSent = true
      console.log("[Resend Activation] Email sent successfully")
    } catch (emailErr: any) {
      const errorMessage = 
        emailErr?.message ||
        emailErr?.response?.data?.message ||
        emailErr?.error?.message ||
        String(emailErr)
      
      emailError = errorMessage
      console.error("[Resend Activation] Email failed (non-blocking):", errorMessage, emailErr)
      // Continue - don't block the flow, token is already updated
    }

    // ✅ Never return 500 just because email failed
    // Token is updated, user can still activate via link
    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent
        ? "Activation email sent successfully"
        : "Activation email could not be sent, but activation link is still valid. You can copy it from the driver menu.",
      ...(emailError && { emailError }),
    })
  } catch (error) {
    console.error("[Resend Activation] Error:", error)
    return NextResponse.json({ error: "Failed to resend activation email" }, { status: 500 })
  }
}

