import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmailChangeConfirmationEmail } from "@/lib/mail"
import { createNotification } from "@/lib/notifications"
import { NotificationType, NotificationPriority } from "@prisma/client"
import { redirect } from "next/navigation"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const { token } = resolvedParams

    // Find user by verification token
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        activationExpires: true,
        emailChangePending: true,
      },
    })

    if (!user) {
      return redirect("/admin/profile?error=invalid_token")
    }

    // Check if token expired
    if (!user.activationExpires || user.activationExpires < new Date()) {
      return redirect("/admin/profile?error=expired_token")
    }

    if (!user.emailChangePending) {
      return redirect("/admin/profile?error=no_pending_email")
    }

    const oldEmail = user.email
    const newEmail = user.emailChangePending

    // Check if new email is already taken by another user
    const emailExists = await prisma.user.findUnique({
      where: { email: newEmail },
    })

    if (emailExists && emailExists.id !== user.id) {
      return redirect("/admin/profile?error=email_already_taken")
    }

    // Update email
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: newEmail,
          isEmailVerified: true,
          activationToken: null,
          activationExpires: null,
          emailChangePending: null,
        },
      })
    } catch (updateError: any) {
      console.error("[Admin] Failed to update email:", updateError)
      
      // Handle unique constraint violation
      if (updateError?.code === "P2002") {
        return redirect("/admin/profile?error=email_already_taken")
      }
      
      throw updateError // Re-throw to be caught by outer catch
    }

    // Send confirmation to old email
    try {
      await sendEmailChangeConfirmationEmail(oldEmail, newEmail, user.name || "Admin")
    } catch (emailError) {
      console.error("[Admin] Failed to send confirmation email:", emailError)
      // Continue even if confirmation email fails
    }

    // Create notification
    try {
      await createNotification({
        userId: user.id,
        type: NotificationType.EMAIL_CHANGED,
        priority: NotificationPriority.HIGH,
        title: "Email updated",
        message: `Your email address was changed from ${oldEmail} to ${newEmail}.`,
        link: "/admin/profile",
      })
    } catch (notificationError) {
      console.error("[Admin] Failed to create email change notification:", notificationError)
      // Continue even if notification fails
    }

    return redirect("/admin/profile?success=email_verified")
  } catch (error) {
    console.error("[Admin] Verify email error:", error)
    return redirect("/admin/profile?error=verification_failed")
  }
}

