import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { emailConfig } from "@/lib/email/config"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    
    const { id } = await params

    // Find driver profile with user
    const driver = await prisma.driverProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            activationToken: true,
            activationExpires: true,
            isEmailVerified: true,
          },
        },
      },
    })

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    if (driver.user.role !== "DRIVER") {
      return NextResponse.json({ error: "User is not a driver" }, { status: 400 })
    }

    // Check if user has an activation token
    if (!driver.user.activationToken) {
      return NextResponse.json(
        { error: "No activation token found. Driver may already be activated." },
        { status: 400 }
      )
    }

    // Check if token expired
    if (driver.user.activationExpires && driver.user.activationExpires < new Date()) {
      return NextResponse.json(
        { error: "Activation token has expired" },
        { status: 400 }
      )
    }

    // Generate activation link
    const activationLink = `${emailConfig.baseUrl}/activate/${driver.user.activationToken}`

    return NextResponse.json({
      activationLink,
      expiresAt: driver.user.activationExpires,
    })
  } catch (error) {
    console.error("[Get Activation Link] Error:", error)
    return NextResponse.json(
      { error: "Failed to get activation link" },
      { status: 500 }
    )
  }
}

