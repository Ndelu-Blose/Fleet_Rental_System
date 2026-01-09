import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { createContractSchema, updateContractSchema } from "@/lib/validations/contract"
import { ContractStatus } from "@prisma/client"

export const runtime = "nodejs"

export async function GET(
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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            reg: true,
            make: true,
            model: true,
          },
        },
        payments: {
          orderBy: {
            dueDate: "desc",
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error("[Get Contract] Error:", error)
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 })
  }
}

export async function DELETE(
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

    // Only allow deletion of DRAFT contracts
    if (contract.status !== ContractStatus.DRAFT) {
      return NextResponse.json(
        { error: "Only draft contracts can be deleted" },
        { status: 400 }
      )
    }

    await prisma.rentalContract.delete({
      where: { id: contractId },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[Delete Contract] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete contract" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await requireAdmin()
    const { contractId } = await params
    const body = await req.json()

    // Check if this is a status update (end contract) or full update (edit draft)
    if (body.status && body.status !== undefined) {
      // Status update (end contract)
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
    } else {
      // Full update (edit draft contract)
      // First, check if contract exists and is DRAFT
      const existingContract = await prisma.rentalContract.findUnique({
        where: { id: contractId },
        include: {
          driver: true,
          vehicle: true,
        },
      })

      if (!existingContract) {
        return NextResponse.json({ error: "Contract not found" }, { status: 404 })
      }

      // Block edits when not DRAFT
      if (existingContract.status !== ContractStatus.DRAFT) {
        return NextResponse.json(
          { error: `Only draft contracts can be edited. Current status: ${existingContract.status}` },
          { status: 400 }
        )
      }

      // Validate input
      const validationResult = createContractSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: validationResult.error.errors },
          { status: 400 }
        )
      }

      const { driverProfileId, vehicleId, feeAmountCents, frequency, dueWeekday, dueDayOfMonth, startDate } =
        validationResult.data

      // Check if driver is verified
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverProfileId },
      })

      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      }

      if (driver.verificationStatus !== "VERIFIED") {
        return NextResponse.json(
          { error: "Driver must be verified before assigning a vehicle" },
          { status: 400 }
        )
      }

      // Check if vehicle is available (or is the same vehicle)
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      })

      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
      }

      // Allow same vehicle, or must be available
      if (vehicleId !== existingContract.vehicleId && vehicle.status !== "AVAILABLE") {
        return NextResponse.json({ error: "Vehicle is not available" }, { status: 400 })
      }

      // Safety check: ensure vehicle doesn't already have an ACTIVE contract (unless it's the same contract)
      if (vehicleId !== existingContract.vehicleId) {
        const existingActive = await prisma.rentalContract.findFirst({
          where: {
            vehicleId,
            status: ContractStatus.ACTIVE,
            id: { not: contractId }, // Exclude current contract
          },
          select: { id: true },
        })

        if (existingActive) {
          return NextResponse.json(
            { error: "Vehicle already has an active contract. End the existing contract first." },
            { status: 400 }
          )
        }
      }

      // Update contract
      const updatedContract = await prisma.rentalContract.update({
        where: { id: contractId },
        data: {
          driverId: driverProfileId,
          vehicleId,
          feeAmountCents,
          frequency,
          dueWeekday: dueWeekday ? Number.parseInt(dueWeekday.toString(), 10) : null,
          dueDayOfMonth: dueDayOfMonth ? Number.parseInt(dueDayOfMonth.toString(), 10) : null,
          startDate: new Date(startDate),
        },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          vehicle: {
            select: {
              id: true,
              reg: true,
              make: true,
              model: true,
            },
          },
        },
      })

      return NextResponse.json(updatedContract)
    }
  } catch (error: any) {
    console.error("[Update Contract] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to update contract" }, { status: 500 })
  }
}
