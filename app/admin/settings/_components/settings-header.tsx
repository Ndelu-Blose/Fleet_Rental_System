"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SettingsHeader({
  title,
  subtitle,
  edit,
  dirty,
  lastUpdatedAt,
  onEdit,
  onSave,
  onCancel,
  saving = false,
}: {
  title: string;
  subtitle?: string;
  edit: boolean;
  dirty: boolean;
  lastUpdatedAt: string | null;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {dirty && edit && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved changes
            </Badge>
          )}
          {lastUpdatedAt && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdatedAt).toLocaleString("en-ZA")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!edit ? (
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={!dirty || saving}
              className="bg-black text-white hover:bg-black/90"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

