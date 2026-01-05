import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireDriver } from "@/lib/permissions"
import { updateProfileCompletion } from "@/lib/verification"
import { updateLocationSchema } from "@/lib/validations/user"

export async function POST(req: NextRequest) {
  try {
    const session = await requireDriver()
    const body = await req.json()

    // Validate input
    const validationResult = updateLocationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { latitude, longitude, accuracy } = validationResult.data

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Update location
    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: {
        lastLat: latitude,
        lastLng: longitude,
        lastAccuracy: accuracy,
        lastLocationAt: new Date(),
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
    console.error("[v0] Save location error:", error)
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 })
  }
}
