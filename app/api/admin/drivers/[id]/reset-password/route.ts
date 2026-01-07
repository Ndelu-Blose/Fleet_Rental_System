import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import bcrypt from "bcryptjs"

/**
 * Admin endpoint to reset a driver's password
 * This allows admins to set a temporary password for drivers who can't login
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await req.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Find driver by driverId or userId
    let userId: string | null = null

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (driverProfile) {
      userId = driverProfile.userId
    } else {
      // Try finding by userId
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      })
      if (user && user.role === "DRIVER") {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password and ensure user is active
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isActive: true,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        isEmailVerified: true,
      },
    })

    console.log("[Admin] Driver password reset", {
      userId: updated.id,
      email: updated.email,
    })

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Driver can now log in.",
      user: {
        email: updated.email,
        isActive: updated.isActive,
        isEmailVerified: updated.isEmailVerified,
      },
    })
  } catch (error) {
    console.error("[Admin] Reset password error:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}

