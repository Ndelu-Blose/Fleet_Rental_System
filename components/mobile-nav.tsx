"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = { 
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

type MobileNavProps = {
  items: NavItem[]
  title?: string
  userEmail?: string
  companyName?: string
  setupComplete?: boolean
}

export function MobileNav({ 
  items, 
  title = "Menu",
  userEmail,
  companyName,
  setupComplete
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

      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Premium: User/Company Section */}
        {(userEmail || companyName) && (
          <div className="px-4 py-4 border-b bg-muted/30">
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
              <Badge 
                variant={setupComplete ? "default" : "secondary"}
                className="text-xs"
              >
                {setupComplete ? "Configured" : "Setup incomplete"}
              </Badge>
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
      </SheetContent>
    </Sheet>
  )
}
