// lib/dashboard/adminDashboard.ts
import { prisma } from "@/lib/prisma";

export type DashboardRange = "all" | "month" | "week";

export type AdminDashboardData = {
  range: DashboardRange;

  kpis: {
    totalRevenue: number; // sum(paid) in rands
    pendingAmount: number; // sum(pending) in rands
    pendingCount: number;
    overdueAmount: number; // sum(overdue) in rands
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
    amount: number; // in rands
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

  // Preserve existing features
  vehicleCosts: Array<{
    vehicleId: string;
    vehicleReg: string;
    totalCostCents: number;
  }>;

  driverPerformanceDetails: Array<{
    driverId: string;
    driverName: string;
    totalPayments: number;
    paidOnTime: number;
    onTimeRate: number;
  }>;

  alerts: {
    compliance: Array<{
      vehicleId: string;
      vehicleReg: string;
      type: string;
      expiryDate: string;
      daysUntil: number;
    }>;
    maintenance: Array<{
      id: string;
      title: string;
      scheduledAt: string;
      vehicle: {
        reg: string;
      };
    }>;
  };
};

// ---- Helpers ----
function rangeStart(range: DashboardRange): Date | null {
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
 * Field names match your Prisma schema:
 * - Payment: status, amountCents, dueDate, paidAt, contractId
 * - RentalContract: status, driverId, vehicleId
 * - Vehicle: status, reg, compliance (VehicleCompliance model)
 * - VehicleCompliance: licenseExpiry, insuranceExpiry, roadworthyExpiry
 * - DriverProfile: verificationStatus (IN_REVIEW for pending), completionPercent, user relation
 */
export async function getAdminDashboardData(range: DashboardRange): Promise<AdminDashboardData> {
  const start = rangeStart(range);
  const now = new Date();

  // ---- PAYMENTS ----
  const paymentsWhere = start ? { createdAt: { gte: start } } : {};

  // Get all payments for the range
  const allPayments = await prisma.payment.findMany({
    where: paymentsWhere,
  });

  // Calculate paid payments (status === "PAID")
  const paidPayments = allPayments.filter((p) => p.status === "PAID");
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amountCents, 0) / 100;

  // Calculate pending payments (status === "PENDING")
  const pendingPayments = allPayments.filter((p) => p.status === "PENDING");
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amountCents, 0) / 100;
  const pendingCount = pendingPayments.length;

  // Calculate overdue payments (status === "OVERDUE" OR status === "PENDING" with dueDate < now)
  const overduePayments = allPayments.filter(
    (p) => p.status === "OVERDUE" || (p.status === "PENDING" && new Date(p.dueDate) < now)
  );
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amountCents, 0) / 100;
  const overdueCount = overduePayments.length;

  // Find oldest overdue payment
  const oldestOverdue = overduePayments
    .filter((p) => p.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const oldestOverdueDays = oldestOverdue?.dueDate
    ? Math.max(0, Math.floor((Date.now() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // Get last payment date
  const lastPayment = await prisma.payment.findFirst({
    where: { status: "PAID" },
    orderBy: { paidAt: "desc" },
    select: { paidAt: true },
  });

  // ---- CONTRACTS ----
  const activeContracts = (
    await prisma.rentalContract.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    })
  ).length;

  // ---- VEHICLES (Fleet status + utilization) ----
  const [fleetCounts, assignedVehicles, allVehicles] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.vehicle.findMany({ where: { status: "ASSIGNED" }, select: { id: true } }),
    prisma.vehicle.findMany({ select: { id: true } }),
  ]);
  
  const assignedVehiclesCount = assignedVehicles.length;
  const totalVehiclesCount = allVehicles.length;

  const fleet = {
    total: totalVehiclesCount,
    available: fleetCounts.find((x) => x.status === "AVAILABLE")?._count._all ?? 0,
    assigned: fleetCounts.find((x) => x.status === "ASSIGNED")?._count._all ?? 0,
    maintenance: fleetCounts.find((x) => x.status === "MAINTENANCE")?._count._all ?? 0,
    inactive: fleetCounts.find((x) => x.status === "INACTIVE")?._count._all ?? 0,
  };

  // ---- DRIVER OVERVIEW ----
  const [allDrivers, verifiedDriversList, pendingVerificationList, rejectedDriversList, incompleteProfilesList] =
    await Promise.all([
      prisma.driverProfile.findMany({ select: { id: true } }),
      prisma.driverProfile.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true } }),
      prisma.driverProfile.findMany({ where: { verificationStatus: "IN_REVIEW" }, select: { id: true } }),
      prisma.driverProfile.findMany({ where: { verificationStatus: "REJECTED" }, select: { id: true } }),
      prisma.driverProfile.findMany({ where: { completionPercent: { lt: 100 } }, select: { id: true } }),
    ]);
  
  const totalDrivers = allDrivers.length;
  const verifiedDrivers = verifiedDriversList.length;
  const pendingVerification = pendingVerificationList.length;
  const rejectedDrivers = rejectedDriversList.length;
  const incompleteProfiles = incompleteProfilesList.length;

  // ---- EXPIRIES (Action Required) ----
  const soon = new Date();
  soon.setDate(soon.getDate() + 14); // 14-day window

  const vehiclesWithCompliance = await prisma.vehicle.findMany({
    where: {
      compliance: { isNot: null },
    },
    include: {
      compliance: true,
    },
  });

  const vehiclesExpiringSoon = vehiclesWithCompliance.filter((v) => {
    if (!v.compliance) return false;
    const expiries = [
      v.compliance.licenseExpiry,
      v.compliance.insuranceExpiry,
      v.compliance.roadworthyExpiry,
    ].filter((e): e is Date => e !== null);
    return expiries.some((expiry) => expiry <= soon);
  }).length;

  // ---- RECENT PAYMENTS LIST ----
  const recentPayments = await prisma.payment.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      amountCents: true,
      status: true,
      dueDate: true,
      paidAt: true,
      contract: {
        select: {
          driver: {
            select: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
          vehicle: {
            select: { reg: true, make: true, model: true },
          },
        },
      },
    },
  });

  // ---- DRIVER PERFORMANCE (placeholder until you have real KPIs) ----
  const activeDriversList = await prisma.rentalContract.findMany({ 
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const activeDrivers = activeDriversList.length;

  // ---- PRESERVE EXISTING FEATURES ----

  // Vehicle Costs (Last 6 months)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const vehicleCostsData = await prisma.vehicleCost.findMany({
    where: {
      occurredAt: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      vehicle: true,
    },
  });

  const costsByVehicle = vehicleCostsData.reduce(
    (acc, cost) => {
      const key = cost.vehicleId;
      if (!acc[key]) {
        acc[key] = {
          vehicleId: cost.vehicleId,
          vehicleReg: cost.vehicle.reg,
          totalCostCents: 0,
        };
      }
      acc[key].totalCostCents += cost.amountCents;
      return acc;
    },
    {} as Record<string, { vehicleId: string; vehicleReg: string; totalCostCents: number }>,
  );

  const topCostVehicles = Object.values(costsByVehicle)
    .sort((a, b) => b.totalCostCents - a.totalCostCents)
    .slice(0, 5);

  // Driver Performance Details
  const driverPerformanceData = await prisma.driverProfile.findMany({
    where: {
      contracts: {
        some: {
          status: "ACTIVE",
        },
      },
    },
    include: {
      user: true,
      contracts: {
        where: {
          status: "ACTIVE",
        },
        include: {
          payments: true,
        },
      },
    },
  });

  const driverStats = driverPerformanceData.map((driver) => {
    const allPayments = driver.contracts.flatMap((c) => c.payments);
    const totalPayments = allPayments.length;
    const paidOnTime = allPayments.filter((p) => {
      if (p.status !== "PAID" || !p.paidAt) return false;
      return new Date(p.paidAt) <= new Date(p.dueDate);
    }).length;

    return {
      driverId: driver.id,
      driverName: driver.user.name || driver.user.email,
      totalPayments,
      paidOnTime,
      onTimeRate: totalPayments > 0 ? Math.round((paidOnTime / totalPayments) * 100) : 0,
    };
  });

  // Compliance Alerts
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const complianceAlerts = vehiclesWithCompliance.flatMap((v) => {
    if (!v.compliance) return [];
    const alerts = [];

    if (v.compliance.licenseExpiry) {
      const expiry = new Date(v.compliance.licenseExpiry);
      if (expiry <= thirtyDaysFromNow) {
        alerts.push({
          vehicleId: v.id,
          vehicleReg: v.reg,
          type: "LICENSE",
          expiryDate: v.compliance.licenseExpiry.toISOString(),
          daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    if (v.compliance.insuranceExpiry) {
      const expiry = new Date(v.compliance.insuranceExpiry);
      if (expiry <= thirtyDaysFromNow) {
        alerts.push({
          vehicleId: v.id,
          vehicleReg: v.reg,
          type: "INSURANCE",
          expiryDate: v.compliance.insuranceExpiry.toISOString(),
          daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    if (v.compliance.roadworthyExpiry) {
      const expiry = new Date(v.compliance.roadworthyExpiry);
      if (expiry <= thirtyDaysFromNow) {
        alerts.push({
          vehicleId: v.id,
          vehicleReg: v.reg,
          type: "ROADWORTHY",
          expiryDate: v.compliance.roadworthyExpiry.toISOString(),
          daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    return alerts;
  });

  // Maintenance Alerts
  const upcomingMaintenance = await prisma.vehicleMaintenance.findMany({
    where: {
      status: "PLANNED",
      scheduledAt: {
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      vehicle: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return {
    range,
    kpis: {
      totalRevenue,
      pendingAmount,
      pendingCount,
      overdueAmount,
      overdueCount,
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
      overduePayments: overdueCount,
      pendingVerifications: pendingVerification,
      vehiclesExpiringSoon,
    },
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amountCents / 100, // Convert to rands
      status: p.status,
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : null,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
      driverName: p.contract?.driver?.user
        ? p.contract.driver.user.name || p.contract.driver.user.email
        : null,
      vehicleLabel: p.contract?.vehicle
        ? `${p.contract.vehicle.reg} ${p.contract.vehicle.make} ${p.contract.vehicle.model}`.trim()
        : null,
    })),
    driverPerformance: {
      activeDrivers,
      message: activeDrivers === 0 ? "No active drivers yet" : "Active drivers are running contracts",
    },
    vehicleCosts: topCostVehicles,
    driverPerformanceDetails: driverStats,
    alerts: {
      compliance: complianceAlerts,
      maintenance: upcomingMaintenance.map((m) => ({
        id: m.id,
        title: m.title,
        scheduledAt: m.scheduledAt?.toISOString() || new Date().toISOString(),
        vehicle: {
          reg: m.vehicle.reg,
        },
      })),
    },
  };
}

