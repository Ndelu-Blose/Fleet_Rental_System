import type React from "react"
import { requireDriver } from "@/lib/permissions"
import { getSettingBool } from "@/lib/settings"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Car, User, CreditCard, FileText } from "lucide-react"
import { SignOutButton } from "./_components/sign-out-button"

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  // Check maintenance mode
  const maintenanceMode = await getSettingBool("system.maintenanceMode", false)
  if (maintenanceMode) {
    redirect("/maintenance")
  }

  const session = await requireDriver()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6" />
              <h1 className="text-xl font-bold">FleetHub</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <nav className="flex gap-4 mb-6 border-b">
          <Link
            href="/driver"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Dashboard
            </div>
          </Link>
          <Link
            href="/driver/profile"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </div>
          </Link>
          <Link
            href="/driver/payments"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </div>
          </Link>
          <Link
            href="/driver/documents"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </div>
          </Link>
        </nav>

        <main>{children}</main>
      </div>
    </div>
  )
}
