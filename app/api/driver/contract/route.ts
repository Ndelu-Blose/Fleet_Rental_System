import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireDriver } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    const session = await requireDriver()

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const contract = await prisma.rentalContract.findFirst({
      where: {
        driverId: profile.id,
        status: {
          in: ["SENT_TO_DRIVER", "DRIVER_SIGNED", "ACTIVE"],
        },
      },
      include: {
        vehicle: {
          include: {
            compliance: true,
          },
        },
        payments: {
          orderBy: {
            dueDate: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error("[v0] Get driver contract error:", error)
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 })
  }
}
