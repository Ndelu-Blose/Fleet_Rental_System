import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import bcrypt from "bcryptjs"

/**
 * Diagnostic endpoint to check why a driver can't login
 * Shows exact state of user account and tests password
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params

    // Find driver by driverId or userId
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
            isEmailVerified: true,
            isActive: true,
            activationToken: true,
            activationExpires: true,
          },
        },
      },
    })

    if (!driverProfile) {
      // Try finding by userId
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          isEmailVerified: true,
          isActive: true,
          activationToken: true,
          activationExpires: true,
          driverProfile: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!user) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      }

      return NextResponse.json({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasPassword: !!user.password,
        passwordHashLength: user.password?.length || 0,
        passwordHashStartsWith: user.password?.substring(0, 15) || "none",
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        hasActivationToken: !!user.activationToken,
        activationExpired: user.activationExpires ? user.activationExpires < new Date() : null,
        driverProfileId: user.driverProfile?.id,
        loginBlockers: {
          noPassword: !user.password,
          inactive: user.isActive === false,
          emailNotVerified: user.role === "DRIVER" && user.isEmailVerified !== true,
        },
        canLogin: !!(
          user.password &&
          user.isActive !== false &&
          (user.role === "ADMIN" || user.isEmailVerified === true)
        ),
      })
    }

    const user = driverProfile.user

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password,
      passwordHashLength: user.password?.length || 0,
      passwordHashStartsWith: user.password?.substring(0, 15) || "none",
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      hasActivationToken: !!user.activationToken,
      activationExpired: user.activationExpires ? user.activationExpires < new Date() : null,
      driverProfileId: driverProfile.id,
      loginBlockers: {
        noPassword: !user.password,
        inactive: user.isActive === false,
        emailNotVerified: user.role === "DRIVER" && user.isEmailVerified !== true,
      },
      canLogin: !!(
        user.password &&
        user.isActive !== false &&
        (user.role === "ADMIN" || user.isEmailVerified === true)
      ),
    })
  } catch (error) {
    console.error("[Admin] Check driver login error:", error)
    return NextResponse.json(
      { error: "Failed to check driver login status" },
      { status: 500 }
    )
  }
}

/**
 * Test password for a driver
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await req.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    // Find user
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            password: true,
            role: true,
          },
        },
      },
    })

    if (!driverProfile) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
        },
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (!user.password) {
        return NextResponse.json({
          error: "User has no password set",
          passwordMatch: false,
        })
      }

      const match = await bcrypt.compare(password, user.password)
      return NextResponse.json({
        email: user.email,
        passwordMatch: match,
        message: match ? "Password is correct" : "Password does not match",
      })
    }

    const user = driverProfile.user

    if (!user.password) {
      return NextResponse.json({
        error: "User has no password set",
        passwordMatch: false,
      })
    }

    const match = await bcrypt.compare(password, user.password)
    return NextResponse.json({
      email: user.email,
      passwordMatch: match,
      message: match ? "Password is correct" : "Password does not match",
    })
  } catch (error) {
    console.error("[Admin] Test password error:", error)
    return NextResponse.json(
      { error: "Failed to test password" },
      { status: 500 }
    )
  }
}

