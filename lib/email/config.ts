export const emailConfig = {
  provider: "resend",

  apiKey: process.env.RESEND_API_KEY!,
  from: process.env.MAIL_FROM || "FleetHub <onboarding@resend.dev>",

  appName: "FleetHub",
  supportEmail: process.env.SUPPORT_EMAIL || "support@fleethub.co.za",
  // Reply-to email (Gmail) - replies go here instead of FROM address
  replyToEmail: process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || "cliveuxweb@gmail.com",
  baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
}

