import { sendEmail } from "@/lib/email/sendEmail"
import { emailConfig } from "@/lib/email/config"
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

export async function sendActivationEmail(email: string, name: string, token: string) {
  const activationUrl = `${emailConfig.baseUrl}/activate/${token}`

  await sendEmail({
    to: email,
    subject: "Activate Your Account - FleetHub",
    html: activationEmailTemplate(name, activationUrl),
    replyTo: emailConfig.replyToEmail, // Replies go to Gmail
  })
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
