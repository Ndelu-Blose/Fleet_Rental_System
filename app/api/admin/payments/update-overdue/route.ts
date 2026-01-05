import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const now = new Date()

    // Update all PENDING payments where dueDate has passed
    const result = await prisma.payment.updateMany({
      where: {
        status: "PENDING",
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: "OVERDUE",
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Updated ${result.count} payment(s) to OVERDUE status`,
    })
  } catch (error) {
    console.error("[v0] Update overdue payments error:", error)
    return NextResponse.json({ error: "Failed to update overdue payments" }, { status: 500 })
  }
}

// Also allow GET for easy cron job calling
export async function GET(req: NextRequest) {
  try {
    // Check for API key in header for cron jobs (optional security)
    const apiKey = req.headers.get("x-api-key")
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require it
    if (cronSecret && apiKey !== cronSecret) {
      // Fall back to admin auth if no API key
      await requireAdmin()
    } else if (!cronSecret) {
      // If no CRON_SECRET set, require admin auth
      await requireAdmin()
    }

    const now = new Date()

    // Update all PENDING payments where dueDate has passed
    const result = await prisma.payment.updateMany({
      where: {
        status: "PENDING",
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: "OVERDUE",
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Updated ${result.count} payment(s) to OVERDUE status`,
    })
  } catch (error) {
    console.error("[v0] Update overdue payments error:", error)
    return NextResponse.json({ error: "Failed to update overdue payments" }, { status: 500 })
  }
}

