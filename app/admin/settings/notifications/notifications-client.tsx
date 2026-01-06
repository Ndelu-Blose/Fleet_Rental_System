"use client";

import { useState } from "react";
import { useSettingsForm } from "../_hooks/useSettingsForm";
import { SettingsHeader } from "../_components/settings-header";
import { StatusBadge } from "../_components/status-badge";
import { getNotificationsStatus } from "../_utils/status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";
import { ViewModeDisplay } from "../_components/view-mode-display";
import { toast } from "sonner";

const KEYS = [
  "notifications.enabled",
  "notifications.fromEmail",
  "notifications.reminderBeforeDays",
  "notifications.reminderOnDueDate",
  "notifications.reminderOverdueAfterDays",
  "notifications.template.paymentReminder",
  "notifications.template.overdueNotice",
  "notifications.template.docApproved",
  "notifications.template.docRejected",
];

export default function NotificationsClient({ resendConfigured }: { resendConfigured: boolean }) {
  const s = useSettingsForm(KEYS);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const enabled = (s.form["notifications.enabled"] ?? "false") === "true";
  const configured = getNotificationsStatus(s.form);

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

  const handleTestEmail = async () => {
    if (!enabled || !s.form["notifications.fromEmail"]?.trim()) {
      toast.error("Please enable notifications and set a from email first");
      return;
    }

    setTestingEmail(true);
    try {
      const res = await fetch("/api/admin/settings/notifications/test-email", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send test email");
      }

      toast.success("Test email sent! Check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send test email");
    } finally {
      setTestingEmail(false);
    }
  };

  const bool = (key: string) => (s.form[key] ?? "false") === "true";

  const textarea = (key: string, label: string, hint?: string) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Textarea
        id={key}
        className="min-h-[80px] disabled:bg-muted"
        disabled={!s.edit}
        value={s.form[key] ?? ""}
        onChange={(e) => {
          const newForm = { ...s.form };
          newForm[key] = e.target.value;
          s.setForm(newForm);
        }}
      />
    </div>
  );

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
          title="Notifications"
          subtitle="Configure email reminders and templates"
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

        <Alert>
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 font-medium">
                <span>Resend API</span>
                {resendConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
              <AlertDescription className="mt-1">
                {resendConfigured ? (
                  <span className="text-green-600 font-medium">Configured ✅</span>
                ) : (
                  <span className="text-red-600 font-medium">Missing ❌</span>
                )}
                <br />
                <span className="text-xs text-muted-foreground">
                  Set <code>RESEND_API_KEY</code> in <code>.env.local</code>.
                </span>
              </AlertDescription>
            </div>
            {resendConfigured && enabled && s.form["notifications.fromEmail"]?.trim() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={testingEmail || s.edit}
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Test Email
                  </>
                )}
              </Button>
            )}
          </div>
        </Alert>

        {!s.edit ? (
          <ViewModeDisplay
            label="Notifications"
            value={bool("notifications.enabled")}
            type="boolean"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Switch
              checked={bool("notifications.enabled")}
              onCheckedChange={(checked) => {
                const newForm = { ...s.form };
                newForm["notifications.enabled"] = String(checked);
                s.setForm(newForm);
              }}
            />
            <Label htmlFor="notifications.enabled">Enable notifications</Label>
          </div>
        )}

        {!s.edit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <ViewModeDisplay
              label="From Email"
              value={s.form["notifications.fromEmail"]}
              type="text"
            />
            <ViewModeDisplay
              label="Remind before (days)"
              value={s.form["notifications.reminderBeforeDays"] || "3"}
              type="number"
            />
            <ViewModeDisplay
              label="Remind on due date"
              value={bool("notifications.reminderOnDueDate")}
              type="boolean"
            />
            <ViewModeDisplay
              label="Overdue reminder after (days)"
              value={s.form["notifications.reminderOverdueAfterDays"] || "3"}
              type="number"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notifications.fromEmail">From Email</Label>
              <Input
                id="notifications.fromEmail"
                type="email"
                value={s.form["notifications.fromEmail"] ?? ""}
                onChange={(e) => {
                  const newForm = { ...s.form };
                  newForm["notifications.fromEmail"] = e.target.value;
                  s.setForm(newForm);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifications.reminderBeforeDays">Remind before (days)</Label>
              <Input
                id="notifications.reminderBeforeDays"
                type="number"
                value={s.form["notifications.reminderBeforeDays"] ?? "3"}
                onChange={(e) => {
                  const newForm = { ...s.form };
                  newForm["notifications.reminderBeforeDays"] = e.target.value;
                  s.setForm(newForm);
                }}
              />
            </div>

            <div className="flex items-center gap-2 pt-8">
              <Switch
                checked={bool("notifications.reminderOnDueDate")}
                onCheckedChange={(checked) => {
                  const newForm = { ...s.form };
                  newForm["notifications.reminderOnDueDate"] = String(checked);
                  s.setForm(newForm);
                }}
              />
              <Label htmlFor="notifications.reminderOnDueDate">Remind on due date</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifications.reminderOverdueAfterDays">Overdue reminder after (days)</Label>
              <Input
                id="notifications.reminderOverdueAfterDays"
                type="number"
                value={s.form["notifications.reminderOverdueAfterDays"] ?? "3"}
                onChange={(e) => {
                  const newForm = { ...s.form };
                  newForm["notifications.reminderOverdueAfterDays"] = e.target.value;
                  s.setForm(newForm);
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-medium">Email Templates</h3>
          {!s.edit ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Payment Reminder Template:</div>
                <div className="text-sm whitespace-pre-wrap">{s.form["notifications.template.paymentReminder"] || "Not set"}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Overdue Notice Template:</div>
                <div className="text-sm whitespace-pre-wrap">{s.form["notifications.template.overdueNotice"] || "Not set"}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Document Approved Template:</div>
                <div className="text-sm whitespace-pre-wrap">{s.form["notifications.template.docApproved"] || "Not set"}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Document Rejected Template:</div>
                <div className="text-sm whitespace-pre-wrap">{s.form["notifications.template.docRejected"] || "Not set"}</div>
              </div>
            </div>
          ) : (
            <>
              {textarea(
                "notifications.template.paymentReminder",
                "Payment Reminder Template",
                "Use placeholders: {{driverName}}, {{amount}}, {{dueDate}}"
              )}
              {textarea(
                "notifications.template.overdueNotice",
                "Overdue Notice Template",
                "Use placeholders: {{driverName}}, {{amount}}, {{dueDate}}"
              )}
              {textarea("notifications.template.docApproved", "Document Approved Template")}
              {textarea(
                "notifications.template.docRejected",
                "Document Rejected Template",
                "Use placeholder: {{reason}}"
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
