import type React from "react"
import { requireAdmin } from "@/lib/permissions"
import { Car } from "lucide-react"
import { getSetting } from "@/lib/settings"
import { SignOutButton } from "./_components/sign-out-button"
import { NotificationsDropdownWrapper } from "./_components/notifications-dropdown-wrapper"
import { NavLinks, navItems } from "./_components/nav-links"
import { MobileNav } from "@/components/mobile-nav"
import { MobileNavWrapper } from "./_components/mobile-nav-wrapper"
import { getNextIncompleteStep } from "@/lib/setup-helper"

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
  
  // Get next incomplete step for clickable badge
  const { step: nextIncompleteStep, targetUrl, incompleteCount } = await getNextIncompleteStep()

  return (
    <div className="min-h-screen bg-background">
      {/* Header: Fixed on mobile, sticky on desktop */}
      <header className="fixed md:sticky top-0 left-0 right-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm md:shadow-none">
        {/* Top row */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Car className="h-6 w-6 flex-shrink-0" />
              <h1 className="text-xl font-bold truncate">FleetHub Admin</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <MobileNavWrapper
                  items={navItems}
                  title="FleetHub Admin"
                  userEmail={displayEmail}
                  companyName={companyName || undefined}
                  setupComplete={setupComplete}
                  nextIncompleteStep={nextIncompleteStep}
                  setupTargetUrl={targetUrl}
                  incompleteCount={incompleteCount}
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

        {/* Desktop Navigation Tabs - inside sticky header */}
        <div className="hidden md:block border-t">
          <div className="container mx-auto px-4">
            <nav className="flex h-12 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <NavLinks />
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer only on mobile to prevent content from going under fixed header */}
      <div className="md:hidden h-[73px]" />

      <div className="container mx-auto px-4 py-6">
        <main>{children}</main>
      </div>
    </div>
  )
}
