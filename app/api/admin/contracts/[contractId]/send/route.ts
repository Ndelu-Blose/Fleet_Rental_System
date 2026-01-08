import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { sendContractCreatedEmail } from "@/lib/mail"
import { createNotification } from "@/lib/notifications"
import { NotificationType, NotificationPriority } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await requireAdmin()
    const { contractId } = await params

    const contract = await prisma.rentalContract.findUnique({
      where: { id: contractId },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
        vehicle: true,
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    if (contract.status !== "DRAFT" && contract.status !== "SENT_TO_DRIVER") {
      return NextResponse.json(
        { error: `Contract must be in DRAFT status. Current status: ${contract.status}` },
        { status: 400 }
      )
    }

    // Update contract status to SENT
    const updated = await prisma.rentalContract.update({
      where: { id: contract.id },
      data: {
        status: "SENT",
        sentToDriverAt: new Date(),
        lockedAt: new Date(), // Lock contract from editing
      },
    })

    // Send email notification to driver
    try {
      const user = contract.driver.user
      if (user.email && user.name) {
        await sendContractCreatedEmail(user.email, user.name, contract.id)
      }
    } catch (emailError) {
      console.error("[Send Contract] Email failed:", emailError)
      // Don't fail the request if email fails
    }

    // Create notification for driver
    try {
      await createNotification({
        userId: contract.driver.user.id,
        type: NotificationType.CONTRACT_CREATED,
        priority: NotificationPriority.HIGH,
        title: "Contract Ready for Signature",
        message: `A rental contract for ${contract.vehicle.reg} is ready for your signature.`,
        link: `/driver/contract`,
      })
    } catch (notifError) {
      console.error("[Send Contract] Notification failed:", notifError)
    }

    return NextResponse.json({ ok: true, contract: updated })
  } catch (error: any) {
    console.error("[Send Contract] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to send contract" }, { status: 500 })
  }
}
