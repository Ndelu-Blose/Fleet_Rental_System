import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const activeContracts = await prisma.rentalContract.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        payments: {
          orderBy: {
            dueDate: "desc",
          },
          take: 1, // Get the latest payment
        },
      },
    })

    let totalGenerated = 0
    const now = new Date()

    for (const contract of activeContracts) {
      const latestPayment = contract.payments[0]
      if (!latestPayment) continue

      // Calculate how many payments to generate
      // For weekly: generate up to 4 weeks ahead
      // For daily: generate up to 7 days ahead
      const lookAheadDays = contract.frequency === "WEEKLY" ? 28 : 7
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + lookAheadDays)

      let nextDueDate = new Date(latestPayment.dueDate)

      // Generate payments until we reach the target date
      while (nextDueDate <= targetDate) {
        // Calculate next payment date
        if (contract.frequency === "DAILY") {
          nextDueDate.setDate(nextDueDate.getDate() + 1)
        } else if (contract.frequency === "WEEKLY") {
          nextDueDate.setDate(nextDueDate.getDate() + 7)
          // If dueWeekday is specified, adjust to that weekday
          if (contract.dueWeekday !== null) {
            const daysDiff = (contract.dueWeekday - nextDueDate.getDay() + 7) % 7
            nextDueDate.setDate(nextDueDate.getDate() + (daysDiff === 0 ? 0 : daysDiff))
          }
        }

        // Check if payment already exists
        const existing = await prisma.payment.findFirst({
          where: {
            contractId: contract.id,
            dueDate: nextDueDate,
          },
        })

        if (!existing && nextDueDate <= targetDate) {
          await prisma.payment.create({
            data: {
              contractId: contract.id,
              amountCents: contract.feeAmountCents,
              dueDate: new Date(nextDueDate),
              status: "PENDING",
            },
          })
          totalGenerated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      generated: totalGenerated,
      message: `Generated ${totalGenerated} payment(s) for active contracts`,
    })
  } catch (error) {
    console.error("[v0] Generate payments error:", error)
    return NextResponse.json({ error: "Failed to generate payments" }, { status: 500 })
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

    const activeContracts = await prisma.rentalContract.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        payments: {
          orderBy: {
            dueDate: "desc",
          },
          take: 1, // Get the latest payment
        },
      },
    })

    let totalGenerated = 0
    const now = new Date()

    for (const contract of activeContracts) {
      const latestPayment = contract.payments[0]
      if (!latestPayment) continue

      // Calculate how many payments to generate
      // For weekly: generate up to 4 weeks ahead
      // For daily: generate up to 7 days ahead
      const lookAheadDays = contract.frequency === "WEEKLY" ? 28 : 7
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + lookAheadDays)

      let nextDueDate = new Date(latestPayment.dueDate)

      // Generate payments until we reach the target date
      while (nextDueDate <= targetDate) {
        // Calculate next payment date
        if (contract.frequency === "DAILY") {
          nextDueDate.setDate(nextDueDate.getDate() + 1)
        } else if (contract.frequency === "WEEKLY") {
          nextDueDate.setDate(nextDueDate.getDate() + 7)
          // If dueWeekday is specified, adjust to that weekday
          if (contract.dueWeekday !== null) {
            const daysDiff = (contract.dueWeekday - nextDueDate.getDay() + 7) % 7
            nextDueDate.setDate(nextDueDate.getDate() + (daysDiff === 0 ? 0 : daysDiff))
          }
        }

        // Check if payment already exists
        const existing = await prisma.payment.findFirst({
          where: {
            contractId: contract.id,
            dueDate: nextDueDate,
          },
        })

        if (!existing && nextDueDate <= targetDate) {
          await prisma.payment.create({
            data: {
              contractId: contract.id,
              amountCents: contract.feeAmountCents,
              dueDate: new Date(nextDueDate),
              status: "PENDING",
            },
          })
          totalGenerated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      generated: totalGenerated,
      message: `Generated ${totalGenerated} payment(s) for active contracts`,
    })
  } catch (error) {
    console.error("[v0] Generate payments error:", error)
    return NextResponse.json({ error: "Failed to generate payments" }, { status: 500 })
  }
}

