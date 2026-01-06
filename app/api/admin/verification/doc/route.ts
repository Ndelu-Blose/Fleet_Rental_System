import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { reviewDocumentSchema } from "@/lib/validations/payment"
import {
  sendDocumentApprovalEmail,
  sendDocumentRejectionEmail,
} from "@/lib/mail"
import { createNotification } from "@/lib/notifications"
import { NotificationType, NotificationPriority } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()

    // Validate input (documentId needs to be added separately)
    if (!body.documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    const validationResult = reviewDocumentSchema.safeParse({
      status: body.status,
      reviewNote: body.note,
    })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status, reviewNote } = validationResult.data
    const { documentId } = body

    // Get document with driver info for email
    const document = await prisma.driverDocument.findUnique({
      where: { id: documentId },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Update document
    await prisma.driverDocument.update({
      where: { id: documentId },
      data: {
        status: status as any,
        reviewNote,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    })

    // Send email notification
    try {
      const user = document.driver.user
      if (user.email && user.name) {
        if (status === "APPROVED") {
          await sendDocumentApprovalEmail(user.email, user.name, document.type)
        } else if (status === "REJECTED") {
          await sendDocumentRejectionEmail(user.email, user.name, document.type, reviewNote)
        }
      }
    } catch (emailError) {
      console.error("[v0] Failed to send document review email:", emailError)
      // Continue even if email fails
    }

    // Create notification
    try {
      const driverName = document.driver.user.name || "Driver"
      const docType = document.type.replace(/_/g, " ").toLowerCase()
      
      await createNotification({
        userId: session.user.id,
        type: status === "APPROVED" ? NotificationType.DOCUMENT_APPROVED : NotificationType.DOCUMENT_REJECTED,
        priority: NotificationPriority.MEDIUM,
        title: status === "APPROVED" ? "Document approved" : "Document rejected",
        message: `${driverName}'s ${docType} was ${status === "APPROVED" ? "approved" : "rejected"}.`,
        link: "/admin/verification",
        metadata: {
          driverId: document.driverId,
          documentId: document.id,
          docType: document.type,
        },
      })
    } catch (notificationError) {
      console.error("[v0] Failed to create document review notification:", notificationError)
      // Continue even if notification fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Review document error:", error)
    return NextResponse.json({ error: "Failed to review document" }, { status: 500 })
  }
}
