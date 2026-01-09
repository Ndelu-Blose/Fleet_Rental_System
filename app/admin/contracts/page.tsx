"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Calendar, DollarSign, FileText, Download, Edit, Trash2, Copy, Eye, X, Pause, RotateCcw, CheckCircle2, AlertCircle, MoreVertical } from "lucide-react"
import { toast } from "sonner"
import { formatZARFromCents, parseZARToCents } from "@/lib/money"
import { ContractStatus } from "@prisma/client"
import Link from "next/link"

type Contract = {
  id: string
  feeAmountCents: number
  frequency: string
  startDate: string
  endDate: string | null
  status: string
  driverSignedAt: string | null
  signedPdfUrl: string | null
  driver: {
    verificationStatus: string
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
    status: string
  }
  payments: Array<{
    id: string
    amountCents: number
    status: string
    dueDate: string
    paidAt: string | null
  }>
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

export default function AdminContractsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const showActiveOnly = searchParams.get("status") === "active"
  const vehicleIdParam = searchParams.get("vehicleId")
  const [showDialog, setShowDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    driverProfileId: "",
    vehicleId: vehicleIdParam || "",
    feeAmountCents: "",
    frequency: "WEEKLY",
    dueWeekday: "1",
    startDate: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchContracts()
    fetchDrivers()
    fetchVehicles()
    
    // If vehicleId in URL, pre-fill form
    if (vehicleIdParam) {
      setFormData(prev => ({ ...prev, vehicleId: vehicleIdParam }))
    }
  }, [vehicleIdParam])

  const fetchContracts = async () => {
    try {
      const url = vehicleIdParam 
        ? `/api/admin/contracts?vehicleId=${vehicleIdParam}`
        : "/api/admin/contracts"
      const res = await fetch(url)
      const data = await res.json()
      setContracts(data)
    } catch (error) {
      console.error("Failed to fetch contracts:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/admin/drivers")
      const data = await res.json()
      // Handle API response structure: { ok: true, drivers: [...] } or just array
      const driversList = data.ok === false ? [] : (Array.isArray(data) ? data : data.drivers || [])
      setDrivers(driversList.filter((d: Driver) => d.verificationStatus === "VERIFIED"))
    } catch (error) {
      console.error("Failed to fetch drivers:", error)
      setDrivers([])
    }
  }

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/admin/vehicles")
      const data = await res.json()
      setVehicles(data.filter((v: Vehicle) => v.status === "AVAILABLE"))
    } catch (error) {
      console.error("Failed to fetch vehicles:", error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const cents = parseZARToCents(formData.feeAmountCents)
      if (cents === null) {
        toast.error("Invalid rental fee amount")
        return
      }

      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          feeAmountCents: cents,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Failed to create contract")
        return
      }

      setShowDialog(false)
      setFormData({
        driverProfileId: "",
        vehicleId: "",
        feeAmountCents: "",
        frequency: "WEEKLY",
        dueWeekday: "1",
        startDate: new Date().toISOString().split("T")[0],
      })
      await fetchContracts()
      await fetchVehicles()
    } catch (error) {
      console.error("Failed to create contract:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleEndContract = async (contractId: string) => {
    if (!confirm("Are you sure you want to end this contract?")) return

    try {
      await fetch(`/api/admin/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ENDED",
          endDate: new Date().toISOString(),
        }),
      })

      await fetchContracts()
      await fetchVehicles()
    } catch (error) {
      console.error("Failed to end contract:", error)
    }
  }

  const handleDeleteDraft = async (contractId: string) => {
    if (!confirm("Are you sure you want to delete this draft contract? This action cannot be undone.")) return

    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Draft contract deleted")
        await fetchContracts()
      } else {
        toast.error(data.error || "Failed to delete contract")
      }
    } catch (error) {
      toast.error("Failed to delete contract")
    }
  }

  const handleDuplicateContract = async (contract: Contract) => {
    try {
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverProfileId: contract.driver.id || "",
          vehicleId: contract.vehicle.id,
          feeAmountCents: contract.feeAmountCents,
          frequency: contract.frequency,
          startDate: new Date().toISOString().split("T")[0],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Contract duplicated successfully")
        await fetchContracts()
      } else {
        toast.error(data.error || "Failed to duplicate contract")
      }
    } catch (error) {
      toast.error("Failed to duplicate contract")
    }
  }

  const handlePreviewContract = (contractId: string) => {
    router.push(`/admin/contracts/${contractId}/preview`)
  }

  const handleRejectContract = async (contractId: string) => {
    const reason = prompt("Please provide a reason for rejecting this contract:")
    if (!reason) return

    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Contract rejected")
        await fetchContracts()
      } else {
        toast.error(data.error || "Failed to reject contract")
      }
    } catch (error) {
      toast.error("Failed to reject contract")
    }
  }

  const handleSuspendContract = async (contractId: string) => {
    if (!confirm("Suspend this contract? Billing will stop but the contract will remain in the system.")) return

    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/suspend`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Contract suspended")
        await fetchContracts()
      } else {
        toast.error(data.error || "Failed to suspend contract")
      }
    } catch (error) {
      toast.error("Failed to suspend contract")
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700"
      case "SIGNED_BY_DRIVER":
      case "DRIVER_SIGNED":
        return "bg-blue-100 text-blue-700"
      case "SENT":
      case "SENT_TO_DRIVER":
        return "bg-yellow-100 text-yellow-700"
      case "DRAFT":
        return "bg-gray-100 text-gray-700"
      case "PAUSED":
        return "bg-orange-100 text-orange-700"
      case "ENDED":
      case "CANCELLED":
      case "EXPIRED":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getNextAction = (contract: Contract) => {
    switch (contract.status) {
      case "DRAFT":
        return { label: "Send to Driver", action: "send", variant: "default" as const }
      case "SENT":
      case "SENT_TO_DRIVER":
        return { label: "Waiting for Signature", action: null, variant: "outline" as const }
      case "SIGNED_BY_DRIVER":
      case "DRIVER_SIGNED":
        return { label: "Activate & Generate PDF", action: "activate", variant: "default" as const }
      case "ACTIVE":
        return { label: "Ready for Assignment", action: null, variant: "outline" as const }
      default:
        return { label: "View Details", action: null, variant: "outline" as const }
    }
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
          <h1 className="text-3xl font-bold">Rental Contracts</h1>
          <p className="text-muted-foreground mt-1">Assign vehicles to verified drivers</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Contract
        </Button>
      </div>

      {/* Show message if vehicleId param but no contract found */}
      {vehicleIdParam && contracts.filter(c => c.vehicle.id === vehicleIdParam).length === 0 && !loading && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-yellow-900">No Contract Found</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  No contract exists for this vehicle yet. Create a contract to assign a driver.
                </p>
              </div>
              <Button onClick={() => setShowDialog(true)}>
                Create Contract
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {(showActiveOnly ? contracts.filter((c) => c.status === "ACTIVE") : contracts).map((contract) => (
          <Card key={contract.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(contract.status)}`}>
                      {contract.status === ContractStatus.DRAFT ? "Draft (editable)" :
                       contract.status === ContractStatus.SENT_TO_DRIVER || contract.status === "SENT" ? "Sent to driver (awaiting signature)" :
                       contract.status === ContractStatus.ACTIVE ? "Active" :
                       contract.status}
                    </span>
                    <h3 className="font-medium">
                      {contract.driver.user.name || contract.driver.user.email} → {contract.vehicle.reg}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatZARFromCents(contract.feeAmountCents)} {contract.frequency.toLowerCase()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Started: {new Date(contract.startDate).toLocaleDateString()}
                    </div>
                    {contract.endDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Ended: {new Date(contract.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    {/* Status Indicators */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        Vehicle: {contract.vehicle.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Driver: {contract.driver.verificationStatus === "VERIFIED" ? "✓ Verified" : contract.driver.verificationStatus}
                      </Badge>
                    </div>
                    
                    {/* Financial Snapshot */}
                    {(() => {
                      const paidPayments = contract.payments.filter((p) => p.status === "PAID")
                      const pendingPayments = contract.payments.filter((p) => p.status === "PENDING")
                      const totalBilled = contract.payments.reduce((sum, p) => sum + (p.amountCents || 0), 0)
                      const outstanding = pendingPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0)
                      const nextPayment = pendingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
                      
                      return (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Rate</p>
                            <p className="font-medium">{formatZARFromCents(contract.feeAmountCents)} {contract.frequency.toLowerCase()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Billed</p>
                            <p className="font-medium">{formatZARFromCents(totalBilled)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Outstanding</p>
                            <p className="font-medium text-orange-600">{formatZARFromCents(outstanding)}</p>
                          </div>
                          {nextPayment ? (
                            <div>
                              <p className="text-xs text-muted-foreground">Next Payment</p>
                              <p className="font-medium">{new Date(nextPayment.dueDate).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-muted-foreground">Vehicle</p>
                              <p className="font-medium">{contract.vehicle.make} {contract.vehicle.model}</p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const status = contract.status
                    const isDraft = status === ContractStatus.DRAFT
                    const isSent = status === ContractStatus.SENT_TO_DRIVER || status === "SENT"
                    const isSigned = status === ContractStatus.SIGNED_BY_DRIVER || status === ContractStatus.DRIVER_SIGNED
                    const isActive = status === ContractStatus.ACTIVE
                    const isEnded = status === ContractStatus.ENDED || status === ContractStatus.CANCELLED || status === ContractStatus.EXPIRED
                    
                    // DRAFT actions
                    if (isDraft) {
                      return (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/contracts/${contract.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewContract(contract.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateContract(contract)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/contracts/${contract.id}/send`, {
                                  method: "POST",
                                })
                                const data = await res.json()
                                if (res.ok) {
                                  toast.success("Contract sent to driver!")
                                  await fetchContracts()
                                } else {
                                  toast.error(data.error || "Failed to send contract")
                                }
                              } catch (error) {
                                toast.error("Failed to send contract")
                              }
                            }}
                          >
                            Send to Driver
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteDraft(contract.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Draft
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )
                    }
                    
                    // SENT actions
                    if (isSent) {
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewContract(contract.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRejectContract(contract.id)}>
                                <X className="h-4 w-4 mr-2" />
                                Reject Contract
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )
                    }
                    
                    // SIGNED BY DRIVER actions
                    if (isSigned) {
                      return (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              try {
                                const activateRes = await fetch(`/api/admin/contracts/${contract.id}/activate`, {
                                  method: "POST",
                                })
                                if (!activateRes.ok) {
                                  const data = await activateRes.json()
                                  toast.error(data.error || "Failed to activate contract")
                                  return
                                }
                                
                                const pdfRes = await fetch(`/api/contracts/${contract.id}/generate-signed-pdf`, {
                                  method: "POST",
                                })
                                const pdfData = await pdfRes.json()
                                if (pdfRes.ok) {
                                  toast.success("Contract activated and PDF generated!")
                                  await fetchContracts()
                                } else {
                                  toast.error(pdfData.error || "Contract activated but PDF generation failed")
                                  await fetchContracts()
                                }
                              } catch (error) {
                                toast.error("Failed to activate contract")
                              }
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Activate Contract
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRejectContract(contract.id)}>
                                <X className="h-4 w-4 mr-2" />
                                Reject Before Activation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )
                    }
                    
                    // ACTIVE actions
                    if (isActive) {
                      return (
                        <>
                          {contract.signedPdfUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(contract.signedPdfUrl!, "_blank")}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/contracts/${contract.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modify Terms
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {/* TODO: Reassign vehicle */}}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reassign Vehicle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSuspendContract(contract.id)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Suspend Contract
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleEndContract(contract.id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                End Contract
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )
                    }
                    
                    // ENDED/CANCELLED actions
                    if (isEnded) {
                      return (
                        <>
                          {contract.signedPdfUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(contract.signedPdfUrl!, "_blank")}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* TODO: View payments */}}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Payments
                          </Button>
                        </>
                      )
                    }
                    
                    // Default fallback
                    return (
                      <>
                        {contract.signedPdfUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(contract.signedPdfUrl!, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No contracts yet. Create one to assign a vehicle to a driver.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Rental Contract</DialogTitle>
            <DialogDescription>Assign a vehicle to a verified driver</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
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
              {drivers.length === 0 && <p className="text-xs text-muted-foreground">No verified drivers available</p>}
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
              {vehicles.length === 0 && <p className="text-xs text-muted-foreground">No available vehicles</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Rental Fee (R) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  value={formData.feeAmountCents}
                  onChange={(e) => setFormData({ ...formData, feeAmountCents: e.target.value })}
                  placeholder="500.00"
                  required
                />
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.frequency === "WEEKLY" && (
              <div className="space-y-2">
                <Label htmlFor="dueWeekday">Payment Due Day *</Label>
                <Select
                  value={formData.dueWeekday}
                  onValueChange={(value) => setFormData({ ...formData, dueWeekday: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
              <p className="font-medium mb-1">Note:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Only verified drivers can be assigned vehicles</li>
                <li>First payment will be generated automatically</li>
                <li>Vehicle status will change to ASSIGNED</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={creating || drivers.length === 0 || vehicles.length === 0}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Contract"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
