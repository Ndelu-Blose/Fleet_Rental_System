"use client"

import { MobileNav } from "@/components/mobile-nav"
import { NotificationsDropdownWrapper } from "./notifications-dropdown-wrapper"

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

type MobileNavWrapperProps = {
  items: NavItem[]
  title?: string
  userEmail?: string
  companyName?: string
  setupComplete?: boolean
  nextIncompleteStep?: SetupStep | null
  setupTargetUrl?: string | null
  incompleteCount?: number
}

export function MobileNavWrapper(props: MobileNavWrapperProps) {
  return (
    <MobileNav
      {...props}
      notificationsComponent={<NotificationsDropdownWrapper />}
    />
  )
}
