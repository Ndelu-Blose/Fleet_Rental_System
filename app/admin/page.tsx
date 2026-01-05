"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, DollarSign, Car, Users, FileCheck, AlertTriangle, TrendingUp, Wrench } from "lucide-react"

type Analytics = {
  financial: {
    totalPaid: number
    totalPending: number
    totalOverdue: number
  }
  vehicles: {
    total: number
    byStatus: {
      AVAILABLE: number
      ASSIGNED: number
      MAINTENANCE: number
      INACTIVE: number
    }
  }
  contracts: {
    active: number
    total: number
  }
  drivers: {
    total: number
    verified: number
    pendingVerification: number
  }
  alerts: {
    compliance: Array<{
      vehicleId: string
      vehicleReg: string
      type: string
      expiryDate: string
      daysUntil: number
    }>
    maintenance: Array<{
      id: string
      title: string
      scheduledAt: string
      vehicle: {
        reg: string
      }
    }>
  }
  recentPayments: Array<{
    id: string
    amountCents: number
    paidAt: string
    contract: {
      driver: {
        user: {
          name: string | null
          email: string
        }
      }
      vehicle: {
        reg: string
      }
    }
  }>
  driverPerformance: Array<{
    driverId: string
    driverName: string
    totalPayments: number
    paidOnTime: number
    onTimeRate: number
  }>
  vehicleCosts: Array<{
    vehicleId: string
    vehicleReg: string
    totalCostCents: number
  }>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics")
      const data = await res.json()
      setAnalytics(data)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => `R ${(cents / 100).toFixed(2)}`

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const overdueAlerts = analytics.alerts.compliance.filter((a) => a.daysUntil < 0)
  const expiringSoon = analytics.alerts.compliance.filter((a) => a.daysUntil >= 0 && a.daysUntil <= 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your fleet operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.financial.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(analytics.financial.totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">Expected revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.financial.totalOverdue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.contracts.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of {analytics.contracts.total} total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <span className="font-bold">{analytics.vehicles.total}</span>
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.vehicles.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              <span className="font-bold">{analytics.drivers.total}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verified</span>
                <span className="font-medium text-green-600">{analytics.drivers.verified}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending Verification</span>
                <span className="font-medium text-yellow-600">{analytics.drivers.pendingVerification}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(overdueAlerts.length > 0 || expiringSoon.length > 0 || analytics.alerts.maintenance.length > 0) && (
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
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-white rounded border border-red-200 cursor-pointer hover:border-red-300"
                      onClick={() => router.push(`/admin/vehicles/${alert.vehicleId}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{alert.vehicleReg}</p>
                        <p className="text-xs text-red-600">
                          {alert.type} expired {Math.abs(alert.daysUntil)} days ago
                        </p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expiringSoon.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">Expiring Soon ({expiringSoon.length})</h4>
                <div className="space-y-2">
                  {expiringSoon.slice(0, 3).map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-white rounded border border-yellow-200 cursor-pointer hover:border-yellow-300"
                      onClick={() => router.push(`/admin/vehicles/${alert.vehicleId}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{alert.vehicleReg}</p>
                        <p className="text-xs text-yellow-700">
                          {alert.type} expires in {alert.daysUntil} days
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.alerts.maintenance.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  Upcoming Maintenance ({analytics.alerts.maintenance.length})
                </h4>
                <div className="space-y-2">
                  {analytics.alerts.maintenance.slice(0, 3).map((task) => (
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
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                    <div>
                      <p className="text-sm font-medium">
                        {payment.contract.driver.user.name || payment.contract.driver.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.contract.vehicle.reg} • {new Date(payment.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(payment.amountCents)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent payments</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.driverPerformance.length > 0 ? (
              <div className="space-y-3">
                {analytics.driverPerformance.map((driver) => (
                  <div key={driver.driverId} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{driver.driverName}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.paidOnTime} / {driver.totalPayments} payments on time
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold ${driver.onTimeRate >= 80 ? "text-green-600" : driver.onTimeRate >= 60 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {driver.onTimeRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No active drivers</p>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics.vehicleCosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Costs (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.vehicleCosts.map((cost) => (
                <div
                  key={cost.vehicleId}
                  className="flex items-center justify-between p-3 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80"
                  onClick={() => router.push(`/admin/vehicles/${cost.vehicleId}`)}
                >
                  <div>
                    <p className="font-medium">{cost.vehicleReg}</p>
                    <p className="text-xs text-muted-foreground">Total operating costs</p>
                  </div>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(cost.totalCostCents)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
