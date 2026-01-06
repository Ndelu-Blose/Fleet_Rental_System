import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const startTime = Date.now();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    // Get basic counts
    const [vehicles, drivers, contracts, payments] = await Promise.all([
      prisma.vehicle.count(),
      prisma.driverProfile.count(),
      prisma.rentalContract.count(),
      prisma.payment.count(),
    ]);

    // Check for recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [recentVehicles, recentDrivers, recentPayments] = await Promise.all([
      prisma.vehicle.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prisma.driverProfile.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prisma.payment.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
    ]);

    // Check for issues
    const overduePayments = await prisma.payment.count({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    });

    const vehiclesNeedingMaintenance = await prisma.vehicle.count({
      where: { status: "MAINTENANCE" },
    });

    return NextResponse.json({
      status: "healthy",
      database: {
        connected: true,
        responseTimeMs: dbResponseTime,
      },
      counts: {
        vehicles,
        drivers,
        contracts,
        payments,
      },
      recentActivity: {
        vehicles: recentVehicles,
        drivers: recentDrivers,
        payments: recentPayments,
      },
      alerts: {
        overduePayments,
        vehiclesNeedingMaintenance,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

