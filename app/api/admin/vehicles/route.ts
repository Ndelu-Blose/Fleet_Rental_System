import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { createVehicleSchema } from "@/lib/validations/vehicle"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const vehicles = await prisma.vehicle.findMany({
      include: {
        compliance: true,
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
        _count: {
          select: {
            documents: true,
            maintenance: true,
            costs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error("[v0] Get vehicles error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    
    // Validate input
    const validationResult = createVehicleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { type, reg, make, model, year, notes, licenseExpiry, insuranceExpiry, roadworthyExpiry } = validationResult.data

    const vehicle = await prisma.vehicle.create({
      data: {
        type,
        reg,
        make,
        model,
        year,
        notes,
        status: "AVAILABLE",
        compliance: {
          create: {
            licenseExpiry,
            insuranceExpiry,
            roadworthyExpiry,
          },
        },
      },
      include: {
        compliance: true,
      },
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    console.error("[v0] Create vehicle error:", error)
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 })
  }
}
