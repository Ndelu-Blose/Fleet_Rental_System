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
  // Validate API key before attempting to send
  if (!emailConfig.apiKey) {
    const error = new Error("RESEND_API_KEY is not configured. Please set it in your environment variables.")
    console.error("[Email] Configuration error:", error.message)
    throw error
  }
  
  // Log email attempt for debugging
  const fromAddress = from || emailConfig.from
  console.log("[Email] Attempting to send email:", {
    to,
    from: fromAddress,
    subject,
    hasApiKey: !!emailConfig.apiKey,
    apiKeyPrefix: emailConfig.apiKey?.substring(0, 10) + "...",
  })
  
  try {
    const result = await resend.emails.send({
      from: from || emailConfig.from,
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    })
    
    // Verify that Resend actually returned a valid response
    if (!result || typeof result !== 'object') {
      throw new Error("Resend API returned an invalid response format")
    }
    
    // Check for error in response (Resend sometimes returns errors in the response object)
    if ('error' in result && result.error) {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error)
      throw new Error(`Resend API error: ${errorMsg}`)
    }
    
    // Verify we got an ID (indicates successful send)
    if (!result.id) {
      console.warn("[Email] Resend API returned response without ID:", result)
      // Don't throw here - some Resend responses might not have ID immediately
      // But log it for debugging
    } else {
      console.log("[Email] Email sent successfully via Resend:", {
        resendId: result.id,
        to,
        from: fromAddress,
      })
    }
    
    return result
  } catch (error) {
    console.error("[Email] Failed to send email:", error)
    
    // Parse Resend-specific errors
    let errorMessage = "Failed to send email"
    let errorDetails: any = {}
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for common Resend error patterns
      const errorStr = error.message.toLowerCase()
      
      if (errorStr.includes('api key') || errorStr.includes('unauthorized') || errorStr.includes('authentication')) {
        errorMessage = "Invalid or missing Resend API key. Please check your RESEND_API_KEY environment variable."
        errorDetails = { type: "API_KEY_ERROR", originalError: error.message }
      } else if (errorStr.includes('domain') || errorStr.includes('verify') || errorStr.includes('not verified')) {
        errorMessage = `Email domain not verified. The "from" address "${from || emailConfig.from}" uses a domain that hasn't been verified in Resend. Use "onboarding@resend.dev" for testing or verify your domain in Resend dashboard.`
        errorDetails = { type: "DOMAIN_ERROR", fromAddress: from || emailConfig.from, originalError: error.message }
      } else if (errorStr.includes('rate limit') || errorStr.includes('too many')) {
        errorMessage = "Rate limit exceeded. Please wait a few minutes before trying again."
        errorDetails = { type: "RATE_LIMIT_ERROR", originalError: error.message }
      } else if (errorStr.includes('invalid') && errorStr.includes('email')) {
        errorMessage = `Invalid email address: ${to}`
        errorDetails = { type: "INVALID_EMAIL", email: to, originalError: error.message }
      } else {
        errorDetails = { type: "UNKNOWN_ERROR", originalError: error.message, stack: error.stack }
      }
    } else {
      errorMessage = String(error)
      errorDetails = { type: "UNKNOWN_ERROR", originalError: String(error) }
    }
    
    // Create enhanced error with details
    const enhancedError = new Error(errorMessage)
    ;(enhancedError as any).details = errorDetails
    ;(enhancedError as any).originalError = error
    
    throw enhancedError
  }
}

