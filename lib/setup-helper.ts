import { getSetting } from "@/lib/settings"
import { prisma } from "@/lib/prisma"
import { ContractStatus, VerificationStatus, VehicleStatus } from "@prisma/client"

type SetupStep = {
  id: string
  label: string
  completed: boolean
  actionHref?: string
}

/**
 * Gets the next incomplete setup step and its target URL
 */
export async function getNextIncompleteStep(): Promise<{
  step: SetupStep | null
  targetUrl: string | null
  incompleteCount: number
}> {
  try {
    const steps: SetupStep[] = []

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

    steps.push({
      id: "company",
      label: "Company profile",
      completed: !!(companyName && companyEmail),
      actionHref: "/admin/settings/company",
    })

    steps.push({
      id: "payments",
      label: "Payment method",
      completed: !!paymentMethod,
      actionHref: "/admin/settings/payments",
    })

    steps.push({
      id: "drivers",
      label: "Add a driver",
      completed: driversCount > 0,
      actionHref: "/admin/drivers",
    })

    steps.push({
      id: "verified",
      label: "Verify a driver",
      completed: verifiedDriversCount > 0,
      actionHref: "/admin/verification",
    })

    steps.push({
      id: "vehicles",
      label: "Add a vehicle",
      completed: vehiclesCount > 0,
      actionHref: "/admin/vehicles",
    })

    steps.push({
      id: "contracts",
      label: "Create a contract",
      completed: contractsCount > 0,
      actionHref: "/admin/contracts",
    })

    steps.push({
      id: "signed",
      label: "Send contract to driver",
      completed: signedContractsCount > 0,
      actionHref: "/admin/contracts",
    })

    steps.push({
      id: "active",
      label: "Start a rental",
      completed: activeContractsCount > 0,
      actionHref: "/admin/contracts",
    })

    steps.push({
      id: "assigned",
      label: "Give a vehicle to a driver",
      completed: assignedVehiclesCount > 0,
      actionHref: "/admin/vehicles",
    })

    const incompleteSteps = steps.filter((s) => !s.completed)
    const nextStep = incompleteSteps[0] || null
    const incompleteCount = incompleteSteps.length

    // Use actionHref directly from the step (it's already set correctly)
    const targetUrl = nextStep?.actionHref || null

    return {
      step: nextStep,
      targetUrl,
      incompleteCount,
    }
  } catch (error) {
    console.error("[SetupHelper] Failed to get next incomplete step:", error)
    return {
      step: null,
      targetUrl: null,
      incompleteCount: 0,
    }
  }
}
