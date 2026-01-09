// lib/dashboard/adminDashboard.ts
import { prisma } from "@/lib/prisma";
import { ContractStatus, PaymentStatus, VehicleStatus, VerificationStatus, MaintenanceStatus } from "@prisma/client";

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
    totalRevenue: number; // sum(paid) in cents
    pendingAmount: number; // sum(pending) in cents
    pendingCount: number;
    overdueAmount: number; // sum(overdue) in cents
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
 * Optimized dashboard data fetcher using count() and aggregate() instead of findMany()
 * All queries run in parallel for maximum performance
 */
export async function getAdminDashboardData(range: DashboardRange): Promise<AdminDashboardData> {
  console.time("dashboard:data");
  const start = rangeStart(range);
  const now = new Date();

  // Build date filter for payments
  const paymentsWhere = start ? { createdAt: { gte: start } } : {};
  const overdueWhere = {
    OR: [
      { status: PaymentStatus.OVERDUE },
      { status: PaymentStatus.PENDING, dueDate: { lt: now } },
    ],
    ...(start ? { createdAt: { gte: start } } : {}),
  };

  // ---- MAIN PARALLEL QUERY BATCH ----
  // All independent queries run simultaneously
  try {
    console.time("dashboard:parallel-queries");
    const [
      // Payment aggregates (using aggregate instead of fetching all)
      revenueResult,
      pendingResult,
      overdueResult,
      lastPayment,
      oldestOverduePayment,
      
      // Counts (using count() instead of findMany)
      activeContractsCount,
      totalVehiclesCount,
      assignedVehiclesCount,
      fleetCounts,
      
      // Driver counts
      totalDriversCount,
      verifiedDriversCount,
      pendingVerificationCount,
      rejectedDriversCount,
      incompleteProfilesCount,
      
      // Recent payments (only fetch what we need)
      recentPaymentsData,
      
      // Compliance data (needed for alerts)
      vehiclesWithCompliance,
      
      // Driver performance data (only active drivers)
      driverPerformanceData,
      
      // Vehicle costs (last 6 months)
      vehicleCostsData,
      
      // Maintenance alerts
      maintenanceData,
    ] = await Promise.all([
      // Payment aggregates
      withTimeout(
        prisma.payment.aggregate({
          where: {
            status: PaymentStatus.PAID,
            ...paymentsWhere,
          },
          _sum: { amountCents: true },
        }),
        5000
      ).catch(() => ({ _sum: { amountCents: null } })),
      
      withTimeout(
        prisma.payment.aggregate({
          where: {
            status: PaymentStatus.PENDING,
            ...paymentsWhere,
          },
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
        5000
      ).catch(() => ({ _sum: { amountCents: null }, _count: { _all: 0 } })),
      
      withTimeout(
        prisma.payment.aggregate({
          where: overdueWhere,
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
        5000
      ).catch(() => ({ _sum: { amountCents: null }, _count: { _all: 0 } })),
      
      withTimeout(
        prisma.payment.findFirst({
          where: { status: PaymentStatus.PAID },
          orderBy: { paidAt: "desc" },
          select: { paidAt: true },
        }),
        3000
      ).catch(() => null),
      
      withTimeout(
        prisma.payment.findFirst({
          where: overdueWhere,
          orderBy: { dueDate: "asc" },
          select: { dueDate: true },
        }),
        3000
      ).catch(() => null),
      
      // Contract count
      withTimeout(
        prisma.rentalContract.count({
          where: { status: ContractStatus.ACTIVE },
        }),
        3000
      ).catch(() => 0),
      
      // Vehicle counts
      withTimeout(
        prisma.vehicle.count(),
        3000
      ).catch(() => 0),
      
      withTimeout(
        prisma.vehicle.count({
          where: { status: VehicleStatus.ASSIGNED },
        }),
        3000
      ).catch(() => 0),
      
      withTimeout(
        prisma.vehicle.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        5000
      ).catch(() => []),
      
      // Driver counts
      withTimeout(
        prisma.driverProfile.count(),
        3000
      ).catch(() => 0),
      
      withTimeout(
        prisma.driverProfile.count({
          where: { verificationStatus: VerificationStatus.VERIFIED },
        }),
        3000
      ).catch(() => 0),
      
      withTimeout(
        prisma.driverProfile.count({
          where: { verificationStatus: VerificationStatus.IN_REVIEW },
        }),
        3000
      ).catch(() => 0),
      
      withTimeout(
        prisma.driverProfile.count({
          where: { verificationStatus: VerificationStatus.REJECTED },
        }),
        3000
      ).catch(() => 0),
      
      withTimeout(
        prisma.driverProfile.count({
          where: { completionPercent: { lt: 100 } },
        }),
        3000
      ).catch(() => 0),
      
      // Recent payments (limited fetch)
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
      
      // Compliance data
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
      
      // Driver performance (only active drivers)
      withTimeout(
        prisma.driverProfile.findMany({
          where: {
            contracts: {
              some: {
                status: ContractStatus.ACTIVE,
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
                status: ContractStatus.ACTIVE,
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
      
      // Vehicle costs (last 6 months)
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
      
      // Maintenance alerts
      withTimeout(
        prisma.vehicleMaintenance.findMany({
          where: {
            status: MaintenanceStatus.PLANNED,
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
    console.timeEnd("dashboard:parallel-queries");

    // Process results
    const totalRevenue = revenueResult._sum.amountCents || 0;
    const pendingAmount = pendingResult._sum.amountCents || 0;
    const pendingCount = pendingResult._count._all;
    const overdueAmount = overdueResult._sum.amountCents || 0;
    const overdueCount = overdueResult._count._all;

    const oldestOverdueDays = oldestOverduePayment?.dueDate
      ? Math.max(0, Math.floor((Date.now() - new Date(oldestOverduePayment.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    const lastPaymentDate = lastPayment?.paidAt ? new Date(lastPayment.paidAt).toISOString() : null;

    // Fleet counts
    const fleet = {
      total: totalVehiclesCount,
      available: fleetCounts.find((x) => x.status === VehicleStatus.AVAILABLE)?._count._all ?? 0,
      assigned: fleetCounts.find((x) => x.status === VehicleStatus.ASSIGNED)?._count._all ?? 0,
      maintenance: fleetCounts.find((x) => x.status === VehicleStatus.MAINTENANCE)?._count._all ?? 0,
      inactive: fleetCounts.find((x) => x.status === VehicleStatus.INACTIVE)?._count._all ?? 0,
    };

    // Drivers
    const drivers = {
      total: totalDriversCount,
      verified: verifiedDriversCount,
      pendingVerification: pendingVerificationCount,
      rejected: rejectedDriversCount,
      incompleteProfiles: incompleteProfilesCount,
    };

    // Compliance alerts
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const vehiclesExpiringSoon = vehiclesWithCompliance.filter((v) => {
      if (!v.compliance) return false;
      const expiries = [
        v.compliance.licenseExpiry,
        v.compliance.insuranceExpiry,
        v.compliance.roadworthyExpiry,
      ].filter((e): e is Date => e !== null);
      return expiries.some((expiry) => expiry <= soon);
    }).length;

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

    // Vehicle costs
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

    // Driver performance
    const activeDrivers = driverPerformanceData.length;
    const driverStats = driverPerformanceData.map((driver) => {
      const allPayments = driver.contracts.flatMap((c) => c.payments);
      const totalPayments = allPayments.length;
      const paidOnTime = allPayments.filter((p) => {
        if (p.status !== PaymentStatus.PAID || !p.paidAt) return false;
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

    // Maintenance alerts
    const upcomingMaintenance = maintenanceData.map((m) => ({
      id: m.id,
      title: m.title,
      scheduledAt: m.scheduledAt?.toISOString() || new Date().toISOString(),
      vehicle: {
        reg: m.vehicle.reg,
      },
    }));

    console.timeEnd("dashboard:data");

    return {
      range,
      kpis: {
        totalRevenue,
        pendingAmount,
        pendingCount,
        overdueAmount,
        overdueCount,
        oldestOverdueDays,
        activeContracts: activeContractsCount,
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
      recentPayments: recentPaymentsData.map((p) => ({
        id: p.id,
        amount: p.amountCents / 100,
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
  } catch (error) {
    console.error("[Dashboard] Failed to load:", error);
    console.timeEnd("dashboard:data");
    // Return safe defaults
    return {
      range,
      kpis: {
        totalRevenue: 0,
        pendingAmount: 0,
        pendingCount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        oldestOverdueDays: null,
        activeContracts: 0,
        vehicleUtilization: { assigned: 0, total: 0 },
        lastPaymentDate: null,
      },
      fleet: {
        total: 0,
        available: 0,
        assigned: 0,
        maintenance: 0,
        inactive: 0,
      },
      drivers: {
        total: 0,
        verified: 0,
        pendingVerification: 0,
        rejected: 0,
        incompleteProfiles: 0,
      },
      actionRequired: {
        overduePayments: 0,
        pendingVerifications: 0,
        vehiclesExpiringSoon: 0,
      },
      recentPayments: [],
      driverPerformance: {
        activeDrivers: 0,
        message: "No active drivers yet",
      },
      vehicleCosts: [],
      driverPerformanceDetails: [],
      alerts: {
        compliance: [],
        maintenance: [],
      },
    };
  }
}
