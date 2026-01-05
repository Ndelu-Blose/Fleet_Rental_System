import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireDriver } from "@/lib/permissions"
import { updateProfileCompletion } from "@/lib/verification"
import { updateProfileSchema } from "@/lib/validations/user"

export async function GET(req: NextRequest) {
  try {
    const session = await requireDriver()

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        documents: true,
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
            isEmailVerified: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("[v0] Get profile error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireDriver()
    const body = await req.json()

    // Validate input
    const validationResult = updateProfileSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, phone, idNumber, addressLine1, addressLine2, city, province, postalCode } = validationResult.data

    // Update user fields
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
      },
    })

    // Update profile fields
    const profile = await prisma.driverProfile.update({
      where: { userId: session.user.id },
      data: {
        idNumber,
        addressLine1,
        addressLine2,
        city,
        province,
        postalCode,
      },
    })

    // Update completion percentage
    await updateProfileCompletion(profile.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
