"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, CheckCircle2 } from "lucide-react"

export default function VerifyLocationPage() {
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState("")

  const handleVerifyLocation = async () => {
    setLoading(true)
    setError("")

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch("/api/driver/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          })

          if (res.ok) {
            setVerified(true)
          } else {
            setError("Failed to save location")
          }
        } catch (err) {
          setError("An error occurred")
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setError("Unable to retrieve your location. Please enable location services.")
        setLoading(false)
      },
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Location Verification</h1>
        <p className="text-muted-foreground mt-1">Verify your location to complete your profile</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GPS Check-In</CardTitle>
          <CardDescription>We need to verify your current location for security purposes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verified ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 text-green-900 border border-green-200">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Location Verified</p>
                <p className="text-sm">Your location has been successfully recorded</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Why do we need this?</p>
                  <p className="text-muted-foreground">
                    Location verification helps us ensure the security of your account and comply with our verification
                    requirements. Your location data is kept private and secure.
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <Button onClick={handleVerifyLocation} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Verify My Location
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
