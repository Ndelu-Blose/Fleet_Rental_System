"use client";

import { useState, useEffect } from "react";
import { useSettingsForm } from "../_hooks/useSettingsForm";
import { SettingsHeader } from "../_components/settings-header";
import { StatusBadge } from "../_components/status-badge";
import { getOnboardingStatus } from "../_utils/status";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ViewModeDisplay } from "../_components/view-mode-display";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const KEYS = [
  "onboarding.locationRequired",
  "onboarding.requiredFields",
  "onboarding.requiredDocuments",
  "onboarding.progressWeights",
];

const FIELD_OPTIONS = [
  { key: "fullName", label: "Full Name" },
  { key: "idNumber", label: "ID Number" },
  { key: "address", label: "Address" },
  { key: "driverPhoto", label: "Driver Photo" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
];

const DOCUMENT_OPTIONS = [
  { key: "CERTIFIED_ID", label: "Certified ID" },
  { key: "PROOF_OF_RESIDENCE", label: "Proof of Residence" },
  { key: "DRIVERS_LICENSE", label: "Driver's License" },
  { key: "DRIVER_PHOTO", label: "Driver Photo" },
];

export default function OnboardingClient() {
  const s = useSettingsForm(KEYS);
  const [saving, setSaving] = useState(false);

  // Parse JSON strings
  const [requiredFields, setRequiredFields] = useState<string[]>(() => {
    try {
      return JSON.parse(
        s.form["onboarding.requiredFields"] || '["fullName", "idNumber", "address", "driverPhoto"]'
      );
    } catch {
      return ["fullName", "idNumber", "address", "driverPhoto"];
    }
  });

  const [requiredDocuments, setRequiredDocuments] = useState<string[]>(() => {
    try {
      return JSON.parse(
        s.form["onboarding.requiredDocuments"] ||
          '["CERTIFIED_ID", "PROOF_OF_RESIDENCE", "DRIVERS_LICENSE"]'
      );
    } catch {
      return ["CERTIFIED_ID", "PROOF_OF_RESIDENCE", "DRIVERS_LICENSE"];
    }
  });

  const [progressWeights, setProgressWeights] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(
        s.form["onboarding.progressWeights"] || '{"profile": 40, "documents": 40, "location": 20}'
      );
    } catch {
      return { profile: 40, documents: 40, location: 20 };
    }
  });

  // Sync with form when it loads
  useEffect(() => {
    try {
      const parsedFields = JSON.parse(
        s.form["onboarding.requiredFields"] || '["fullName", "idNumber", "address", "driverPhoto"]'
      );
      setRequiredFields(Array.isArray(parsedFields) ? parsedFields : []);
    } catch {
      setRequiredFields([]);
    }
  }, [s.form["onboarding.requiredFields"]]);

  useEffect(() => {
    try {
      const parsedDocs = JSON.parse(
        s.form["onboarding.requiredDocuments"] ||
          '["CERTIFIED_ID", "PROOF_OF_RESIDENCE", "DRIVERS_LICENSE"]'
      );
      setRequiredDocuments(Array.isArray(parsedDocs) ? parsedDocs : []);
    } catch {
      setRequiredDocuments([]);
    }
  }, [s.form["onboarding.requiredDocuments"]]);

  useEffect(() => {
    try {
      const parsedWeights = JSON.parse(
        s.form["onboarding.progressWeights"] || '{"profile": 40, "documents": 40, "location": 20}'
      );
      setProgressWeights(typeof parsedWeights === "object" ? parsedWeights : {});
    } catch {
      setProgressWeights({});
    }
  }, [s.form["onboarding.progressWeights"]]);

  // Update form when local state changes
  useEffect(() => {
    const newForm = { ...s.form };
    newForm["onboarding.requiredFields"] = JSON.stringify(requiredFields);
    s.setForm(newForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredFields]);

  useEffect(() => {
    const newForm = { ...s.form };
    newForm["onboarding.requiredDocuments"] = JSON.stringify(requiredDocuments);
    s.setForm(newForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredDocuments]);

  useEffect(() => {
    const newForm = { ...s.form };
    newForm["onboarding.progressWeights"] = JSON.stringify(progressWeights);
    s.setForm(newForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressWeights]);

  const configured = getOnboardingStatus(s.form);

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

  const toggleField = (field: string) => {
    if (!s.edit) return;
    setRequiredFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleDocument = (doc: string) => {
    if (!s.edit) return;
    setRequiredDocuments((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  };

  const updateWeight = (key: string, value: number) => {
    if (!s.edit) return;
    setProgressWeights((prev) => ({ ...prev, [key]: value }));
  };

  const totalWeight = Object.values(progressWeights).reduce((a, b) => a + b, 0);

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
          title="Driver Requirements"
          subtitle="Configure required fields, documents, and progress tracking for driver onboarding"
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
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <ViewModeDisplay
              label="Location Verification Required"
              value={bool("onboarding.locationRequired")}
              type="boolean"
            />
            <div>
              <span className="text-sm font-medium text-muted-foreground">Required Profile Fields:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {requiredFields.length > 0 ? (
                  requiredFields.map((field) => {
                    const fieldOption = FIELD_OPTIONS.find((f) => f.key === field);
                    return (
                      <Badge key={field} variant="outline">
                        {fieldOption?.label || field}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic">None</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Required Documents:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {requiredDocuments.length > 0 ? (
                  requiredDocuments.map((doc) => {
                    const docOption = DOCUMENT_OPTIONS.find((d) => d.key === doc);
                    return (
                      <Badge key={doc} variant="outline">
                        {docOption?.label || doc}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic">None</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Switch
                checked={bool("onboarding.locationRequired")}
                onCheckedChange={(checked) => {
                  const newForm = { ...s.form };
                  newForm["onboarding.locationRequired"] = String(checked);
                  s.setForm(newForm);
                }}
              />
              <Label htmlFor="onboarding.locationRequired">Require location verification</Label>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Required Profile Fields</Label>
                <div className="grid grid-cols-2 gap-3">
                  {FIELD_OPTIONS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`field-${field.key}`}
                        checked={requiredFields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                      <Label htmlFor={`field-${field.key}`} className="cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Required Documents</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DOCUMENT_OPTIONS.map((doc) => (
                    <div key={doc.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`doc-${doc.key}`}
                        checked={requiredDocuments.includes(doc.key)}
                        onCheckedChange={() => toggleDocument(doc.key)}
                      />
                      <Label htmlFor={`doc-${doc.key}`} className="cursor-pointer">
                        {doc.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {!s.edit ? (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Progress Bar Weights:</span>
            <div className="space-y-2 text-sm">
              <div>Profile: {progressWeights.profile || 0}%</div>
              <div>Documents: {progressWeights.documents || 0}%</div>
              <div>Location: {progressWeights.location || 0}%</div>
              <div className="pt-2 border-t">
                <span className="font-medium">Total: {totalWeight}%</span>
                {totalWeight !== 100 && (
                  <span className="text-orange-600 ml-2">(should equal 100%)</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Progress Bar Weights</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Total: {totalWeight}% {totalWeight !== 100 && "(should equal 100%)"}
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor="weight-profile" className="w-24">
                    Profile:
                  </Label>
                  <Input
                    id="weight-profile"
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={progressWeights.profile || 0}
                    onChange={(e) => updateWeight("profile", parseInt(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="weight-documents" className="w-24">
                    Documents:
                  </Label>
                  <Input
                    id="weight-documents"
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={progressWeights.documents || 0}
                    onChange={(e) => updateWeight("documents", parseInt(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="weight-location" className="w-24">
                    Location:
                  </Label>
                  <Input
                    id="weight-location"
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={progressWeights.location || 0}
                    onChange={(e) => updateWeight("location", parseInt(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
