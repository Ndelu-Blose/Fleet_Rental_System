import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { activateAccountSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // ✅ Log activation attempt
    console.log("[Activation] Activation attempt received", {
      hasToken: !!body.token,
      tokenLength: body.token?.length || 0,
      hasPassword: !!body.password,
      passwordLength: body.password?.length || 0,
    })
    
    // Validate input
    const validationResult = activateAccountSchema.safeParse(body)
    if (!validationResult.success) {
      console.error("[Activation] ❌ Validation failed:", validationResult.error.errors)
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // Find user by token
    console.log("[Activation] Looking up user by token...")
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
      select: {
        id: true,
        email: true,
        activationToken: true,
        activationExpires: true,
        isActive: true,
        isEmailVerified: true,
        role: true,
      },
    })

    if (!user) {
      console.error("[Activation] ❌ User not found for token")
      return NextResponse.json({ error: "Invalid activation token" }, { status: 400 })
    }

    console.log("[Activation] ✅ User found:", {
      userId: user.id,
      email: user.email,
      role: user.role,
      hasExpiration: !!user.activationExpires,
      expirationDate: user.activationExpires,
      isExpired: user.activationExpires ? user.activationExpires < new Date() : false,
    })

    // Check if token expired
    if (user.activationExpires && user.activationExpires < new Date()) {
      console.error("[Activation] ❌ Token expired:", {
        userId: user.id,
        email: user.email,
        expirationDate: user.activationExpires,
        now: new Date(),
      })
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

    // Update profile completion (non-critical - don't fail activation if this fails)
    try {
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
        console.log("[Activation] Profile completion updated", {
          userId: user.id,
          completionPercent: percent,
        })
      }
    } catch (profileError) {
      // Log but don't fail activation if profile update fails
      console.warn("[Activation] ⚠️ Profile completion update failed (non-critical):", {
        userId: user.id,
        error: profileError instanceof Error ? profileError.message : String(profileError),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // ✅ Enhanced error logging to identify the exact failure point
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error("[Activation] ❌ Activation confirm error:", {
      error: errorMessage,
      stack: errorStack,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    })
    
    // Return more specific error message for debugging
    return NextResponse.json(
      { 
        error: "Failed to activate account",
        message: process.env.NODE_ENV === 'development' ? errorMessage : "Please try again or contact support",
      }, 
      { status: 500 }
    )
  }
}
