import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/sendEmail"
import { requireAdmin } from "@/lib/permissions"

export async function POST() {
  try {
    // Only allow admins to test emails
    await requireAdmin()

    const testEmail = process.env.TEST_EMAIL || "test@example.com"

    await sendEmail({
      to: testEmail,
      subject: "FleetHub Email Test",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ Email System Test</h1>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Email System Working!</h2>
            
            <p style="color: #666; font-size: 16px;">
              If you're reading this, your FleetHub email system is properly configured and working.
            </p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #666;"><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0 0 0; color: #666;"><strong>Provider:</strong> Resend</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              All email functionality (activation, password reset, notifications, etc.) should now work correctly.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} FleetHub. All rights reserved.</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    })
  } catch (error) {
    console.error("[Email] Test email error:", error)
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

