import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { ContractStatus, VerificationStatus, VehicleStatus } from "@prisma/client"

export async function GET() {
  try {
    await requireAdmin()

    const checklist: any[] = []

    // 1. Company profile complete
    const companyName = await getSetting("company.name", "")
    const companyEmail = await getSetting("company.email", "")
    checklist.push({
      id: "company",
      label: "Company profile complete",
      completed: !!(companyName && companyEmail),
      pending: false,
      actionLabel: "Complete Profile",
      actionHref: "/admin/settings/company",
    })

    // 2. Payment settings configured
    const paymentMethod = await getSetting("payments.method", "")
    checklist.push({
      id: "payments",
      label: "Payment method configured",
      completed: !!paymentMethod,
      pending: false,
      actionLabel: "Configure Payments",
      actionHref: "/admin/settings/payments",
    })

    // 3. At least 1 driver created
    const drivers = await prisma.driverProfile.findMany({ select: { id: true } })
    checklist.push({
      id: "drivers",
      label: "At least 1 driver created",
      completed: drivers.length > 0,
      pending: false,
      actionLabel: "Add Driver",
      actionHref: "/admin/drivers",
    })

    // 4. At least 1 driver verified
    const verifiedDrivers = await prisma.driverProfile.findMany({
      where: { verificationStatus: VerificationStatus.VERIFIED },
      select: { id: true },
    })
    checklist.push({
      id: "verified",
      label: "At least 1 driver verified",
      completed: verifiedDrivers.length > 0,
      pending: drivers.length > 0 && verifiedDrivers.length === 0,
      actionLabel: "Verify Drivers",
      actionHref: "/admin/verification",
    })

    // 5. At least 1 vehicle created
    const vehicles = await prisma.vehicle.findMany({ select: { id: true } })
    checklist.push({
      id: "vehicles",
      label: "At least 1 vehicle added",
      completed: vehicles.length > 0,
      pending: false,
      actionLabel: "Add Vehicle",
      actionHref: "/admin/vehicles",
    })

    // 6. At least 1 contract created
    const contracts = await prisma.rentalContract.findMany({ select: { id: true } })
    checklist.push({
      id: "contracts",
      label: "At least 1 contract created",
      completed: contracts.length > 0,
      pending: false,
      actionLabel: "Create Contract",
      actionHref: "/admin/contracts",
    })

    // 7. At least 1 contract signed
    const signedContracts = await prisma.rentalContract.findMany({
      where: { status: { in: [ContractStatus.SIGNED_BY_DRIVER, ContractStatus.ACTIVE] } },
      select: { id: true },
    })
    checklist.push({
      id: "signed",
      label: "At least 1 contract signed",
      completed: signedContracts.length > 0,
      pending: contracts.length > 0 && signedContracts.length === 0,
      actionLabel: "View Contracts",
      actionHref: "/admin/contracts",
    })

    // 8. At least 1 contract active
    const activeContracts = await prisma.rentalContract.findMany({
      where: { status: ContractStatus.ACTIVE },
      select: { id: true },
    })
    checklist.push({
      id: "active",
      label: "At least 1 contract active",
      completed: activeContracts.length > 0,
      pending: signedContracts.length > 0 && activeContracts.length === 0,
      actionLabel: "Activate Contracts",
      actionHref: "/admin/contracts",
    })

    // 9. At least 1 vehicle assigned
    const assignedVehicles = await prisma.vehicle.findMany({
      where: { status: VehicleStatus.ASSIGNED },
      select: { id: true },
    })
    checklist.push({
      id: "assigned",
      label: "At least 1 vehicle assigned",
      completed: assignedVehicles.length > 0,
      pending: activeContracts.length > 0 && assignedVehicles.length === 0,
      actionLabel: "Assign Vehicles",
      actionHref: "/admin/vehicles",
    })

    return NextResponse.json({ checklist })
  } catch (error: any) {
    console.error("[Readiness] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch checklist" },
      { status: 500 }
    )
  }
}
