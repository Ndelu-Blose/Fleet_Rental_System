import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { createContractSchema } from "@/lib/validations/contract"
import { sendContractCreatedEmail } from "@/lib/mail"
import { getSettingInt, getSetting } from "@/lib/settings"
import { createFirstPayment } from "@/lib/payments/generator"
import { createNotification } from "@/lib/notifications"
import { FeeFrequency, VehicleType, NotificationType, NotificationPriority } from "@prisma/client"

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
    const session = await requireAdmin()

    const body = await req.json()
    
    // Validate input
    const validationResult = createContractSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { driverProfileId, vehicleId, feeAmountCents, frequency, dueWeekday, dueDayOfMonth, startDate } = validationResult.data

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

    // Load defaults from settings
    const defaultCar = await getSettingInt("contracts.default.carAmount", 0)
    const defaultBike = await getSettingInt("contracts.default.bikeAmount", 0)
    const defaultFrequencyRaw = await getSetting("payments.defaultRentCycle", "WEEKLY")
    const defaultFrequency = (defaultFrequencyRaw as FeeFrequency) || "WEEKLY"
    
    // Get allowed frequencies from settings
    const allowedFrequenciesRaw = await getSetting("contracts.allowedFrequencies", '["WEEKLY", "MONTHLY"]')
    let allowedFrequencies: FeeFrequency[] = ["WEEKLY", "MONTHLY"]
    try {
      const parsed = JSON.parse(allowedFrequenciesRaw)
      if (Array.isArray(parsed)) {
        allowedFrequencies = parsed.filter((f: string) => ["DAILY", "WEEKLY", "MONTHLY"].includes(f)) as FeeFrequency[]
      }
    } catch {
      // Use default if parsing fails
    }

    // Determine amount (use provided or default based on vehicle type)
    const amount =
      typeof feeAmountCents === "number" && feeAmountCents > 0
        ? feeAmountCents
        : vehicle.type === VehicleType.CAR
          ? defaultCar
          : defaultBike

    if (amount <= 0) {
      return NextResponse.json({ error: "Fee amount must be greater than 0" }, { status: 400 })
    }

    // Determine frequency (use provided or default)
    const freq = frequency || defaultFrequency
    
    // Validate frequency is allowed
    if (!allowedFrequencies.includes(freq)) {
      return NextResponse.json(
        { 
          error: `Frequency "${freq}" is not allowed. Allowed frequencies: ${allowedFrequencies.join(", ")}` 
        },
        { status: 400 }
      )
    }

    // Determine due day/weekday based on frequency
    const finalDueWeekday = freq === "WEEKLY" ? (typeof dueWeekday === "number" ? dueWeekday : 1) : null // Default Monday
    const finalDueDayOfMonth = freq === "MONTHLY" ? (typeof dueDayOfMonth === "number" ? dueDayOfMonth : 25) : null // Default 25th

    // Create contract and first payment in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const created = await tx.rentalContract.create({
        data: {
          driverId: driverProfileId,
          vehicleId,
          feeAmountCents: amount,
          frequency: freq,
          dueWeekday: finalDueWeekday,
          dueDayOfMonth: finalDueDayOfMonth,
          startDate,
          status: "SENT_TO_DRIVER", // Start as sent to driver for signing
          sentToDriverAt: new Date(),
          termsText: `Vehicle Rental Agreement

This agreement is between FleetHub and the driver for the rental of vehicle ${vehicle.reg}.

Terms:
- Rental rate: R ${(amount / 100).toFixed(2)} ${freq.toLowerCase()}
- Payment frequency: ${freq}
- Start date: ${new Date(startDate).toLocaleDateString()}
- Vehicle: ${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ""}

By signing this contract, you agree to:
1. Pay the rental fee on time as specified
2. Maintain the vehicle in good condition
3. Report any issues immediately
4. Return the vehicle in the same condition (normal wear excepted)

Failure to comply may result in contract termination.`,
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

      // Update vehicle status to ASSIGNED (but contract is still SENT_TO_DRIVER until signed)
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: "ASSIGNED" },
      })

      // Don't create payments yet - wait until contract is signed and becomes ACTIVE
      // Payments will be generated when admin generates the signed PDF

      return created
    })

    // Send email notification
    try {
      const user = contract.driver.user
      if (user.email && user.name) {
        await sendContractCreatedEmail(
          user.email,
          user.name,
          contract.vehicle.reg,
          amount,
          contract.frequency,
        )
      }
    } catch (emailError) {
      console.error("[v0] Failed to send contract creation email:", emailError)
      // Continue even if email fails
    }

    // Create notification
    try {
      const driverName = contract.driver.user.name || "Driver"
      const vehicleReg = contract.vehicle.reg
      
      await createNotification({
        userId: session.user.id,
        type: NotificationType.CONTRACT_CREATED,
        priority: NotificationPriority.MEDIUM,
        title: "Contract created",
        message: `A new contract was created for ${driverName} with vehicle ${vehicleReg}.`,
        link: "/admin/contracts",
        metadata: {
          contractId: contract.id,
          driverId: driverProfileId,
          vehicleId: vehicleId,
        },
      })
    } catch (notificationError) {
      console.error("[v0] Failed to create contract notification:", notificationError)
      // Continue even if notification fails
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error("[v0] Create contract error:", error)
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 })
  }
}
