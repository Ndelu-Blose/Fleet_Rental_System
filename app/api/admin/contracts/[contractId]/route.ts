import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { updateContractSchema } from "@/lib/validations/contract"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contractId: string }> }) {
  try {
    await requireAdmin()
    const { contractId } = await params
    const body = await req.json()

    // Validate input
    const validationResult = updateContractSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status, endDate } = validationResult.data

    const contract = await prisma.rentalContract.update({
      where: { id: contractId },
      data: {
        status: status as any,
        endDate,
      },
      include: {
        vehicle: true,
      },
    })

    // If contract is ended, mark vehicle as available
    if (status === "ENDED") {
      await prisma.vehicle.update({
        where: { id: contract.vehicleId },
        data: { status: "AVAILABLE" },
      })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error("[v0] Update contract error:", error)
    return NextResponse.json({ error: "Failed to update contract" }, { status: 500 })
  }
}
