"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ReadinessStatus = {
  company: boolean;
  contracts: boolean;
  payments: boolean;
  onboarding: boolean;
  notifications: boolean;
  system: boolean;
};

export function NotificationsDropdown() {
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadiness();
    // Refresh every 30 seconds
    const interval = setInterval(fetchReadiness, 30000);
    return () => clearInterval(interval);
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
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  const statuses = [
    { key: "company", label: "Company", configured: readiness.company, href: "/admin/settings/company" },
    { key: "contracts", label: "Pricing & Contracts", configured: readiness.contracts, href: "/admin/settings/contracts" },
    { key: "payments", label: "Payment Rules", configured: readiness.payments, href: "/admin/settings/payments" },
    { key: "onboarding", label: "Driver Requirements", configured: readiness.onboarding, href: "/admin/settings/onboarding" },
    { key: "notifications", label: "Notifications", configured: readiness.notifications, href: "/admin/settings/notifications" },
    { key: "system", label: "System Controls", configured: readiness.system, href: "/admin/settings/system" },
  ];

  const incompleteCount = statuses.filter((s) => !s.configured).length;
  const hasNotifications = incompleteCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {incompleteCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>System Notifications</span>
          {hasNotifications && (
            <Badge variant="destructive" className="text-xs">
              {incompleteCount} incomplete
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasNotifications ? (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Some settings need configuration:
            </div>
            {statuses
              .filter((s) => !s.configured)
              .map((status) => (
                <DropdownMenuItem key={status.key} asChild>
                  <Link
                    href={status.href}
                    className="flex items-center gap-2 cursor-pointer w-full"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="flex-1">{status.label}</span>
                    <Badge variant="outline" className="text-xs">
                      Missing
                    </Badge>
                  </Link>
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 cursor-pointer w-full font-medium"
              >
                <Settings className="h-4 w-4" />
                <span>Go to Settings</span>
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <div className="px-2 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium">All systems configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your settings are complete
            </p>
            <Link href="/admin/settings">
              <Button variant="outline" size="sm" className="mt-3">
                View Settings
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

