import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit") ?? "20");
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(session.user.id, safeLimit),
      getUnreadCount(session.user.id),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.markAllAsRead === true) {
      await markAllAsRead(session.user.id);
      return NextResponse.json({ success: true });
    }

    if (typeof body.notificationId === "string" && body.notificationId.length > 0) {
      await markAsRead(body.notificationId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

