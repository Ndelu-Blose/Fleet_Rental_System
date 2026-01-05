import { Resend } from "resend"
import { env } from "@/lib/env"

const resend = new Resend(env.mail.resendApiKey)

export async function sendActivationEmail(email: string, name: string, token: string) {
  const activationUrl = `${env.auth.url}/activate/${token}`

  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Activate Your Fleet Rental Account",
    html: `
      <h1>Welcome to Fleet Rental, ${name}!</h1>
      <p>Your account has been created. Please activate your account by clicking the link below:</p>
      <p><a href="${activationUrl}">Activate Account</a></p>
      <p>This link will expire in 7 days.</p>
      <p>If you did not request this account, please ignore this email.</p>
    `,
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

  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: `Payment Reminder: R ${amount} due ${formattedDate}`,
    html: `
      <h1>Payment Reminder</h1>
      <p>Hi ${name},</p>
      <p>This is a reminder that your rental payment is due soon.</p>
      <p><strong>Amount:</strong> R ${amount}</p>
      <p><strong>Due Date:</strong> ${formattedDate}</p>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p>Please log in to your account to make the payment.</p>
      <p><a href="${env.auth.url}/driver/payments">View Payments</a></p>
    `,
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

  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: `URGENT: Payment Overdue - R ${amount}`,
    html: `
      <h1>Payment Overdue</h1>
      <p>Hi ${name},</p>
      <p>Your rental payment is now overdue. Please make payment as soon as possible.</p>
      <p><strong>Amount:</strong> R ${amount}</p>
      <p><strong>Due Date:</strong> ${formattedDate}</p>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p>Please log in to your account to make the payment immediately.</p>
      <p><a href="${env.auth.url}/driver/payments">Pay Now</a></p>
    `,
  })
}

export async function sendDocumentApprovalEmail(email: string, name: string, docType: string) {
  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Document Approved",
    html: `
      <h1>Document Approved</h1>
      <p>Hi ${name},</p>
      <p>Your ${docType} document has been reviewed and approved.</p>
      <p>You can continue with your profile verification process.</p>
      <p><a href="${env.auth.url}/driver/profile">View Profile</a></p>
    `,
  })
}

export async function sendDocumentRejectionEmail(
  email: string,
  name: string,
  docType: string,
  reviewNote: string | null,
) {
  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Document Rejected - Action Required",
    html: `
      <h1>Document Rejected</h1>
      <p>Hi ${name},</p>
      <p>Your ${docType} document has been reviewed and rejected.</p>
      ${reviewNote ? `<p><strong>Reason:</strong> ${reviewNote}</p>` : ""}
      <p>Please upload a new document to continue with your verification.</p>
      <p><a href="${env.auth.url}/driver/profile">Upload Document</a></p>
    `,
  })
}

export async function sendVerificationCompleteEmail(email: string, name: string) {
  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Account Verified - Welcome!",
    html: `
      <h1>Account Verified</h1>
      <p>Hi ${name},</p>
      <p>Congratulations! Your account has been verified and you are now eligible for vehicle assignment.</p>
      <p>An administrator will contact you soon about vehicle assignment.</p>
      <p><a href="${env.auth.url}/driver">View Dashboard</a></p>
    `,
  })
}

export async function sendVerificationRejectedEmail(email: string, name: string, note: string | null) {
  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Verification Rejected",
    html: `
      <h1>Verification Rejected</h1>
      <p>Hi ${name},</p>
      <p>Unfortunately, your account verification has been rejected.</p>
      ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ""}
      <p>Please review your profile and documents, then contact support if you have questions.</p>
      <p><a href="${env.auth.url}/driver/profile">View Profile</a></p>
    `,
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

  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Vehicle Assigned - Contract Created",
    html: `
      <h1>Vehicle Assigned</h1>
      <p>Hi ${name},</p>
      <p>Congratulations! A vehicle has been assigned to you.</p>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p><strong>Rental Fee:</strong> R ${amount} per ${frequency.toLowerCase()}</p>
      <p>You can now view your contract and payment schedule in your dashboard.</p>
      <p><a href="${env.auth.url}/driver">View Dashboard</a></p>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${env.auth.url}/reset-password/${token}`

  await resend.emails.send({
    from: env.mail.from,
    to: email,
    subject: "Reset Your Password",
    html: `
      <h1>Password Reset Request</h1>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `,
  })
}
