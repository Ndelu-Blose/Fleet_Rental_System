"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function StatusBadge({
  configured,
  okText = "Configured",
  badText = "Missing info",
}: {
  configured: boolean;
  okText?: string;
  badText?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 ${
        configured
          ? "text-green-700 border-green-700 bg-green-50"
          : "text-orange-700 border-orange-700 bg-orange-50"
      }`}
    >
      {configured ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          {okText} ✅
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" />
          {badText} ⚠️
        </>
      )}
    </Badge>
  );
}

