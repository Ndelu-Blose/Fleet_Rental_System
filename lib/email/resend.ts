import { Resend } from "resend"
import { emailConfig } from "./config"

if (!emailConfig.apiKey) {
  throw new Error("RESEND_API_KEY is not defined. Please set it in your environment variables.")
}

export const resend = new Resend(emailConfig.apiKey)

