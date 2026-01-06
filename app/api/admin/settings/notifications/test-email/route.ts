import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { sendEmail } from "@/lib/email/sendEmail";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const settings = await getSettings([
      "notifications.enabled",
      "notifications.fromEmail",
      "notifications.template.paymentReminder",
    ]);

    const enabled = settings["notifications.enabled"] === "true";
    const fromEmail = settings["notifications.fromEmail"]?.trim();
    const template = settings["notifications.template.paymentReminder"] || "";

    if (!enabled) {
      return NextResponse.json(
        { error: "Notifications are not enabled" },
        { status: 400 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { error: "From email is not configured" },
        { status: 400 }
      );
    }

    // Get admin email from session
    const adminEmail = session.user.email;

    if (!adminEmail) {
      return NextResponse.json(
        { error: "Admin email not found" },
        { status: 400 }
      );
    }

    // Replace template placeholders with test data
    let html = template || "This is a test notification email.";
    html = html
      .replace(/\{\{driverName\}\}/g, "Test Driver")
      .replace(/\{\{amount\}\}/g, "R 500.00")
      .replace(/\{\{dueDate\}\}/g, new Date().toLocaleDateString());

    // If no template, use default
    if (!template) {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Notification Test - FleetHub</h2>
          <p>This is a test email to verify your notification configuration.</p>
          <p>If you received this email, your Resend API key and email settings are working correctly.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from FleetHub.
          </p>
        </div>
      `;
    } else {
      html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; white-space: pre-wrap;">${html}</div>`;
    }

    // Send test email
    await sendEmail({
      to: adminEmail,
      from: fromEmail,
      subject: "Notification Test - FleetHub",
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error: any) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to send test email. Check your Resend API key.",
      },
      { status: 500 }
    );
  }
}

