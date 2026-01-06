import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { finalizeVerificationSchema } from "@/lib/validations/payment"
import {
  sendVerificationCompleteEmail,
  sendVerificationRejectedEmail,
} from "@/lib/mail"
import { createNotification } from "@/lib/notifications"
import { NotificationType, NotificationPriority } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()

    // Validate input
    const validationResult = finalizeVerificationSchema.safeParse({
      driverProfileId: body.driverProfileId,
      status: body.status,
      verificationNote: body.note,
    })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { driverProfileId, status, verificationNote } = validationResult.data

    // Get driver profile with documents and user
    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        documents: true,
        user: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if all documents are reviewed
    const hasUnreviewedDocs = profile.documents.some((doc) => doc.status === "PENDING")

    if (hasUnreviewedDocs && status === "VERIFIED") {
      return NextResponse.json({ error: "Please review all documents before finalizing" }, { status: 400 })
    }

    // Check if any document is rejected
    const hasRejectedDocs = profile.documents.some((doc) => doc.status === "REJECTED")

    if (hasRejectedDocs && status === "VERIFIED") {
      return NextResponse.json(
        { error: "Cannot verify driver with rejected documents. Please reject the profile instead." },
        { status: 400 },
      )
    }

    // Update driver profile
    await prisma.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        verificationStatus: status as any,
        verificationNote,
      },
    })

    // Send email notification
    try {
      const user = profile.user
      if (user.email && user.name) {
        if (status === "VERIFIED") {
          await sendVerificationCompleteEmail(user.email, user.name)
        } else if (status === "REJECTED") {
          await sendVerificationRejectedEmail(user.email, user.name, verificationNote)
        }
      }
    } catch (emailError) {
      console.error("[v0] Failed to send verification email:", emailError)
      // Continue even if email fails
    }

    // Create notification
    try {
      const driverName = profile.user.name || "Driver"
      
      await createNotification({
        userId: session.user.id,
        type: status === "VERIFIED" ? NotificationType.VERIFICATION_COMPLETE : NotificationType.VERIFICATION_REJECTED,
        priority: NotificationPriority.HIGH,
        title: status === "VERIFIED" ? "Verification complete" : "Verification rejected",
        message: `${driverName}'s verification was ${status === "VERIFIED" ? "completed" : "rejected"}.`,
        link: "/admin/verification",
        metadata: {
          driverId: driverProfileId,
        },
      })
    } catch (notificationError) {
      console.error("[v0] Failed to create verification notification:", notificationError)
      // Continue even if notification fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Finalize verification error:", error)
    return NextResponse.json({ error: "Failed to finalize verification" }, { status: 500 })
  }
}
