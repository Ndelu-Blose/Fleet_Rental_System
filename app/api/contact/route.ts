import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/sendEmail"
import { emailConfig } from "@/lib/email/config"
import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message is too long"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const validationResult = contactSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = validationResult.data

    // Send email to support (Gmail)
    await sendEmail({
      to: emailConfig.replyToEmail,
      replyTo: email, // Reply goes back to the person who sent the inquiry
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #111; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #666;"><strong>From:</strong> ${name}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #333; white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              Reply to this email to respond directly to ${name}.
            </p>
          </div>
        </div>
      `,
    })

    // Send auto-reply to sender
    await sendEmail({
      to: email,
      subject: `Re: ${subject} - We Received Your Message`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✓ Message Received</h1>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
            
            <p style="color: #666; font-size: 16px;">
              Thank you for contacting ${emailConfig.appName}. We have received your message and will get back to you soon.
            </p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #666;"><strong>Your Subject:</strong> ${subject}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              We typically respond within 24-48 hours. If your matter is urgent, please call us directly.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              ${emailConfig.appName} Team
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
          </div>
        </div>
      `,
      replyTo: emailConfig.replyToEmail,
    })

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. We'll get back to you soon!",
    })
  } catch (error) {
    console.error("[Contact] Failed to send contact form:", error)
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    )
  }
}

