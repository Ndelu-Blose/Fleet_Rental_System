"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { formatZARFromCents, centsToRands, parseZARToCents } from "@/lib/money"
import { ContractStatus } from "@prisma/client"

type Contract = {
  id: string
  feeAmountCents: number
  frequency: string
  startDate: string
  endDate: string | null
  status: string
  driver: {
    id: string
    user: {
      name: string | null
      email: string
    }
  }
  vehicle: {
    id: string
    reg: string
    make: string
    model: string
  }
}

type Driver = {
  id: string
  verificationStatus: string
  user: {
    name: string | null
    email: string
  }
}

type Vehicle = {
  id: string
  reg: string
  make: string
  model: string
  status: string
}

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params.contractId as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    driverProfileId: "",
    vehicleId: "",
    feeAmountCents: "",
    frequency: "WEEKLY",
    dueWeekday: "1",
    dueDayOfMonth: "",
    startDate: "",
  })

  useEffect(() => {
    fetchContract()
    fetchDrivers()
    fetchVehicles()
  }, [contractId])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`)
      if (!res.ok) {
        throw new Error("Contract not found")
      }
      const data = await res.json()
      setContract(data)
      
      // Pre-fill form with contract data
      setFormData({
        driverProfileId: data.driver.id,
        vehicleId: data.vehicle.id,
        feeAmountCents: centsToRands(data.feeAmountCents).toString(),
        frequency: data.frequency,
        dueWeekday: data.dueWeekday?.toString() || "1",
        dueDayOfMonth: data.dueDayOfMonth?.toString() || "",
        startDate: data.startDate.split("T")[0],
      })
    } catch (error) {
      toast.error("Failed to load contract")
      router.push("/admin/contracts")
    } finally {
      setLoading(false)
    }
  }

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/admin/drivers")
      const data = await res.json()
      const driversList = data.ok === false ? [] : (Array.isArray(data) ? data : data.drivers || [])
      setDrivers(driversList.filter((d: Driver) => d.verificationStatus === "VERIFIED"))
    } catch (error) {
      console.error("Failed to fetch drivers:", error)
    }
  }

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/admin/vehicles")
      const data = await res.json()
      setVehicles(data.filter((v: Vehicle) => v.status === "AVAILABLE" || v.id === contract?.vehicle.id))
    } catch (error) {
      console.error("Failed to fetch vehicles:", error)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const cents = parseZARToCents(formData.feeAmountCents)
      if (cents === null) {
        toast.error("Invalid rental fee amount")
        setSaving(false)
        return
      }

      const res = await fetch(`/api/admin/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          feeAmountCents: cents,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to update contract")
        return
      }

      toast.success("Contract updated successfully!")
      router.push("/admin/contracts")
    } catch (error) {
      toast.error("Failed to update contract")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contract) {
    return null
  }

  // Block editing if not DRAFT
  if (contract.status !== ContractStatus.DRAFT) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push("/admin/contracts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Only draft contracts can be edited. This contract is already {contract.status.toLowerCase()}.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/admin/contracts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Contract</h1>
          <p className="text-muted-foreground mt-1">
            Editing contract for {contract.driver.user.name || contract.driver.user.email} → {contract.vehicle.reg}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver">Driver *</Label>
              <Select
                value={formData.driverProfileId}
                onValueChange={(value) => setFormData({ ...formData, driverProfileId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select verified driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.user.name || driver.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select available vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.reg} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Rental Fee (R) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.feeAmountCents}
                  onChange={(e) => setFormData({ ...formData, feeAmountCents: e.target.value })}
                  placeholder="500.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formatZARFromCents(contract.feeAmountCents)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/contracts")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
