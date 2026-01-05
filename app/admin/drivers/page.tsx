"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, UserPlus, Mail, Phone } from "lucide-react"

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
        setFormData({ email: "", name: "", phone: "" })
        await fetchDrivers()
      }
    } catch (error) {
      console.error("Failed to create driver:", error)
    } finally {
      setCreating(false)
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
                <div className="space-y-1">
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
                  </div>
                </div>
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
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-900 font-medium mb-2">Driver created successfully!</p>
                <p className="text-xs text-green-700">Activation link (for testing):</p>
                <code className="text-xs bg-white p-2 rounded block mt-2 break-all">{activationLink}</code>
              </div>
              <Button
                onClick={() => {
                  setActivationLink("")
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
    </div>
  )
}
