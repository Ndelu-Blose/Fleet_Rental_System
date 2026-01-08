"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react"
import { toast } from "sonner"

// Dynamic import to prevent SSR issues with react-signature-canvas
const SignaturePad = dynamic(
  () => import("@/components/driver/SignaturePad").then((m) => m.SignaturePad),
  { ssr: false }
)

type Contract = {
  id: string
  status: string
  feeAmountCents: number
  frequency: string
  startDate: string
  endDate: string | null
  termsText: string | null
  driverSignedAt: string | null
  driverSignatureUrl: string | null
  signedPdfUrl: string | null
  vehicle: {
    reg: string
    make: string
    model: string
    year: number | null
  }
}

export default function DriverContractPage() {
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [acceptance, setAcceptance] = useState({
    agreeTerms: false,
    agreePayments: false,
  })

  useEffect(() => {
    fetchContract()
  }, [])

  const fetchContract = async () => {
    try {
      const res = await fetch("/api/driver/contract")
      const data = await res.json()
      if (data && !data.error) {
        setContract(data)
      } else {
        toast.error(data.error || "No contract found")
        router.push("/driver")
      }
    } catch (error) {
      console.error("Failed to fetch contract:", error)
      toast.error("Failed to load contract")
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (signatureDataUrl: string) => {
    if (!contract) return

    if (!acceptance.agreeTerms || !acceptance.agreePayments) {
      toast.error("Please accept all terms before signing")
      return
    }

    setSigning(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}/driver-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          acceptance,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Contract signed successfully!")
        await fetchContract()
      } else {
        toast.error(data.error || "Failed to sign contract")
      }
    } catch (error) {
      console.error("Sign error:", error)
      toast.error("Failed to sign contract")
    } finally {
      setSigning(false)
    }
  }

  const formatCurrency = (cents: number) => `R ${(cents / 100).toFixed(2)}`

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
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No contract found</p>
            <Button onClick={() => router.push("/driver")} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Contract already signed
  if (
    contract.status === "DRIVER_SIGNED" ||
    contract.status === "SIGNED_BY_DRIVER" ||
    contract.status === "ACTIVE"
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contract</h1>
          <p className="text-muted-foreground mt-1">View your rental contract</p>
        </div>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Contract Signed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Vehicle</p>
                <p className="font-medium">
                  {contract.vehicle.reg} - {contract.vehicle.make} {contract.vehicle.model}
                  {contract.vehicle.year && ` (${contract.vehicle.year})`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate</p>
                <p className="font-medium">
                  {formatCurrency(contract.feeAmountCents)} {contract.frequency.toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
              </div>
              {contract.driverSignedAt && (
                <div>
                  <p className="text-muted-foreground">Signed At</p>
                  <p className="font-medium">{new Date(contract.driverSignedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {contract.signedPdfUrl && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => window.open(contract.signedPdfUrl!, "_blank")}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Signed Contract PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Contract needs signing
  if (contract.status === "SENT" || contract.status === "SENT_TO_DRIVER") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sign Contract</h1>
          <p className="text-muted-foreground mt-1">Review and sign your rental contract</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Vehicle</p>
                <p className="font-medium">
                  {contract.vehicle.reg} - {contract.vehicle.make} {contract.vehicle.model}
                  {contract.vehicle.year && ` (${contract.vehicle.year})`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate</p>
                <p className="font-medium">
                  {formatCurrency(contract.feeAmountCents)} {contract.frequency.toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
              </div>
              {contract.endDate && (
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {contract.termsText && (
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                {contract.termsText}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Acceptance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="agreeTerms"
                checked={acceptance.agreeTerms}
                onCheckedChange={(checked) => setAcceptance({ ...acceptance, agreeTerms: checked === true })}
              />
              <Label htmlFor="agreeTerms" className="cursor-pointer">
                I have read and agree to the terms and conditions of this contract
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="agreePayments"
                checked={acceptance.agreePayments}
                onCheckedChange={(checked) => setAcceptance({ ...acceptance, agreePayments: checked === true })}
              />
              <Label htmlFor="agreePayments" className="cursor-pointer">
                I understand and agree to make payments as specified in this contract
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <SignaturePad onSigned={handleSign} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Contract status: {contract.status}</p>
      </CardContent>
    </Card>
  )
}
