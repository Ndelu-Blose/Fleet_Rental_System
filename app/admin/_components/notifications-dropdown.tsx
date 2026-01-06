"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Clock, AlertTriangle, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationPriority, NotificationType } from "@prisma/client";

type NotificationRow = {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "PASSWORD_CHANGED":
    case "EMAIL_CHANGED":
    case "PROFILE_UPDATED":
      return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    case "DOCUMENT_APPROVED":
    case "VERIFICATION_COMPLETE":
    case "PAYMENT_RECEIVED":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "DOCUMENT_REJECTED":
    case "VERIFICATION_REJECTED":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case "PAYMENT_OVERDUE":
    case "COMPLIANCE_EXPIRING":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-gray-600" />;
  }
}

function getPriorityStyle(priority: NotificationPriority) {
  switch (priority) {
    case "URGENT":
      return "bg-red-50 border border-red-200";
    case "HIGH":
      return "bg-orange-50 border border-orange-200";
    case "MEDIUM":
      return "bg-blue-50 border border-blue-200";
    default:
      return "bg-muted/30";
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/admin/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent (dropdown should never crash the page)
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markOne(id: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  async function markAll() {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 max-h-[520px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>

          {hasUnread && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAll}>
                Mark all read
              </Button>
            </div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {loading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
          </div>
        ) : (
          <>
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer rounded-md",
                  !n.read && getPriorityStyle(n.priority)
                )}
                onClick={() => {
                  if (!n.read) markOne(n.id);
                  if (n.link) window.location.href = n.link;
                }}
              >
                <div className="mt-0.5">{getNotificationIcon(n.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5" />}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{formatTime(n.createdAt)}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
