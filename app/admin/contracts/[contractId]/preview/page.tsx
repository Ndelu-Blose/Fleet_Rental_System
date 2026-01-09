"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import { formatZARFromCents } from "@/lib/money"
import { ContractStatus } from "@prisma/client"

type Contract = {
  id: string
  feeAmountCents: number
  frequency: string
  startDate: string
  endDate: string | null
  status: string
  termsText: string | null
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

export default function PreviewContractPage() {
  const params = useParams()
  const contractId = params.contractId as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContract()
  }, [contractId])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`)
      if (!res.ok) {
        throw new Error("Contract not found")
      }
      const data = await res.json()
      setContract(data)
    } catch (error) {
      console.error("Failed to load contract:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="space-y-6">
        <Link href="/admin/contracts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Contract not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/contracts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Contract Preview</h1>
          <p className="text-muted-foreground mt-1">Read-only preview of contract details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Driver</p>
              <p className="font-medium">{contract.driver.user.name || contract.driver.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p className="font-medium">{contract.vehicle.reg} - {contract.vehicle.make} {contract.vehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rental Fee</p>
              <p className="font-medium">{formatZARFromCents(contract.feeAmountCents)} {contract.frequency.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
            </div>
            {contract.endDate && (
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{contract.status}</p>
            </div>
          </div>

          {contract.termsText && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Terms & Conditions</p>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted p-4 rounded-md">
                  {contract.termsText}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
