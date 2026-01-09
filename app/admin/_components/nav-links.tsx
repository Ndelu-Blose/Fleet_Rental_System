"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Car, FileCheck, CreditCard, UserPlus, UserCircle, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/drivers", label: "Drivers", icon: Users },
  { href: "/admin/verification", label: "Verification", icon: FileCheck },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/contracts", label: "Contracts", icon: UserPlus },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/profile", label: "Profile", icon: UserCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm font-medium hover:text-primary border-b-2 flex items-center gap-2 flex-shrink-0 transition-colors",
              isActive
                ? "text-primary border-primary"
                : "border-transparent hover:border-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}
