"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VehicleDocuments } from "@/components/vehicle-documents"
import { VehicleMaintenance } from "@/components/vehicle-maintenance"
import { VehicleCosts } from "@/components/vehicle-costs"
import { VehicleSetupChecklist } from "@/components/admin/VehicleSetupChecklist"
import { Loader2, ArrowLeft, AlertCircle, UserPlus, FileText, Edit, MoreVertical, CheckCircle2, XCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
    id: string
    status: string
    startDate: string
    endDate: string | null
    feeAmountCents: number
    frequency: string
    driver: {
      id: string
      user: {
        name: string | null
        email: string
      }
    }
    payments: Array<{
      id: string
      amountCents: number
      dueDate: string
      status: string
      paidAt: string | null
    }>
  }>
}

export default function VehicleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
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

  // Handle tab from URL params
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["overview", "compliance", "documents", "maintenance", "costs"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

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

  const activeContract = vehicle.contracts.find((c) => c.status === "ACTIVE")
  const pendingContract = vehicle.contracts.find((c) =>
    ["DRAFT", "SENT", "SENT_TO_DRIVER", "SIGNED_BY_DRIVER", "DRIVER_SIGNED"].includes(c.status)
  )
  const nextPayment = activeContract?.payments
    .filter((p) => p.status === "PENDING")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-700 border-green-200"
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "INACTIVE":
        return "bg-gray-100 text-gray-700 border-gray-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const formatCurrency = formatZARFromCents

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/vehicles")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{vehicle.reg}</h1>
              <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusBadgeColor(vehicle.status)}`}>
                {vehicle.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {vehicle.make} {vehicle.model}
              {vehicle.year && ` (${vehicle.year})`}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              {vehicle.status === "AVAILABLE" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push(`/admin/contracts?vehicleId=${vehicle.id}`)}
                  title={pendingContract ? "Complete contract workflow first" : "Create contract to assign driver"}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {pendingContract ? "Complete Contract" : "Create Contract"}
                </Button>
              )}
              {activeContract && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/admin/contracts?vehicleId=${vehicle.id}`)}
                >
                  Transfer
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push(`/admin/vehicles/${vehicle.id}?tab=documents`)}>
                <FileText className="h-4 w-4 mr-2" />
                Upload Docs
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setActiveTab("maintenance")
                      router.push(`/admin/vehicles/${vehicle.id}?tab=maintenance&action=add`)
                    }}
                  >
                    Log Maintenance
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Archive Vehicle</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Setup Checklist */}
          {vehicle && (
            <VehicleSetupChecklist
              vehicle={{
                id: vehicle.id,
                reg: vehicle.reg,
                type: vehicle.type,
                status: vehicle.status,
                documents: (vehicle.documents || []).map((d: any) => ({ type: d.type })),
                compliance: vehicle.compliance
                  ? {
                      licenseExpiry: vehicle.compliance.licenseExpiry,
                      insuranceExpiry: vehicle.compliance.insuranceExpiry,
                      roadworthyExpiry: vehicle.compliance.roadworthyExpiry,
                    }
                  : null,
                contracts: (vehicle.contracts || []).map((c: any) => ({
                  id: c.id,
                  status: c.status,
                  driverSignedAt: c.driverSignedAt,
                  signedPdfPath: c.signedPdfPath,
                  createdAt: c.createdAt,
                })),
              }}
            />
          )}

          {/* Assigned Driver Card */}
          {activeContract ? (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Driver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">
                      {activeContract.driver.user.name || activeContract.driver.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Contract started {new Date(activeContract.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(activeContract.feeAmountCents)} {activeContract.frequency.toLowerCase()}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => router.push(`/admin/contracts?vehicleId=${vehicle.id}`)}>
                    View Contract
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : pendingContract ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle>Contract Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-yellow-800">
                    A contract exists but is not yet active. Complete the contract workflow to assign this vehicle.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                      Status: {pendingContract.status}
                    </span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push(`/admin/contracts?vehicleId=${vehicle.id}`)}
                  >
                    Complete Contract
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-2">Not assigned to any driver</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Create and activate a contract to assign this vehicle
                </p>
                <Button onClick={() => router.push(`/admin/contracts?vehicleId=${vehicle.id}`)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Contract
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Next Payment Card */}
          {nextPayment && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <CardTitle>Next Payment Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(nextPayment.amountCents)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Due: {new Date(nextPayment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => router.push("/admin/payments")}>
                    View Payments
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Information */}
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

                  {vehicle.notes !== null && (
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                      />
                    </div>
                  )}
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
                  {vehicle.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Notes</p>
                      <p className="font-medium">{vehicle.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Compliance Dates</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Update Dates
                </Button>
              )}
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
                <div className="space-y-3">
                  {[
                    { label: "License", date: vehicle.compliance?.licenseExpiry },
                    { label: "Insurance", date: vehicle.compliance?.insuranceExpiry },
                    { label: "Roadworthy", date: vehicle.compliance?.roadworthyExpiry },
                  ].map((item) => {
                    const warning = getExpiryWarning(item.date)
                    const isExpired = item.date && new Date(item.date) < new Date()
                    const isExpiringSoon = item.date && !isExpired && warning !== null
                    const isOk = item.date && !isExpired && !isExpiringSoon

                    return (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isExpired
                            ? "bg-red-50 border-red-200"
                            : isExpiringSoon
                              ? "bg-yellow-50 border-yellow-200"
                              : "bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isOk && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                          {isExpired && <XCircle className="h-5 w-5 text-red-600" />}
                          {isExpiringSoon && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.date ? new Date(item.date).toLocaleDateString() : "Not set"}
                            </p>
                          </div>
                        </div>
                        {warning && (
                          <div className={`flex items-center gap-2 ${warning.color}`}>
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
              <VehicleMaintenance 
                vehicleId={vehicle.id} 
                maintenance={vehicle.maintenance} 
                onRefresh={fetchVehicle}
                autoOpen={searchParams.get("action") === "add"}
              />
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
