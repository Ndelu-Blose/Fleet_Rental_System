// Single source of truth for email "from" address
// Priority: RESEND_FROM (production) > MAIL_FROM (dev) > test sender
export const EMAIL_FROM =
  process.env.RESEND_FROM?.trim() ||
  process.env.MAIL_FROM?.trim() ||
  "FleetHub <onboarding@resend.dev>"

export const emailConfig = {
  provider: "resend",

  apiKey: process.env.RESEND_API_KEY!,
  // Use single EMAIL_FROM constant (Resend-first, MAIL_FROM fallback for dev)
  from: EMAIL_FROM,

  appName: "FleetHub",
  supportEmail: process.env.SUPPORT_EMAIL || "support@fleethub.co.za",
  // Reply-to email (Gmail) - replies go here instead of FROM address
  replyToEmail: process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || "cliveuxweb@gmail.com",
  // Support both AUTH_URL (Auth.js v5) and NEXTAUTH_URL (NextAuth v4)
  baseUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
}

