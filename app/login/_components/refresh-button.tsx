"use client"

import { Button } from "@/components/ui/button"

export function RefreshButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.location.reload()}
      className="text-xs w-full"
    >
      Refresh Page
    </Button>
  )
}

