import type React from "react"
import { requireAdmin } from "@/lib/permissions"
import Link from "next/link"
import { CreditCard } from "lucide-react"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage system configuration</p>
      </div>

      <div className="border-b">
        <nav className="flex gap-4">
          <Link
            href="/admin/settings/payments"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </div>
          </Link>
        </nav>
      </div>

      <div>{children}</div>
    </div>
  )
}

