import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Overdue payments
    const overduePayments = await prisma.payment.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        dueDate: { lt: now },
      },
      include: {
        contract: {
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            vehicle: {
              select: {
                reg: true,
                make: true,
                model: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 10,
    });

    // Contracts expiring soon (within 7 days)
    const expiringContracts = await prisma.rentalContract.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          not: null,
          lte: sevenDaysFromNow,
          gte: now,
        },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            reg: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: {
        endDate: "asc",
      },
      take: 10,
    });

    // Vehicle compliance expiring soon
    const complianceAlerts = await prisma.vehicle.findMany({
      where: {
        compliance: {
          OR: [
            {
              licenseExpiry: {
                lte: thirtyDaysFromNow,
                gte: now,
              },
            },
            {
              insuranceExpiry: {
                lte: thirtyDaysFromNow,
                gte: now,
              },
            },
            {
              roadworthyExpiry: {
                lte: thirtyDaysFromNow,
                gte: now,
              },
            },
          ],
        },
      },
      select: {
        id: true,
        reg: true,
        make: true,
        model: true,
        compliance: {
          select: {
            licenseExpiry: true,
            insuranceExpiry: true,
            roadworthyExpiry: true,
          },
        },
      },
      take: 10,
    });

    // Upcoming maintenance (within 7 days)
    const upcomingMaintenance = await prisma.vehicleMaintenance.findMany({
      where: {
        status: "PLANNED",
        scheduledAt: {
          lte: sevenDaysFromNow,
          gte: now,
        },
      },
      include: {
        vehicle: {
          select: {
            reg: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 10,
    });

    return NextResponse.json({
      overduePayments: overduePayments.map((p) => ({
        id: p.id,
        driverName: p.contract.driver.user.name || "Unknown",
        vehicleReg: p.contract.vehicle.reg,
        amount: p.amountCents,
        dueDate: p.dueDate,
        daysOverdue: Math.floor((now.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      expiringContracts: expiringContracts.map((c) => ({
        id: c.id,
        driverName: c.driver.user.name || "Unknown",
        vehicleReg: c.vehicle.reg,
        endDate: c.endDate,
        daysUntil: c.endDate ? Math.floor((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      })),
      complianceAlerts: complianceAlerts.flatMap((v) => {
        const alerts: Array<{
          vehicleId: string;
          vehicleReg: string;
          type: string;
          expiryDate: Date;
          daysUntil: number;
        }> = [];

        if (v.compliance?.licenseExpiry) {
          const expiry = new Date(v.compliance.licenseExpiry);
          if (expiry <= thirtyDaysFromNow && expiry >= now) {
            alerts.push({
              vehicleId: v.id,
              vehicleReg: v.reg,
              type: "License",
              expiryDate: expiry,
              daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        if (v.compliance?.insuranceExpiry) {
          const expiry = new Date(v.compliance.insuranceExpiry);
          if (expiry <= thirtyDaysFromNow && expiry >= now) {
            alerts.push({
              vehicleId: v.id,
              vehicleReg: v.reg,
              type: "Insurance",
              expiryDate: expiry,
              daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        if (v.compliance?.roadworthyExpiry) {
          const expiry = new Date(v.compliance.roadworthyExpiry);
          if (expiry <= thirtyDaysFromNow && expiry >= now) {
            alerts.push({
              vehicleId: v.id,
              vehicleReg: v.reg,
              type: "Roadworthy",
              expiryDate: expiry,
              daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        return alerts;
      }),
      upcomingMaintenance: upcomingMaintenance.map((m) => ({
        id: m.id,
        vehicleReg: m.vehicle.reg,
        title: m.title,
        scheduledAt: m.scheduledAt,
        daysUntil: Math.floor((m.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    });
  } catch (error: any) {
    console.error("[Attention] Failed to fetch attention items:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch attention items",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

