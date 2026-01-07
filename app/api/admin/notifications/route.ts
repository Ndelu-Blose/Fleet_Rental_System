import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "@/lib/notifications";
import { logger, getRequestContext } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    
    // Validate session has user ID
    if (!session?.user?.id) {
      logger.error("Session missing user ID", undefined, getRequestContext(req));
      return NextResponse.json(
        { error: "Authentication error", message: "User ID not found in session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

    // Fetch notifications with error handling for each query
    let notifications = [];
    let unreadCount = 0;

    try {
      notifications = await getNotifications(session.user.id, safeLimit);
    } catch (notifError) {
      logger.error("Failed to fetch notifications list", notifError, {
        ...getRequestContext(req),
        userId: session.user.id,
      });
      // Continue with empty array if notifications query fails
      notifications = [];
    }

    try {
      unreadCount = await getUnreadCount(session.user.id);
    } catch (countError) {
      logger.error("Failed to fetch unread count", countError, {
        ...getRequestContext(req),
        userId: session.user.id,
      });
      // Continue with 0 if count query fails
      unreadCount = 0;
    }

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    // Re-throw Next.js redirect errors (they're special and should propagate)
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    
    logger.error("Failed to fetch notifications", err, {
      ...getRequestContext(req),
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch notifications",
        message: err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
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
  } catch (err: any) {
    // Re-throw Next.js redirect errors (they're special and should propagate)
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    
    logger.error("Failed to update notifications", err, {
      ...getRequestContext(req),
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Failed to update notifications",
        message: err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

