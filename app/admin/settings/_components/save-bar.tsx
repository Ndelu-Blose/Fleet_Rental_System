"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SaveBar({ onSave }: { onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button
        className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave();
            toast.success("Settings saved successfully");
          } catch (error) {
            toast.error("Failed to save settings");
            console.error(error);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

