"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Car, Calendar, DollarSign, Loader2 } from "lucide-react"

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
  }
  payments: Array<{
    id: string
    status: string
    dueDate: string
    amountCents: number
  }>
}

type Profile = {
  verificationStatus: string
  completionPercent: number
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

      {profile && profile.verificationStatus !== "VERIFIED" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900">Complete Your Profile</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your profile is {profile.completionPercent}% complete. Please complete your profile and upload
                  required documents to get verified.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-transparent"
                  onClick={() => router.push("/driver/profile")}
                >
                  Complete Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {contract ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Assigned Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{contract.vehicle.reg}</h3>
                  <p className="text-muted-foreground">
                    {contract.vehicle.make} {contract.vehicle.model}
                    {contract.vehicle.year && ` (${contract.vehicle.year})`}
                  </p>
                  <div className="flex items-center gap-6 mt-3 text-sm">
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
                </div>
              </div>
            </CardContent>
          </Card>

          {nextPayment && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle>Next Payment Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{formatCurrency(nextPayment.amountCents)}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Calendar className="h-4 w-4" />
                      Due: {new Date(nextPayment.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <Button onClick={() => router.push("/driver/payments")}>View Payments</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      contract.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amountCents, 0),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(
                      contract.payments
                        .filter((p) => p.status === "PENDING")
                        .reduce((sum, p) => sum + p.amountCents, 0),
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Vehicle Assigned</h3>
            <p className="text-sm text-muted-foreground">
              You don't have a vehicle assigned yet. Complete your profile to be eligible for vehicle assignment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
