import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { NotificationType, NotificationPriority } from "@prisma/client";

// Simple protection (set in env)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const overdue = await prisma.payment.findMany({
      where: { status: "PENDING", dueDate: { lt: new Date() } },
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
                type: true,
              },
            },
          },
        },
      },
      take: 200, // Limit to prevent overwhelming the system
    });

    // TODO: decide who the admin is (single owner vs multiple admins)
    // If you have a single owner admin, store their ID in env ADMIN_USER_ID.
    const adminUserId = process.env.ADMIN_USER_ID;
    if (!adminUserId) {
      return NextResponse.json(
        { error: "ADMIN_USER_ID not set in environment variables" },
        { status: 500 }
      );
    }

    // Verify admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 500 }
      );
    }

    let notificationCount = 0;

    for (const payment of overdue) {
      const driverName = payment.contract?.driver?.user?.name ?? "Driver";
      const vehicleReg = payment.contract?.vehicle?.reg ?? "Unknown";
      const amount = (payment.amountCents / 100).toFixed(2);

      try {
        await createNotification({
          userId: adminUserId,
          type: NotificationType.PAYMENT_OVERDUE,
          priority: NotificationPriority.URGENT,
          title: "Payment overdue",
          message: `Payment of R${amount} is overdue for ${driverName} (Vehicle: ${vehicleReg}).`,
          link: "/admin/payments",
          metadata: {
            paymentId: payment.id,
            contractId: payment.contractId,
            driverId: payment.contract?.driverId,
            vehicleId: payment.contract?.vehicleId,
          },
        });
        notificationCount++;
      } catch (notificationError) {
        console.error(
          `[Jobs] Failed to create overdue payment notification for payment ${payment.id}:`,
          notificationError
        );
        // Continue processing other payments even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      count: overdue.length,
      notificationsCreated: notificationCount,
    });
  } catch (error) {
    console.error("[Jobs] Overdue payments job error:", error);
    return NextResponse.json(
      { error: "Failed to process overdue payments" },
      { status: 500 }
    );
  }
}

