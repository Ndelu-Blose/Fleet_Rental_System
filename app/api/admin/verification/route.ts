import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "IN_REVIEW"

    const drivers = await prisma.driverProfile.findMany({
      where: {
        verificationStatus: status as any,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isEmailVerified: true,
          },
        },
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    console.error("[v0] Get verification queue error:", error)
    return NextResponse.json({ error: "Failed to fetch verification queue" }, { status: 500 })
  }
}
