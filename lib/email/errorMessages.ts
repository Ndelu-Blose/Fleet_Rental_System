/**
 * Converts technical email errors into admin-friendly messages
 * Technical details are logged but not shown to non-technical users
 */

export function getFriendlyEmailError(technicalError: string | null | undefined): {
  friendlyMessage: string
  shouldShowDetails: boolean
} {
  if (!technicalError) {
    return {
      friendlyMessage: "We couldn't send the activation email. Please try again or use the activation link below.",
      shouldShowDetails: false,
    }
  }

  const errorLower = technicalError.toLowerCase()

  // Domain verification errors
  if (
    errorLower.includes('domain') ||
    errorLower.includes('verified') ||
    errorLower.includes('resend') ||
    errorLower.includes('onboarding@resend.dev')
  ) {
    return {
      friendlyMessage:
        "We couldn't send the activation email yet because email sending is still being set up.\n\nThis does not affect the driver account. You can safely send the activation link below.",
      shouldShowDetails: false,
    }
  }

  // API key errors
  if (errorLower.includes('api key') || errorLower.includes('unauthorized') || errorLower.includes('authentication')) {
    return {
      friendlyMessage:
        "We couldn't send the activation email because email sending isn't configured yet.\n\nThis does not affect the driver account. You can safely send the activation link below.",
      shouldShowDetails: false,
    }
  }

  // Rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return {
      friendlyMessage:
        "We've sent too many emails recently. Please wait a few minutes and try again, or use the activation link below.",
      shouldShowDetails: false,
    }
  }

  // Invalid email address
  if (errorLower.includes('invalid') && errorLower.includes('email')) {
    return {
      friendlyMessage: "The email address provided is invalid. Please check the email and try again.",
      shouldShowDetails: true, // Show this one as it's actionable
    }
  }

  // Generic fallback
  return {
    friendlyMessage:
      "We couldn't send the activation email. This does not affect the driver account.\n\nYou can safely send the activation link below.",
    shouldShowDetails: false,
  }
}

