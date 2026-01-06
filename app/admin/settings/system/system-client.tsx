"use client";

import { useState, useEffect } from "react";
import { useSettingsForm } from "../_hooks/useSettingsForm";
import { SettingsHeader } from "../_components/settings-header";
import { StatusBadge } from "../_components/status-badge";
import { getSystemStatus } from "../_utils/status";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, BarChart3, Loader2 } from "lucide-react";
import { ViewModeDisplay } from "../_components/view-mode-display";
import { toast } from "sonner";

const KEYS = ["system.maintenanceMode"];

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

export default function SystemClient() {
  const s = useSettingsForm(KEYS);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const configured = getSystemStatus(s.form);

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
      a.download = response.headers.get("Content-Disposition")?.split('filename="')[1]?.split('"')[0] || `${type}-export.csv`;
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
    try {
      const response = await fetch("/api/admin/system/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error("Failed to load system statistics");
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
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

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SettingsHeader
          title="System Controls"
          subtitle="Manage system-wide configuration and maintenance mode"
          edit={s.edit}
          dirty={s.dirty}
          lastUpdatedAt={s.lastUpdatedAt}
          onEdit={s.toggleEdit}
          onSave={handleSave}
          onCancel={s.cancel}
          saving={saving}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <StatusBadge configured={configured} />
        </div>

        <div className="space-y-4">
          {!s.edit ? (
            <div className="p-4 bg-muted/50 rounded-lg">
              <ViewModeDisplay
                label="Maintenance Mode"
                value={bool("system.maintenanceMode")}
                type="boolean"
              />
              <p className="text-sm text-muted-foreground mt-2">
                When enabled, the system will be unavailable to drivers
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="system.maintenanceMode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, the system will be unavailable to drivers
                </p>
              </div>
              <Switch
                id="system.maintenanceMode"
                checked={bool("system.maintenanceMode")}
                onCheckedChange={(checked) => {
                  const newForm = { ...s.form };
                  newForm["system.maintenanceMode"] = String(checked);
                  s.setForm(newForm);
                }}
              />
            </div>
          )}

          {bool("system.maintenanceMode") && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Maintenance mode is enabled. Drivers will not be able to access the system.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-4 border-t space-y-6">
          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              System Statistics
            </h3>
            {stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.vehicles && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Vehicles</div>
                      <div className="text-2xl font-bold">{stats.vehicles.total}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Object.entries(stats.vehicles.byStatus)
                          .map(([status, count]) => `${status}: ${count}`)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                  {stats.drivers && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Drivers</div>
                      <div className="text-2xl font-bold">{stats.drivers.total}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Object.entries(stats.drivers.byVerificationStatus)
                          .map(([status, count]) => `${status}: ${count}`)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                  {stats.contracts && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Contracts</div>
                      <div className="text-2xl font-bold">{stats.contracts.total}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Object.entries(stats.contracts.byStatus)
                          .map(([status, count]) => `${status}: ${count}`)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                  {stats.payments && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Payments</div>
                      <div className="text-2xl font-bold">{stats.payments.total}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div>Total Revenue: R {((stats.payments.revenue.total || 0) / 100).toFixed(2)}</div>
                        <div>Pending: R {((stats.payments.revenue.pending || 0) / 100).toFixed(2)}</div>
                        {stats.payments.revenue.overdue > 0 && (
                          <div className="text-red-600">
                            Overdue: R {((stats.payments.revenue.overdue || 0) / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats}>
                  {loadingStats ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Refresh Statistics"
                  )}
                </Button>
              </div>
            ) : (
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
            )}
          </div>

          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data Exports
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Export system data to CSV format for backup or analysis purposes.
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
        </div>
      </CardContent>
    </Card>
  );
}
