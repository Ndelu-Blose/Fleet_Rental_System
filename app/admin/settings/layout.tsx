import type React from "react"
import { requireAdmin } from "@/lib/permissions"
import { TabNav } from "./_components/tab-nav"
import { Settings as SettingsIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Settings Context Bar */}
      <div className="bg-muted/50 border rounded-lg px-4 py-3 flex items-start gap-3">
        <SettingsIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span>⚙️ Settings</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how your fleet system works (pricing, payments, onboarding, notifications)
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">
            These settings control system behaviour. They do not modify existing records.
          </p>
        </div>
      </div>

      <TabNav />

      <div>{children}</div>
    </div>
  )
}

