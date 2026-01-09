import { redirect } from "next/navigation"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string }>
}) {
  // Handle focus query param to redirect to specific settings section
  const params = searchParams ? await searchParams : {}
  const focus = params.focus

  // Map focus values to settings URLs
  const focusMap: Record<string, string> = {
    company: "/admin/settings/company",
    payments: "/admin/settings/payments",
    contracts: "/admin/settings/contracts",
    onboarding: "/admin/settings/onboarding",
    notifications: "/admin/settings/notifications",
    setup: "/admin/settings/company", // Default to company for generic "setup"
  }

  if (focus && focusMap[focus]) {
    redirect(focusMap[focus])
  }

  // Default redirect
  redirect("/admin/settings/company")
}

