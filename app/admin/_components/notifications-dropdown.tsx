"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/lib/use-media-query"
import { NotificationsContent } from "./notifications-content"

type NotificationRow = {
  id: string
  type: any
  priority: any
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const isMobile = useMediaQuery("(max-width: 767px)")

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount])

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/admin/notifications?limit=20", { cache: "no-store" })
      if (!res.ok) return

      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silent (dropdown should never crash the page)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  async function markOne(id: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  async function markAll() {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const trigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  )

  const content = (
    <NotificationsContent
      notifications={notifications}
      loading={loading}
      hasUnread={hasUnread}
      unreadCount={unreadCount}
      onMarkOne={markOne}
      onMarkAll={markAll}
      variant={isMobile ? "sheet" : "dropdown"}
    />
  )

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[80vh] flex flex-col">
          <SheetHeader className="px-4 py-4 border-b flex-shrink-0">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-96 max-h-[520px] overflow-y-auto">
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
