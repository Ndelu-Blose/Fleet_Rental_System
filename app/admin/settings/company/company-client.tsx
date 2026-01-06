"use client";

import { useState } from "react";
import { useSettingsForm } from "../_hooks/useSettingsForm";
import { SettingsHeader } from "../_components/settings-header";
import { StatusBadge } from "../_components/status-badge";
import { getCompanyStatus, getBankingStatus } from "../_utils/status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const KEYS = [
  "company.name",
  "company.email",
  "company.phone",
  "company.whatsapp",
  "company.address",
  "company.currency",
  "company.bank.name",
  "company.bank.accountHolder",
  "company.bank.accountNumber",
  "company.bank.branchCode",
  "company.bank.accountType",
  "company.bank.referencePrefix",
  "company.bank.instructions",
];

export default function CompanyClient() {
  const s = useSettingsForm(KEYS);
  const [saving, setSaving] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const configured = getCompanyStatus(s.form);
  const bankConfigured = getBankingStatus(s.form);

  // Banking details for display
  const bankName = (s.form["company.bank.name"] ?? "").trim();
  const accountHolder = (s.form["company.bank.accountHolder"] ?? "").trim();
  const accountNumber = (s.form["company.bank.accountNumber"] ?? "").trim();
  const branchCode = (s.form["company.bank.branchCode"] ?? "").trim();
  const accountType = (s.form["company.bank.accountType"] ?? "").trim();

  // Mask account number for display
  const maskAccountNumber = (num: string) => {
    if (!num) return "";
    if (num.length <= 4) return "•".repeat(num.length);
    return "•".repeat(num.length - 4) + num.slice(-4);
  };

  const copyReferencePrefix = () => {
    const prefix = s.form["company.bank.referencePrefix"] ?? "";
    if (prefix) {
      navigator.clipboard.writeText(prefix);
      toast.success("Reference prefix copied to clipboard");
    }
  };

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

  const input = (key: string, label: string, type: string = "text") => {
    if (!s.edit) {
      return (
        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">{label}:</span>
          <div className="text-sm font-medium">
            {s.form[key] || <span className="text-muted-foreground italic">Not set</span>}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type={type}
          value={s.form[key] ?? ""}
          onChange={(e) => {
            const newForm = { ...s.form };
            newForm[key] = e.target.value;
            s.setForm(newForm);
          }}
        />
      </div>
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
          title="Company Information"
          subtitle="Manage your company details and contact information"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {input("company.name", "Company Name")}
          {input("company.email", "Company Email", "email")}
          {input("company.phone", "Phone")}
          {input("company.whatsapp", "WhatsApp")}
          {input("company.currency", "Currency (ZAR)")}
        </div>

        {!s.edit ? (
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Address:</span>
            <div className="text-sm p-3 bg-muted/50 rounded-lg">
              {s.form["company.address"] || <span className="text-muted-foreground italic">Not set</span>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="company.address">Address</Label>
            <Textarea
              id="company.address"
              className="min-h-[80px]"
              value={s.form["company.address"] ?? ""}
              onChange={(e) => {
                const newForm = { ...s.form };
                newForm["company.address"] = e.target.value;
                s.setForm(newForm);
              }}
            />
          </div>
        )}

        {/* Banking Details Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Banking Details (EFT)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Used for invoices, payment instructions, and driver communications.
              </p>
            </div>
            <StatusBadge configured={bankConfigured} okText="Configured" badText="Missing info" />
          </div>

          {!s.edit && bankConfigured ? (
            // View Mode - Display formatted banking details
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Bank Name:</span>
                <p className="text-sm font-medium mt-1">{bankName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Account Holder:</span>
                <p className="text-sm font-medium mt-1">{accountHolder}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Account Number:</span>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-medium font-mono">
                    {showAccountNumber ? accountNumber : maskAccountNumber(accountNumber)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                  >
                    {showAccountNumber ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Branch Code:</span>
                <p className="text-sm font-medium mt-1">{branchCode}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Account Type:</span>
                <p className="text-sm font-medium mt-1">{accountType}</p>
              </div>
              {s.form["company.bank.referencePrefix"] && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Reference Prefix:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-medium font-mono">
                      {s.form["company.bank.referencePrefix"]}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={copyReferencePrefix}
                      title="Copy reference prefix"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {s.form["company.bank.instructions"] && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-muted-foreground">Payment Instructions:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{s.form["company.bank.instructions"]}</p>
                </div>
              )}
            </div>
          ) : (
            // Edit Mode - Structured input fields
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company.bank.name">Bank Name *</Label>
                <Input
                  id="company.bank.name"
                  disabled={!s.edit}
                  className="disabled:bg-muted"
                  value={s.form["company.bank.name"] ?? ""}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.name"] = e.target.value;
                    s.setForm(newForm);
                  }}
                  placeholder="e.g., FNB, Standard Bank"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company.bank.accountHolder">Account Holder Name *</Label>
                <Input
                  id="company.bank.accountHolder"
                  disabled={!s.edit}
                  className="disabled:bg-muted"
                  value={s.form["company.bank.accountHolder"] ?? ""}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.accountHolder"] = e.target.value;
                    s.setForm(newForm);
                  }}
                  placeholder="e.g., FleetHub (Pty) Ltd"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company.bank.accountNumber">Account Number *</Label>
                <Input
                  id="company.bank.accountNumber"
                  type={s.edit ? "text" : "password"}
                  disabled={!s.edit}
                  className="disabled:bg-muted font-mono"
                  value={s.form["company.bank.accountNumber"] ?? ""}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.accountNumber"] = e.target.value.replace(/\D/g, "");
                    s.setForm(newForm);
                  }}
                  placeholder="Account number (numbers only)"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company.bank.branchCode">Branch Code *</Label>
                <Input
                  id="company.bank.branchCode"
                  disabled={!s.edit}
                  className="disabled:bg-muted"
                  value={s.form["company.bank.branchCode"] ?? ""}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.branchCode"] = e.target.value.replace(/\D/g, "");
                    s.setForm(newForm);
                  }}
                  placeholder="e.g., 250655"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company.bank.accountType">Account Type *</Label>
                <Select
                  disabled={!s.edit}
                  value={s.form["company.bank.accountType"] ?? ""}
                  onValueChange={(value) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.accountType"] = value;
                    s.setForm(newForm);
                  }}
                >
                  <SelectTrigger id="company.bank.accountType" className="disabled:bg-muted">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Transmission">Transmission</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company.bank.referencePrefix">Reference Prefix (Optional)</Label>
                <Input
                  id="company.bank.referencePrefix"
                  disabled={!s.edit}
                  className="disabled:bg-muted font-mono"
                  value={s.form["company.bank.referencePrefix"] ?? ""}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.referencePrefix"] = e.target.value.toUpperCase();
                    s.setForm(newForm);
                  }}
                  placeholder="e.g., FLEET-"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Prefix for payment references (e.g., FLEET-123)
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company.bank.instructions">Payment Instructions (Optional)</Label>
                <Textarea
                  id="company.bank.instructions"
                  disabled={!s.edit}
                  className="disabled:bg-muted min-h-[100px]"
                  value={s.form["company.bank.instructions"] ?? ""}
                  onChange={(e) => {
                    const newForm = { ...s.form };
                    newForm["company.bank.instructions"] = e.target.value;
                    s.setForm(newForm);
                  }}
                  placeholder="e.g., Please use your contract number as the payment reference"
                />
                <p className="text-xs text-muted-foreground">
                  Additional instructions for drivers when making payments
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
