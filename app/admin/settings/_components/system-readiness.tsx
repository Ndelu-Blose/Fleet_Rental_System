"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ReadinessStatus = {
  company: boolean;
  contracts: boolean;
  payments: boolean;
  onboarding: boolean;
  notifications: boolean;
  system: boolean;
};

export function SystemReadiness() {
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadiness();
  }, []);

  const fetchReadiness = async () => {
    try {
      const res = await fetch("/api/admin/settings/readiness");
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (error) {
      console.error("Failed to fetch readiness:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !readiness) {
    return (
      <div className="bg-muted/50 border rounded-lg px-4 py-3">
        <div className="text-sm text-muted-foreground">Loading system readiness...</div>
      </div>
    );
  }

  const statuses = [
    { key: "company", label: "Company", configured: readiness.company },
    { key: "contracts", label: "Pricing", configured: readiness.contracts },
    { key: "payments", label: "Payment Rules", configured: readiness.payments },
    { key: "onboarding", label: "Driver Requirements", configured: readiness.onboarding },
    { key: "notifications", label: "Notifications", configured: readiness.notifications },
    { key: "system", label: "Operations", configured: readiness.system },
  ];

  const configuredCount = statuses.filter((s) => s.configured).length;
  const totalCount = statuses.length;
  const percentage = Math.round((configuredCount / totalCount) * 100);

  return (
    <div className="bg-muted/50 border rounded-lg px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">System Readiness</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {configuredCount} / {totalCount} configured
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{percentage}%</div>
          <div className="text-xs text-muted-foreground">Complete</div>
        </div>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex flex-wrap gap-2 pt-1">
        {statuses.map((status) => (
          <Badge
            key={status.key}
            variant={status.configured ? "default" : "secondary"}
            className={cn(
              "text-xs",
              status.configured
                ? "bg-green-600 hover:bg-green-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            {status.configured ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {status.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

