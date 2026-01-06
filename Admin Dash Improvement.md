Below is a **cursor-ready Implementation Pack** to refine your **Admin Dashboard** exactly as we discussed — **same layout**, but upgraded to **action-driven**, with smarter metrics, clickable alerts, quick actions, and better empty states.

This pack assumes **Next.js App Router + Prisma** (which you already have) and your existing routes:
`/admin/dashboard` (or `/admin`) + `/admin/drivers` + `/admin/verification` + `/admin/vehicles` + `/admin/contracts` + `/admin/payments`

---

# Fleet Rental System — Admin Dashboard Refinement (Implementation Pack)

## ✅ Outcomes (What will be added)

1. **Smarter KPI cards**

   * Time range: `All time | This month | This week`
   * Extra context: counts + “last payment”
   * Overdue includes “oldest overdue days”
   * Active contracts includes utilisation (assigned/total)

2. **🚨 Action Required panel**

   * Overdue payments
   * Drivers pending verification
   * Vehicles nearing expiry (license/insurance/roadworthy/service)

3. **Quick Actions row**

   * Add Driver, Add Vehicle, Create Contract, Record Payment

4. **Empty state upgrades**

   * Replace “No data” with guidance + CTA button

5. **Clickable navigation**

   * Each alert routes to the relevant page with filter querystring

---

# 0) Add Querystring Filters (Optional but recommended)

We’ll standardize filters using URL params:

* `/admin/payments?status=overdue`
* `/admin/drivers?status=pending`
* `/admin/vehicles?filter=expiring`
* `/admin/contracts?status=active`

If your pages don’t support this yet, you can add later — dashboard still works without it.

---

# 1) Files To Create / Update

## Create

✅ `lib/dashboard/adminDashboard.ts`
✅ `components/admin/dashboard/KpiCards.tsx`
✅ `components/admin/dashboard/ActionRequired.tsx`
✅ `components/admin/dashboard/QuickActions.tsx`
✅ `components/admin/dashboard/EmptyState.tsx`

## Update

✏️ `app/admin/page.tsx` *(or your dashboard route)*

---

# 2) Data Contract (Types)

### Create: `lib/dashboard/adminDashboard.ts`

> This is the only place that touches Prisma. Keep dashboard queries centralized.

```ts
// lib/dashboard/adminDashboard.ts
import { prisma } from "@/lib/prisma";

export type DashboardRange = "all" | "month" | "week";

export type AdminDashboardData = {
  range: DashboardRange;

  kpis: {
    totalRevenue: number;        // sum(paid)
    pendingAmount: number;       // sum(pending)
    pendingCount: number;
    overdueAmount: number;       // sum(overdue)
    overdueCount: number;
    oldestOverdueDays: number | null;
    activeContracts: number;
    vehicleUtilization: { assigned: number; total: number };
    lastPaymentDate: string | null; // ISO
  };

  fleet: {
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    inactive: number;
  };

  drivers: {
    total: number;
    verified: number;
    pendingVerification: number;
    rejected: number;
    incompleteProfiles: number;
  };

  actionRequired: {
    overduePayments: number;
    pendingVerifications: number;
    vehiclesExpiringSoon: number;
  };

  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    dueDate: string | null;
    paidAt: string | null;
    driverName: string | null;
    vehicleLabel: string | null;
  }>;

  driverPerformance: {
    activeDrivers: number;
    message: string; // for empty state
  };
};

// ---- Helpers ----
function rangeStart(range: DashboardRange) {
  const now = new Date();
  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

/**
 * IMPORTANT:
 * Replace field names below to match your Prisma schema.
 * I’m using likely names based on your system:
 * - Payment: status, amount, dueDate, paidAt, contractId
 * - Contract: status, driverId, vehicleId
 * - Vehicle: status, registrationNumber OR name, licenseExpiry, insuranceExpiry, roadworthyExpiry
 * - Driver: status, verificationStatus, profileCompletion, firstName, lastName
 */
export async function getAdminDashboardData(range: DashboardRange): Promise<AdminDashboardData> {
  const start = rangeStart(range);

  // ---- PAYMENTS ----
  const paymentsWhere = start ? { createdAt: { gte: start } } : {};

  const [paidAgg, pendingAgg, overdueAgg, lastPayment, oldestOverdue] = await Promise.all([
    prisma.payment.aggregate({
      where: { ...paymentsWhere, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...paymentsWhere, status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { ...paymentsWhere, status: "OVERDUE" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.findFirst({
      where: { status: "PAID" },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true },
    }),
    prisma.payment.findFirst({
      where: { status: "OVERDUE", dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true },
    }),
  ]);

  const oldestOverdueDays =
    oldestOverdue?.dueDate
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        )
      : null;

  // ---- CONTRACTS ----
  const activeContracts = await prisma.contract.count({
    where: { status: "ACTIVE" },
  });

  // ---- VEHICLES (Fleet status + utilization) ----
  const [fleetCounts, assignedVehiclesCount, totalVehiclesCount] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.vehicle.count({ where: { status: "ASSIGNED" } }),
    prisma.vehicle.count(),
  ]);

  const fleet = {
    total: totalVehiclesCount,
    available: fleetCounts.find(x => x.status === "AVAILABLE")?._count._all ?? 0,
    assigned: fleetCounts.find(x => x.status === "ASSIGNED")?._count._all ?? 0,
    maintenance: fleetCounts.find(x => x.status === "MAINTENANCE")?._count._all ?? 0,
    inactive: fleetCounts.find(x => x.status === "INACTIVE")?._count._all ?? 0,
  };

  // ---- DRIVER OVERVIEW ----
  const [totalDrivers, verifiedDrivers, pendingVerification, rejectedDrivers, incompleteProfiles] =
    await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.driver.count({ where: { verificationStatus: "PENDING" } }),
      prisma.driver.count({ where: { verificationStatus: "REJECTED" } }),
      prisma.driver.count({ where: { profileCompletion: { lt: 100 } } }), // change if you store differently
    ]);

  // ---- EXPIRIES (Action Required) ----
  const soon = new Date();
  soon.setDate(soon.getDate() + 14); // 14-day window

  const vehiclesExpiringSoon = await prisma.vehicle.count({
    where: {
      OR: [
        { licenseExpiry: { lte: soon } },
        { insuranceExpiry: { lte: soon } },
        { roadworthyExpiry: { lte: soon } },
      ],
    },
  });

  // ---- RECENT PAYMENTS LIST ----
  const recentPayments = await prisma.payment.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      contract: {
        select: {
          driver: { select: { firstName: true, lastName: true } },
          vehicle: { select: { registrationNumber: true, make: true, model: true } },
        },
      },
    },
  });

  // ---- DRIVER PERFORMANCE (placeholder until you have real KPIs) ----
  const activeDrivers = await prisma.contract.count({ where: { status: "ACTIVE" } });

  return {
    range,
    kpis: {
      totalRevenue: paidAgg._sum.amount ?? 0,
      pendingAmount: pendingAgg._sum.amount ?? 0,
      pendingCount: pendingAgg._count._all ?? 0,
      overdueAmount: overdueAgg._sum.amount ?? 0,
      overdueCount: overdueAgg._count._all ?? 0,
      oldestOverdueDays,
      activeContracts,
      vehicleUtilization: { assigned: assignedVehiclesCount, total: totalVehiclesCount },
      lastPaymentDate: lastPayment?.paidAt ? new Date(lastPayment.paidAt).toISOString() : null,
    },
    fleet,
    drivers: {
      total: totalDrivers,
      verified: verifiedDrivers,
      pendingVerification,
      rejected: rejectedDrivers,
      incompleteProfiles,
    },
    actionRequired: {
      overduePayments: overdueAgg._count._all ?? 0,
      pendingVerifications: pendingVerification,
      vehiclesExpiringSoon,
    },
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : null,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
      driverName: p.contract?.driver
        ? `${p.contract.driver.firstName ?? ""} ${p.contract.driver.lastName ?? ""}`.trim()
        : null,
      vehicleLabel: p.contract?.vehicle
        ? `${p.contract.vehicle.registrationNumber ?? ""} ${p.contract.vehicle.make ?? ""} ${p.contract.vehicle.model ?? ""}`.trim()
        : null,
    })),
    driverPerformance: {
      activeDrivers,
      message: activeDrivers === 0 ? "No active drivers yet" : "Active drivers are running contracts",
    },
  };
}
```

---

# 3) Dashboard Page Update (Server Component)

### Update: `app/admin/page.tsx` (or `app/admin/dashboard/page.tsx`)

```tsx
// app/admin/page.tsx
import { getAdminDashboardData } from "@/lib/dashboard/adminDashboard";
import KpiCards from "@/components/admin/dashboard/KpiCards";
import ActionRequired from "@/components/admin/dashboard/ActionRequired";
import QuickActions from "@/components/admin/dashboard/QuickActions";
import EmptyState from "@/components/admin/dashboard/EmptyState";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { range?: "all" | "month" | "week" };
}) {
  const range = searchParams.range ?? "all";
  const data = await getAdminDashboardData(range);

  return (
    <div className="space-y-6">
      {/* Header area stays as you have it */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your fleet operations</p>
      </div>

      <KpiCards data={data} />

      <ActionRequired data={data} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Fleet Status */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Fleet Status</h2>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Total Vehicles" value={data.fleet.total} />
            <Row label="Available" value={data.fleet.available} />
            <Row label="Assigned" value={data.fleet.assigned} />
            <Row label="Maintenance" value={data.fleet.maintenance} />
            <Row label="Inactive" value={data.fleet.inactive} />
          </div>
        </div>

        {/* Driver Overview */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Driver Overview</h2>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Total Drivers" value={data.drivers.total} />
            <Row label="Verified" value={data.drivers.verified} />
            <Row label="Pending Verification" value={data.drivers.pendingVerification} />
            <Row label="Rejected" value={data.drivers.rejected} />
            <Row label="Incomplete Profiles" value={data.drivers.incompleteProfiles} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Recent Payments */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Payments</h2>
          </div>

          {data.recentPayments.length === 0 ? (
            <EmptyState
              title="No payments yet"
              description="Create a contract to automatically generate payments."
              actionLabel="Create Contract"
              actionHref="/admin/contracts"
            />
          ) : (
            <div className="space-y-3">
              {data.recentPayments.map(p => (
                <div key={p.id} className="flex items-start justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">
                      {p.driverName ?? "Unknown Driver"} • {p.vehicleLabel ?? "Unknown Vehicle"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.status} • Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="font-semibold">R {p.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Driver Performance */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Driver Performance</h2>
          </div>

          {data.driverPerformance.activeDrivers === 0 ? (
            <EmptyState
              title="No active drivers"
              description="Verify drivers and create contracts to begin tracking performance."
              actionLabel="Verify Drivers"
              actionHref="/admin/verification"
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              {data.driverPerformance.message}
            </div>
          )}
        </div>
      </div>

      <QuickActions />
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
```

---

# 4) KPI Cards Component (with time range toggle)

### Create: `components/admin/dashboard/KpiCards.tsx`

```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdminDashboardData, DashboardRange } from "@/lib/dashboard/adminDashboard";

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
          value={`R ${data.kpis.totalRevenue.toFixed(2)}`}
          sub={`Last payment: ${
            data.kpis.lastPaymentDate ? new Date(data.kpis.lastPaymentDate).toLocaleDateString() : "—"
          }`}
          href="/admin/payments?status=paid"
        />

        <Card
          title="Pending Payments"
          value={`R ${data.kpis.pendingAmount.toFixed(2)}`}
          sub={`${data.kpis.pendingCount} payment(s) due soon`}
          href="/admin/payments?status=pending"
        />

        <Card
          title="Overdue"
          value={`R ${data.kpis.overdueAmount.toFixed(2)}`}
          sub={
            data.kpis.oldestOverdueDays !== null
              ? `Oldest overdue: ${data.kpis.oldestOverdueDays} day(s)`
              : `${data.kpis.overdueCount} overdue`
          }
          href="/admin/payments?status=overdue"
          danger
        />

        <Card
          title="Active Contracts"
          value={`${data.kpis.activeContracts}`}
          sub={`Utilisation: ${data.kpis.vehicleUtilization.assigned}/${data.kpis.vehicleUtilization.total} vehicles`}
          href="/admin/contracts?status=active"
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
}: {
  title: string;
  value: string;
  sub: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link href={href} className="rounded-lg border bg-card p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className={`text-xs ${danger ? "text-red-600" : "text-muted-foreground"}`}>
          View
        </div>
      </div>

      <div className={`mt-3 text-2xl font-bold ${danger ? "text-red-600" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Link>
  );
}
```

---

# 5) 🚨 Action Required Panel

### Create: `components/admin/dashboard/ActionRequired.tsx`

```tsx
import Link from "next/link";
import type { AdminDashboardData } from "@/lib/dashboard/adminDashboard";

export default function ActionRequired({ data }: { data: AdminDashboardData }) {
  const items = [
    {
      label: "Overdue payments",
      count: data.actionRequired.overduePayments,
      href: "/admin/payments?status=overdue",
      tone: "text-red-600",
    },
    {
      label: "Drivers pending verification",
      count: data.actionRequired.pendingVerifications,
      href: "/admin/verification",
      tone: "text-amber-600",
    },
    {
      label: "Vehicles expiring soon (14 days)",
      count: data.actionRequired.vehiclesExpiringSoon,
      href: "/admin/vehicles?filter=expiring",
      tone: "text-amber-600",
    },
  ].filter(i => i.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">🚨 Action Required</h2>
        <p className="text-sm text-muted-foreground">
          Items that need your attention right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map(i => (
          <Link key={i.label} href={i.href} className="rounded-md border p-4 hover:shadow-sm transition-shadow">
            <div className="text-sm font-medium">{i.label}</div>
            <div className={`mt-2 text-2xl font-bold ${i.tone}`}>{i.count}</div>
            <div className="mt-1 text-xs text-muted-foreground">Tap to review</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

# 6) Quick Actions Row

### Create: `components/admin/dashboard/QuickActions.tsx`

```tsx
import Link from "next/link";

export default function QuickActions() {
  const actions = [
    { label: "Add Driver", href: "/admin/drivers", hint: "Create a new driver profile" },
    { label: "Add Vehicle", href: "/admin/vehicles", hint: "Register a new vehicle" },
    { label: "Create Contract", href: "/admin/contracts", hint: "Assign driver to vehicle" },
    { label: "Record Payment", href: "/admin/payments", hint: "Capture cash/EFT payment" },
  ];

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <p className="text-sm text-muted-foreground">Shortcuts for common admin tasks.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {actions.map(a => (
          <Link
            key={a.label}
            href={a.href}
            className="rounded-md border p-4 hover:shadow-sm transition-shadow"
          >
            <div className="font-medium">{a.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.hint}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

# 7) Improved Empty State Component

### Create: `components/admin/dashboard/EmptyState.tsx`

```tsx
import Link from "next/link";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-md border p-6 text-center">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      <Link
        href={actionHref}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
```

---

# 8) Acceptance Criteria (Done = Done)

✅ KPI cards update based on `?range=`
✅ Pending + overdue show **amount + count**
✅ Overdue shows **oldest overdue days**
✅ Active contracts shows **utilisation**
✅ “Action Required” appears only if there are alerts
✅ Empty states include guidance + CTA
✅ Quick actions appear at bottom
✅ No layout break on mobile

---

# 9) Notes You Must Adjust (Schema Alignment)

In `getAdminDashboardData()` update field names if yours differ:

* `payment.status` values (PAID/PENDING/OVERDUE)
* `driver.verificationStatus` values (VERIFIED/PENDING/REJECTED)
* `driver.profileCompletion` numeric or computed
* vehicle expiry fields: `licenseExpiry`, `insuranceExpiry`, `roadworthyExpiry`
* `vehicle.status` values (AVAILABLE/ASSIGNED/MAINTENANCE/INACTIVE)

---

## If you want the NEXT refinement after this

I can add **tiny micro-improvements** that make it feel premium:

* “View” icons on cards
* subtle “risk highlight” when maintenance > 30%
* “Due this week” mini counter under pending

Just say: **“Add premium touches”** and I’ll extend this pack without changing your design.
