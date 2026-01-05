import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { updateMaintenanceSchema } from "@/lib/validations/maintenance"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    // Validate input
    const validationResult = updateMaintenanceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status, actualCostCents, completedAt } = validationResult.data

    const maintenance = await prisma.vehicleMaintenance.update({
      where: { id },
      data: {
        status: status as any,
        actualCostCents,
        completedAt,
      },
    })

    // If completed, create a cost entry
    if (status === "COMPLETED" && actualCostCents) {
      await prisma.vehicleCost.create({
        data: {
          vehicleId: maintenance.vehicleId,
          type: "SERVICE",
          title: maintenance.title,
          amountCents: actualCostCents,
          occurredAt: new Date(),
          notes: `Maintenance completed: ${maintenance.title}`,
        },
      })
    }

    return NextResponse.json(maintenance)
  } catch (error) {
    console.error("[v0] Update maintenance error:", error)
    return NextResponse.json({ error: "Failed to update maintenance" }, { status: 500 })
  }
}
