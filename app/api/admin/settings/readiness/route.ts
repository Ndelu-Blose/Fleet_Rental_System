import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import {
  getCompanyStatus,
  getContractsStatus,
  getPaymentsStatus,
  getOnboardingStatus,
  getNotificationsStatus,
  getSystemStatus,
} from "@/app/admin/settings/_utils/status";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch all settings keys needed for status checks
    const allKeys = [
      // Company
      "company.name",
      "company.phone",
      "company.whatsapp",
      "company.address",
      "company.bank.name",
      "company.bank.accountHolder",
      "company.bank.accountNumber",
      "company.bank.branchCode",
      "company.bank.accountType",
      "company.bank.instructions",
      // Contracts
      "contracts.default.carAmount",
      "contracts.default.bikeAmount",
      // Payments
      "payments.mode",
      "payments.gracePeriodDays",
      "payments.graceDays", // Legacy key support
      // Onboarding
      "onboarding.requiredFields",
      // Notifications
      "notifications.enabled",
      "notifications.fromEmail",
      // System
      "system.maintenanceMode",
    ];

    const settings = await getSettings(allKeys);

    const readiness = {
      company: getCompanyStatus(settings),
      contracts: getContractsStatus(settings),
      payments: getPaymentsStatus(settings),
      onboarding: getOnboardingStatus(settings),
      notifications: getNotificationsStatus(settings),
      system: getSystemStatus(settings),
    };

    return NextResponse.json(readiness);
  } catch (error) {
    console.error("Failed to fetch readiness:", error);
    return NextResponse.json(
      { error: "Failed to fetch readiness status" },
      { status: 500 }
    );
  }
}

