import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { sendEmail } from "@/lib/email/sendEmail"
import { prisma } from "@/lib/prisma"

// Helper to get setting
async function getSettingValue(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
  })
  return setting?.value || null
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()

    const fromEmail = await getSettingValue("reminders.fromEmail")
    const remindersEnabled = await getSettingValue("reminders.enabled")

    if (remindersEnabled !== "true") {
      return NextResponse.json({ error: "Reminders are not enabled" }, { status: 400 })
    }

    if (!fromEmail) {
      return NextResponse.json({ error: "From email is not configured" }, { status: 400 })
    }

    // Get admin email from session
    const adminEmail = session.user.email

    if (!adminEmail) {
      return NextResponse.json({ error: "Admin email not found" }, { status: 400 })
    }

    // Send test email
    await sendEmail({
      to: adminEmail,
      from: fromEmail,
      subject: "Payment Reminder Test - FleetHub",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder Test</h2>
          <p>This is a test email to verify your payment reminder configuration.</p>
          <p>If you received this email, your Resend API key and email settings are working correctly.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from FleetHub.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: "Test email sent successfully" })
  } catch (error: any) {
    console.error("Failed to send test email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send test email. Check your Resend API key." },
      { status: 500 },
    )
  }
}

