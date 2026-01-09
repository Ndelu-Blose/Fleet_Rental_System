"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Loader2, UserPlus, Mail, Phone, MoreVertical, Trash2, MailCheck, Eye, Copy, ExternalLink, CheckCircle2, UserCheck, Lock, Search, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activationLink, setActivationLink] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailErrorTechnical, setEmailErrorTechnical] = useState<string | null>(null)
  const [createdDriverEmail, setCreatedDriverEmail] = useState<string | null>(null)
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
      const res = await fetch("/api/admin/drivers", { cache: "no-store" })
      const data = await res.json()
      if (data.ok === false) {
        console.error("API returned error:", data.error)
        setDrivers([])
      } else {
        setDrivers(Array.isArray(data) ? data : data.drivers || [])
      }
    } catch (error) {
      console.error("Failed to fetch drivers:", error)
      setDrivers([])
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

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      searchQuery === "" ||
      driver.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.user.phone?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && driver.verificationStatus === "VERIFIED") ||
      (statusFilter === "in_review" && driver.verificationStatus === "IN_REVIEW") ||
      (statusFilter === "unverified" && driver.verificationStatus === "UNVERIFIED") ||
      (statusFilter === "no_vehicle" && driver.contracts.length === 0)

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden pb-24">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Drivers</h1>
          <p className="text-muted-foreground mt-1">Manage driver accounts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="no_vehicle">No Vehicle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 w-full max-w-full">
        {filteredDrivers.map((driver) => (
          <Card key={driver.id} className="min-w-0 overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 min-w-0">
                <div className="flex-1 space-y-1 min-w-0">
                  <h3 className="font-medium truncate">{driver.user.name || "No name"}</h3>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-sm text-muted-foreground min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{driver.user.email}</span>
                    </div>
                    {driver.user.phone && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{driver.user.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                  {/* Mobile: Show vehicle info */}
                  {driver.contracts.length > 0 && (
                    <div className="sm:hidden mt-2 pt-2 border-t">
                      <div className="text-sm">
                        <p className="font-medium">
                          {driver.contracts[0].vehicle.make} {driver.contracts[0].vehicle.model}
                        </p>
                        <p className="text-muted-foreground">{driver.contracts[0].vehicle.reg}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    {driver.contracts.length > 0 ? (
                      <div className="text-sm">
                        <p className="font-medium truncate max-w-[150px]">
                          {driver.contracts[0].vehicle.make} {driver.contracts[0].vehicle.model}
                        </p>
                        <p className="text-muted-foreground truncate">{driver.contracts[0].vehicle.reg}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No vehicle assigned</span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8}>
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/drivers/${driver.id}`)}
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

        {filteredDrivers.length === 0 && drivers.length > 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No drivers match your search criteria.</p>
            </CardContent>
          </Card>
        )}

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
                    <p className="text-sm text-green-900 font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Driver Created ✅
                    </p>
                    <p className="text-sm text-green-700 mb-2">
                      An activation link is ready. Send it to the driver via WhatsApp/SMS.
                    </p>
                    <p className="text-xs text-green-700 mb-2">
                      Email sent to: <strong>{createdDriverEmail || formData.email}</strong>
                    </p>
                    <p className="text-xs text-green-700">
                      Note: Email delivery may land in Spam folder. You can also copy the link below.
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
                        Copy Activation Link
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          if (createdDriverEmail) {
                            setResendingEmail(createdDriverEmail)
                            try {
                              const res = await fetch("/api/admin/drivers/resend-activation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: createdDriverEmail }),
                              })
                              const data = await res.json()
                              if (data.emailSent) {
                                toast.success("Activation email resent successfully")
                              } else {
                                toast.info("Email sending delayed, but you can still use the link below")
                              }
                            } catch (error) {
                              toast.error("Failed to resend email")
                            } finally {
                              setResendingEmail(null)
                            }
                          }
                        }}
                        disabled={!!resendingEmail}
                      >
                        {resendingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <MailCheck className="mr-2 h-3 w-3" />
                            Resend Email
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md space-y-3">
                  <div>
                    <p className="text-sm text-yellow-900 font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Driver Created ✅
                    </p>
                    <p className="text-sm text-yellow-700 mb-2">
                      An activation link is ready. Send it to the driver via WhatsApp/SMS.
                    </p>
                    <p className="text-xs text-yellow-700 mb-2">
                      Email delivery may land in Spam folder.
                    </p>
                    {/* Technical details - hidden by default, only for admins */}
                    {emailErrorTechnical && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-yellow-800 font-medium hover:text-yellow-900 underline">
                          Technical Details
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
                        Copy Activation Link
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          if (createdDriverEmail) {
                            setResendingEmail(createdDriverEmail)
                            try {
                              const res = await fetch("/api/admin/drivers/resend-activation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: createdDriverEmail }),
                              })
                              const data = await res.json()
                              if (data.emailSent) {
                                toast.success("Activation email sent successfully")
                                setEmailSent(true)
                              } else {
                                toast.info("Email sending delayed, but you can still use the link below")
                              }
                            } catch (error) {
                              toast.error("Failed to resend email")
                            } finally {
                              setResendingEmail(null)
                            }
                          }
                        }}
                        disabled={!!resendingEmail}
                      >
                        {resendingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <MailCheck className="mr-2 h-3 w-3" />
                            Resend Email
                          </>
                        )}
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
                  setCreatedDriverEmail(null)
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
