import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { activateAccountSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validationResult = activateAccountSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // Find user by token
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid activation token" }, { status: 400 })
    }

    // Check if token expired
    if (user.activationExpires && user.activationExpires < new Date()) {
      return NextResponse.json({ error: "Activation token expired" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // ✅ IMPORTANT: Complete activation in one atomic update
    // Must set ALL flags so login works immediately
    // ✅ Using "password" field (matches DB column name, NOT "passwordHash")
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword, // ✅ Matches DB column: "password"
        isEmailVerified: true,
        isActive: true, // ✅ CRITICAL: Must be active to login
        activationToken: null,
        activationExpires: null,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        isEmailVerified: true,
        role: true,
      },
    })

    // ✅ Verify activation was successful
    if (!updatedUser.isActive) {
      console.error("[Activation] ❌ CRITICAL: User isActive not set to true after update!", {
        userId: updatedUser.id,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      })
      // Try to fix it
      await prisma.user.update({
        where: { id: updatedUser.id },
        data: { isActive: true },
      })
    }

    // Log successful activation for debugging
    console.log("[Activation] ✅ Account activated successfully", {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      hasPassword: true,
      isActive: updatedUser.isActive,
      isEmailVerified: updatedUser.isEmailVerified,
    })

    // Update profile completion
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: user.id },
      include: {
        documents: true,
        user: {
          select: {
            isEmailVerified: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (profile) {
      const { calculateProfileCompletion } = await import("@/lib/verification")
      const percent = calculateProfileCompletion(profile)
      await prisma.driverProfile.update({
        where: { id: profile.id },
        data: { completionPercent: percent },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Activation confirm error:", error)
    return NextResponse.json({ error: "Failed to activate account" }, { status: 500 })
  }
}
