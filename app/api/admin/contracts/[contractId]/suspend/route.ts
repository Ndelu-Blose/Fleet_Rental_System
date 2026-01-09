import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { ContractStatus } from "@prisma/client"

export const runtime = "nodejs"

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
        vehicle: true,
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Only allow suspension of ACTIVE contracts
    if (contract.status !== ContractStatus.ACTIVE) {
      return NextResponse.json(
        { error: "Only active contracts can be suspended" },
        { status: 400 }
      )
    }

    // Update contract status to PAUSED
    await prisma.rentalContract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.PAUSED,
      },
    })

    // Optionally unassign vehicle (or keep it assigned - your business logic)
    // Uncomment if you want to free the vehicle when suspending:
    // await prisma.vehicle.update({
    //   where: { id: contract.vehicleId },
    //   data: { status: "AVAILABLE" },
    // })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[Suspend Contract] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to suspend contract" }, { status: 500 })
  }
}
