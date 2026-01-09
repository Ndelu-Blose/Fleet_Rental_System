"use client"

import { CheckCircle2, AlertCircle, Clock, AlertTriangle, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { NotificationPriority, NotificationType } from "@prisma/client"

type NotificationRow = {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "PASSWORD_CHANGED":
    case "EMAIL_CHANGED":
    case "PROFILE_UPDATED":
      return <CheckCircle2 className="h-4 w-4 text-blue-600" />
    case "DOCUMENT_APPROVED":
    case "VERIFICATION_COMPLETE":
    case "PAYMENT_RECEIVED":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case "DOCUMENT_REJECTED":
    case "VERIFICATION_REJECTED":
      return <AlertCircle className="h-4 w-4 text-red-600" />
    case "PAYMENT_OVERDUE":
    case "COMPLIANCE_EXPIRING":
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    default:
      return <Info className="h-4 w-4 text-gray-600" />
  }
}

function getPriorityStyle(priority: NotificationPriority) {
  switch (priority) {
    case "URGENT":
      return "bg-red-50 border border-red-200"
    case "HIGH":
      return "bg-orange-50 border border-orange-200"
    case "MEDIUM":
      return "bg-blue-50 border border-blue-200"
    default:
      return "bg-muted/30"
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

type NotificationsContentProps = {
  notifications: NotificationRow[]
  loading: boolean
  hasUnread: boolean
  unreadCount: number
  onMarkOne: (id: string) => void
  onMarkAll: () => void
  variant?: "dropdown" | "sheet"
}

export function NotificationsContent({
  notifications,
  loading,
  hasUnread,
  unreadCount,
  onMarkOne,
  onMarkAll,
  variant = "dropdown",
}: NotificationsContentProps) {
  const isSheet = variant === "sheet"

  const header = isSheet ? (
    <div className="flex items-center justify-between gap-2 p-4 border-b">
      <span className="font-semibold">Notifications</span>
      {hasUnread && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            {unreadCount} new
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onMarkAll}>
            Mark all read
          </Button>
        </div>
      )}
    </div>
  ) : (
    <DropdownMenuLabel className="flex items-center justify-between gap-2">
      <span>Notifications</span>
      {hasUnread && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            {unreadCount} new
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onMarkAll}>
            Mark all read
          </Button>
        </div>
      )}
    </DropdownMenuLabel>
  )

  const separator = isSheet ? <div className="border-b" /> : <DropdownMenuSeparator />

  return (
    <>
      {header}
      {separator}
      {loading ? (
        <div className={cn(
          "text-center text-sm text-muted-foreground",
          isSheet ? "px-4 py-6" : "px-3 py-6"
        )}>
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className={cn(
          "text-center",
          isSheet ? "px-4 py-8" : "px-3 py-8"
        )}>
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
        </div>
      ) : (
        <>
          {notifications.map((n) => {
            const content = (
              <>
                <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{formatTime(n.createdAt)}</span>
                  </div>
                </div>
              </>
            )

            if (isSheet) {
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) onMarkOne(n.id)
                    if (n.link) window.location.href = n.link
                  }}
                  className={cn(
                    "flex items-start gap-3 cursor-pointer transition-colors p-4 hover:bg-muted/50 border-b last:border-b-0",
                    !n.read && getPriorityStyle(n.priority)
                  )}
                >
                  {content}
                </div>
              )
            }

            return (
              <DropdownMenuItem
                key={n.id}
                onClick={() => {
                  if (!n.read) onMarkOne(n.id)
                  if (n.link) window.location.href = n.link
                }}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer rounded-md",
                  !n.read && getPriorityStyle(n.priority)
                )}
              >
                {content}
              </DropdownMenuItem>
            )
          })}
        </>
      )}
    </>
  )
}
