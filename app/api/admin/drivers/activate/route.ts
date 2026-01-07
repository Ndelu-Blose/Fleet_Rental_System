import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

/**
 * Activate an existing driver (set isActive = true)
 * Useful for fixing drivers who were activated before the isActive fix was deployed
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { userId, driverId } = body

    if (!userId && !driverId) {
      return NextResponse.json(
        { error: "Either userId or driverId is required" },
        { status: 400 }
      )
    }

    // Find the user
    let user
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          password: true,
        },
      })
    } else if (driverId) {
      const driverProfile = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              isEmailVerified: true,
              password: true,
            },
          },
        },
      })
      user = driverProfile?.user
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "DRIVER") {
      return NextResponse.json(
        { error: "This endpoint is only for drivers" },
        { status: 400 }
      )
    }

    // Check if user has a password (has been activated)
    if (!user.password) {
      return NextResponse.json(
        { error: "Driver has not set a password yet. They need to activate their account first." },
        { status: 400 }
      )
    }

    // Activate the driver
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        // Also ensure email is verified if they have a password
        isEmailVerified: user.isEmailVerified || true,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        isEmailVerified: true,
      },
    })

    console.log("[Admin] Driver activated manually", {
      userId: updated.id,
      email: updated.email,
      wasInactive: !user.isActive,
    })

    return NextResponse.json({
      success: true,
      message: "Driver activated successfully",
      user: updated,
    })
  } catch (error) {
    console.error("[Admin] Activate driver error:", error)
    return NextResponse.json(
      { error: "Failed to activate driver" },
      { status: 500 }
    )
  }
}

