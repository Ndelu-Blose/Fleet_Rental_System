import { sendEmail } from "@/lib/email/sendEmail"
import { emailConfig } from "@/lib/email/config"
import { resend } from "@/lib/email/resend"
import { activationEmailTemplate } from "@/lib/email/templates/activation"
import { passwordResetEmailTemplate } from "@/lib/email/templates/passwordReset"
import { emailChangeVerificationTemplate, emailChangeConfirmationTemplate } from "@/lib/email/templates/emailChange"
import { paymentReminderTemplate, paymentOverdueTemplate } from "@/lib/email/templates/payments"
import { 
  documentApprovalTemplate, 
  documentRejectionTemplate, 
  verificationCompleteTemplate, 
  verificationRejectedTemplate 
} from "@/lib/email/templates/verification"
import { contractCreatedTemplate } from "@/lib/email/templates/contract"

/**
 * Get the "from" email address with proper priority:
 * 1. RESEND_FROM (production - verified domain)
 * 2. MAIL_FROM (dev fallback)
 * 3. Test sender (onboarding@resend.dev)
 */
function getFrom() {
  // ✅ Production sender (your verified domain)
  const resendFrom = process.env.RESEND_FROM?.trim()
  
  // Optional fallback (dev only)
  const mailFrom = process.env.MAIL_FROM?.trim()
  
  return resendFrom || mailFrom || "FleetHub <onboarding@resend.dev>"
}

export async function sendActivationEmail(email: string, name: string, token: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing in environment variables")
  }

  const from = getFrom()
  const activationUrl = `${emailConfig.baseUrl}/activate/${token}`
  const subject = "Activate your FleetHub account"

  try {
    const response = await resend.emails.send({
      from, // ✅ Uses RESEND_FROM (production) or MAIL_FROM (dev) or test sender
      to: email,
      subject,
      html: activationEmailTemplate(name, activationUrl),
      // No replyTo for activation emails (matches email change verification pattern)
    })

    // ✅ CORRECT Resend response handling
    // Resend returns: { data: { id: "email_xxxxx" }, error: null } on success
    // Or: { data: null, error: { message: "..." } } on failure
    if (response.error) {
      throw new Error(response.error.message || "Resend API error")
    }

    const emailId = response.data?.id
    if (!emailId) {
      // Log the full response for debugging
      console.error("[sendActivationEmail] Resend response missing ID:", JSON.stringify(response, null, 2))
      throw new Error(
        `Resend did not return an email ID. Response: ${JSON.stringify(response)}`
      )
    }

    // Optional: log for audit/debug
    console.log("[Resend] Activation email sent successfully:", {
      resendId: emailId,
      to: email,
      from,
    })

    // Return the email ID for tracking
    return { id: emailId, data: response.data }
  } catch (err: any) {
    // Extract error message from various possible formats
    const message =
      err?.message ||
      err?.response?.data?.message ||
      err?.error?.message ||
      String(err)

    console.error("[sendActivationEmail] Failed to send:", {
      message,
      error: err,
      from,
      to: email,
    })
    
    throw new Error(message)
  }
}

export async function sendPaymentReminderEmail(
  email: string,
  name: string,
  amountCents: number,
  dueDate: Date,
  vehicleReg: string,
) {
  const amount = (amountCents / 100).toFixed(2)
  const formattedDate = dueDate.toLocaleDateString()

  await sendEmail({
    to: email,
    subject: `Payment Reminder: R ${amount} due ${formattedDate}`,
    html: paymentReminderTemplate(name, amount, formattedDate, vehicleReg),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendPaymentOverdueEmail(
  email: string,
  name: string,
  amountCents: number,
  dueDate: Date,
  vehicleReg: string,
) {
  const amount = (amountCents / 100).toFixed(2)
  const formattedDate = dueDate.toLocaleDateString()

  await sendEmail({
    to: email,
    subject: `URGENT: Payment Overdue - R ${amount}`,
    html: paymentOverdueTemplate(name, amount, formattedDate, vehicleReg),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendDocumentApprovalEmail(email: string, name: string, docType: string) {
  await sendEmail({
    to: email,
    subject: "Document Approved",
    html: documentApprovalTemplate(name, docType),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendDocumentRejectionEmail(
  email: string,
  name: string,
  docType: string,
  reviewNote: string | null,
) {
  await sendEmail({
    to: email,
    subject: "Document Rejected - Action Required",
    html: documentRejectionTemplate(name, docType, reviewNote),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendVerificationCompleteEmail(email: string, name: string) {
  await sendEmail({
    to: email,
    subject: "Account Verified - Welcome!",
    html: verificationCompleteTemplate(name),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendVerificationRejectedEmail(email: string, name: string, note: string | null) {
  await sendEmail({
    to: email,
    subject: "Verification Rejected",
    html: verificationRejectedTemplate(name, note),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendContractCreatedEmail(
  email: string,
  name: string,
  vehicleReg: string,
  feeAmountCents: number,
  frequency: string,
) {
  const amount = (feeAmountCents / 100).toFixed(2)

  await sendEmail({
    to: email,
    subject: "Vehicle Assigned - Contract Created",
    html: contractCreatedTemplate(name, vehicleReg, amount, frequency),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${emailConfig.baseUrl}/reset-password/${token}`

  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: passwordResetEmailTemplate(name, resetUrl),
    // No replyTo for password reset (security)
  })
}

export async function sendEmailChangeVerificationEmail(
  email: string,
  name: string,
  token: string,
) {
  const verificationUrl = `${emailConfig.baseUrl}/admin/profile/verify-email/${token}`

  await sendEmail({
    to: email,
    subject: "Verify Your New Email Address",
    html: emailChangeVerificationTemplate(name, verificationUrl),
    // No replyTo for email change verification (security)
  })
}

export async function sendEmailChangeConfirmationEmail(
  oldEmail: string,
  newEmail: string,
  name: string,
) {
  await sendEmail({
    to: oldEmail,
    subject: "Email Address Changed",
    html: emailChangeConfirmationTemplate(name, oldEmail, newEmail),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
}
