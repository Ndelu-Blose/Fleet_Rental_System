"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Car,
  Calendar,
  DollarSign,
  Loader2,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
} from "lucide-react"

type Contract = {
  id: string
  feeAmountCents: number
  frequency: string
  startDate: string
  vehicle: {
    reg: string
    make: string
    model: string
    year: number | null
    type: string
  }
  payments: Array<{
    id: string
    status: string
    dueDate: string
    amountCents: number
  }>
}

type Profile = {
  id: string
  verificationStatus: string
  verificationNote: string | null
  completionPercent: number
  user: {
    name: string | null
    phone: string | null
    email: string
    isEmailVerified: boolean
  }
}

export default function DriverDashboardPage() {
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [contractRes, profileRes] = await Promise.all([fetch("/api/driver/contract"), fetch("/api/driver/profile")])

      const contractData = await contractRes.json()
      const profileData = await profileRes.json()

      if (contractData && !contractData.error) {
        setContract(contractData)
      }
      if (profileData && !profileData.error) {
        setProfile(profileData)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => `R ${(cents / 100).toFixed(2)}`

  const nextPayment = contract?.payments.find((p) => p.status === "PENDING")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-700 border-green-200"
      case "IN_REVIEW":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "Approved"
      case "IN_REVIEW":
        return "In Review"
      case "REJECTED":
        return "Rejected"
      default:
        return "Unverified"
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
      <div>
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back</p>
      </div>

      {/* Three Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Verification Status */}
        {profile && profile.verificationStatus !== "VERIFIED" && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusColor(profile.verificationStatus)}`}>
                  {profile.verificationStatus === "IN_REVIEW" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : profile.verificationStatus === "REJECTED" ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(profile.verificationStatus)}`}>
                    {getStatusLabel(profile.verificationStatus)}
                  </span>
                </div>
              </div>

              {profile.verificationStatus === "IN_REVIEW" && (
                <p className="text-sm text-muted-foreground">Your documents are being reviewed</p>
              )}

              {profile.verificationStatus === "REJECTED" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">Action required</p>
                  {profile.verificationNote && (
                    <p className="text-sm text-muted-foreground">{profile.verificationNote}</p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => router.push("/driver/documents")} className="w-full">
                    View Documents
                  </Button>
                </div>
              )}

              {profile.verificationStatus === "UNVERIFIED" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Complete verification to get started</p>
                  <Button variant="default" size="sm" onClick={() => router.push("/driver/profile")} className="w-full">
                    Complete Verification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 2: Vehicle Assignment */}
        {profile && profile.verificationStatus === "VERIFIED" && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              {contract ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{contract.vehicle.reg}</h3>
                      <p className="text-muted-foreground">
                        {contract.vehicle.make} {contract.vehicle.model}
                        {contract.vehicle.year && ` (${contract.vehicle.year})`}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">{contract.vehicle.type.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatCurrency(contract.feeAmountCents)} {contract.frequency.toLowerCase()}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push("/driver/payments")} className="w-full">
                    View Contract Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Waiting for assignment</p>
                  <p className="text-xs text-muted-foreground mt-1">The owner will assign you a vehicle soon</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 3: Payments */}
        {contract && (
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {nextPayment ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${new Date(nextPayment.dueDate) <= new Date() ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-2xl font-bold">{formatCurrency(nextPayment.amountCents)}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          new Date(nextPayment.dueDate) <= new Date()
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {new Date(nextPayment.dueDate) <= new Date() ? "OVERDUE" : "DUE"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(nextPayment.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button onClick={() => router.push("/driver/payments")} className="w-full" variant={new Date(nextPayment.dueDate) <= new Date() ? "default" : "default"}>
                    Pay Now
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No payments due</p>
                  <Button variant="outline" size="sm" onClick={() => router.push("/driver/payments")} className="w-full mt-3">
                    View Payment History
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show "No payments" card if verified but no contract */}
        {profile && profile.verificationStatus === "VERIFIED" && !contract && (
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No payments due</p>
                <p className="text-xs text-muted-foreground mt-1">Payments will appear once you have a vehicle assigned</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions - Simplified */}
      {(contract || (profile && profile.verificationStatus === "VERIFIED")) && (
        <div>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contract && nextPayment && nextPayment.status !== "PAID" && (
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push("/driver/payments")}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Pay Now</h3>
                      <p className="text-xs text-muted-foreground">Make your payment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {contract && (
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push("/driver/payments")}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">View Contract</h3>
                      <p className="text-xs text-muted-foreground">See contract details</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                window.location.href = `mailto:support@fleethub.com?subject=Support Request&body=Hello, I need assistance with...`
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <HelpCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Contact Support</h3>
                    <p className="text-xs text-muted-foreground">Get help from admin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
