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
    const [vehiclesList, driversList, contractsList, paymentsList] = await Promise.all([
      prisma.vehicle.findMany({ select: { id: true } }),
      prisma.driverProfile.findMany({ select: { id: true } }),
      prisma.rentalContract.findMany({ select: { id: true } }),
      prisma.payment.findMany({ select: { id: true } }),
    ]);

    const vehicles = vehiclesList.length;
    const drivers = driversList.length;
    const contracts = contractsList.length;
    const payments = paymentsList.length;

    // Check for recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [recentVehiclesList, recentDriversList, recentPaymentsList] = await Promise.all([
      prisma.vehicle.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { id: true },
      }),
      prisma.driverProfile.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { id: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { id: true },
      }),
    ]);

    const recentVehicles = recentVehiclesList.length;
    const recentDrivers = recentDriversList.length;
    const recentPayments = recentPaymentsList.length;

    // Check for issues
    const overduePaymentsList = await prisma.payment.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
      select: { id: true },
    });
    const overduePayments = overduePaymentsList.length;

    const vehiclesNeedingMaintenanceList = await prisma.vehicle.findMany({
      where: { status: "MAINTENANCE" },
      select: { id: true },
    });
    const vehiclesNeedingMaintenance = vehiclesNeedingMaintenanceList.length;

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

