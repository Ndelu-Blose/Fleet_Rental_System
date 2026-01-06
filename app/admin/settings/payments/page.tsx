"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Mail, AlertCircle } from "lucide-react"
import { toast } from "sonner"

type PaymentSettings = {
  mode: "MANUAL" | "STRIPE"
  currency: string
  defaultRentCycle: "WEEKLY" | "MONTHLY"
  defaultDueDay: number
  gracePeriodDays: number
  remindersEnabled: boolean
  reminderFromEmail: string
  reminderSchedule: {
    daysBefore: number
    onDueDate: boolean
    daysOverdue: number
  }
}

type EnvStatus = {
  resend: boolean
  stripe: boolean
}

export default function PaymentsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [settings, setSettings] = useState<PaymentSettings>({
    mode: "MANUAL",
    currency: "ZAR",
    defaultRentCycle: "WEEKLY",
    defaultDueDay: 25,
    gracePeriodDays: 3,
    remindersEnabled: false,
    reminderFromEmail: "",
    reminderSchedule: {
      daysBefore: 3,
      onDueDate: true,
      daysOverdue: 3,
    },
  })
  const [envStatus, setEnvStatus] = useState<EnvStatus>({
    resend: false,
    stripe: false,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings/payments")
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        setEnvStatus(data.envStatus)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save settings")
      }

      toast.success("Settings saved successfully")
      await fetchSettings()
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    try {
      const res = await fetch("/api/admin/settings/payments/test-email", {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to send test email")
      }

      toast.success("Test email sent! Check your inbox.")
    } catch (error: any) {
      toast.error(error.message || "Failed to send test email")
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Payment Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Mode</CardTitle>
          <CardDescription>Choose how payments are processed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Payment Method</Label>
              <p className="text-sm text-muted-foreground">
                {settings.mode === "MANUAL"
                  ? "Payments are marked as paid manually (cash/EFT)"
                  : "Payments are processed through Stripe"}
              </p>
            </div>
            <Select
              value={settings.mode}
              onValueChange={(value: "MANUAL" | "STRIPE") =>
                setSettings({ ...settings, mode: value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="STRIPE" disabled={!envStatus.stripe}>
                  Stripe {!envStatus.stripe && "(Not configured)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.mode === "STRIPE" && !envStatus.stripe && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Stripe Not Configured</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">To enable Stripe payments, add these to your <code className="px-1 py-0.5 bg-muted rounded text-xs">.env.local</code> file:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`}
                </pre>
                <p className="mt-2 text-sm">After adding the keys, restart your development server.</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Currency & Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Currency & Defaults</CardTitle>
          <CardDescription>Set default payment settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                placeholder="ZAR"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultRentCycle">Default Rent Cycle</Label>
              <Select
                value={settings.defaultRentCycle}
                onValueChange={(value: "WEEKLY" | "MONTHLY") =>
                  setSettings({ ...settings, defaultRentCycle: value })
                }
              >
                <SelectTrigger id="defaultRentCycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDueDay">Default Due Day</Label>
              <Input
                id="defaultDueDay"
                type="number"
                min="1"
                max="31"
                value={settings.defaultDueDay}
                onChange={(e) =>
                  setSettings({ ...settings, defaultDueDay: parseInt(e.target.value) || 1 })
                }
              />
              <p className="text-xs text-muted-foreground">Day of month (1-31)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
              <Input
                id="gracePeriodDays"
                type="number"
                min="0"
                value={settings.gracePeriodDays}
                onChange={(e) =>
                  setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">Days before marking as overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email/SMS Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Email Reminders</CardTitle>
          <CardDescription>Configure payment reminder notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send automatic email reminders for payments
              </p>
            </div>
            <Switch
              checked={settings.remindersEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, remindersEnabled: checked })
              }
              disabled={!envStatus.resend}
            />
          </div>

          {!envStatus.resend && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Resend Not Configured</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">To enable email reminders, add this to your <code className="px-1 py-0.5 bg-muted rounded text-xs">.env.local</code> file:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`RESEND_API_KEY=re_...
MAIL_FROM="FleetHub <noreply@yourdomain.com>"`}
                </pre>
                <p className="mt-2 text-sm">After adding the key, restart your development server.</p>
              </AlertDescription>
            </Alert>
          )}

          {settings.remindersEnabled && envStatus.resend && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reminderFromEmail">From Email</Label>
                <Input
                  id="reminderFromEmail"
                  type="email"
                  value={settings.reminderFromEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, reminderFromEmail: e.target.value })
                  }
                  placeholder="noreply@yourdomain.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daysBefore">Days Before Due</Label>
                  <Input
                    id="daysBefore"
                    type="number"
                    min="0"
                    value={settings.reminderSchedule.daysBefore}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reminderSchedule: {
                          ...settings.reminderSchedule,
                          daysBefore: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onDueDate">On Due Date</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="onDueDate"
                      checked={settings.reminderSchedule.onDueDate}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          reminderSchedule: {
                            ...settings.reminderSchedule,
                            onDueDate: checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor="onDueDate" className="text-sm font-normal">
                      {settings.reminderSchedule.onDueDate ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daysOverdue">Days Overdue</Label>
                  <Input
                    id="daysOverdue"
                    type="number"
                    min="0"
                    value={settings.reminderSchedule.daysOverdue}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reminderSchedule: {
                          ...settings.reminderSchedule,
                          daysOverdue: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testingEmail || !settings.reminderFromEmail}
                >
                  {testingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
          <CardDescription>Check if required services are configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Resend API</span>
              </div>
              {envStatus.resend ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Not configured</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Stripe</span>
              </div>
              {envStatus.stripe ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Not configured</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  )
}

