"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Loader2, UserPlus, Mail, Phone, MoreVertical, Trash2, MailCheck, Eye, Copy, ExternalLink, CheckCircle2, UserCheck, Lock } from "lucide-react"

type Driver = {
  id: string
  verificationStatus: string
  completionPercent: number
  user: {
    id: string
    email: string
    name: string | null
    phone: string | null
    isActive: boolean
    isEmailVerified: boolean
  }
  contracts: Array<{
    id: string
    status: string
    vehicle: {
      reg: string
      make: string
      model: string
    }
  }>
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activationLink, setActivationLink] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailErrorTechnical, setEmailErrorTechnical] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [copyingLink, setCopyingLink] = useState<string | null>(null)
  const [activatingDriver, setActivatingDriver] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
  })

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/admin/drivers")
      const data = await res.json()
      setDrivers(data)
    } catch (error) {
      console.error("Failed to fetch drivers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch("/api/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setActivationLink(data.activationLink)
        setEmailSent(data.emailSent || false)
        // Store both friendly and technical errors
        setEmailError(data.emailError || null)
        setEmailErrorTechnical(data.emailErrorTechnical || null)
        setFormData({ email: "", name: "", phone: "" })
        await fetchDrivers()
        if (data.emailSent) {
          toast.success(data.message || "Driver created and activation email sent successfully")
        } else {
          toast.warning(data.message || "Driver created but email failed to send. Use 'Resend Activation Email'.")
        }
      } else {
        // Show error message from API
        const errorMessage = data.error || "Failed to create driver"
        const details = data.details ? `: ${JSON.stringify(data.details)}` : ""
        toast.error(`${errorMessage}${details}`)
        console.error("Create driver error:", data)
      }
    } catch (error) {
      console.error("Failed to create driver:", error)
      toast.error("Failed to create driver. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteDriver = async () => {
    if (!driverToDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/drivers?driverId=${driverToDelete.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Driver deleted successfully")
        setDeleteDialogOpen(false)
        setDriverToDelete(null)
        await fetchDrivers()
      } else {
        toast.error(data.error || "Failed to delete driver")
      }
    } catch (error) {
      console.error("Failed to delete driver:", error)
      toast.error("Failed to delete driver")
    } finally {
      setDeleting(false)
    }
  }

  const handleResendActivation = async (userId: string) => {
    setResendingEmail(userId)
    try {
      const res = await fetch("/api/admin/drivers/resend-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Activation email sent successfully")
      } else {
        toast.error(data.error || "Failed to send activation email")
      }
    } catch (error) {
      console.error("Failed to resend activation email:", error)
      toast.error("Failed to send activation email")
    } finally {
      setResendingEmail(null)
    }
  }

  const handleCopyActivationLink = async (driverId: string) => {
    setCopyingLink(driverId)
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/activation-link`)
      const data = await res.json()

      if (res.ok && data.activationLink) {
        await navigator.clipboard.writeText(data.activationLink)
        toast.success("Activation link copied to clipboard")
      } else {
        toast.error(data.error || "Failed to get activation link")
      }
    } catch (error) {
      console.error("Failed to copy activation link:", error)
      toast.error("Failed to copy activation link")
    } finally {
      setCopyingLink(null)
    }
  }

  const handleActivateDriver = async (userId: string) => {
    setActivatingDriver(userId)
    try {
      const res = await fetch("/api/admin/drivers/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Driver activated successfully. They can now log in.")
        await fetchDrivers() // Refresh the list
      } else {
        toast.error(data.error || "Failed to activate driver")
      }
    } catch (error) {
      console.error("Failed to activate driver:", error)
      toast.error("Failed to activate driver")
    } finally {
      setActivatingDriver(null)
    }
  }

  const handleResetPassword = async (driverId: string) => {
    const newPassword = prompt("Enter a new password for this driver (min 8 characters):")
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Password reset! Driver can now log in with: ${newPassword}`)
        await fetchDrivers()
      } else {
        toast.error(data.error || "Failed to reset password")
      }
    } catch (error) {
      console.error("Failed to reset password:", error)
      toast.error("Failed to reset password")
    }
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Drivers</h1>
          <p className="text-muted-foreground mt-1">Manage driver accounts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <div className="grid gap-4">
        {drivers.map((driver) => (
          <Card key={driver.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium">{driver.user.name || "No name"}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {driver.user.email}
                    </div>
                    {driver.user.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {driver.user.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(driver.verificationStatus)}`}
                    >
                      {driver.verificationStatus}
                    </span>
                    <span className="text-xs text-muted-foreground">{driver.completionPercent}% complete</span>
                    {!driver.user.isEmailVerified && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        Activation: Pending
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {driver.contracts.length > 0 ? (
                      <div className="text-sm">
                        <p className="font-medium">
                          {driver.contracts[0].vehicle.make} {driver.contracts[0].vehicle.model}
                        </p>
                        <p className="text-muted-foreground">{driver.contracts[0].vehicle.reg}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No vehicle assigned</span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => window.open(`/admin/verification?driverId=${driver.id}`, "_blank")}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {!driver.user.isEmailVerified && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleResendActivation(driver.user.id)}
                            disabled={resendingEmail === driver.user.id}
                          >
                            {resendingEmail === driver.user.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <MailCheck className="mr-2 h-4 w-4" />
                            )}
                            Resend Activation Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyActivationLink(driver.id)}
                            disabled={copyingLink === driver.id}
                          >
                            {copyingLink === driver.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Copy Activation Link
                          </DropdownMenuItem>
                        </>
                      )}
                      {driver.user.isEmailVerified && !driver.user.isActive && (
                        <DropdownMenuItem
                          onClick={() => handleActivateDriver(driver.user.id)}
                          disabled={activatingDriver === driver.user.id}
                        >
                          {activatingDriver === driver.user.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="mr-2 h-4 w-4" />
                          )}
                          Activate Driver (Enable Login)
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleResetPassword(driver.id)}
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setDriverToDelete(driver)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-destructive"
                        disabled={driver.contracts.some((c) => c.status === "ACTIVE")}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Driver
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {drivers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No drivers yet. Add your first driver to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>Create a new driver account and send activation email</DialogDescription>
          </DialogHeader>

          {activationLink ? (
            <div className="space-y-4">
              {emailSent ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
                  <div>
                    <p className="text-sm text-green-900 font-medium mb-1 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Activation email sent
                    </p>
                    <p className="text-xs text-green-700">
                      Ask the driver to check their Inbox (and Spam folder) and click "Activate account" in the email.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-green-700 font-medium">Activation link (backup):</p>
                    <div className="rounded-md bg-white border border-green-200 p-2">
                      <code className="text-xs break-all block">{activationLink}</code>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(activationLink)
                            toast.success("Activation link copied to clipboard")
                          } catch (err) {
                            toast.error("Could not copy the link")
                          }
                        }}
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(activationLink, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Open Link
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md space-y-3">
                  <div>
                    <p className="text-sm text-yellow-900 font-medium mb-2">
                      We couldn't send the email automatically
                    </p>
                    <p className="text-xs text-yellow-700 mb-3">
                      Copy this activation link and send it to the driver on WhatsApp or SMS.
                    </p>
                    {/* Technical details - hidden by default, only for admins */}
                    {emailErrorTechnical && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-yellow-800 font-medium hover:text-yellow-900 underline">
                          Show technical details
                        </summary>
                        <div className="mt-2 p-2 bg-white border border-yellow-200 rounded text-yellow-900">
                          <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                            {emailErrorTechnical}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-700 font-medium">Activation link:</p>
                    <div className="rounded-md bg-white border border-yellow-200 p-2">
                      <code className="text-xs break-all block">{activationLink}</code>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(activationLink)
                            toast.success("Activation link copied to clipboard")
                          } catch (err) {
                            toast.error("Could not copy the link")
                          }
                        }}
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(activationLink, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Open Link
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={() => {
                  setActivationLink("")
                  setEmailSent(false)
                  setEmailError(null)
                  setEmailErrorTechnical(null)
                  setShowCreateDialog(false)
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Driver"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the driver account for{" "}
              <strong>{driverToDelete?.user.name || driverToDelete?.user.email}</strong>. This action cannot be
              undone.
              {driverToDelete && driverToDelete.contracts.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This driver has {driverToDelete.contracts.length} contract(s). You should end contracts
                  first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
