"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { SetupProgressCard, type SetupStep } from "./dashboard/SetupProgressCard"

interface VehicleSetupChecklistProps {
  vehicleId: string
}

export function VehicleSetupChecklist({ vehicleId }: VehicleSetupChecklistProps) {
  const [steps, setSteps] = React.useState<SetupStep[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchReadiness() {
      try {
        const res = await fetch(`/api/admin/vehicles/${vehicleId}/readiness`)
        if (!res.ok) {
          throw new Error("Failed to fetch readiness")
        }
        const data = await res.json()
        setSteps(data.checklist || [])
      } catch (error) {
        console.error("Failed to load vehicle readiness:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchReadiness()
  }, [vehicleId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return <SetupProgressCard steps={steps} />
}
