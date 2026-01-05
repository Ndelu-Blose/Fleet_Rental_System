import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { createContractSchema } from "@/lib/validations/contract"
import { sendContractCreatedEmail } from "@/lib/mail"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const contracts = await prisma.rentalContract.findMany({
      include: {
        driver: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        vehicle: true,
        payments: {
          orderBy: {
            dueDate: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error("[v0] Get contracts error:", error)
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    
    // Validate input
    const validationResult = createContractSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { driverProfileId, vehicleId, feeAmountCents, frequency, dueWeekday, startDate } = validationResult.data

    // Check if driver is verified
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
    })

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    if (driver.verificationStatus !== "VERIFIED") {
      return NextResponse.json({ error: "Driver must be verified before assigning a vehicle" }, { status: 400 })
    }

    // Check if vehicle is available
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    if (vehicle.status !== "AVAILABLE") {
      return NextResponse.json({ error: "Vehicle is not available" }, { status: 400 })
    }

    // Create contract
    const contract = await prisma.rentalContract.create({
      data: {
        driverId: driverProfileId,
        vehicleId,
        feeAmountCents,
        frequency: frequency as any,
        dueWeekday,
        startDate,
        status: "ACTIVE",
      },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
        vehicle: true,
      },
    })

    // Update vehicle status
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: "ASSIGNED" },
    })

    // Generate first payment
    const firstPaymentDate = new Date(startDate)
    if (frequency === "WEEKLY" && dueWeekday !== null) {
      // Adjust to next occurrence of the due weekday
      const daysDiff = (dueWeekday - firstPaymentDate.getDay() + 7) % 7
      firstPaymentDate.setDate(firstPaymentDate.getDate() + (daysDiff === 0 ? 7 : daysDiff))
    }

    await prisma.payment.create({
      data: {
        contractId: contract.id,
        amountCents: feeAmountCents,
        dueDate: firstPaymentDate,
        status: "PENDING",
      },
    })

    // Send email notification
    try {
      const user = contract.driver.user
      if (user.email && user.name) {
        await sendContractCreatedEmail(
          user.email,
          user.name,
          contract.vehicle.reg,
          feeAmountCents,
          contract.frequency,
        )
      }
    } catch (emailError) {
      console.error("[v0] Failed to send contract creation email:", emailError)
      // Continue even if email fails
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error("[v0] Create contract error:", error)
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 })
  }
}
