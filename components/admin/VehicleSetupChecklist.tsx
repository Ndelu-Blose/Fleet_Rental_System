"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import Link from "next/link"

interface VehicleSetupChecklistProps {
  vehicle: {
    id: string
    reg: string
    type: string
    status: string
    documents: Array<{ type: string }>
    compliance: {
      licenseExpiry: string | null
      insuranceExpiry: string | null
      roadworthyExpiry: string | null
    } | null
    contracts: Array<{
      id: string
      status: string
      driverSignedAt: string | null
      signedPdfPath: string | null
      createdAt: string
    }>
  }
}

export function VehicleSetupChecklist({ vehicle }: VehicleSetupChecklistProps) {
  // Find latest relevant contract (exclude ENDED/CANCELLED)
  const latestContract = vehicle.contracts.find(
    (c) => !["ENDED", "CANCELLED"].includes(c.status)
  ) ?? null

  // Required document types based on vehicle type
  const requiredDocs =
    vehicle.type === "CAR" ? ["LICENSE", "ROADWORTHY", "INSURANCE"] : ["LICENSE", "INSURANCE"] // Bike may not need roadworthy

  const hasRequiredDocs = requiredDocs.every((docType) =>
    vehicle.documents.some((d) => d.type === docType)
  )

  // Step 1: Vehicle details captured (always complete - vehicle exists)
  const step1Complete = true

  // Step 2: Vehicle compliance docs uploaded
  const step2Complete = hasRequiredDocs

  // Step 3: Driver selected
  const step3Complete = latestContract !== null

  // Step 4: Contract created
  const step4Complete = latestContract !== null && latestContract.status !== undefined

  // Step 5: Sent to driver
  const step5Complete =
    latestContract !== null &&
    ["SENT_TO_DRIVER", "DRIVER_SIGNED", "SIGNED_BY_DRIVER", "ACTIVE"].includes(latestContract.status)

  // Step 6: Driver signed
  const step6Complete =
    latestContract !== null &&
    (latestContract.driverSignedAt !== null ||
      ["DRIVER_SIGNED", "SIGNED_BY_DRIVER", "ACTIVE"].includes(latestContract.status))

  // Step 7: Admin activated + PDF generated
  const step7Complete =
    latestContract !== null &&
    latestContract.status === "ACTIVE" &&
    latestContract.signedPdfPath !== null

  // Step 8: Vehicle assigned
  const step8Complete = vehicle.status === "ASSIGNED"

  const steps = [
    {
      id: 1,
      label: "Vehicle details captured",
      complete: step1Complete,
      inProgress: false,
      action: null,
    },
    {
      id: 2,
      label: "Vehicle compliance docs uploaded",
      complete: step2Complete,
      inProgress: false,
      action: step2Complete
        ? null
        : {
            label: "Upload Docs",
            href: `/admin/vehicles/${vehicle.id}?tab=documents`,
          },
    },
    {
      id: 3,
      label: "Driver selected",
      complete: step3Complete,
      inProgress: false,
      action: step3Complete
        ? null
        : {
            label: "Create Contract",
            href: `/admin/contracts?vehicleId=${vehicle.id}`,
          },
    },
    {
      id: 4,
      label: "Contract created",
      complete: step4Complete,
      inProgress: false,
      action: step4Complete
        ? null
        : {
            label: "Create Contract",
            href: `/admin/contracts?vehicleId=${vehicle.id}`,
          },
    },
    {
      id: 5,
      label: "Sent to driver",
      complete: step5Complete,
      inProgress: latestContract?.status === "DRAFT",
      action: step5Complete
        ? null
        : latestContract && latestContract.status === "DRAFT"
          ? {
              label: "Send to Driver",
              href: `/admin/contracts?vehicleId=${vehicle.id}`,
            }
          : null,
    },
    {
      id: 6,
      label: "Driver signed",
      complete: step6Complete,
      inProgress:
        latestContract !== null &&
        ["SENT_TO_DRIVER", "SENT"].includes(latestContract.status),
      action: step6Complete
        ? null
        : latestContract && ["SENT_TO_DRIVER", "SENT"].includes(latestContract.status)
          ? {
              label: "Remind Driver",
              href: `/admin/contracts?vehicleId=${vehicle.id}`,
            }
          : null,
    },
    {
      id: 7,
      label: "Admin activated + PDF generated",
      complete: step7Complete,
      inProgress:
        latestContract !== null &&
        ["DRIVER_SIGNED", "SIGNED_BY_DRIVER"].includes(latestContract.status),
      action: step7Complete
        ? null
        : latestContract && ["DRIVER_SIGNED", "SIGNED_BY_DRIVER"].includes(latestContract.status)
          ? {
              label: "Activate Contract",
              href: `/admin/contracts?vehicleId=${vehicle.id}`,
            }
          : null,
    },
    {
      id: 8,
      label: "Vehicle assigned",
      complete: step8Complete,
      inProgress: false,
      action: step8Complete ? null : null,
    },
  ]

  const completedCount = steps.filter((s) => s.complete).length
  const totalSteps = steps.length
  const nextStep = steps.find((s) => !s.complete)

  // Don't show checklist if all steps are complete
  if (completedCount === totalSteps) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Setup Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount} of {totalSteps} steps completed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center justify-between p-3 rounded-md border ${
              step.complete
                ? "bg-green-50 border-green-200"
                : step.inProgress
                  ? "bg-yellow-50 border-yellow-200"
                  : nextStep?.id === step.id
                    ? "bg-white border-blue-300 border-2"
                    : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {step.complete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : step.inProgress ? (
                <Loader2 className="h-5 w-5 text-yellow-600 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  step.complete
                    ? "text-green-700 font-medium"
                    : step.inProgress
                      ? "text-yellow-700"
                      : "text-gray-700"
                }`}
              >
                {step.label}
              </span>
            </div>
            {step.action && (
              <Button variant="outline" size="sm" asChild>
                <Link href={step.action.href}>{step.action.label}</Link>
              </Button>
            )}
          </div>
        ))}
        {nextStep && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <strong>Next:</strong> {nextStep.label}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
