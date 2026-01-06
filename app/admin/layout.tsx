import type React from "react"
import { requireAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth"
import Link from "next/link"
import { LayoutDashboard, Users, Car, FileCheck, CreditCard, UserPlus, UserCircle } from "lucide-react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  async function handleSignOut() {
    "use server"
    await signOut()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6" />
              <h1 className="text-xl font-bold">FleetHub Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{session.user.email}</span>
              <form action={handleSignOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <nav className="flex gap-4 mb-6 border-b">
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </div>
          </Link>
          <Link
            href="/admin/drivers"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Drivers
            </div>
          </Link>
          <Link
            href="/admin/verification"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Verification
            </div>
          </Link>
          <Link
            href="/admin/vehicles"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicles
            </div>
          </Link>
          <Link
            href="/admin/contracts"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Contracts
            </div>
          </Link>
          <Link
            href="/admin/payments"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </div>
          </Link>
          <Link
            href="/admin/profile"
            className="px-4 py-2 text-sm font-medium hover:text-primary border-b-2 border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Profile
            </div>
          </Link>
        </nav>

        <main>{children}</main>
      </div>
    </div>
  )
}
