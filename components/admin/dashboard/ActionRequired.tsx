import Link from "next/link";
import { AlertTriangle, UserCheck, Car, ArrowRight } from "lucide-react";
import type { AdminDashboardData } from "@/lib/dashboard/adminDashboard";

export default function ActionRequired({ data }: { data: AdminDashboardData }) {
  const items = [
    {
      label: "Overdue payments",
      count: data.actionRequired.overduePayments,
      href: "/admin/payments?status=overdue",
      tone: "text-red-600",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      label: "Drivers pending verification",
      count: data.actionRequired.pendingVerifications,
      href: "/admin/verification",
      tone: "text-amber-600",
      icon: <UserCheck className="h-5 w-5" />,
    },
    {
      label: "Vehicles expiring soon (14 days)",
      count: data.actionRequired.vehiclesExpiringSoon,
      href: "/admin/vehicles?filter=expiring",
      tone: "text-amber-600",
      icon: <Car className="h-5 w-5" />,
    },
  ].filter((i) => i.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">🚨 Action Required</h2>
        <p className="text-sm text-muted-foreground">Items that need your attention right now.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((i) => (
          <Link
            key={i.label}
            href={i.href}
            className="group rounded-md border p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`${i.tone} group-hover:scale-110 transition-transform`}>
                {i.icon}
              </div>
              <div className="text-sm font-medium">{i.label}</div>
            </div>
            <div className={`mt-2 text-2xl font-bold ${i.tone}`}>{i.count}</div>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              Tap to review
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

