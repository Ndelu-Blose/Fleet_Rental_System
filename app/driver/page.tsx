"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/progress-bar"
import {
  AlertCircle,
  Car,
  Calendar,
  DollarSign,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  MapPin,
  CreditCard,
  Upload,
  User,
  HelpCircle,
  Wrench,
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
  lastLocationAt: string | null
  idNumber: string | null
  addressLine1: string | null
  city: string | null
  province: string | null
  user: {
    name: string | null
    phone: string | null
    email: string
    isEmailVerified: boolean
  }
  documents: Array<{
    id: string
    type: string
    fileName: string | null
    status: string
  }>
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

  // Determine missing items for checklist
  const getMissingItems = () => {
    if (!profile) return []
    const missing: string[] = []

    if (!profile.user.isEmailVerified) missing.push("Verify email")
    if (!profile.user.name) missing.push("Add full name")
    if (!profile.user.phone) missing.push("Add phone number")
    if (!profile.idNumber) missing.push("Add ID number")
    if (!profile.addressLine1 || !profile.city || !profile.province) missing.push("Add address")
    if (!profile.lastLocationAt) missing.push("Verify location")
    const hasPhoto = profile.documents.some((d) => d.type === "DRIVER_PHOTO")
    const hasCertifiedId = profile.documents.some((d) => d.type === "CERTIFIED_ID")
    const hasProofOfResidence = profile.documents.some((d) => d.type === "PROOF_OF_RESIDENCE")
    if (!hasPhoto) missing.push("Upload driver photo")
    if (!hasCertifiedId || !hasProofOfResidence) missing.push("Upload required documents")

    return missing
  }

  // Determine next action
  const getNextAction = () => {
    if (!profile) return null

    // Not activated
    if (!profile.user.isEmailVerified) {
      return {
        label: "Activate account",
        action: () => router.push("/activate"),
        icon: CheckCircle2,
        variant: "default" as const,
      }
    }

    // Profile incomplete
    if (profile.completionPercent < 100) {
      return {
        label: "Complete profile",
        action: () => router.push("/driver/profile"),
        icon: FileText,
        variant: "default" as const,
      }
    }

    // Waiting for approval
    if (profile.verificationStatus === "IN_REVIEW") {
      return {
        label: "Wait for approval (We'll notify you)",
        action: null,
        icon: Clock,
        variant: "secondary" as const,
        disabled: true,
      }
    }

    // Rejected
    if (profile.verificationStatus === "REJECTED") {
      return {
        label: "View rejection details",
        action: () => router.push("/driver/profile"),
        icon: AlertCircle,
        variant: "destructive" as const,
      }
    }

    // Verified but no contract
    if (profile.verificationStatus === "VERIFIED" && !contract) {
      return {
        label: "Ready for vehicle assignment",
        action: null,
        icon: CheckCircle2,
        variant: "secondary" as const,
        disabled: true,
      }
    }

    // Payment due
    if (contract && nextPayment) {
      const dueDate = new Date(nextPayment.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (dueDate <= today) {
        return {
          label: "Pay Now",
          action: () => router.push("/driver/payments"),
          icon: CreditCard,
          variant: "default" as const,
        }
      }
    }

    // All good
    return null
  }

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

  const getStatusMessage = () => {
    if (!profile) return ""
    if (profile.completionPercent < 100) {
      return "Complete your profile to submit for verification"
    }
    if (profile.verificationStatus === "IN_REVIEW") {
      return "Your profile is submitted — waiting for approval"
    }
    if (profile.verificationStatus === "VERIFIED") {
      return "Approved — ready for vehicle assignment"
    }
    if (profile.verificationStatus === "REJECTED") {
      return "Profile rejected — see notes below"
    }
    return ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const nextAction = getNextAction()
  const missingItems = getMissingItems()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back</p>
      </div>

      {/* Grid layout for cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Verification Status */}
        {profile && (
          <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(profile.verificationStatus)}`}>
                {getStatusLabel(profile.verificationStatus)}
              </span>
              <span className="text-sm text-muted-foreground">{profile.completionPercent}% complete</span>
            </div>

            <ProgressBar percent={profile.completionPercent} />

            {missingItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Missing items:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {missingItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-sm font-medium">{getStatusMessage()}</p>
              {profile.verificationStatus === "REJECTED" && profile.verificationNote && (
                <p className="text-sm text-muted-foreground mt-1">{profile.verificationNote}</p>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Card 2: Vehicle & Contract */}
        {contract && (
          <Card>
          <CardHeader>
            <CardTitle>Assigned Vehicle & Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="font-bold text-lg">{contract.vehicle.reg}</h3>
                  <p className="text-muted-foreground">
                    {contract.vehicle.make} {contract.vehicle.model}
                    {contract.vehicle.year && ` (${contract.vehicle.year})`}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{contract.vehicle.type.toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatCurrency(contract.feeAmountCents)} {contract.frequency.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Started: {new Date(contract.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/driver/payments")} className="mt-2">
                  View Payments
                </Button>
              </div>
            </div>
          </CardContent>
          </Card>
        )}

        {/* Card 3: Next Payment */}
        {contract && nextPayment && (
        <Card className={new Date(nextPayment.dueDate) <= new Date() ? "border-red-200 bg-red-50/50" : "border-yellow-200"}>
          <CardHeader>
            <CardTitle>Next Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(nextPayment.amountCents)}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {new Date(nextPayment.dueDate).toLocaleDateString()}</span>
                </div>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                    new Date(nextPayment.dueDate) <= new Date()
                      ? "bg-red-100 text-red-700"
                      : nextPayment.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {new Date(nextPayment.dueDate) <= new Date() ? "Overdue" : nextPayment.status === "PAID" ? "Paid" : "Due"}
                </span>
              </div>
              <Button onClick={() => router.push("/driver/payments")} variant={nextPayment.status === "PAID" ? "outline" : "default"}>
                {nextPayment.status === "PAID" ? "View Payments" : "Pay Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Card 4: Next Action */}
        {nextAction && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <nextAction.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">{nextAction.label}</p>
                {profile?.verificationStatus === "IN_REVIEW" && (
                  <p className="text-sm text-muted-foreground">We'll notify you once your profile is reviewed.</p>
                )}
              </div>
              {nextAction.action && (
                <Button onClick={nextAction.action} variant={nextAction.variant} disabled={nextAction.disabled}>
                  {nextAction.label}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* No Vehicle Assigned - Full width */}
      {!contract && profile?.verificationStatus === "VERIFIED" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Vehicle Assigned</h3>
            <p className="text-sm text-muted-foreground">
              You're approved and ready for a vehicle. The owner will assign you a vehicle soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Cards Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contract && nextPayment && nextPayment.status !== "PAID" && (
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push("/driver/payments")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Pay Now</h3>
                    <p className="text-sm text-muted-foreground">Make your payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {contract && (
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push("/driver/payments")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">View Contract</h3>
                    <p className="text-sm text-muted-foreground">See contract details</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {profile && profile.completionPercent < 100 && (
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push("/driver/profile")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Upload className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Upload Documents</h3>
                    <p className="text-sm text-muted-foreground">Complete your profile</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push("/driver/profile")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Update Profile</h3>
                  <p className="text-sm text-muted-foreground">Edit your information</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
            // TODO: Implement support/contact functionality
            window.location.href = `mailto:support@fleethub.com?subject=Support Request&body=Hello, I need assistance with...`
          }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <HelpCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Contact Support</h3>
                  <p className="text-sm text-muted-foreground">Get help from admin</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {contract && (
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
              // TODO: Implement vehicle issue reporting
              window.location.href = `mailto:support@fleethub.com?subject=Vehicle Issue Report&body=Vehicle: ${contract.vehicle.reg}%0D%0A%0D%0AIssue: `
            }}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Wrench className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Report Vehicle Issue</h3>
                    <p className="text-sm text-muted-foreground">Report a problem</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
