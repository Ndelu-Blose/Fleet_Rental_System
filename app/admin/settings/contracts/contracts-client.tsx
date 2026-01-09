"use client";

import { useState, useEffect } from "react";
import { useSettingsForm } from "../_hooks/useSettingsForm";
import { SettingsHeader } from "../_components/settings-header";
import { StatusBadge } from "../_components/status-badge";
import { getContractsStatus } from "../_utils/status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ViewModeDisplay } from "../_components/view-mode-display";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const KEYS = [
  "contracts.default.carAmount",
  "contracts.default.bikeAmount",
  "contracts.depositEnabled",
  "contracts.depositAmount",
  "contracts.allowedFrequencies",
  "contracts.termsText",
];

export default function ContractsClient() {
  const s = useSettingsForm(KEYS);
  const [saving, setSaving] = useState(false);

  // Parse JSON strings
  const [allowedFrequencies, setAllowedFrequencies] = useState<string[]>(() => {
    try {
      return JSON.parse(s.form["contracts.allowedFrequencies"] || '["WEEKLY", "MONTHLY"]');
    } catch {
      return ["WEEKLY", "MONTHLY"];
    }
  });

  useEffect(() => {
    try {
      const parsed = JSON.parse(s.form["contracts.allowedFrequencies"] || '["WEEKLY", "MONTHLY"]');
      setAllowedFrequencies(parsed);
    } catch {
      setAllowedFrequencies(["WEEKLY", "MONTHLY"]);
    }
  }, [s.form["contracts.allowedFrequencies"]]);

  useEffect(() => {
    const newForm = { ...s.form };
    newForm["contracts.allowedFrequencies"] = JSON.stringify(allowedFrequencies);
    s.setForm(newForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedFrequencies]);

  const configured = getContractsStatus(s.form);

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

  const toggleFrequency = (freq: string) => {
    if (!s.edit) return;
    setAllowedFrequencies((prev) =>
      prev.includes(freq) ? prev.filter((f) => f !== freq) : [...prev, freq]
    );
  };

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
          title="Pricing & Contracts"
          subtitle="Set default pricing, contract terms, and allowed payment frequencies"
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

        {!s.edit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <ViewModeDisplay
              label="Default Car Rental Amount"
              value={Number(s.form["contracts.default.carAmount"] || "0")}
              type="currency"
            />
            <ViewModeDisplay
              label="Default Bike Rental Amount"
              value={Number(s.form["contracts.default.bikeAmount"] || "0")}
              type="currency"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contracts.default.carAmount">Default Car Rental Amount (cents)</Label>
              <Input
                id="contracts.default.carAmount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={s.form["contracts.default.carAmount"] ?? "0"}
                onChange={(e) => {
                  const newForm = { ...s.form };
                  // Only allow integers (no decimals, no negative)
                  const value = e.target.value.replace(/[^\d]/g, "");
                  newForm["contracts.default.carAmount"] = value || "0";
                  s.setForm(newForm);
                }}
                onBlur={(e) => {
                  // Ensure it's a valid integer on blur
                  const value = e.target.value.replace(/[^\d]/g, "") || "0";
                  const newForm = { ...s.form };
                  newForm["contracts.default.carAmount"] = value;
                  s.setForm(newForm);
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Enter amount in cents (e.g., 50000 = R500.00)
                </p>
                {s.form["contracts.default.carAmount"] && (
                  <p className="text-xs font-medium text-primary">
                    = {formatZARFromCents(Number(s.form["contracts.default.carAmount"]) || 0)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contracts.default.bikeAmount">Default Bike Rental Amount (cents)</Label>
              <Input
                id="contracts.default.bikeAmount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={s.form["contracts.default.bikeAmount"] ?? "0"}
                onChange={(e) => {
                  const newForm = { ...s.form };
                  // Only allow integers (no decimals, no negative)
                  const value = e.target.value.replace(/[^\d]/g, "");
                  newForm["contracts.default.bikeAmount"] = value || "0";
                  s.setForm(newForm);
                }}
                onBlur={(e) => {
                  // Ensure it's a valid integer on blur
                  const value = e.target.value.replace(/[^\d]/g, "") || "0";
                  const newForm = { ...s.form };
                  newForm["contracts.default.bikeAmount"] = value;
                  s.setForm(newForm);
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Enter amount in cents (e.g., 75000 = R750.00)
                </p>
                {s.form["contracts.default.bikeAmount"] && (
                  <p className="text-xs font-medium text-primary">
                    = {formatZARFromCents(Number(s.form["contracts.default.bikeAmount"]) || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!s.edit ? (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <ViewModeDisplay
              label="Deposit Requirement"
              value={bool("contracts.depositEnabled")}
              type="boolean"
            />
            {bool("contracts.depositEnabled") && (
              <ViewModeDisplay
                label="Deposit Amount"
                value={Number(s.form["contracts.depositAmount"] || "0")}
                type="currency"
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={bool("contracts.depositEnabled")}
                onCheckedChange={(checked) => {
                  const newForm = { ...s.form };
                  newForm["contracts.depositEnabled"] = String(checked);
                  s.setForm(newForm);
                }}
              />
              <Label htmlFor="contracts.depositEnabled">Enable deposit requirement</Label>
            </div>

            {bool("contracts.depositEnabled") && (
              <div className="space-y-2">
                <Label htmlFor="contracts.depositAmount">Deposit Amount (cents)</Label>
                <Input
                  id="contracts.depositAmount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={s.form["contracts.depositAmount"] ?? "0"}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    // Only allow integers (no decimals, no negative)
                    const value = e.target.value.replace(/[^\d]/g, "");
                    newForm["contracts.depositAmount"] = value || "0";
                    s.setForm(newForm);
                  }}
                  onBlur={(e) => {
                    // Ensure it's a valid integer on blur
                    const value = e.target.value.replace(/[^\d]/g, "") || "0";
                    const newForm = { ...s.form };
                    newForm["contracts.depositAmount"] = value;
                    s.setForm(newForm);
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Enter amount in cents (e.g., 10000 = R100.00)
                  </p>
                  {s.form["contracts.depositAmount"] && (
                    <p className="text-xs font-medium text-primary">
                      = {formatZARFromCents(Number(s.form["contracts.depositAmount"]) || 0)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!s.edit ? (
          <>
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Allowed Payment Frequencies:</span>
              <div className="flex gap-2">
                {allowedFrequencies.map((freq) => (
                  <Badge key={freq} variant="outline">
                    {freq}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Default Contract Terms:</span>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm whitespace-pre-wrap">
                  {s.form["contracts.termsText"] || <span className="text-muted-foreground italic">Not set</span>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Allowed Payment Frequencies</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="freq-weekly"
                    checked={allowedFrequencies.includes("WEEKLY")}
                    onCheckedChange={() => toggleFrequency("WEEKLY")}
                  />
                  <Label htmlFor="freq-weekly" className="cursor-pointer">
                    Weekly
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="freq-monthly"
                    checked={allowedFrequencies.includes("MONTHLY")}
                    onCheckedChange={() => toggleFrequency("MONTHLY")}
                  />
                  <Label htmlFor="freq-monthly" className="cursor-pointer">
                    Monthly
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contracts.termsText">Default Contract Terms</Label>
              <Textarea
                id="contracts.termsText"
                className="min-h-[200px]"
                value={s.form["contracts.termsText"] ?? ""}
                onChange={(e) => {
                  const newForm = { ...s.form };
                  newForm["contracts.termsText"] = e.target.value;
                  s.setForm(newForm);
                }}
                placeholder="Rental terms go here..."
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
