import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { getAdminDashboardData, type DashboardRange } from "@/lib/dashboard/adminDashboard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Timeout wrapper to prevent hanging
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Dashboard timeout after ${ms}ms`)), ms)
    ),
  ])
}

// Safe fallback data structure
function getDashboardFallback(range: DashboardRange = "all") {
  return {
    range,
    kpis: {
      totalRevenue: 0,
      pendingAmount: 0,
      pendingCount: 0,
      overdueAmount: 0,
      overdueCount: 0,
      oldestOverdueDays: null,
      activeContracts: 0,
      vehicleUtilization: { assigned: 0, total: 0 },
      lastPaymentDate: null,
    },
    fleet: {
      total: 0,
      available: 0,
      assigned: 0,
      maintenance: 0,
      inactive: 0,
    },
    drivers: {
      total: 0,
      verified: 0,
      pendingVerification: 0,
      rejected: 0,
      incompleteProfiles: 0,
    },
    actionRequired: {
      overduePayments: 0,
      pendingVerifications: 0,
      vehiclesExpiringSoon: 0,
    },
    recentPayments: [],
    driverPerformance: {
      activeDrivers: 0,
      message: "No active drivers yet",
    },
    vehicleCosts: [],
    driverPerformanceDetails: [],
    alerts: {
      compliance: [],
      maintenance: [],
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const range = (searchParams.get("range") as DashboardRange) || "all"

    // Hard timeout: 8 seconds max for dashboard data
    const data = await withTimeout(getAdminDashboardData(range), 8000)

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error("[Dashboard API] failed:", err?.message ?? err)

    const { searchParams } = new URL(req.url)
    const range = (searchParams.get("range") as DashboardRange) || "all"

    // Return safe fallback instead of hanging the UI
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Dashboard failed to load",
        data: getDashboardFallback(range),
      },
      { status: 200 } // Return 200 so UI can handle the error gracefully
    )
  }
}
