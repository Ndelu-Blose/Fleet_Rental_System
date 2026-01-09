"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TrendingUp, Clock, AlertCircle, FileCheck, ArrowRight } from "lucide-react";
import type { AdminDashboardData, DashboardRange } from "@/lib/dashboard/adminDashboard";
import { formatZARFromCents } from "@/lib/money";

export default function KpiCards({ data }: { data: AdminDashboardData }) {
  const params = useSearchParams();
  const current = (params.get("range") as DashboardRange) ?? data.range;

  const RangeLink = ({ value, label }: { value: DashboardRange; label: string }) => (
    <Link
      href={`/admin?range=${value}`}
      className={`rounded-md border px-2 py-1 text-xs ${
        current === value ? "bg-black text-white" : "bg-transparent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Range:</span>
        <RangeLink value="all" label="All Time" />
        <RangeLink value="month" label="This Month" />
        <RangeLink value="week" label="This Week" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card
          title="Total Revenue"
          value={formatZARFromCents(data.kpis.totalRevenue)}
          sub={`Last payment: ${
            data.kpis.lastPaymentDate ? new Date(data.kpis.lastPaymentDate).toLocaleDateString() : "—"
          }`}
          href="/admin/payments?status=paid"
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <Card
          title="Pending Payments"
          value={formatZARFromCents(data.kpis.pendingAmount)}
          sub={`${data.kpis.pendingCount} payment(s) due soon`}
          href="/admin/payments?status=pending"
          icon={<Clock className="h-5 w-5" />}
        />

        <Card
          title="Overdue"
          value={formatZARFromCents(data.kpis.overdueAmount)}
          sub={
            data.kpis.oldestOverdueDays !== null
              ? `Oldest overdue: ${data.kpis.oldestOverdueDays} day(s)`
              : `${data.kpis.overdueCount} overdue`
          }
          href="/admin/payments?status=overdue"
          danger
          icon={<AlertCircle className="h-5 w-5" />}
        />

        <Card
          title="Active Contracts"
          value={`${data.kpis.activeContracts}`}
          sub={`Utilisation: ${data.kpis.vehicleUtilization.assigned}/${data.kpis.vehicleUtilization.total} vehicles`}
          href="/admin/contracts?status=active"
          icon={<FileCheck className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  href,
  danger,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  href: string;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link 
      href={href} 
      className="group rounded-lg border bg-card p-6 hover:shadow-md hover:border-primary/50 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`${danger ? "text-red-600" : "text-muted-foreground"} group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
          )}
          <div className="text-sm font-medium">{title}</div>
        </div>
        <ArrowRight 
          className={`h-4 w-4 ${danger ? "text-red-600" : "text-muted-foreground"} group-hover:translate-x-1 transition-transform`}
        />
      </div>

      <div className={`mt-3 text-2xl font-bold ${danger ? "text-red-600" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Link>
  );
}

