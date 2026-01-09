"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminDocReview } from "@/components/admin-doc-review"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Car, CreditCard, FileText, MoreVertical, Lock, Trash2, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { formatZARFromCents } from "@/lib/money"

type Driver = {
  id: string
  idNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  verificationStatus: string
  verificationNote: string | null
  completionPercent: number
  lastLat: number | null
  lastLng: number | null
  lastLocationAt: string | null
  user: {
    id: string
    email: string
    name: string | null
    phone: string | null
    isEmailVerified: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  documents: Array<{
    id: string
    type: string
    fileName: string | null
    fileUrl: string
    status: string
    reviewNote: string | null
    createdAt: string
  }>
  contracts: Array<{
    id: string
    status: string
    feeAmountCents: number
    frequency: string
    startDate: string
    endDate: string | null
    vehicle: {
      id: string
      reg: string
      make: string
      model: string
      year: number | null
      type: string
      compliance: {
        licenseExpiry: string | null
        insuranceExpiry: string | null
        roadworthyExpiry: string | null
      } | null
    }
    payments: Array<{
      id: string
      status: string
      dueDate: string
      amountCents: number
      paidAt: string | null
    }>
  }>
}

export default function DriverDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDriver()
  }, [params.id])

  const fetchDriver = async () => {
    try {
      const res = await fetch(`/api/admin/drivers/${params.id}`)
      const data = await res.json()
      if (res.ok) {
        setDriver(data)
      } else {
        toast.error(data.error || "Failed to fetch driver")
        router.push("/admin/drivers")
      }
    } catch (error) {
      console.error("Failed to fetch driver:", error)
      toast.error("Failed to fetch driver")
      router.push("/admin/drivers")
    } finally {
      setLoading(false)
    }
  }

  const handleDocReview = async (docId: string, status: "APPROVED" | "REJECTED", note: string) => {
    await fetch("/api/admin/verification/doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, status, note }),
    })
    await fetchDriver()
  }

  const handleResetPassword = async () => {
    const newPassword = prompt("Enter a new password for this driver (min 8 characters):")
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    try {
      const res = await fetch(`/api/admin/drivers/${driver!.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Password reset! Driver can now log in with: ${newPassword}`)
      } else {
        toast.error(data.error || "Failed to reset password")
      }
    } catch (error) {
      console.error("Failed to reset password:", error)
      toast.error("Failed to reset password")
    }
  }

  const formatCurrency = formatZARFromCents

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-700"
      case "IN_REVIEW":
        return "bg-yellow-100 text-yellow-700"
      case "REJECTED":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!driver) {
    return null
  }

  const activeContract = driver.contracts.find((c) => c.status === "ACTIVE")
  const nextPayment = activeContract?.payments.find((p) => p.status === "PENDING")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/drivers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{driver.user.name || "No name"}</h1>
            <p className="text-muted-foreground mt-1">{driver.user.email}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/contracts?driverId=${driver.id}`)}>
              Create Contract
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/vehicles?assignTo=${driver.id}`)}>
              Assign Vehicle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleResetPassword}>
              <Lock className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
            {!driver.user.isActive && (
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/drivers/activate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: driver.user.id }),
                    })
                    if (res.ok) {
                      toast.success("Driver activated")
                      await fetchDriver()
                    }
                  } catch (error) {
                    toast.error("Failed to activate driver")
                  }
                }}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Activate Driver
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Driver Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{driver.user.name || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <p className="font-medium">{driver.user.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <p className="font-medium">{driver.user.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ID Number</p>
                    <p className="font-medium">{driver.idNumber || "Not provided"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="text-sm">
                    {driver.addressLine1 ? (
                      <>
                        {driver.addressLine1}
                        {driver.addressLine2 && `, ${driver.addressLine2}`}
                        {driver.city && `, ${driver.city}`}
                        {driver.province && `, ${driver.province}`}
                        {driver.postalCode && ` ${driver.postalCode}`}
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </div>

                {driver.lastLocationAt && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 rounded-md">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-900">Location Verified</p>
                      <p className="text-green-700 text-xs">
                        Last check-in: {new Date(driver.lastLocationAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Verification Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(driver.verificationStatus)}`}>
                    {driver.verificationStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Profile Completion</p>
                  <p className="text-2xl font-bold">{driver.completionPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Account Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${driver.user.isEmailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {driver.user.isEmailVerified ? "Email Verified" : "Email Not Verified"}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${driver.user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {driver.user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                {driver.verificationNote && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Verification Note</p>
                    <p className="text-sm">{driver.verificationNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {activeContract && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Assigned Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Car className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{activeContract.vehicle.reg}</h3>
                      <p className="text-muted-foreground">
                        {activeContract.vehicle.make} {activeContract.vehicle.model}
                        {activeContract.vehicle.year && ` (${activeContract.vehicle.year})`}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">{activeContract.vehicle.type.toLowerCase()}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatCurrency(activeContract.feeAmountCents)} {activeContract.frequency.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>Started: {new Date(activeContract.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          {driver.contracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No contracts found</p>
              </CardContent>
            </Card>
          ) : (
            driver.contracts.map((contract) => (
              <Card key={contract.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {contract.vehicle.make} {contract.vehicle.model} ({contract.vehicle.reg})
                    </CardTitle>
                    <span className={`px-2 py-1 rounded text-xs ${contract.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {contract.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="font-medium">
                        {formatCurrency(contract.feeAmountCents)} {contract.frequency.toLowerCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
                    </div>
                    {contract.endDate && (
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Payments</p>
                      <p className="font-medium">
                        {contract.payments.filter((p) => p.status === "PAID").length} paid / {contract.payments.length} total
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {activeContract && activeContract.payments.length > 0 ? (
            <>
              {nextPayment && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                  <CardHeader>
                    <CardTitle>Next Payment Due</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold">{formatCurrency(nextPayment.amountCents)}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Due: {new Date(nextPayment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                {activeContract.payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amountCents)}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            payment.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : new Date(payment.dueDate) <= new Date()
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {payment.status === "PAID" ? "PAID" : new Date(payment.dueDate) <= new Date() ? "OVERDUE" : "PENDING"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No payments found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {driver.documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No documents uploaded</p>
              </CardContent>
            </Card>
          ) : (
            driver.documents.map((doc) => (
              <AdminDocReview key={doc.id} document={doc} onReview={handleDocReview} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
