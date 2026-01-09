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
 */
export async function checkPaymentConfiguration(): Promise<PaymentConfigStatus> {
  const missing: string[] = []
  const warnings: string[] = []

  // 1. Payment method (required)
  const paymentMethod = await getSetting("payments.method", "") || await getSetting("payments.mode", "")
  if (!paymentMethod || (paymentMethod !== "MANUAL" && paymentMethod !== "STRIPE")) {
    missing.push("Payment method not selected")
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

  // Warnings (not blocking, but should be noted)
  if (paymentMethod === "STRIPE") {
    // Check if Stripe keys are configured (this is env-based, not settings-based)
    // We can't check this here, but the UI should show this
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
