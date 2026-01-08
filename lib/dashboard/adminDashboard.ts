// lib/dashboard/adminDashboard.ts
import { prisma } from "@/lib/prisma";

export type DashboardRange = "all" | "month" | "week";

// Timeout wrapper to prevent hanging queries
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
    ),
  ]);
}

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

  // ---- PAYMENTS SECTION (with error handling) ----
  let allPayments: any[] = [];
  let totalRevenue = 0;
  let pendingAmount = 0;
  let pendingCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let oldestOverdueDays: number | null = null;
  let lastPaymentDate: string | null = null;

  try {
    const paymentsWhere = start ? { createdAt: { gte: start } } : {};

    // Parallelize payment queries
    const [payments, lastPayment] = await Promise.all([
      withTimeout(
        prisma.payment.findMany({
          where: paymentsWhere,
        }),
        5000
      ).catch(() => []),
      withTimeout(
        prisma.payment.findFirst({
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          select: { paidAt: true },
        }),
        3000
      ).catch(() => null),
    ]);

    allPayments = payments;

    // Calculate paid payments (status === "PAID")
    const paidPayments = allPayments.filter((p) => p.status === "PAID");
    totalRevenue = paidPayments.reduce((sum, p) => sum + p.amountCents, 0) / 100;

    // Calculate pending payments (status === "PENDING")
    const pendingPayments = allPayments.filter((p) => p.status === "PENDING");
    pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amountCents, 0) / 100;
    pendingCount = pendingPayments.length;

    // Calculate overdue payments (status === "OVERDUE" OR status === "PENDING" with dueDate < now)
    const overduePayments = allPayments.filter(
      (p) => p.status === "OVERDUE" || (p.status === "PENDING" && new Date(p.dueDate) < now)
    );
    overdueAmount = overduePayments.reduce((sum, p) => sum + p.amountCents, 0) / 100;
    overdueCount = overduePayments.length;

    // Find oldest overdue payment
    const oldestOverdue = overduePayments
      .filter((p) => p.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    oldestOverdueDays = oldestOverdue?.dueDate
      ? Math.max(0, Math.floor((Date.now() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    lastPaymentDate = lastPayment?.paidAt ? new Date(lastPayment.paidAt).toISOString() : null;
  } catch (error) {
    console.error("[Dashboard] Payments section failed:", error);
    // Use defaults, continue
  }

  // ---- CONTRACTS SECTION (with error handling) ----
  let activeContracts = 0;
  try {
    const activeContractsList = await withTimeout(
      prisma.rentalContract.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      }),
      3000
    ).catch(() => []);
    activeContracts = activeContractsList.length;
  } catch (error) {
    console.error("[Dashboard] Contracts section failed:", error);
    // Use default (0)
  }

  // ---- VEHICLES SECTION (with error handling) ----
  let fleet = {
    total: 0,
    available: 0,
    assigned: 0,
    maintenance: 0,
    inactive: 0,
  };
  let assignedVehiclesCount = 0;
  let totalVehiclesCount = 0;

  try {
    // Parallelize contracts and vehicle queries
    const [fleetCounts, assignedVehicles, allVehicles] = await Promise.all([
      withTimeout(
        prisma.vehicle.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        5000
      ).catch(() => []),
      withTimeout(
        prisma.vehicle.findMany({ where: { status: "ASSIGNED" }, select: { id: true } }),
        3000
      ).catch(() => []),
      withTimeout(
        prisma.vehicle.findMany({ select: { id: true } }),
        3000
      ).catch(() => []),
    ]);

    assignedVehiclesCount = assignedVehicles.length;
    totalVehiclesCount = allVehicles.length;

    fleet = {
      total: totalVehiclesCount,
      available: fleetCounts.find((x) => x.status === "AVAILABLE")?._count._all ?? 0,
      assigned: fleetCounts.find((x) => x.status === "ASSIGNED")?._count._all ?? 0,
      maintenance: fleetCounts.find((x) => x.status === "MAINTENANCE")?._count._all ?? 0,
      inactive: fleetCounts.find((x) => x.status === "INACTIVE")?._count._all ?? 0,
    };
  } catch (error) {
    console.error("[Dashboard] Vehicles section failed:", error);
    // Use defaults
  }

  // ---- DRIVERS SECTION (with error handling) ----
  let drivers = {
    total: 0,
    verified: 0,
    pendingVerification: 0,
    rejected: 0,
    incompleteProfiles: 0,
  };

  try {
    const [allDrivers, verifiedDriversList, pendingVerificationList, rejectedDriversList, incompleteProfilesList] =
      await Promise.all([
        withTimeout(prisma.driverProfile.findMany({ select: { id: true } }), 3000).catch(() => []),
        withTimeout(
          prisma.driverProfile.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true } }),
          3000
        ).catch(() => []),
        withTimeout(
          prisma.driverProfile.findMany({ where: { verificationStatus: "IN_REVIEW" }, select: { id: true } }),
          3000
        ).catch(() => []),
        withTimeout(
          prisma.driverProfile.findMany({ where: { verificationStatus: "REJECTED" }, select: { id: true } }),
          3000
        ).catch(() => []),
        withTimeout(
          prisma.driverProfile.findMany({ where: { completionPercent: { lt: 100 } }, select: { id: true } }),
          3000
        ).catch(() => []),
      ]);

    drivers = {
      total: allDrivers.length,
      verified: verifiedDriversList.length,
      pendingVerification: pendingVerificationList.length,
      rejected: rejectedDriversList.length,
      incompleteProfiles: incompleteProfilesList.length,
    };
  } catch (error) {
    console.error("[Dashboard] Drivers section failed:", error);
    // Use defaults
  }

  // ---- COMPLIANCE & RECENT PAYMENTS (with error handling) ----
  let vehiclesExpiringSoon = 0;
  let recentPayments: any[] = [];
  let complianceAlerts: Array<{
    vehicleId: string;
    vehicleReg: string;
    type: string;
    expiryDate: string;
    daysUntil: number;
  }> = [];

  try {
    const soon = new Date();
    soon.setDate(soon.getDate() + 14); // 14-day window

    // Parallelize compliance and recent payments
    const [vehiclesWithCompliance, recentPaymentsData] = await Promise.all([
      withTimeout(
        prisma.vehicle.findMany({
          where: {
            compliance: { isNot: null },
          },
          include: {
            compliance: true,
          },
        }),
        5000
      ).catch(() => []),
      withTimeout(
        prisma.payment.findMany({
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
        }),
        5000
      ).catch(() => []),
    ]);

    vehiclesExpiringSoon = vehiclesWithCompliance.filter((v) => {
      if (!v.compliance) return false;
      const expiries = [
        v.compliance.licenseExpiry,
        v.compliance.insuranceExpiry,
        v.compliance.roadworthyExpiry,
      ].filter((e): e is Date => e !== null);
      return expiries.some((expiry) => expiry <= soon);
    }).length;

    recentPayments = recentPaymentsData;

    // Compliance Alerts
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    complianceAlerts = vehiclesWithCompliance.flatMap((v) => {
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
  } catch (error) {
    console.error("[Dashboard] Compliance/Recent payments section failed:", error);
    // Use defaults
  }

  // ---- DRIVER PERFORMANCE & VEHICLE COSTS (with error handling) ----
  let activeDrivers = 0;
  let driverStats: Array<{
    driverId: string;
    driverName: string;
    totalPayments: number;
    paidOnTime: number;
    onTimeRate: number;
  }> = [];
  let topCostVehicles: Array<{
    vehicleId: string;
    vehicleReg: string;
    totalCostCents: number;
  }> = [];
  let upcomingMaintenance: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    vehicle: {
      reg: string;
    };
  }> = [];

  try {
    const [activeDriversList, vehicleCostsData, driverPerformanceData, maintenanceData] = await Promise.all([
      withTimeout(
        prisma.rentalContract.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        }),
        3000
      ).catch(() => []),
      withTimeout(
        prisma.vehicleCost.findMany({
          where: {
            occurredAt: {
              gte: new Date(now.getFullYear(), now.getMonth() - 6, 1),
            },
          },
          include: {
            vehicle: {
              select: { reg: true },
            },
          },
        }),
        5000
      ).catch(() => []),
      withTimeout(
        prisma.driverProfile.findMany({
          where: {
            contracts: {
              some: {
                status: "ACTIVE",
              },
            },
          },
          select: {
            id: true,
            user: {
              select: { name: true, email: true },
            },
            contracts: {
              where: {
                status: "ACTIVE",
              },
              select: {
                payments: {
                  select: {
                    status: true,
                    paidAt: true,
                    dueDate: true,
                  },
                },
              },
            },
          },
        }),
        5000
      ).catch(() => []),
      withTimeout(
        prisma.vehicleMaintenance.findMany({
          where: {
            status: "PLANNED",
            scheduledAt: {
              lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            vehicle: {
              select: { reg: true },
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
        }),
        5000
      ).catch(() => []),
    ]);

    activeDrivers = activeDriversList.length;

    // Process vehicle costs
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

    topCostVehicles = Object.values(costsByVehicle)
      .sort((a, b) => b.totalCostCents - a.totalCostCents)
      .slice(0, 5);

    // Process driver performance
    driverStats = driverPerformanceData.map((driver) => {
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

    // Process maintenance alerts
    upcomingMaintenance = maintenanceData.map((m) => ({
      id: m.id,
      title: m.title,
      scheduledAt: m.scheduledAt?.toISOString() || new Date().toISOString(),
      vehicle: {
        reg: m.vehicle.reg,
      },
    }));
  } catch (error) {
    console.error("[Dashboard] Driver performance/Vehicle costs section failed:", error);
    // Use defaults
  }

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
      lastPaymentDate,
    },
    fleet,
    drivers,
    actionRequired: {
      overduePayments: overdueCount,
      pendingVerifications: drivers.pendingVerification,
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
      maintenance: upcomingMaintenance,
    },
  };
}

