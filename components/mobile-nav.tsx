"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Menu, AlertCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SignOutConfirm } from "@/components/sign-out-confirm"

type NavItem = { 
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

type SetupStep = {
  id: string
  label: string
  completed: boolean
  actionHref?: string
}

type MobileNavProps = {
  items: NavItem[]
  title?: string
  userEmail?: string
  companyName?: string
  setupComplete?: boolean
  notificationsComponent?: React.ReactNode
  onSignOut?: () => void // Deprecated - use SignOutConfirm component instead
  nextIncompleteStep?: SetupStep | null
  setupTargetUrl?: string | null
  incompleteCount?: number
}

export function MobileNav({ 
  items, 
  title = "Menu",
  userEmail,
  companyName,
  setupComplete,
  notificationsComponent,
  onSignOut,
  nextIncompleteStep,
  setupTargetUrl,
  incompleteCount = 0
}: MobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="h-4 w-4 mr-2" />
          Menu
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b flex-shrink-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Premium: User/Company Section */}
        {(userEmail || companyName) && (
          <div className="px-4 py-4 border-b bg-muted/30 flex-shrink-0">
            {companyName && (
              <div className="mb-2">
                <p className="text-sm font-semibold truncate">{companyName}</p>
              </div>
            )}
            {userEmail && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}
            {setupComplete !== undefined && (
              setupComplete ? (
                <Badge 
                  variant="default"
                  className="text-xs bg-green-500 hover:bg-green-500"
                >
                  Configured
                </Badge>
              ) : setupTargetUrl ? (
                <Link 
                  href={setupTargetUrl}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 group"
                >
                  <Badge 
                    variant="secondary"
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white border-0 cursor-pointer group-hover:bg-orange-600 transition-colors"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {incompleteCount > 0 ? `Setup incomplete · ${incompleteCount}` : "Setup incomplete"}
                    <ArrowRight className="h-3 w-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </Badge>
                </Link>
              ) : (
                <Badge 
                  variant="secondary"
                  className="text-xs bg-orange-500 hover:bg-orange-500"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Setup incomplete
                </Badge>
              )
            )}
          </div>
        )}

        <div className="px-2 py-2 overflow-y-auto flex-1">
          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer: Notifications + Sign Out */}
        <div className="mt-auto border-t p-4 space-y-2 flex-shrink-0">
          {notificationsComponent && (
            <div className="flex justify-center">
              {notificationsComponent}
            </div>
          )}
          <SignOutConfirm fullWidth />
        </div>
      </SheetContent>
    </Sheet>
  )
}
