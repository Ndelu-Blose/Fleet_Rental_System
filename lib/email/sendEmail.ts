import { resend } from "./resend"
import { emailConfig } from "./config"

type SendEmailProps = {
  to: string
  subject: string
  html: string
  replyTo?: string
  from?: string
}

export async function sendEmail({ to, subject, html, replyTo, from }: SendEmailProps) {
  try {
    const result = await resend.emails.send({
      from: from || emailConfig.from,
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    })

    return result
  } catch (error) {
    console.error("[Email] Failed to send email:", error)
    throw error
  }
}

