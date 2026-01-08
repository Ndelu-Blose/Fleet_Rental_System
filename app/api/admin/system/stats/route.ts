import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    // Get detailed statistics
    const [
      totalVehicles,
      vehiclesByStatus,
      totalDrivers,
      driversByStatus,
      totalContracts,
      contractsByStatus,
      totalPayments,
      paymentsByStatus,
      totalRevenue,
      pendingRevenue,
      overdueRevenue,
    ] = await Promise.all([
      // Vehicle stats
      prisma.vehicle.findMany({ select: { id: true } }),
      prisma.vehicle.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Driver stats
      prisma.driverProfile.findMany({ select: { id: true } }),
      prisma.driverProfile.groupBy({
        by: ["verificationStatus"],
        _count: true,
      }),

      // Contract stats
      prisma.rentalContract.findMany({ select: { id: true } }),
      prisma.rentalContract.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Payment stats
      prisma.payment.findMany({ select: { id: true } }),
      prisma.payment.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Revenue calculations
      prisma.payment.aggregate({
        where: { status: "PAID" },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PENDING" },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: "PENDING",
          dueDate: { lt: new Date() },
        },
        _sum: { amountCents: true },
      }),
    ]);

    // Get oldest and newest records
    const [oldestVehicle, newestVehicle] = await Promise.all([
      prisma.vehicle.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.vehicle.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    const [oldestDriver, newestDriver] = await Promise.all([
      prisma.driverProfile.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.driverProfile.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({
      vehicles: {
        total: totalVehicles.length,
        byStatus: Object.fromEntries(
          vehiclesByStatus.map((v) => [v.status, v._count])
        ),
        oldestRecord: oldestVehicle?.createdAt,
        newestRecord: newestVehicle?.createdAt,
      },
      drivers: {
        total: totalDrivers.length,
        byVerificationStatus: Object.fromEntries(
          driversByStatus.map((d) => [d.verificationStatus, d._count])
        ),
        oldestRecord: oldestDriver?.createdAt,
        newestRecord: newestDriver?.createdAt,
      },
      contracts: {
        total: totalContracts.length,
        byStatus: Object.fromEntries(
          contractsByStatus.map((c) => [c.status, c._count])
        ),
      },
      payments: {
        total: totalPayments.length,
        byStatus: Object.fromEntries(
          paymentsByStatus.map((p) => [p.status, p._count])
        ),
        revenue: {
          total: totalRevenue._sum.amountCents ?? 0,
          pending: pendingRevenue._sum.amountCents ?? 0,
          overdue: overdueRevenue._sum.amountCents ?? 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Stats] Error fetching statistics:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch statistics",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

