"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, CheckCircle2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type Payment = {
  id: string
  amountCents: number
  dueDate: string
  status: string
  paidAt: string | null
  isOverdue?: boolean
  contract: {
    id: string
    driver: {
      user: {
        name: string | null
        email: string
      }
    }
    vehicle: {
      reg: string
      make: string
      model: string
    }
  }
}

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Read status from URL query param, default to "all"
  const statusParam = searchParams.get("status")?.toLowerCase()
  const initialFilter = statusParam === "paid" || statusParam === "pending" || statusParam === "overdue" 
    ? statusParam 
    : "all"
  const [filter, setFilter] = useState<string>(initialFilter)

  useEffect(() => {
    fetchPayments()
  }, [])

  // Update filter when URL param changes
  useEffect(() => {
    const status = searchParams.get("status")?.toLowerCase()
    if (status && (status === "paid" || status === "pending" || status === "overdue")) {
      setFilter(status)
    } else if (!status) {
      setFilter("all")
    }
  }, [searchParams])

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments")
      const data = await res.json()
      setPayments(data)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = formatZARFromCents

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700"
      case "OVERDUE":
        return "bg-red-100 text-red-700"
      case "FAILED":
        return "bg-orange-100 text-orange-700"
      default:
        return "bg-yellow-100 text-yellow-700"
    }
  }

  const isOverdue = (payment: Payment) => {
    return payment.isOverdue === true || (payment.status === "PENDING" && new Date(payment.dueDate) < new Date())
  }

  const filterPayments = (status: string) => {
    if (status === "all") return payments
    if (status === "overdue") return payments.filter((p) => isOverdue(p))
    return payments.filter((p) => p.status === status.toUpperCase())
  }

  const handleMarkPaid = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/mark-paid`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to mark payment as paid")
      }

      toast.success("Payment marked as paid ✅")
      await fetchPayments() // Refresh the list
    } catch (error: any) {
      toast.error(error.message || "Failed to mark payment as paid")
    }
  }

  const filteredPayments = filterPayments(filter)

  const stats = {
    total: payments.reduce((sum, p) => sum + (p.status === "PAID" ? p.amountCents : 0), 0),
    pending: payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amountCents, 0),
    overdue: payments.filter((p) => isOverdue(p)).reduce((sum, p) => sum + p.amountCents, 0),
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
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">Track all rental payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {filteredPayments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(isOverdue(payment) ? "OVERDUE" : payment.status)}`}
                      >
                        {isOverdue(payment) ? "OVERDUE" : payment.status}
                      </span>
                      <h3 className="font-medium">
                        {payment.contract.driver.user.name || payment.contract.driver.user.email}
                      </h3>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                      {payment.paidAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Paid: {new Date(payment.paidAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Vehicle: {payment.contract.vehicle.reg} ({payment.contract.vehicle.make}{" "}
                      {payment.contract.vehicle.model})
                    </p>
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-2xl font-bold">{formatCurrency(payment.amountCents)}</p>
                    {payment.status === "PENDING" && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(payment.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <Link href={`/admin/contracts?contract=${payment.contract.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Contract
                          </Link>
                        </Button>
                      </div>
                    )}
                    {payment.status === "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/admin/contracts?contract=${payment.contract.id}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Contract
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPayments.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No {filter} payments</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
