"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ViewModeDisplayProps {
  label: string;
  value: string | boolean | number | null | undefined;
  type?: "text" | "boolean" | "currency" | "number";
  className?: string;
}

export function ViewModeDisplay({ label, value, type = "text", className = "" }: ViewModeDisplayProps) {
  const renderValue = () => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not set</span>;
    }

    switch (type) {
      case "boolean":
        const boolValue = value === true || value === "true";
        return (
          <div className="flex items-center gap-2">
            {boolValue ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Enabled</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">Disabled</span>
              </>
            )}
          </div>
        );

      case "currency":
        const cents = typeof value === "number" ? value : Number(value) || 0;
        return <span className="font-medium">{formatZARFromCents(cents)}</span>;

      case "number":
        return <span className="font-medium">{value}</span>;

      default:
        return <span className="font-medium">{String(value)}</span>;
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      <div className="text-sm">{renderValue()}</div>
    </div>
  );
}

