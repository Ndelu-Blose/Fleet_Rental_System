import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireDriver } from "@/lib/permissions"
import { uploadDriverDocument } from "@/lib/supabase"
import { updateProfileCompletion } from "@/lib/verification"
import { validateDriverDocument } from "@/lib/file-validation"

export async function POST(req: NextRequest) {
  try {
    const session = await requireDriver()

    const formData = await req.formData()
    const file = formData.get("file") as File
    const docType = formData.get("docType") as string

    if (!file || !docType) {
      return NextResponse.json({ error: "File and document type are required" }, { status: 400 })
    }

    // Validate file
    const validation = validateDriverDocument(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Upload to Supabase
    const fileUrl = await uploadDriverDocument(file, profile.id, docType)

    // Create document record
    await prisma.driverDocument.create({
      data: {
        driverId: profile.id,
        type: docType as any,
        fileUrl,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        status: "PENDING",
      },
    })

    // Update profile status and completion
    if (profile.verificationStatus === "UNVERIFIED") {
      await prisma.driverProfile.update({
        where: { id: profile.id },
        data: { verificationStatus: "IN_REVIEW" },
      })
    }

    await updateProfileCompletion(profile.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Upload document error:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
