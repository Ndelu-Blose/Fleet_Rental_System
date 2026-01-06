"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, Bell, FileText, UserCheck, Settings as SettingsIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type TabConfig = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "required" | "advanced";
  description?: string;
};

// Configuration tabs (system behavior)
const configTabs: TabConfig[] = [
  {
    href: "/admin/settings/company",
    label: "Company",
    icon: Building2,
    badge: "required",
    description: "Set your company details and banking information",
  },
  {
    href: "/admin/settings/contracts",
    label: "Pricing & Contracts",
    icon: FileText,
    badge: "required",
    description: "Configure default pricing, contract terms, and payment frequencies",
  },
  {
    href: "/admin/settings/payments",
    label: "Payment Rules",
    icon: CreditCard,
    badge: "required",
    description: "Set payment processing mode, grace periods, and reminder schedules",
  },
  {
    href: "/admin/settings/onboarding",
    label: "Driver Requirements",
    icon: UserCheck,
    description: "Define required fields, documents, and progress tracking for drivers",
  },
  {
    href: "/admin/settings/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Controls when and how drivers receive email reminders",
  },
];

// Administration tabs (system management)
const adminTabs: TabConfig[] = [
  {
    href: "/admin/settings/system",
    label: "Operations Overview",
    icon: SettingsIcon,
    description: "Monitor business status and control platform access",
  },
  {
    href: "/admin/settings/admin-accounts",
    label: "Admin Users",
    icon: Users,
    badge: "advanced",
    description: "View and manage admin user accounts",
  },
];

const allTabs = [...configTabs, ...adminTabs];

export function TabNav() {
  const pathname = usePathname();
  const activeTab = allTabs.find((tab) => pathname === tab.href);

  return (
    <div className="space-y-4">
      {/* Core Configuration Section */}
      <div>
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Core Configuration
          </h3>
        </div>
        <div className="border-b">
          <nav className="flex gap-4 overflow-x-auto">
            {configTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative",
                    isActive
                      ? "border-primary text-primary bg-primary/5 font-semibold"
                      : "border-transparent hover:text-primary hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    {tab.label}
                    {tab.badge === "required" && (
                      <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 h-4 border-primary/30 text-primary">
                        Required
                      </Badge>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute left-0 bottom-0 h-0.5 w-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Administration & Control Section */}
      <div>
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Administration & Control
          </h3>
        </div>
        <div className="border-b border-dashed">
          <nav className="flex gap-4 overflow-x-auto">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative",
                    isActive
                      ? "border-primary text-primary bg-primary/5 font-semibold"
                      : "border-transparent hover:text-primary hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    {tab.label}
                    {tab.badge === "advanced" && (
                      <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 h-4 text-muted-foreground">
                        Advanced
                      </Badge>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute left-0 bottom-0 h-0.5 w-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Micro-description for active tab */}
      {activeTab?.description && (
        <div className="text-xs text-muted-foreground px-1">
          {activeTab.description}
        </div>
      )}
    </div>
  );
}

