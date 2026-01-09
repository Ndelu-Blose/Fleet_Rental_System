"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AdminDocReview } from "@/components/admin-doc-review"
import { Loader2, CheckCircle2, XCircle, MapPin, Mail, Phone } from "lucide-react"

type Driver = {
  id: string
  idNumber: string | null
  addressLine1: string | null
  city: string | null
  province: string | null
  verificationStatus: string
  verificationNote: string | null
  completionPercent: number
  lastLat: number | null
  lastLng: number | null
  lastLocationAt: string | null
  user: {
    email: string
    name: string | null
    phone: string | null
    isEmailVerified: boolean
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
}

function AdminVerificationContent() {
  const searchParams = useSearchParams()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [finalNote, setFinalNote] = useState("")

  useEffect(() => {
    fetchDrivers()
  }, [])

  useEffect(() => {
    const driverId = searchParams.get("driverId")
    if (driverId && drivers.length > 0) {
      const driver = drivers.find((d) => d.id === driverId)
      if (driver) {
        setSelectedDriver(driver)
      }
    }
  }, [searchParams, drivers])

  const fetchDrivers = async () => {
    try {
      const driverId = searchParams.get("driverId")
      const url = driverId 
        ? `/api/admin/verification?driverId=${driverId}`
        : "/api/admin/verification"
      const res = await fetch(url)
      
      // Check if response is ok
      if (!res.ok) {
        // Check if response has content before trying to parse JSON
        const contentType = res.headers.get("content-type")
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`
        
        if (contentType?.includes("application/json")) {
          try {
            const text = await res.text()
            if (text.trim()) {
              const parsed = JSON.parse(text)
              errorMessage = parsed.error || parsed.message || errorMessage
            }
          } catch (e) {
            // If parsing fails, use default error message
            console.error("Failed to parse error response:", e)
          }
        } else {
          // Try to read as text if not JSON
          try {
            const text = await res.text()
            if (text.trim()) {
              errorMessage = text.trim()
            }
          } catch (e) {
            // Ignore text reading errors
          }
        }
        
        // Only log if there's actual error content
        if (errorMessage && errorMessage !== `HTTP ${res.status}: ${res.statusText}`) {
          console.error("API error:", errorMessage)
        } else if (res.status === 401 || res.status === 403) {
          console.error("Authentication error: Please sign in again")
        }
        
        setDrivers([])
        setLoading(false)
        return
      }
      
      const data = await res.json()
      
      // Ensure data is always an array
      const driversArray = Array.isArray(data) ? data : []
      
      // If there's an error in the response, log it and use empty array
      if (data.error) {
        console.error("API error:", data.error)
        setDrivers([])
        setLoading(false)
        return
      }
      
      setDrivers(driversArray)
      if (driversArray.length > 0 && !selectedDriver) {
        const driverIdParam = searchParams.get("driverId")
        if (driverIdParam) {
          const driver = driversArray.find((d: Driver) => d.id === driverIdParam)
          setSelectedDriver(driver || driversArray[0])
        } else {
          setSelectedDriver(driversArray[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch drivers:", error)
      setDrivers([])
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

    await fetchDrivers()
    if (selectedDriver) {
      const updated = drivers.find((d) => d.id === selectedDriver.id)
      if (updated) setSelectedDriver(updated)
    }
  }

  const handleFinalize = async (status: "VERIFIED" | "REJECTED") => {
    if (!selectedDriver) return

    setFinalizing(true)
    try {
      const res = await fetch("/api/admin/verification/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverProfileId: selectedDriver.id,
          status,
          note: finalNote,
        }),
      })

      if (res.ok) {
        setFinalNote("")
        await fetchDrivers()
        setSelectedDriver(null)
      }
    } catch (error) {
      console.error("Failed to finalize:", error)
    } finally {
      setFinalizing(false)
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
        <h1 className="text-3xl font-bold">Driver Verification</h1>
        <p className="text-muted-foreground mt-1">Review and approve driver profiles</p>
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No drivers pending verification</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="font-medium">Pending Review ({drivers.length})</h2>
            {drivers.map((driver) => (
              <Card
                key={driver.id}
                className={`cursor-pointer transition-colors ${
                  selectedDriver?.id === driver.id ? "border-primary" : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedDriver(driver)}
              >
                <CardContent className="pt-4">
                  <h3 className="font-medium">{driver.user.name || "No name"}</h3>
                  <p className="text-sm text-muted-foreground">{driver.user.email}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{driver.completionPercent}% complete</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedDriver && (
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Driver Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedDriver.user.name || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <p className="font-medium">{selectedDriver.user.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <p className="font-medium">{selectedDriver.user.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ID Number</p>
                      <p className="font-medium">{selectedDriver.idNumber || "Not provided"}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                    <p className="text-sm">
                      {selectedDriver.addressLine1 ? (
                        <>
                          {selectedDriver.addressLine1}, {selectedDriver.city}, {selectedDriver.province}
                        </>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                  </div>

                  {selectedDriver.lastLocationAt && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-md">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-900">Location Verified</p>
                        <p className="text-green-700 text-xs">
                          Last check-in: {new Date(selectedDriver.lastLocationAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Review uploaded documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDriver.documents.map((doc) => (
                    <AdminDocReview key={doc.id} document={doc} onReview={handleDocReview} />
                  ))}

                  {selectedDriver.documents.length === 0 && (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Final Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="finalNote">Verification Note (Optional)</Label>
                    <Textarea
                      id="finalNote"
                      value={finalNote}
                      onChange={(e) => setFinalNote(e.target.value)}
                      placeholder="Add any final comments..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleFinalize("VERIFIED")}
                      disabled={finalizing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {finalizing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Verify Driver
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleFinalize("REJECTED")}
                      disabled={finalizing}
                      variant="destructive"
                      className="flex-1"
                    >
                      {finalizing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Profile
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminVerificationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AdminVerificationContent />
    </Suspense>
  )
}
