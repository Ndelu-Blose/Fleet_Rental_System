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

    const payments = await prisma.payment.findMany({
      where: {
        contract: {
          driverId: profile.id,
        },
      },
      include: {
        contract: {
          include: {
            vehicle: true,
          },
        },
      },
      orderBy: {
        dueDate: "desc",
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("[v0] Get driver payments error:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
