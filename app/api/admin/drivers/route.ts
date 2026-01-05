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
