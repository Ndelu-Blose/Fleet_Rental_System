"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DollarSign, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { formatZARFromCents, parseZARToCents } from "@/lib/money"

interface VehicleCost {
  id: string
  type: string
  title: string | null
  amountCents: number
  occurredAt: string
  vendor: string | null
  notes: string | null
  receiptUrl: string | null
}

interface VehicleCostsProps {
  vehicleId: string
  costs: VehicleCost[]
  onRefresh: () => void
}

export function VehicleCosts({ vehicleId, costs, onRefresh }: VehicleCostsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    type: "OTHER",
    title: "",
    amountCents: "",
    occurredAt: new Date().toISOString().split("T")[0],
    vendor: "",
    notes: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const cents = parseZARToCents(formData.amountCents)
      if (cents === null) {
        toast.error("Invalid cost amount")
        setSaving(false)
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append("type", formData.type)
      formDataToSend.append("title", formData.title)
      formDataToSend.append("amountCents", cents.toString())
      formDataToSend.append("occurredAt", formData.occurredAt)
      formDataToSend.append("vendor", formData.vendor)
      formDataToSend.append("notes", formData.notes)
      if (file) formDataToSend.append("file", file)

      const res = await fetch(`/api/admin/vehicles/${vehicleId}/costs`, {
        method: "POST",
        body: formDataToSend,
      })

      if (res.ok) {
        setShowDialog(false)
        setFile(null)
        setFormData({
          type: "OTHER",
          title: "",
          amountCents: "",
          occurredAt: new Date().toISOString().split("T")[0],
          vendor: "",
          notes: "",
        })
        onRefresh()
      }
    } catch (error) {
      console.error("Create failed:", error)
    } finally {
      setSaving(false)
    }
  }

  const totalCost = costs.reduce((sum, cost) => sum + cost.amountCents, 0)

  const getCostTypeColor = (type: string) => {
    switch (type) {
      case "LICENSE":
        return "bg-blue-100 text-blue-700"
      case "SERVICE":
        return "bg-green-100 text-green-700"
      case "REPAIR":
        return "bg-red-100 text-red-700"
      case "INSURANCE":
        return "bg-purple-100 text-purple-700"
      case "FUEL":
        return "bg-yellow-100 text-yellow-700"
      case "FINES":
        return "bg-orange-100 text-orange-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Cost History</h3>
          <p className="text-sm text-muted-foreground">Total: {formatZARFromCents(totalCost)}</p>
        </div>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <DollarSign className="mr-2 h-4 w-4" />
          Add Cost
        </Button>
      </div>

      <div className="grid gap-4">
        {costs.map((cost) => (
          <Card key={cost.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getCostTypeColor(cost.type)}`}>
                    {cost.type.replace(/_/g, " ")}
                  </span>
                  <h4 className="font-medium">{cost.title || cost.type.replace(/_/g, " ")}</h4>
                </div>

                {cost.vendor && <p className="text-sm text-muted-foreground">Vendor: {cost.vendor}</p>}
                {cost.notes && <p className="text-sm text-muted-foreground">{cost.notes}</p>}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(cost.occurredAt).toLocaleDateString()}
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">{formatZARFromCents(cost.amountCents)}</p>
                {cost.receiptUrl && (
                  <a href={cost.receiptUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                      View Receipt
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}

        {costs.length === 0 && (
          <Card className="p-8">
            <p className="text-center text-sm text-muted-foreground">No costs recorded yet</p>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle Cost</DialogTitle>
            <DialogDescription>Record a new expense for this vehicle</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="costType">Cost Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LICENSE">License Renewal</SelectItem>
                  <SelectItem value="SERVICE">Service/Maintenance</SelectItem>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                  <SelectItem value="TYRES">Tyres</SelectItem>
                  <SelectItem value="INSURANCE">Insurance</SelectItem>
                  <SelectItem value="FUEL">Fuel</SelectItem>
                  <SelectItem value="FINES">Fines</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (R) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amountCents}
                  onChange={(e) => setFormData({ ...formData, amountCents: e.target.value })}
                  placeholder="500.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurredAt">Date *</Label>
                <Input
                  id="occurredAt"
                  type="date"
                  value={formData.occurredAt}
                  onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Supplier</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt (Optional)</Label>
              <Input id="receipt" type="file" onChange={handleFileChange} accept="image/*,application/pdf" />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Cost"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
