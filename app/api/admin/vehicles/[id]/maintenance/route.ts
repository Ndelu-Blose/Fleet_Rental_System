import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { createMaintenanceSchema } from "@/lib/validations/maintenance"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    // Validate input
    const validationResult = createMaintenanceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { title, description, scheduledAt, odometerKm, estimatedCostCents } = validationResult.data

    const maintenance = await prisma.vehicleMaintenance.create({
      data: {
        vehicleId: id,
        title,
        description,
        scheduledAt,
        odometerKm,
        estimatedCostCents,
        status: "PLANNED",
      },
    })

    return NextResponse.json(maintenance)
  } catch (error) {
    console.error("[v0] Create maintenance error:", error)
    return NextResponse.json({ error: "Failed to create maintenance" }, { status: 500 })
  }
}
