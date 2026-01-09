import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { ContractStatus } from "@prisma/client"
import { createNotification } from "@/lib/notifications"
import { NotificationType, NotificationPriority } from "@prisma/client"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await requireAdmin()
    const { contractId } = await params
    const { reason } = await req.json()

    const contract = await prisma.rentalContract.findUnique({
      where: { id: contractId },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
        vehicle: {
          select: {
            reg: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Only allow rejection before activation
    if (contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.ENDED) {
      return NextResponse.json(
        { error: "Cannot reject an active or ended contract" },
        { status: 400 }
      )
    }

    // Update contract status
    await prisma.rentalContract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.CANCELLED,
        endDate: new Date(),
      },
    })

    // Notify driver
    try {
      await createNotification({
        userId: contract.driver.user.id,
        type: NotificationType.CONTRACT_CREATED,
        priority: NotificationPriority.HIGH,
        title: "Contract Rejected",
        message: `Your contract for ${contract.vehicle?.reg || "vehicle"} has been rejected. ${reason ? `Reason: ${reason}` : ""}`,
        link: `/driver/contract`,
      })
    } catch (notifError) {
      console.error("[Reject Contract] Notification failed:", notifError)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[Reject Contract] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to reject contract" }, { status: 500 })
  }
}
