"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Wrench, Loader2, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import { formatZARFromCents, parseZARToCents } from "@/lib/money"

interface MaintenanceTask {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  completedAt: string | null
  odometerKm: number | null
  estimatedCostCents: number | null
  actualCostCents: number | null
  createdAt: string
}

interface VehicleMaintenanceProps {
  vehicleId: string
  maintenance: MaintenanceTask[]
  onRefresh: () => void
  autoOpen?: boolean
}

export function VehicleMaintenance({ vehicleId, maintenance, onRefresh, autoOpen = false }: VehicleMaintenanceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showDialog, setShowDialog] = useState(autoOpen)
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null)
  const [saving, setSaving] = useState(false)

  // Auto-open dialog if action=add is in URL
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setShowDialog(true)
    }
  }, [searchParams])

  // Clear URL param when dialog closes
  const handleDialogChange = (open: boolean) => {
    setShowDialog(open)
    if (!open && searchParams.get("action") === "add") {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("action")
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl, { scroll: false })
    }
  }
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    odometerKm: "",
    estimatedCostCents: "",
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt: formData.scheduledAt || null,
          odometerKm: formData.odometerKm ? Number.parseInt(formData.odometerKm) : null,
          estimatedCostCents: formData.estimatedCostCents ? parseZARToCents(formData.estimatedCostCents) : null,
        }),
      })

      if (res.ok) {
        handleDialogChange(false)
        setFormData({ title: "", description: "", scheduledAt: "", odometerKm: "", estimatedCostCents: "" })
        onRefresh()
      }
    } catch (error) {
      console.error("Create failed:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (taskId: string, status: string, actualCostCents?: number) => {
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/maintenance/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          actualCostCents,
          completedAt: status === "COMPLETED" ? new Date().toISOString() : null,
        }),
      })

      if (res.ok) {
        setEditingTask(null)
        onRefresh()
      }
    } catch (error) {
      console.error("Update failed:", error)
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700"
      case "CANCELLED":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-yellow-100 text-yellow-700"
    }
  }

  const formatCurrency = (cents: number | null) => {
    if (!cents) return "N/A"
    return formatZARFromCents(cents)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Maintenance Schedule</h3>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Wrench className="mr-2 h-4 w-4" />
          Add Maintenance
        </Button>
      </div>

      <div className="grid gap-4">
        {maintenance.map((task) => (
          <Card key={task.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                  {task.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {task.scheduledAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.scheduledAt).toLocaleDateString()}
                  </div>
                )}
                {task.odometerKm && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.odometerKm.toLocaleString()} km
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">
                  <span className="text-muted-foreground">Estimated: </span>
                  <span className="font-medium">{formatCurrency(task.estimatedCostCents)}</span>
                  {task.actualCostCents && (
                    <>
                      <span className="text-muted-foreground mx-2">|</span>
                      <span className="text-muted-foreground">Actual: </span>
                      <span className="font-medium">{formatCurrency(task.actualCostCents)}</span>
                    </>
                  )}
                </div>

                {task.status === "PLANNED" && (
                  <Button
                    onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                  >
                    Start
                  </Button>
                )}

                {task.status === "IN_PROGRESS" && (
                  <Button onClick={() => setEditingTask(task)} disabled={saving} size="sm">
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {maintenance.length === 0 && (
          <Card className="p-8">
            <p className="text-center text-sm text-muted-foreground">No maintenance scheduled</p>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>Create a new maintenance task</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Oil change, tire rotation, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Scheduled Date</Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometerKm">Odometer (km)</Label>
                <Input
                  id="odometerKm"
                  type="number"
                  value={formData.odometerKm}
                  onChange={(e) => setFormData({ ...formData, odometerKm: e.target.value })}
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (R)</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                value={formData.estimatedCostCents}
                onChange={(e) => setFormData({ ...formData, estimatedCostCents: e.target.value })}
                placeholder="500.00"
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Maintenance</DialogTitle>
              <DialogDescription>Enter the actual cost to mark as completed</DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const actualCost = Number.parseFloat(formData.get("actualCost") as string)
                handleUpdateStatus(editingTask.id, "COMPLETED", actualCost ? actualCost * 100 : undefined)
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="actualCost">Actual Cost (R) *</Label>
                <Input
                  id="actualCost"
                  name="actualCost"
                  type="number"
                  step="0.01"
                  defaultValue={editingTask.estimatedCostCents ? (editingTask.estimatedCostCents / 100).toFixed(2) : ""}
                  placeholder="500.00"
                  required
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Mark as Completed"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
