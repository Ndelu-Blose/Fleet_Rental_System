"use client";

import { useState, useEffect } from "react";
import { useSettingsForm } from "../_hooks/useSettingsForm";
import { SettingsHeader } from "../_components/settings-header";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Car,
  FileText,
  CreditCard,
  Wrench,
  Calendar,
  Shield,
} from "lucide-react";
import { ViewModeDisplay } from "../_components/view-mode-display";
import { toast } from "sonner";
import Link from "next/link";

const KEYS = ["system.maintenanceMode"];

type AttentionItems = {
  overduePayments: Array<{
    id: string;
    driverName: string;
    vehicleReg: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }>;
  expiringContracts: Array<{
    id: string;
    driverName: string;
    vehicleReg: string;
    endDate: string;
    daysUntil: number | null;
  }>;
  complianceAlerts: Array<{
    vehicleId: string;
    vehicleReg: string;
    type: string;
    expiryDate: string;
    daysUntil: number;
  }>;
  upcomingMaintenance: Array<{
    id: string;
    vehicleReg: string;
    title: string;
    scheduledAt: string;
    daysUntil: number;
  }>;
};

type SystemStats = {
  vehicles?: {
    total: number;
    byStatus: Record<string, number>;
  };
  drivers?: {
    total: number;
    byVerificationStatus: Record<string, number>;
  };
  contracts?: {
    total: number;
    byStatus: Record<string, number>;
  };
  payments?: {
    total: number;
    byStatus: Record<string, number>;
    revenue: {
      total: number;
      pending: number;
      overdue: number;
    };
  };
  timestamp?: string;
};

type Activity = {
  type: "payment" | "contract";
  id: string;
  message: string;
  details: string;
  timestamp: string;
};

export default function SystemClient() {
  const s = useSettingsForm(KEYS);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [attention, setAttention] = useState<AttentionItems | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingAttention, setLoadingAttention] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await s.save();
      toast.success("Settings saved successfully ✅");
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const bool = (key: string) => (s.form[key] ?? "false") === "true";

  const handleExport = async (type: "vehicles" | "drivers" | "contracts" | "payments") => {
    setExporting(type);
    try {
      const response = await fetch(`/api/admin/system/export?type=${type}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers.get("Content-Disposition")?.split('filename="')[1]?.split('"')[0] ||
        `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    } catch (error) {
      toast.error(`Failed to export ${type}`);
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const response = await fetch("/api/admin/system/stats");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to load statistics");
      }
      const data = await response.json();
      setStats(data);
      setStatsError(null);
    } catch (error: any) {
      console.error("[Operations] Failed to load statistics:", error);
      setStatsError(error.message || "Failed to load statistics");
      // Only show toast if user manually clicks refresh
      if (stats) {
        toast.error(error.message || "Failed to load statistics");
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const loadAttention = async () => {
    setLoadingAttention(true);
    try {
      const response = await fetch("/api/admin/system/attention");
      if (!response.ok) {
        throw new Error("Failed to fetch attention items");
      }
      const data = await response.json();
      setAttention(data);
    } catch (error) {
      console.error("[Operations] Failed to load attention items:", error);
      // Silent failure - don't show error to user
    } finally {
      setLoadingAttention(false);
    }
  };

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      const response = await fetch("/api/admin/system/activity?limit=10");
      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error("[Operations] Failed to load activity:", error);
      // Silent failure - don't show error to user
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadAttention();
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (s.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const totalAttentionItems =
    (attention?.overduePayments.length || 0) +
    (attention?.expiringContracts.length || 0) +
    (attention?.complianceAlerts.length || 0) +
    (attention?.upcomingMaintenance.length || 0);

  const formatCurrency = formatZARFromCents;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="space-y-6">
      {/* Needs Attention Section - Top Priority */}
      {totalAttentionItems > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Needs Your Attention
            </CardTitle>
            <CardDescription>
              {totalAttentionItems} item{totalAttentionItems !== 1 ? "s" : ""} requiring action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attention?.overduePayments && attention.overduePayments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-red-600" />
                  Overdue Payments ({attention.overduePayments.length})
                </h4>
                <div className="space-y-2">
                  {attention.overduePayments.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-red-200"
                    >
                      <div>
                        <span className="text-sm font-medium">{p.driverName}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {p.vehicleReg} • {p.daysOverdue} day{p.daysOverdue !== 1 ? "s" : ""} overdue
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                {attention.overduePayments.length > 5 && (
                  <Link href="/admin/payments">
                    <Button variant="link" size="sm" className="mt-2">
                      View all overdue payments →
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {attention?.expiringContracts && attention.expiringContracts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  Contracts Expiring Soon ({attention.expiringContracts.length})
                </h4>
                <div className="space-y-2">
                  {attention.expiringContracts.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-amber-200"
                    >
                      <div>
                        <span className="text-sm font-medium">{c.driverName}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {c.vehicleReg} • {c.daysUntil} day{c.daysUntil !== 1 ? "s" : ""} remaining
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
                {attention.expiringContracts.length > 5 && (
                  <Link href="/admin/contracts">
                    <Button variant="link" size="sm" className="mt-2">
                      View all contracts →
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {attention?.complianceAlerts && attention.complianceAlerts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  Vehicle Compliance Expiring ({attention.complianceAlerts.length})
                </h4>
                <div className="space-y-2">
                  {attention.complianceAlerts.slice(0, 5).map((alert, idx) => (
                    <div
                      key={`${alert.vehicleId}-${alert.type}-${idx}`}
                      className="flex items-center justify-between p-2 bg-white rounded border border-amber-200"
                    >
                      <div>
                        <span className="text-sm font-medium">{alert.vehicleReg}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {alert.type} expires in {alert.daysUntil} day{alert.daysUntil !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(alert.expiryDate)}
                      </span>
                    </div>
                  ))}
                </div>
                {attention.complianceAlerts.length > 5 && (
                  <Link href="/admin/vehicles">
                    <Button variant="link" size="sm" className="mt-2">
                      View all vehicles →
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {attention?.upcomingMaintenance && attention.upcomingMaintenance.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  Upcoming Maintenance ({attention.upcomingMaintenance.length})
                </h4>
                <div className="space-y-2">
                  {attention.upcomingMaintenance.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-blue-200"
                    >
                      <div>
                        <span className="text-sm font-medium">{m.vehicleReg}</span>
                        <span className="text-xs text-muted-foreground ml-2">{m.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {m.daysUntil === 0
                          ? "Today"
                          : m.daysUntil === 1
                            ? "Tomorrow"
                            : `In ${m.daysUntil} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Operations Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <SettingsHeader
            title="Operations Overview"
            subtitle="Monitor your business status and control platform access"
            edit={s.edit}
            dirty={s.dirty}
            lastUpdatedAt={s.lastUpdatedAt}
            onEdit={s.toggleEdit}
            onSave={handleSave}
            onCancel={s.cancel}
            saving={saving}
          />

          {/* Business Status */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Business Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-green-50/50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-xs text-muted-foreground">System availability</div>
                    <div className="text-sm font-medium">Running normally</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-xs text-muted-foreground">Driver access</div>
                    <div className="text-sm font-medium">
                      {bool("system.maintenanceMode") ? "Disabled" : "Enabled"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-xs text-muted-foreground">Payments processing</div>
                    <div className="text-sm font-medium">Active</div>
                  </div>
                </div>
                {stats?.payments?.revenue.total &&
                  stats.payments.revenue.total > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">Last successful payment</div>
                        <div className="text-sm font-medium">
                          {stats.timestamp
                            ? new Date(stats.timestamp).toLocaleDateString()
                            : "Today"}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* System Availability Control */}
            <div className="space-y-4 pt-4 border-t">
              {!s.edit ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <ViewModeDisplay
                    label="Driver Access"
                    value={!bool("system.maintenanceMode")}
                    type="boolean"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    When disabled, drivers will temporarily be unable to use the system.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system.maintenanceMode">Driver Access</Label>
                    <p className="text-sm text-muted-foreground">
                      When disabled, drivers will temporarily be unable to use the system.
                    </p>
                  </div>
                  <Switch
                    id="system.maintenanceMode"
                    checked={!bool("system.maintenanceMode")}
                    onCheckedChange={(checked) => {
                      const newForm = { ...s.form };
                      newForm["system.maintenanceMode"] = String(!checked);
                      s.setForm(newForm);
                    }}
                  />
                </div>
              )}

              {bool("system.maintenanceMode") && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Driver Access Disabled</AlertTitle>
                  <AlertDescription>
                    Drivers cannot currently access the system. Enable driver access when ready.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          {stats?.payments && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Money Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Money Received</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.payments.revenue.total || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">All time</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Expected Payments</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.payments.revenue.pending || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">From active contracts</div>
                </div>
                {stats.payments.revenue.overdue > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-xs text-red-600 mb-1">Outstanding Balances</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(stats.payments.revenue.overdue)}
                    </div>
                    <div className="text-xs text-red-600 mt-1">Requires attention</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Statistics */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Business Statistics
            </h3>
            {statsError && !stats && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Unable to Load Statistics</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-sm mb-2">{statsError}</p>
                  <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats}>
                    {loadingStats ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Try Again"
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {stats ? (
              <div className="space-y-4">
                {statsError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{statsError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.vehicles && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm font-medium">Vehicles in Fleet</div>
                      </div>
                      <div className="text-3xl font-bold">{stats.vehicles.total}</div>
                      {stats.vehicles.total === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          No vehicles yet — add your first vehicle to start renting
                        </p>
                      )}
                    </div>
                  )}
                  {stats.drivers && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm font-medium">Drivers Onboarded</div>
                      </div>
                      <div className="text-3xl font-bold">{stats.drivers.total}</div>
                      {stats.drivers.total === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          No drivers onboarded — invite drivers to begin
                        </p>
                      )}
                    </div>
                  )}
                  {stats.contracts && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm font-medium">Active Contracts</div>
                      </div>
                      <div className="text-3xl font-bold">
                        {stats.contracts.byStatus["ACTIVE"] || 0}
                      </div>
                      {stats.contracts.total === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          No contracts created — contracts generate payments
                        </p>
                      )}
                    </div>
                  )}
                  {stats.payments && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm font-medium">Payments This Month</div>
                      </div>
                      <div className="text-3xl font-bold">
                        {formatCurrency(stats.payments.revenue.total || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {stats.payments.total} total payment{stats.payments.total !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats}>
                  {loadingStats ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh Statistics"
                  )}
                </Button>
              </div>
            ) : !statsError ? (
              <div className="text-sm text-muted-foreground">
                <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats}>
                  {loadingStats ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load Statistics"
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          {/* Recent Activity */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </h3>
            {activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="mt-0.5">
                      {activity.type === "payment" ? (
                        <CreditCard className="h-4 w-4 text-green-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>

          {/* Data Exports */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data Exports
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download records for backup, sharing, or accounting purposes.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport("vehicles")}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === "vehicles" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Vehicles
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("drivers")}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === "drivers" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Drivers
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("contracts")}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === "contracts" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Contracts
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("payments")}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === "payments" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Payments
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
