"use client"

import dynamic from "next/dynamic"

// Dynamically import NotificationsDropdown with SSR disabled to prevent hydration mismatch
// Radix UI generates random IDs that differ between server and client
const NotificationsDropdown = dynamic(
  () => import("./notifications-dropdown").then((mod) => ({ default: mod.NotificationsDropdown })),
  { ssr: false }
)

export function NotificationsDropdownWrapper() {
  return <NotificationsDropdown />
}
