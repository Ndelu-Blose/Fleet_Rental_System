import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { uploadVehicleDocument } from "@/lib/supabase"
import { validateVehicleDocument } from "@/lib/file-validation"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const formData = await req.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string
    const title = formData.get("title") as string
    const issuedAt = formData.get("issuedAt") as string
    const expiresAt = formData.get("expiresAt") as string

    if (!file || !type) {
      return NextResponse.json({ error: "File and type are required" }, { status: 400 })
    }

    // Validate file
    const validation = validateVehicleDocument(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const fileUrl = await uploadVehicleDocument(file, id, type)

    const document = await prisma.vehicleDocument.create({
      data: {
        vehicleId: id,
        type: type as any,
        title,
        fileUrl,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        issuedAt: issuedAt ? new Date(issuedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("[v0] Upload vehicle document error:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
