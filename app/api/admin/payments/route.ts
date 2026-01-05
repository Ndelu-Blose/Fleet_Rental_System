import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const where: any = {}
    if (status) {
      where.status = status
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        contract: {
          include: {
            driver: {
              include: {
                user: true,
              },
            },
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
    console.error("[v0] Get payments error:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
