import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { getSettingInt } from "@/lib/settings"

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

    // Get grace period from settings for overdue calculation
    const graceDays = await getSettingInt("payments.gracePeriodDays", 3)

    // Enhance payments with overdue status
    const now = new Date()
    const enhancedPayments = payments.map((payment) => {
      const dueDate = new Date(payment.dueDate)
      const graceDate = new Date(dueDate)
      graceDate.setDate(graceDate.getDate() + graceDays)

      // Payment is overdue if:
      // - Status is PENDING
      // - Current date is past grace period
      const isOverdue = payment.status === "PENDING" && now > graceDate

      return {
        ...payment,
        isOverdue,
      }
    })

    return NextResponse.json(enhancedPayments)
  } catch (error) {
    console.error("[v0] Get payments error:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
