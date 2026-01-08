import { getAdminDashboardData } from "@/lib/dashboard/adminDashboard";
import KpiCards from "@/components/admin/dashboard/KpiCards";
import ActionRequired from "@/components/admin/dashboard/ActionRequired";
import QuickActions from "@/components/admin/dashboard/QuickActions";
import EmptyState from "@/components/admin/dashboard/EmptyState";
import { SetupChecklist } from "@/components/admin/SetupChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Users, FileCheck, AlertTriangle, Wrench } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

// Timeout wrapper to prevent hanging
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Dashboard timeout after ${ms}ms`)), ms)
    ),
  ]);
}

type Props = {
  searchParams?: Promise<{ range?: "all" | "month" | "week" }>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const range = sp?.range ?? "all";
  
  let data: Awaited<ReturnType<typeof getAdminDashboardData>>;
  let hasError = false;
  let errorMessage: string | null = null;
  
  try {
    // Hard timeout: 8 seconds max for dashboard data
    data = await withTimeout(getAdminDashboardData(range), 8000);
  } catch (error) {
    console.error("[Dashboard] Failed to load:", error);
    hasError = true;
    errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    // Return minimal default data structure
    data = {
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
    };
  }

  const formatCurrency = (cents: number) => `R ${(cents / 100).toFixed(2)}`;

  const overdueAlerts = data.alerts.compliance.filter((a) => a.daysUntil < 0);
  const expiringSoon = data.alerts.compliance.filter((a) => a.daysUntil >= 0 && a.daysUntil <= 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your fleet operations</p>
      </div>

      {hasError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Dashboard Data Unavailable</h3>
                <p className="text-sm text-red-700 mt-1">
                  Some dashboard data could not be loaded. Please refresh the page or contact support if the issue persists.
                </p>
                {errorMessage && (
                  <p className="text-xs text-red-600 mt-2 font-mono">
                    {errorMessage}
                  </p>
                )}
              </div>
              <form action={async () => {
                "use server"
                revalidatePath("/admin")
              }}>
                <Button type="submit" variant="outline">
                  Retry
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      <SetupChecklist />

      <KpiCards data={data} />

      <ActionRequired data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Status */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Vehicles</span>
              </div>
              <span className="font-bold">{data.fleet.total}</span>
            </div>
            <div className="space-y-2">
              <Row label="AVAILABLE" value={data.fleet.available} />
              <Row label="ASSIGNED" value={data.fleet.assigned} />
              <Row label="MAINTENANCE" value={data.fleet.maintenance} />
              <Row label="INACTIVE" value={data.fleet.inactive} />
            </div>
          </CardContent>
        </Card>

        {/* Driver Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Drivers</span>
              </div>
              <span className="font-bold">{data.drivers.total}</span>
            </div>
            <div className="space-y-2">
              <Row label="Verified" value={data.drivers.verified} className="text-green-600" />
              <Row label="Pending Verification" value={data.drivers.pendingVerification} className="text-yellow-600" />
              <Row label="Rejected" value={data.drivers.rejected} />
              <Row label="Incomplete Profiles" value={data.drivers.incompleteProfiles} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications - Preserve existing styling */}
      {(overdueAlerts.length > 0 || expiringSoon.length > 0 || data.alerts.maintenance.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueAlerts.length > 0 && (
              <div>
                <h4 className="font-medium text-red-900 mb-2">Expired Compliance ({overdueAlerts.length})</h4>
                <div className="space-y-2">
                  {overdueAlerts.map((alert, i) => (
                    <Link
                      key={i}
                      href={`/admin/vehicles/${alert.vehicleId}`}
                      className="flex items-center justify-between p-2 bg-white rounded border border-red-200 cursor-pointer hover:border-red-300"
                    >
                      <div>
                        <p className="text-sm font-medium">{alert.vehicleReg}</p>
                        <p className="text-xs text-red-600">
                          {alert.type} expired {Math.abs(alert.daysUntil)} days ago
                        </p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {expiringSoon.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">Expiring Soon ({expiringSoon.length})</h4>
                <div className="space-y-2">
                  {expiringSoon.slice(0, 3).map((alert, i) => (
                    <Link
                      key={i}
                      href={`/admin/vehicles/${alert.vehicleId}`}
                      className="flex items-center justify-between p-2 bg-white rounded border border-yellow-200 cursor-pointer hover:border-yellow-300"
                    >
                      <div>
                        <p className="text-sm font-medium">{alert.vehicleReg}</p>
                        <p className="text-xs text-yellow-700">
                          {alert.type} expires in {alert.daysUntil} days
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.alerts.maintenance.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  Upcoming Maintenance ({data.alerts.maintenance.length})
                </h4>
                <div className="space-y-2">
                  {data.alerts.maintenance.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-blue-200"
                    >
                      <div>
                        <p className="text-sm font-medium">{task.vehicle.reg}</p>
                        <p className="text-xs text-blue-700">
                          {task.title} - {new Date(task.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Wrench className="h-4 w-4 text-blue-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <EmptyState
                title="No payments yet"
                description="Create a contract to automatically generate payments."
                actionLabel="Create Contract"
                actionHref="/admin/contracts"
              />
            ) : (
              <div className="space-y-3">
                {data.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                    <div>
                      <p className="text-sm font-medium">{payment.driverName ?? "Unknown Driver"}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.vehicleLabel ?? "Unknown Vehicle"} •{" "}
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <span className="font-bold text-green-600">R {payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.driverPerformanceDetails.length === 0 ? (
              <EmptyState
                title="No active drivers"
                description="Verify drivers and create contracts to begin tracking performance."
                actionLabel="Verify Drivers"
                actionHref="/admin/verification"
              />
            ) : (
              <div className="space-y-3">
                {data.driverPerformanceDetails.map((driver) => (
                  <div key={driver.driverId} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{driver.driverName}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.paidOnTime} / {driver.totalPayments} payments on time
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold ${
                          driver.onTimeRate >= 80
                            ? "text-green-600"
                            : driver.onTimeRate >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {driver.onTimeRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Costs - Preserve existing feature */}
      {data.vehicleCosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Costs (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.vehicleCosts.map((cost) => (
                <Link
                  key={cost.vehicleId}
                  href={`/admin/vehicles/${cost.vehicleId}`}
                  className="flex items-center justify-between p-3 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80"
                >
                  <div>
                    <p className="font-medium">{cost.vehicleReg}</p>
                    <p className="text-xs text-muted-foreground">Total operating costs</p>
                  </div>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(cost.totalCostCents)}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <QuickActions />
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${className || ""}`}>{value}</span>
    </div>
  );
}
