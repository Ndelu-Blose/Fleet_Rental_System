import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const limit = Number(new URL(req.url).searchParams.get("limit") || "20");

    // Recent payments
    const recentPayments = await prisma.payment.findMany({
      where: {
        status: "PAID",
      },
      include: {
        contract: {
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
        },
      },
      orderBy: {
        paidAt: "desc",
      },
      take: Math.floor(limit / 2),
    });

    // Recent contracts
    const recentContracts = await prisma.rentalContract.findMany({
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
        createdAt: "desc",
      },
      take: Math.floor(limit / 2),
    });

    // Combine and sort by date
    const activities = [
      ...recentPayments.map((p) => ({
        type: "payment" as const,
        id: p.id,
        message: `${p.contract.driver.user.name || "Driver"} made a payment – R${((p.amountCents || 0) / 100).toFixed(2)}`,
        details: `${p.contract.vehicle.make} ${p.contract.vehicle.model} (${p.contract.vehicle.reg})`,
        timestamp: p.paidAt || p.createdAt,
      })),
      ...recentContracts.map((c) => ({
        type: "contract" as const,
        id: c.id,
        message: `Contract created for ${c.driver.user.name || "Driver"}`,
        details: `${c.vehicle.make} ${c.vehicle.model} (${c.vehicle.reg})`,
        timestamp: c.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error("[Activity] Failed to fetch activity:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch activity",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

