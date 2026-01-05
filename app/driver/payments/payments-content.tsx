"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, CheckCircle2, AlertCircle } from "lucide-react"

type Payment = {
  id: string
  amountCents: number
  dueDate: string
  status: string
  paidAt: string | null
  contract: {
    vehicle: {
      reg: string
      make: string
      model: string
    }
  }
}

export default function DriverPaymentsContent() {
  const searchParams = useSearchParams()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()

    // Show success message if redirected from Stripe
    if (searchParams.get("status") === "success") {
      setTimeout(() => {
        fetchPayments()
      }, 2000)
    }
  }, [searchParams])

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/driver/payments")
      const data = await res.json()
      setPayments(data)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (paymentId: string) => {
    setPayingId(paymentId)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Failed to create payment session")
        setPayingId(null)
      }
    } catch (error) {
      console.error("Payment error:", error)
      setPayingId(null)
    }
  }

  const formatCurrency = (cents: number) => `R ${(cents / 100).toFixed(2)}`

  const isOverdue = (payment: Payment) => {
    return payment.status === "PENDING" && new Date(payment.dueDate) < new Date()
  }

  const pendingPayments = payments.filter((p) => p.status === "PENDING")
  const paidPayments = payments.filter((p) => p.status === "PAID")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">View and pay your rental fees</p>
      </div>

      {searchParams.get("status") === "success" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Payment Successful</p>
                <p className="text-sm text-green-700">Your payment has been processed successfully</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Due Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className={`p-4 rounded-lg border-2 ${isOverdue(payment) ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">
                      {payment.contract.vehicle.make} {payment.contract.vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">{payment.contract.vehicle.reg}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(payment.amountCents)}</p>
                    {isOverdue(payment) && (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-1">
                        <AlertCircle className="h-3 w-3" />
                        OVERDUE
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(payment.dueDate).toLocaleDateString()}
                  </div>

                  <Button onClick={() => handlePay(payment.id)} disabled={payingId === payment.id} size="sm">
                    {payingId === payment.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Pay Now"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paidPayments.length > 0 ? (
            <div className="space-y-3">
              {paidPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                  <div>
                    <p className="font-medium text-sm">
                      {payment.contract.vehicle.make} {payment.contract.vehicle.model}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        Paid: {payment.paidAt && new Date(payment.paidAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <p className="font-bold">{formatCurrency(payment.amountCents)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No payment history yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
