/**
 * Single source of truth for payment configuration completeness
 * Used by: Setup checklist, Settings page, Dashboard
 */

import { getSetting, getSettingInt, getSettingBool, getSettingJSON } from "./settings"

type PaymentConfigStatus = {
  configured: boolean
  missing: string[]
  warnings: string[]
}

type ReminderSchedule = {
  daysBefore: number
  onDueDate: boolean
  daysOverdue: number
}

type PaymentSettings = {
  mode: string
  currency: string
  defaultRentCycle: string
  defaultDueDay: number | null
  defaultDueWeekday: number | null
  gracePeriodDays: number | null
  remindersEnabled: boolean
  reminderFromEmail: string
  reminderSchedule: ReminderSchedule | null
}

/**
 * Check if payments are fully configured
 * Returns configured status and list of missing requirements
 * 
 * Business logic requirements:
 * 1. Company identity (who receives money)
 * 2. Payment provider (how money is collected)
 * 3. Payment collection method (online/manual/hybrid)
 * 4. Currency and cycle defaults
 * 5. Due date logic
 * 6. Grace period and overdue handling
 * 7. Reminder rules (if enabled)
 */
export async function checkPaymentConfiguration(): Promise<PaymentConfigStatus> {
  const missing: string[] = []
  const warnings: string[] = []

  // 1. Company identity (required - who receives the money)
  const companyName = await getSetting("company.name", "")
  const companyEmail = await getSetting("company.email", "")
  if (!companyName || companyName.trim() === "") {
    missing.push("Company name not set (required for payment receipts)")
  }
  if (!companyEmail || companyEmail.trim() === "") {
    missing.push("Company email not set (required for payment receipts)")
  }

  // 2. Payment provider (required)
  const paymentMethod = await getSetting("payments.method", "") || await getSetting("payments.mode", "")
  if (!paymentMethod || (paymentMethod !== "MANUAL" && paymentMethod !== "STRIPE")) {
    missing.push("Payment provider not selected")
  }

  // 2. Currency (required)
  const currency = await getSetting("payments.currency", "")
  if (!currency || currency.trim() === "") {
    missing.push("Currency not set")
  }

  // 3. Default rent cycle (required)
  const defaultRentCycle = await getSetting("payments.defaultRentCycle", "")
  if (!defaultRentCycle || !["DAILY", "WEEKLY", "MONTHLY"].includes(defaultRentCycle)) {
    missing.push("Default rent cycle not set")
  }

  // 4. Due logic (required based on cycle)
  if (defaultRentCycle === "WEEKLY") {
    const defaultDueWeekday = await getSettingInt("payments.defaultDueWeekday", -1)
    if (defaultDueWeekday < 0 || defaultDueWeekday > 6) {
      missing.push("Default due weekday not set (required for weekly payments)")
    }
  } else if (defaultRentCycle === "MONTHLY") {
    const defaultDueDay = await getSettingInt("payments.defaultDueDay", -1)
    if (defaultDueDay < 1 || defaultDueDay > 31) {
      missing.push("Default due day not set (required for monthly payments)")
    }
  } else if (defaultRentCycle === "DAILY") {
    // Daily doesn't need a specific day
  }

  // 5. Grace period (required - must be explicitly set, even if 0)
  const gracePeriodDays = await getSetting("payments.gracePeriodDays", "")
  if (gracePeriodDays === "" || gracePeriodDays === null) {
    missing.push("Grace period not set")
  } else {
    const graceNum = Number(gracePeriodDays)
    if (!Number.isFinite(graceNum) || graceNum < 0) {
      missing.push("Grace period must be a valid number (0 or greater)")
    }
  }

  // 6. Reminder rules (required if reminders are enabled)
  const remindersEnabled =
    (await getSettingBool("payments.remindersEnabled", false)) ||
    (await getSettingBool("reminders.enabled", false))
  if (remindersEnabled) {
    const reminderFromEmail =
      (await getSetting("payments.reminderFromEmail", "")) ||
      (await getSetting("reminders.fromEmail", ""))
    if (!reminderFromEmail || reminderFromEmail.trim() === "") {
      missing.push("Reminder from email not set (required when reminders are enabled)")
    }

    // Check reminder schedule (can be stored as JSON or individual keys)
    const reminderScheduleJson = await getSettingJSON<ReminderSchedule | null>(
      "payments.reminderSchedule",
      null
    )
    const reminderDaysBefore = await getSettingInt("reminders.schedule.daysBefore", -1)
    const reminderDaysOverdue = await getSettingInt("reminders.schedule.daysOverdue", -1)

    if (reminderScheduleJson) {
      // Using JSON format
      if (typeof reminderScheduleJson.daysBefore !== "number" || reminderScheduleJson.daysBefore < 0) {
        missing.push("Reminder days before due not set")
      }
      if (typeof reminderScheduleJson.daysOverdue !== "number" || reminderScheduleJson.daysOverdue < 0) {
        missing.push("Reminder days overdue not set")
      }
    } else {
      // Using individual keys
      if (reminderDaysBefore < 0) {
        missing.push("Reminder days before due not set")
      }
      if (reminderDaysOverdue < 0) {
        missing.push("Reminder days overdue not set")
      }
    }
  }

  // 7. Payment collection method clarity (business requirement)
  // This checks if the system knows HOW drivers can pay
  // For now, we infer from payment method, but this could be expanded
  // to explicitly track: "ONLINE_ONLY", "MANUAL_ALLOWED", "HYBRID"
  if (paymentMethod === "STRIPE") {
    // If Stripe is selected, assume online payments are enabled
    // Could add explicit setting: payments.collectionMethod = "ONLINE_ONLY" | "HYBRID"
    // For now, this is acceptable
  } else if (paymentMethod === "MANUAL") {
    // Manual mode is clear - no online payments
    // This is acceptable
  }

  // 8. First payment timing (business requirement)
  // Currently inferred from contract start date logic
  // Could add explicit setting: payments.firstPaymentTiming = "BEFORE_ACTIVATION" | "ON_START" | "END_OF_CYCLE"
  // For now, we assume contracts handle this, but it's worth noting as a potential gap
  const firstPaymentTiming = await getSetting("payments.firstPaymentTiming", "")
  if (!firstPaymentTiming) {
    // Not blocking, but should be noted
    warnings.push("First payment timing not explicitly set (using contract defaults)")
  }

  // 9. Payment failure handling (business requirement)
  // What happens when payment fails? Lock contract? Mark vehicle at risk?
  // Could add: payments.failureAction = "LOCK_CONTRACT" | "NOTIFY_ONLY" | "MARK_AT_RISK"
  const failureAction = await getSetting("payments.failureAction", "")
  if (!failureAction) {
    // Not blocking, but should be noted
    warnings.push("Payment failure handling not explicitly defined")
  }

  // Warnings (not blocking, but should be noted)
  if (paymentMethod === "STRIPE") {
    // Check if Stripe keys are configured (this is env-based, not settings-based)
    // We can't check this here, but the UI should show this
    warnings.push("Verify Stripe API keys are configured in environment variables")
  }

  return {
    configured: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Get payment settings for UI display
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const mode = await getSetting("payments.method", "")
  const currency = await getSetting("payments.currency", "ZAR")
  const defaultRentCycle = await getSetting("payments.defaultRentCycle", "WEEKLY")
  const defaultDueDay = await getSettingInt("payments.defaultDueDay", -1)
  const defaultDueWeekday = await getSettingInt("payments.defaultDueWeekday", -1)
  const gracePeriodDays = await getSettingInt("payments.gracePeriodDays", -1)
  const remindersEnabled = await getSettingBool("payments.remindersEnabled", false)
  const reminderFromEmail = await getSetting("payments.reminderFromEmail", "")
  const reminderSchedule = await getSettingJSON<ReminderSchedule | null>(
    "payments.reminderSchedule",
    null
  )

  return {
    mode,
    currency,
    defaultRentCycle,
    defaultDueDay: defaultDueDay >= 0 ? defaultDueDay : null,
    defaultDueWeekday: defaultDueWeekday >= 0 ? defaultDueWeekday : null,
    gracePeriodDays: gracePeriodDays >= 0 ? gracePeriodDays : null,
    remindersEnabled,
    reminderFromEmail,
    reminderSchedule,
  }
}
