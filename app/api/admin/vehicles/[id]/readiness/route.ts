import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { ContractStatus, VehicleStatus } from "@prisma/client"

export const runtime = "nodejs"

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        documents: {
          select: { type: true },
        },
        contracts: {
          where: {
            status: {
              notIn: [ContractStatus.ENDED, ContractStatus.CANCELLED],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            driverSignedAt: true,
            signedPdfPath: true,
            createdAt: true,
          },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const latestContract = vehicle.contracts[0] ?? null

    // Required document types based on vehicle type
    const requiredDocs =
      vehicle.type === "CAR" ? ["LICENSE", "ROADWORTHY", "INSURANCE"] : ["LICENSE", "INSURANCE"]

    const hasRequiredDocs = requiredDocs.every((docType) =>
      vehicle.documents.some((d) => d.type === docType)
    )

    const checklist: Step[] = []

    // Step 1: Vehicle details captured (always complete - vehicle exists)
    checklist.push({
      id: "vehicle-details",
      label: "Vehicle details captured",
      description: "Basic vehicle information has been entered",
      completed: true,
      state: "DONE",
    })

    // Step 2: Vehicle compliance docs uploaded
    checklist.push({
      id: "compliance-docs",
      label: "Vehicle compliance docs uploaded",
      description: `Upload required documents: ${requiredDocs.join(", ")}`,
      completed: hasRequiredDocs,
      state: computeState({
        completed: hasRequiredDocs,
        canDoNow: true,
      }),
      hint: hasRequiredDocs ? undefined : `Missing: ${requiredDocs.filter((d) => !vehicle.documents.some((doc) => doc.type === d)).join(", ")}`,
      actionLabel: hasRequiredDocs ? undefined : "Upload Docs",
      actionHref: hasRequiredDocs ? undefined : `/admin/vehicles/${id}?tab=documents`,
    })

    // Step 3: Driver selected
    const canSelectDriver = hasRequiredDocs
    checklist.push({
      id: "driver-selected",
      label: "Driver selected",
      description: "Choose a verified driver for this vehicle",
      completed: latestContract !== null,
      state: computeState({
        completed: latestContract !== null,
        canDoNow: canSelectDriver,
      }),
      hint: !canSelectDriver ? "Complete compliance docs first" : latestContract ? undefined : "No driver assigned yet",
      actionLabel: latestContract ? undefined : "Create Contract",
      actionHref: latestContract ? undefined : `/admin/contracts?vehicleId=${id}`,
    })

    // Step 4: Contract created
    const canCreateContract = hasRequiredDocs
    checklist.push({
      id: "contract-created",
      label: "Contract created",
      description: "Create a rental contract for this vehicle",
      completed: latestContract !== null && latestContract.status !== undefined,
      state: computeState({
        completed: latestContract !== null && latestContract.status !== undefined,
        canDoNow: canCreateContract,
      }),
      hint: !canCreateContract ? "Complete compliance docs first" : latestContract ? undefined : "No contract exists",
      actionLabel: latestContract ? undefined : "Create Contract",
      actionHref: latestContract ? undefined : `/admin/contracts?vehicleId=${id}`,
    })

    // Step 5: Sent to driver
    const canSendToDriver =
      latestContract !== null && latestContract.status === ContractStatus.DRAFT
    const isSentToDriver =
      latestContract !== null &&
      [
        ContractStatus.SENT,
        ContractStatus.SENT_TO_DRIVER,
        ContractStatus.DRIVER_SIGNED,
        ContractStatus.SIGNED_BY_DRIVER,
        ContractStatus.ACTIVE,
      ].includes(latestContract.status as ContractStatus)

    checklist.push({
      id: "sent-to-driver",
      label: "Sent to driver",
      description: "Send the contract to the driver for review and signing",
      completed: isSentToDriver,
      state: computeState({
        completed: isSentToDriver,
        canDoNow: canSendToDriver,
        waiting: latestContract !== null && !canSendToDriver && !isSentToDriver,
      }),
      hint: canSendToDriver
        ? undefined
        : latestContract && !isSentToDriver
          ? "Contract must be in DRAFT status"
          : !latestContract
            ? "Create contract first"
            : undefined,
      actionLabel: canSendToDriver ? "Send to Driver" : undefined,
      actionHref: canSendToDriver ? `/admin/contracts/${latestContract.id}/send` : undefined,
    })

    // Step 6: Driver signed
    const canDriverSign =
      latestContract !== null &&
      [ContractStatus.SENT, ContractStatus.SENT_TO_DRIVER].includes(
        latestContract.status as ContractStatus
      )
    const isDriverSigned =
      latestContract !== null &&
      (latestContract.driverSignedAt !== null ||
        [
          ContractStatus.DRIVER_SIGNED,
          ContractStatus.SIGNED_BY_DRIVER,
          ContractStatus.ACTIVE,
        ].includes(latestContract.status as ContractStatus))

    checklist.push({
      id: "driver-signed",
      label: "Driver signed",
      description: "Driver has reviewed and signed the contract",
      completed: isDriverSigned,
      state: computeState({
        completed: isDriverSigned,
        canDoNow: false, // Driver action, admin waits
        waiting: canDriverSign || (latestContract !== null && !isDriverSigned && !canDriverSign),
      }),
      hint: canDriverSign
        ? "Waiting for driver to sign"
        : latestContract && !isDriverSigned
          ? "Send contract to driver first"
          : !latestContract
            ? "Create contract first"
            : undefined,
    })

    // Step 7: Admin activated + PDF generated
    const canActivate =
      latestContract !== null &&
      [
        ContractStatus.DRIVER_SIGNED,
        ContractStatus.SIGNED_BY_DRIVER,
      ].includes(latestContract.status as ContractStatus)
    const isActivated =
      latestContract !== null &&
      latestContract.status === ContractStatus.ACTIVE &&
      latestContract.signedPdfPath !== null

    checklist.push({
      id: "admin-activated",
      label: "Admin activated + PDF generated",
      description: "Activate the contract and generate the signed PDF",
      completed: isActivated,
      state: computeState({
        completed: isActivated,
        canDoNow: canActivate,
        waiting: latestContract !== null && !canActivate && !isActivated,
      }),
      hint: canActivate
        ? undefined
        : latestContract && !isActivated
          ? "Driver must sign first"
          : !latestContract
            ? "Create contract first"
            : undefined,
      actionLabel: canActivate ? "Activate Contract" : undefined,
      actionHref: canActivate ? `/admin/contracts/${latestContract.id}/activate` : undefined,
    })

    // Step 8: Vehicle assigned
    const canAssign = isActivated
    checklist.push({
      id: "vehicle-assigned",
      label: "Vehicle assigned",
      description: "Vehicle is assigned to the driver and ready for use",
      completed: vehicle.status === VehicleStatus.ASSIGNED,
      state: computeState({
        completed: vehicle.status === VehicleStatus.ASSIGNED,
        canDoNow: canAssign,
        waiting: latestContract !== null && !canAssign && vehicle.status !== VehicleStatus.ASSIGNED,
      }),
      hint: canAssign
        ? "Activate contract to assign vehicle"
        : vehicle.status === VehicleStatus.ASSIGNED
          ? undefined
          : "Complete previous steps first",
    })

    return NextResponse.json({ checklist })
  } catch (error: any) {
    console.error("[Vehicle Readiness] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch checklist" },
      { status: 500 }
    )
  }
}
