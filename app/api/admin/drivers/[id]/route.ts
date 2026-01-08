import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const driver = await prisma.driverProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isEmailVerified: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
        contracts: {
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
            startDate: "desc",
          },
        },
      },
    })

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    return NextResponse.json(driver)
  } catch (error) {
    console.error("[v0] Get driver error:", error)
    return NextResponse.json({ error: "Failed to fetch driver" }, { status: 500 })
  }
}
