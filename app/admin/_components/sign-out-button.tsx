"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

export function SignOutButton() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut}>
      Sign Out
    </Button>
  )
}
