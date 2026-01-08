import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await requireAdmin()
    const { contractId } = await params

    const contract = await prisma.rentalContract.findUnique({
      where: { id: contractId },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    if (contract.status !== "SIGNED_BY_DRIVER" && contract.status !== "DRIVER_SIGNED") {
      return NextResponse.json(
        { error: `Contract must be signed by driver. Current status: ${contract.status}` },
        { status: 400 }
      )
    }

    // Update contract to ACTIVE
    // Note: PDF generation should be done separately via the generate-signed-pdf endpoint
    const updated = await prisma.rentalContract.update({
      where: { id: contract.id },
      data: {
        status: "ACTIVE",
        adminSignedAt: new Date(),
      },
    })

    // Generate first payment now that contract is active
    const { createFirstPayment } = await import("@/lib/payments/generator")

    await prisma.$transaction(async (tx) => {
      await createFirstPayment(tx, {
        contractId: contract.id,
        amountCents: contract.feeAmountCents,
        startDate: contract.startDate,
        frequency: contract.frequency,
        dueWeekday: contract.dueWeekday,
        dueDayOfMonth: contract.dueDayOfMonth,
      })
    })

    return NextResponse.json({ ok: true, contract: updated })
  } catch (error: any) {
    console.error("[Activate Contract] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to activate contract" }, { status: 500 })
  }
}
