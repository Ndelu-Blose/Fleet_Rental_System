"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VehicleDocuments } from "@/components/vehicle-documents"
import { VehicleMaintenance } from "@/components/vehicle-maintenance"
import { VehicleCosts } from "@/components/vehicle-costs"
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react"

type Vehicle = {
  id: string
  type: string
  reg: string
  make: string
  model: string
  year: number | null
  status: string
  notes: string | null
  compliance: {
    id: string
    licenseExpiry: string | null
    insuranceExpiry: string | null
    roadworthyExpiry: string | null
  } | null
  documents: any[]
  maintenance: any[]
  costs: any[]
  contracts: Array<{
    driver: {
      user: {
        name: string | null
        email: string
      }
    }
  }>
}

export default function VehicleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    type: "",
    reg: "",
    make: "",
    model: "",
    year: "",
    status: "",
    notes: "",
    licenseExpiry: "",
    insuranceExpiry: "",
    roadworthyExpiry: "",
  })

  useEffect(() => {
    fetchVehicle()
  }, [params.id])

  const fetchVehicle = async () => {
    try {
      const res = await fetch(`/api/admin/vehicles/${params.id}`)
      const data = await res.json()
      setVehicle(data)
      setFormData({
        type: data.type,
        reg: data.reg,
        make: data.make,
        model: data.model,
        year: data.year?.toString() || "",
        status: data.status,
        notes: data.notes || "",
        licenseExpiry: data.compliance?.licenseExpiry?.split("T")[0] || "",
        insuranceExpiry: data.compliance?.insuranceExpiry?.split("T")[0] || "",
        roadworthyExpiry: data.compliance?.roadworthyExpiry?.split("T")[0] || "",
      })
    } catch (error) {
      console.error("Failed to fetch vehicle:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/vehicles/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setEditing(false)
        await fetchVehicle()
      }
    } catch (error) {
      console.error("Failed to save vehicle:", error)
    } finally {
      setSaving(false)
    }
  }

  const getExpiryWarning = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const daysUntil = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return { text: "EXPIRED", color: "text-red-600" }
    if (daysUntil <= 30) return { text: `Expires in ${daysUntil} days`, color: "text-yellow-600" }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!vehicle) {
    return <div>Vehicle not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/vehicles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{vehicle.reg}</h1>
          <p className="text-muted-foreground">
            {vehicle.make} {vehicle.model}
            {vehicle.year && ` (${vehicle.year})`}
          </p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)}>Edit Details</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
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
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg">Registration</Label>
                    <Input
                      id="reg"
                      value={formData.reg}
                      onChange={(e) => setFormData({ ...formData, reg: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{vehicle.type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{vehicle.status}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Registration</p>
                    <p className="font-medium">{vehicle.reg}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium">{vehicle.year || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Make</p>
                    <p className="font-medium">{vehicle.make}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium">{vehicle.model}</p>
                  </div>
                </div>
              )}

              {vehicle.contracts.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Currently Assigned To</p>
                  <p className="font-medium">
                    {vehicle.contracts[0].driver.user.name || vehicle.contracts[0].driver.user.email}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseExpiry">License Expiry</Label>
                    <Input
                      id="licenseExpiry"
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      value={formData.insuranceExpiry}
                      onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roadworthyExpiry">Roadworthy Expiry</Label>
                    <Input
                      id="roadworthyExpiry"
                      type="date"
                      value={formData.roadworthyExpiry}
                      onChange={(e) => setFormData({ ...formData, roadworthyExpiry: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: "License", date: vehicle.compliance?.licenseExpiry },
                    { label: "Insurance", date: vehicle.compliance?.insuranceExpiry },
                    { label: "Roadworthy", date: vehicle.compliance?.roadworthyExpiry },
                  ].map((item) => {
                    const warning = getExpiryWarning(item.date)
                    return (
                      <div key={item.label} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.date ? new Date(item.date).toLocaleDateString() : "Not set"}
                          </p>
                        </div>
                        {warning && (
                          <div className={`flex items-center gap-2 ${warning.color}`}>
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">{warning.text}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
              <VehicleDocuments vehicleId={vehicle.id} documents={vehicle.documents} onRefresh={fetchVehicle} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardContent className="pt-6">
              <VehicleMaintenance vehicleId={vehicle.id} maintenance={vehicle.maintenance} onRefresh={fetchVehicle} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardContent className="pt-6">
              <VehicleCosts vehicleId={vehicle.id} costs={vehicle.costs} onRefresh={fetchVehicle} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
