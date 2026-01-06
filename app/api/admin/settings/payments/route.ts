import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env"

// Helper to get/set settings
async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
  })
  return setting?.value || null
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

async function getSettings() {
  const [
    mode,
    currency,
    defaultRentCycle,
    defaultDueDay,
    gracePeriodDays,
    remindersEnabled,
    reminderFromEmail,
    reminderDaysBefore,
    reminderOnDueDate,
    reminderDaysOverdue,
  ] = await Promise.all([
    getSetting("payments.mode"),
    getSetting("payments.currency"),
    getSetting("payments.defaultRentCycle"),
    getSetting("payments.defaultDueDay"),
    getSetting("payments.gracePeriodDays"),
    getSetting("reminders.enabled"),
    getSetting("reminders.fromEmail"),
    getSetting("reminders.schedule.daysBefore"),
    getSetting("reminders.schedule.onDueDate"),
    getSetting("reminders.schedule.daysOverdue"),
  ])

  return {
    mode: mode || "MANUAL",
    currency: currency || "ZAR",
    defaultRentCycle: (defaultRentCycle as "WEEKLY" | "MONTHLY") || "WEEKLY",
    defaultDueDay: defaultDueDay ? parseInt(defaultDueDay) : 25,
    gracePeriodDays: gracePeriodDays ? parseInt(gracePeriodDays) : 3,
    remindersEnabled: remindersEnabled === "true",
    reminderFromEmail: reminderFromEmail || "",
    reminderSchedule: {
      daysBefore: reminderDaysBefore ? parseInt(reminderDaysBefore) : 3,
      onDueDate: reminderOnDueDate !== "false",
      daysOverdue: reminderDaysOverdue ? parseInt(reminderDaysOverdue) : 3,
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const settings = await getSettings()

    // Check environment variable status
    const envStatus = {
      resend: !!env.mail.resendApiKey,
      stripe: !!(env.stripe.secretKey && env.stripe.webhookSecret),
    }

    return NextResponse.json({ settings, envStatus })
  } catch (error: any) {
    console.error("Failed to fetch payment settings:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const {
      mode,
      currency,
      defaultRentCycle,
      defaultDueDay,
      gracePeriodDays,
      remindersEnabled,
      reminderFromEmail,
      reminderSchedule,
    } = body

    // Validate mode
    if (mode && mode !== "MANUAL" && mode !== "STRIPE") {
      return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 })
    }

    // Validate defaultDueDay
    if (defaultDueDay !== undefined && (defaultDueDay < 1 || defaultDueDay > 31)) {
      return NextResponse.json({ error: "Default due day must be between 1 and 31" }, { status: 400 })
    }

    // Save settings
    await Promise.all([
      mode && setSetting("payments.mode", mode),
      currency && setSetting("payments.currency", currency),
      defaultRentCycle && setSetting("payments.defaultRentCycle", defaultRentCycle),
      defaultDueDay !== undefined && setSetting("payments.defaultDueDay", defaultDueDay.toString()),
      gracePeriodDays !== undefined && setSetting("payments.gracePeriodDays", gracePeriodDays.toString()),
      remindersEnabled !== undefined && setSetting("reminders.enabled", remindersEnabled.toString()),
      reminderFromEmail !== undefined && setSetting("reminders.fromEmail", reminderFromEmail),
      reminderSchedule?.daysBefore !== undefined &&
        setSetting("reminders.schedule.daysBefore", reminderSchedule.daysBefore.toString()),
      reminderSchedule?.onDueDate !== undefined &&
        setSetting("reminders.schedule.onDueDate", reminderSchedule.onDueDate.toString()),
      reminderSchedule?.daysOverdue !== undefined &&
        setSetting("reminders.schedule.daysOverdue", reminderSchedule.daysOverdue.toString()),
    ])

    const updatedSettings = await getSettings()

    return NextResponse.json({ settings: updatedSettings })
  } catch (error: any) {
    console.error("Failed to update payment settings:", error)
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 })
  }
}

