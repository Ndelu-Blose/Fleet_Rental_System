import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { uploadVehicleDocument } from "@/lib/supabase"
import { createCostSchema } from "@/lib/validations/cost"
import { validateVehicleDocument } from "@/lib/file-validation"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const formData = await req.formData()
    const type = formData.get("type") as string
    const title = formData.get("title") as string
    const amountCents = formData.get("amountCents") as string
    const occurredAt = formData.get("occurredAt") as string
    const vendor = formData.get("vendor") as string
    const notes = formData.get("notes") as string
    const file = formData.get("file") as File | null

    // Validate input
    const validationResult = createCostSchema.safeParse({
      type,
      title,
      amountCents,
      occurredAt,
      vendor,
      notes,
      receiptUrl: null, // Will be set after upload
    })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    let receiptUrl = null
    if (file) {
      // Validate file
      const validation = validateVehicleDocument(file)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      receiptUrl = await uploadVehicleDocument(file, id, "receipt")
    }

    const cost = await prisma.vehicleCost.create({
      data: {
        vehicleId: id,
        type: validationResult.data.type as any,
        title: validationResult.data.title,
        amountCents: validationResult.data.amountCents,
        occurredAt: validationResult.data.occurredAt,
        vendor: validationResult.data.vendor,
        notes: validationResult.data.notes,
        receiptUrl: receiptUrl || validationResult.data.receiptUrl,
      },
    })

    return NextResponse.json(cost)
  } catch (error) {
    console.error("[v0] Create cost error:", error)
    return NextResponse.json({ error: "Failed to create cost" }, { status: 500 })
  }
}
