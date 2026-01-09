"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CreditCard, Bell, FileText, UserCheck, Settings as SettingsIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const router = useRouter();
  const activeTab = allTabs.find((tab) => pathname === tab.href);
  
  const activeConfigTab = configTabs.find((tab) => pathname === tab.href);
  const activeAdminTab = adminTabs.find((tab) => pathname === tab.href);

  return (
    <div className="space-y-4">
      {/* Core Configuration Section */}
      <div>
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Core Configuration
          </h3>
        </div>
        
        {/* Mobile: Dropdown Selector */}
        <div className="md:hidden mb-4">
          <Select
            value={activeConfigTab?.href || ""}
            onValueChange={(value) => router.push(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose section">
                {activeConfigTab ? (
                  <div className="flex items-center gap-2">
                    <activeConfigTab.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{activeConfigTab.label}</span>
                  </div>
                ) : (
                  "Choose section"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {configTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.href} value={tab.href}>
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{tab.label}</span>
                      {tab.badge === "required" && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 border-primary/30 text-primary shrink-0">
                          Required
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Horizontal Tabs */}
        <div className="hidden md:block border-b">
          <nav className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {/* Mobile: Dropdown Selector */}
        <div className="md:hidden mb-4">
          <Select
            value={activeAdminTab?.href || ""}
            onValueChange={(value) => router.push(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose section">
                {activeAdminTab ? (
                  <div className="flex items-center gap-2">
                    <activeAdminTab.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{activeAdminTab.label}</span>
                  </div>
                ) : (
                  "Choose section"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.href} value={tab.href}>
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{tab.label}</span>
                      {tab.badge === "advanced" && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 text-muted-foreground shrink-0">
                          Advanced
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Horizontal Tabs */}
        <div className="hidden md:block border-b border-dashed">
          <nav className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

