export const emailConfig = {
  provider: "resend",

  apiKey: process.env.RESEND_API_KEY!,
  // Use RESEND_FROM env var, fallback to test sender for dev
  from: process.env.RESEND_FROM?.trim() || process.env.MAIL_FROM || "FleetHub <onboarding@resend.dev>",

  appName: "FleetHub",
  supportEmail: process.env.SUPPORT_EMAIL || "support@fleethub.co.za",
  // Reply-to email (Gmail) - replies go here instead of FROM address
  replyToEmail: process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || "cliveuxweb@gmail.com",
  // Support both AUTH_URL (Auth.js v5) and NEXTAUTH_URL (NextAuth v4)
  baseUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
}

