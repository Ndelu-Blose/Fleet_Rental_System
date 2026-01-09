"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

type SignOutConfirmProps = {
  fullWidth?: boolean
  variant?: "outline" | "ghost" | "default" | "destructive" | "secondary" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

export function SignOutConfirm({
  fullWidth = false,
  variant = "outline",
  size = "sm",
  className = "",
  children,
}: SignOutConfirmProps) {
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  async function handleSignOut() {
    try {
      setLoading(true)
      await signOut({ callbackUrl: "/login" })
    } catch (error) {
      console.error("Failed to sign out:", error)
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button
            variant={variant}
            size={size}
            className={fullWidth ? `w-full justify-start ${className}` : className}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            You're about to sign out of FleetHub Admin. You can sign back in anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSignOut}
            disabled={loading}
            className="bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
          >
            {loading ? "Signing out..." : "Sign out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
