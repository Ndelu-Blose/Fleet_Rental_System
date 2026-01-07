import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const drivers = await prisma.driverProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isEmailVerified: true,
            isActive: true,
            activationToken: true,
          },
        },
        contracts: {
          include: {
            vehicle: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    console.error("[v0] Get drivers error:", error)
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const driverId = searchParams.get("driverId")
    const userId = searchParams.get("userId")

    if (!driverId && !userId) {
      return NextResponse.json({ error: "Driver ID or User ID is required" }, { status: 400 })
    }

    // Check if driver has active contracts
    if (driverId) {
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        include: {
          contracts: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      })

      if (driver && driver.contracts.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete driver with active contracts. Please end contracts first." },
          { status: 400 }
        )
      }
    }

    // Delete by driverId or userId
    if (driverId) {
      // Delete driver profile (cascades to user due to schema)
      await prisma.driverProfile.delete({
        where: { id: driverId },
      })
    } else if (userId) {
      // Delete user (cascades to driver profile)
      await prisma.user.delete({
        where: { id: userId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete driver error:", error)
    return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 })
  }
}
