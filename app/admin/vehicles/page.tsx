"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, Car, AlertCircle } from "lucide-react"

type Vehicle = {
  id: string
  type: string
  reg: string
  make: string
  model: string
  year: number | null
  status: string
  compliance: {
    licenseExpiry: string | null
    insuranceExpiry: string | null
    roadworthyExpiry: string | null
  } | null
  contracts: Array<{
    driver: {
      user: {
        name: string | null
        email: string
      }
    }
  }>
}

export default function AdminVehiclesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const showExpiringOnly = searchParams.get("filter") === "expiring"
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    type: "CAR",
    reg: "",
    make: "",
    model: "",
    year: "",
    notes: "",
    licenseExpiry: "",
    insuranceExpiry: "",
    roadworthyExpiry: "",
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/admin/vehicles")
      const data = await res.json()
      setVehicles(data)
    } catch (error) {
      console.error("Failed to fetch vehicles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowDialog(false)
        setFormData({
          type: "CAR",
          reg: "",
          make: "",
          model: "",
          year: "",
          notes: "",
          licenseExpiry: "",
          insuranceExpiry: "",
          roadworthyExpiry: "",
        })
        await fetchVehicles()
      }
    } catch (error) {
      console.error("Failed to create vehicle:", error)
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-700"
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700"
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const hasExpiringCompliance = (vehicle: Vehicle) => {
    if (!vehicle.compliance) return false
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    return (
      (vehicle.compliance.licenseExpiry && new Date(vehicle.compliance.licenseExpiry) < thirtyDaysFromNow) ||
      (vehicle.compliance.insuranceExpiry && new Date(vehicle.compliance.insuranceExpiry) < thirtyDaysFromNow) ||
      (vehicle.compliance.roadworthyExpiry && new Date(vehicle.compliance.roadworthyExpiry) < thirtyDaysFromNow)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground mt-1">Manage your fleet</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(showExpiringOnly ? vehicles.filter(hasExpiringCompliance) : vehicles).map((vehicle) => (
          <Card
            key={vehicle.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => router.push(`/admin/vehicles/${vehicle.id}`)}
          >
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </div>
                  {hasExpiringCompliance(vehicle) && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                </div>

                <div>
                  <h3 className="font-bold text-lg">{vehicle.reg}</h3>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.make} {vehicle.model}
                    {vehicle.year && ` (${vehicle.year})`}
                  </p>
                </div>

                {vehicle.contracts.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Assigned to</p>
                    <p className="text-sm font-medium">
                      {vehicle.contracts[0].driver.user.name || vehicle.contracts[0].driver.user.email}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {vehicles.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No vehicles yet. Add your first vehicle to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>Create a new vehicle record with compliance information</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Vehicle Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">Car</SelectItem>
                    <SelectItem value="BIKE">Motorbike</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg">Registration *</Label>
                <Input
                  id="reg"
                  value={formData.reg}
                  onChange={(e) => setFormData({ ...formData, reg: e.target.value })}
                  placeholder="ABC123GP"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="Toyota"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Corolla"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2020"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Compliance Dates</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="licenseExpiry" className="text-xs">
                    License Expiry
                  </Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="insuranceExpiry" className="text-xs">
                    Insurance Expiry
                  </Label>
                  <Input
                    id="insuranceExpiry"
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="roadworthyExpiry" className="text-xs">
                    Roadworthy Expiry
                  </Label>
                  <Input
                    id="roadworthyExpiry"
                    type="date"
                    value={formData.roadworthyExpiry}
                    onChange={(e) => setFormData({ ...formData, roadworthyExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Vehicle"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
