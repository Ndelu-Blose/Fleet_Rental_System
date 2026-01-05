"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ProgressBar, ProfileChecklist } from "@/components/progress-bar"
import { DocumentUploader } from "@/components/document-uploader"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

type Profile = {
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
  lastLocationAt: string | null
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

export default function DriverProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    idNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/driver/profile")
      const data = await res.json()
      setProfile(data)
      setFormData({
        name: data.user.name || "",
        phone: data.user.phone || "",
        idNumber: data.idNumber || "",
        addressLine1: data.addressLine1 || "",
        addressLine2: data.addressLine2 || "",
        city: data.city || "",
        province: data.province || "",
        postalCode: data.postalCode || "",
      })
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/driver/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchProfile()
      }
    } catch (error) {
      console.error("Failed to save profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDocumentUpload = async (file: File, docType: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("docType", docType)

    const res = await fetch("/api/driver/documents", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      throw new Error("Upload failed")
    }

    await fetchProfile()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return <div>Profile not found</div>
  }

  const getDoc = (type: string) => profile.documents.find((d) => d.type === type)

  const checklistItems = [
    { label: "Email verified", completed: profile.user.isEmailVerified },
    { label: "Basic info completed", completed: !!profile.user.name && !!profile.user.phone },
    { label: "ID number provided", completed: !!profile.idNumber },
    { label: "Address provided", completed: !!profile.addressLine1 && !!profile.city && !!profile.province },
    { label: "Location verified", completed: !!profile.lastLocationAt },
    { label: "Photo uploaded", completed: !!getDoc("DRIVER_PHOTO") },
    { label: "ID & residence docs uploaded", completed: !!getDoc("CERTIFIED_ID") && !!getDoc("PROOF_OF_RESIDENCE") },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Driver Profile</h1>
        <p className="text-muted-foreground mt-1">Complete your profile to get verified</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>Track your profile completion progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProgressBar percent={profile.completionPercent} />

          <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
            {profile.verificationStatus === "VERIFIED" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                Status: <span className="text-primary">{profile.verificationStatus}</span>
              </p>
              {profile.verificationNote && (
                <p className="text-sm text-muted-foreground mt-1">{profile.verificationNote}</p>
              )}
            </div>
          </div>

          <ProfileChecklist items={checklistItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+27 12 345 6789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              placeholder="0000000000000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              placeholder="Apartment 4B"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Johannesburg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Gauteng"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="2000"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KYC Documents</CardTitle>
          <CardDescription>Upload required documents for verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader
            docType="DRIVER_PHOTO"
            label="Driver Photo"
            onUpload={(file) => handleDocumentUpload(file, "DRIVER_PHOTO")}
            existingDoc={getDoc("DRIVER_PHOTO")}
          />
          <DocumentUploader
            docType="CERTIFIED_ID"
            label="Certified ID Copy"
            onUpload={(file) => handleDocumentUpload(file, "CERTIFIED_ID")}
            existingDoc={getDoc("CERTIFIED_ID")}
          />
          <DocumentUploader
            docType="PROOF_OF_RESIDENCE"
            label="Proof of Residence"
            onUpload={(file) => handleDocumentUpload(file, "PROOF_OF_RESIDENCE")}
            existingDoc={getDoc("PROOF_OF_RESIDENCE")}
          />
        </CardContent>
      </Card>
    </div>
  )
}
