"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle2, AlertCircle, User, Lock, Mail } from "lucide-react"
import { toast } from "sonner"

type Profile = {
  id: string
  name: string | null
  email: string
  phone: string | null
  isEmailVerified: boolean
  role: string
  createdAt: string
}

export default function AdminProfilePage() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile update state
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)

  // Email change state
  const [emailData, setEmailData] = useState({
    currentPassword: "",
    newEmail: "",
  })
  const [changingEmail, setChangingEmail] = useState(false)

  useEffect(() => {
    fetchProfile()

    // Check for success/error messages from URL params
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "email_verified") {
      toast.success("Email address verified successfully!")
    } else if (error) {
      if (error === "invalid_token") {
        toast.error("Invalid verification token")
      } else if (error === "expired_token") {
        toast.error("Verification token expired. Please request a new email change.")
      } else if (error === "no_pending_email") {
        toast.error("No pending email change found")
      } else if (error === "verification_failed") {
        toast.error("Email verification failed. Please try again.")
      }
    }
  }, [searchParams])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/admin/profile")
      const data = await res.json()
      setProfile(data)
      setProfileData({
        name: data.name || "",
        phone: data.phone || "",
      })
    } catch (error) {
      console.error("Failed to fetch profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Profile updated successfully")
        await fetchProfile()
      } else {
        toast.error(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch("/api/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Password changed successfully")
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        toast.error(data.error || "Failed to change password")
      }
    } catch (error) {
      console.error("Failed to change password:", error)
      toast.error("Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleChangeEmail = async () => {
    setChangingEmail(true)
    try {
      const res = await fetch("/api/admin/profile/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Verification email sent to your new address. Please check your email.")
        setEmailData({
          currentPassword: "",
          newEmail: "",
        })
      } else {
        toast.error(data.error || "Failed to initiate email change")
      }
    } catch (error) {
      console.error("Failed to change email:", error)
      toast.error("Failed to change email")
    } finally {
      setChangingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and security</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password">
            <Lock className="h-4 w-4 mr-2" />
            Password
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your name and phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+27 12 345 6789"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={profile.email} disabled className="bg-muted" />
                  {profile.isEmailVerified ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Unverified</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Change email in the Email tab</p>
              </div>

              <Button onClick={handleUpdateProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm new password"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Change Email Address</CardTitle>
              <CardDescription>
                Update your email address. A verification email will be sent to your new address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Email</Label>
                <Input value={profile.email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPasswordEmail">Current Password</Label>
                <Input
                  id="currentPasswordEmail"
                  type="password"
                  value={emailData.currentPassword}
                  onChange={(e) =>
                    setEmailData({ ...emailData, currentPassword: e.target.value })
                  }
                  placeholder="Enter your password to confirm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                  placeholder="newemail@example.com"
                />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>You'll receive a verification email at your new address</li>
                  <li>You must click the verification link within 24 hours</li>
                  <li>Your email will not change until verified</li>
                </ul>
              </div>

              <Button onClick={handleChangeEmail} disabled={changingEmail}>
                {changingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Verification...
                  </>
                ) : (
                  "Send Verification Email"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

