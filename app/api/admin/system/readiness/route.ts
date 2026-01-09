import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { ContractStatus, VerificationStatus, VehicleStatus } from "@prisma/client"

type StepState = "DONE" | "ACTION" | "WAITING" | "LOCKED"

type Step = {
  id: string
  label: string
  description?: string
  completed: boolean
  state: StepState
  hint?: string
  actionLabel?: string
  actionHref?: string
}

function computeState(args: {
  completed: boolean
  canDoNow: boolean
  waiting?: boolean
}): StepState {
  if (args.completed) return "DONE"
  if (!args.canDoNow) return "LOCKED"
  if (args.waiting) return "WAITING"
  return "ACTION"
}

export async function GET() {
  try {
    await requireAdmin()

    const checklist: Step[] = []

    // Fetch once (avoid many queries later)
    const companyName = await getSetting("company.name", "")
    const companyEmail = await getSetting("company.email", "")
    const paymentMethod = await getSetting("payments.method", "")

    const driversCount = await prisma.driverProfile.count()
    const verifiedDriversCount = await prisma.driverProfile.count({
      where: { verificationStatus: VerificationStatus.VERIFIED },
    })

    const vehiclesCount = await prisma.vehicle.count()
    const contractsCount = await prisma.rentalContract.count()

    const signedContractsCount = await prisma.rentalContract.count({
      where: { status: { in: [ContractStatus.SIGNED_BY_DRIVER, ContractStatus.ACTIVE] } },
    })

    const activeContractsCount = await prisma.rentalContract.count({
      where: { status: ContractStatus.ACTIVE },
    })

    const assignedVehiclesCount = await prisma.vehicle.count({
      where: { status: VehicleStatus.ASSIGNED },
    })

    // 1. Company profile
    {
      const completed = !!(companyName && companyEmail)
      const canDoNow = true
      checklist.push({
        id: "company",
        label: "Company profile",
        description: "Add your business name and email.",
        completed,
        state: computeState({ completed, canDoNow }),
        actionLabel: "Complete profile",
        actionHref: "/admin/settings/company",
      })
    }

    // 2. Payment method
    {
      const completed = !!paymentMethod
      const canDoNow = true
      checklist.push({
        id: "payments",
        label: "Payment method",
        description: "Choose how drivers will pay.",
        completed,
        state: computeState({ completed, canDoNow }),
        actionLabel: "Set up payments",
        actionHref: "/admin/settings/payments",
      })
    }

    // 3. Create driver
    {
      const completed = driversCount > 0
      const canDoNow = true
      checklist.push({
        id: "drivers",
        label: "Add a driver",
        description: "Create at least one driver profile.",
        completed,
        state: computeState({ completed, canDoNow }),
        actionLabel: "Add driver",
        actionHref: "/admin/drivers",
      })
    }

    // 4. Verify driver
    {
      const completed = verifiedDriversCount > 0
      const canDoNow = driversCount > 0
      const waiting = false
      checklist.push({
        id: "verified",
        label: "Verify a driver",
        description: "Approve driver documents.",
        completed,
        state: computeState({ completed, canDoNow, waiting }),
        hint: !canDoNow ? "Add a driver first." : undefined,
        actionLabel: "Verify drivers",
        actionHref: "/admin/verification",
      })
    }

    // 5. Add vehicle
    {
      const completed = vehiclesCount > 0
      const canDoNow = true
      checklist.push({
        id: "vehicles",
        label: "Add a vehicle",
        description: "Create at least one vehicle.",
        completed,
        state: computeState({ completed, canDoNow }),
        actionLabel: "Add vehicle",
        actionHref: "/admin/vehicles",
      })
    }

    // 6. Create contract
    {
      const completed = contractsCount > 0
      const canDoNow = verifiedDriversCount > 0 && vehiclesCount > 0
      checklist.push({
        id: "contracts",
        label: "Create a contract",
        description: "Assign a vehicle to a verified driver.",
        completed,
        state: computeState({ completed, canDoNow }),
        hint:
          !canDoNow
            ? verifiedDriversCount === 0
              ? "Verify a driver first."
              : "Add a vehicle first."
            : undefined,
        actionLabel: "Create contract",
        actionHref: "/admin/contracts",
      })
    }

    // 7. Send contract for signing
    {
      const completed = signedContractsCount > 0
      const canDoNow = contractsCount > 0
      const waiting = false
      checklist.push({
        id: "signed",
        label: "Send contract to driver",
        description: "Send the contract for driver signing.",
        completed,
        state: computeState({ completed, canDoNow, waiting }),
        hint: !canDoNow ? "Create a contract first." : undefined,
        actionLabel: "Open contracts",
        actionHref: "/admin/contracts",
      })
    }

    // 8. Start rental (activate)
    {
      const completed = activeContractsCount > 0
      const canDoNow = signedContractsCount > 0
      const waiting = false
      checklist.push({
        id: "active",
        label: "Start a rental",
        description: "Activate the contract when ready.",
        completed,
        state: computeState({ completed, canDoNow, waiting }),
        hint: !canDoNow ? "Waiting for driver to sign the contract." : undefined,
        actionLabel: "Activate contract",
        actionHref: "/admin/contracts",
      })
    }

    // 9. Assign vehicle
    {
      const completed = assignedVehiclesCount > 0
      const canDoNow = activeContractsCount > 0
      const waiting = false
      checklist.push({
        id: "assigned",
        label: "Give a vehicle to a driver",
        description: "Mark vehicle as assigned after activation.",
        completed,
        state: computeState({ completed, canDoNow, waiting }),
        hint: !canDoNow ? "Start a rental first." : undefined,
        actionLabel: "Assign vehicle",
        actionHref: "/admin/vehicles",
      })
    }

    return NextResponse.json({ checklist })
  } catch (error: any) {
    console.error("[Readiness] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch checklist" },
      { status: 500 }
    )
  }
}
