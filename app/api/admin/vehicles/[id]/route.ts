import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { updateVehicleSchema } from "@/lib/validations/vehicle"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        compliance: true,
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
        maintenance: {
          orderBy: {
            scheduledAt: "desc",
          },
        },
        costs: {
          orderBy: {
            occurredAt: "desc",
          },
        },
        contracts: {
          where: {
            status: "ACTIVE",
          },
          include: {
            driver: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    return NextResponse.json(vehicle)
  } catch (error) {
    console.error("[v0] Get vehicle error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    // Validate input
    const validationResult = updateVehicleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { type, reg, make, model, year, notes, status, licenseExpiry, insuranceExpiry, roadworthyExpiry } = validationResult.data

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        type: type as any,
        reg,
        make,
        model,
        year,
        notes,
        status: status as any,
        compliance: {
          upsert: {
            create: {
              licenseExpiry,
              insuranceExpiry,
              roadworthyExpiry,
            },
            update: {
              licenseExpiry,
              insuranceExpiry,
              roadworthyExpiry,
            },
          },
        },
      },
      include: {
        compliance: true,
      },
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    console.error("[v0] Update vehicle error:", error)
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
  }
}
