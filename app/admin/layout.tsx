import type React from "react"
import { requireAdmin } from "@/lib/permissions"
import { Car } from "lucide-react"
import { getSetting } from "@/lib/settings"
import { SignOutButton } from "./_components/sign-out-button"
import { NotificationsDropdownWrapper } from "./_components/notifications-dropdown-wrapper"
import { NavLinks, navItems } from "./_components/nav-links"
import { MobileNav } from "@/components/mobile-nav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  
  // Use session email directly - it's already up-to-date from the JWT callback
  const displayEmail = session.user.email

  // Get company info and setup status for mobile nav
  const companyName = await getSetting("company.name", "")
  const companyEmail = await getSetting("company.email", "")
  const paymentMethod = await getSetting("payments.method", "")
  
  // Simple check: setup is complete if company name, email, and payment method are set
  const setupComplete = !!(companyName && companyEmail && paymentMethod)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Car className="h-6 w-6 flex-shrink-0" />
              <h1 className="text-xl font-bold truncate">FleetHub Admin</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <MobileNav 
                  items={navItems}
                  title="FleetHub Admin"
                  userEmail={displayEmail}
                  companyName={companyName || undefined}
                  setupComplete={setupComplete}
                />
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2 sm:gap-4">
                <NotificationsDropdownWrapper />
                <span className="text-sm text-muted-foreground truncate max-w-[120px]">{displayEmail}</span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex -mx-4 px-4 w-full gap-2 overflow-x-auto whitespace-nowrap border-b pb-2 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLinks />
        </nav>

        <main>{children}</main>
      </div>
    </div>
  )
}
