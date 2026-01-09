import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { formatZARFromCents } from "@/lib/money"
import { buildContractBody } from "@/lib/contracts/contractText"
import { ContractStatus } from "@prisma/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PrintButton } from "./print-button"

export default async function ContractPreviewPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  await requireAdmin()

  const { contractId } = await params

  const contract = await prisma.rentalContract.findUnique({
    where: { id: contractId },
    include: {
        driver: {
          select: {
            id: true,
            idNumber: true,
            driverLicenseNumber: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            province: true,
            postalCode: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            reg: true,
            make: true,
            model: true,
            year: true,
            vin: true,
            color: true,
          },
        },
    },
  })

  if (!contract) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="p-6">Contract not found</CardContent>
        </Card>
      </div>
    )
  }

  // Company settings (safe defaults)
  const company = {
    name: await getSetting("company.name", "FleetHub"),
    email: await getSetting("company.email", ""),
    phone: await getSetting("company.phone", ""),
    address: await getSetting("company.address", ""),
    regNumber: await getSetting("company.regNumber", ""),
  }

  // Build driver full name
  const driverFullName = contract.driver.user.name || contract.driver.user.email || "Driver"

  // Build driver address from parts
  const addressParts = [
    contract.driver.addressLine1,
    contract.driver.addressLine2,
    contract.driver.city,
    contract.driver.province,
    contract.driver.postalCode,
  ].filter(Boolean)
  const driverAddress = addressParts.length > 0 ? addressParts.join(", ") : null

  const driver = {
    fullName: driverFullName,
    idNumber: contract.driver.idNumber ?? null,
    email: contract.driver.user.email ?? null,
    phone: contract.driver.user.phone ?? null,
    address: driverAddress,
    driverLicense: contract.driver.driverLicenseNumber ?? null,
  }

  const vehicle = {
    registration: contract.vehicle.reg,
    make: contract.vehicle.make,
    model: contract.vehicle.model,
    year: contract.vehicle.year ?? null,
    vin: contract.vehicle.vin ?? null,
    color: contract.vehicle.color ?? null,
  }

  // Convert feeAmountCents to rands for the contract builder
  const rentalFeeInRands = contract.feeAmountCents / 100

  const body = buildContractBody({
    company,
    driver,
    vehicle,
    contract: {
      rentalFee: rentalFeeInRands,
      paymentFrequency: contract.frequency,
      startDate: contract.startDate,
      endDate: contract.endDate ?? null,
      deposit: null, // Not in schema yet
      lateFeePercent: null, // Not in schema yet
      dueWeekday: contract.dueWeekday ?? null,
      dueDayOfMonth: contract.dueDayOfMonth ?? null,
    },
  })

  const statusLabel = String(contract.status)

  return (
    <div className="mx-auto max-w-5xl p-6 print-area">
      <div className="mb-4 flex items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-semibold">Vehicle Rental Agreement</h1>
          <p className="text-sm text-muted-foreground">This is the agreement the driver will sign</p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/contracts">Back to Contracts</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Document header */}
      <Card className="overflow-hidden print-area">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-lg">{company.name || "FleetHub"}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {company.address ? <div>{company.address}</div> : null}
                {company.email ? <div>{company.email}</div> : null}
                {company.phone ? <div>{company.phone}</div> : null}
              </div>
            </div>

            <div className="text-right text-sm">
              <div className="font-medium">Agreement status</div>
              <div className="text-muted-foreground">{statusLabel}</div>
              <div className="mt-2 font-medium">Start date</div>
              <div className="text-muted-foreground">
                {new Date(contract.startDate).toLocaleDateString("en-ZA")}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Key details grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Driver</div>
              <div className="mt-1 text-sm font-medium">{driver.fullName}</div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div>ID/Passport: {driver.idNumber ?? "—"}</div>
                {driver.driverLicense && <div>Driver's License: {driver.driverLicense}</div>}
                <div>Email: {driver.email ?? "—"}</div>
                <div>Phone: {driver.phone ?? "—"}</div>
                <div>Address: {driver.address ?? "—"}</div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Vehicle</div>
              <div className="mt-1 text-sm font-medium">
                {vehicle.registration} — {vehicle.make} {vehicle.model}
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div>Year: {vehicle.year ?? "—"}</div>
                {vehicle.vin && <div>VIN: {vehicle.vin}</div>}
                {vehicle.color && <div>Colour: {vehicle.color}</div>}
              </div>
            </div>
          </div>

          {/* Rental summary */}
          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Rental Fee</div>
                <div className="text-lg font-semibold">
                  {formatZARFromCents(contract.feeAmountCents)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {String(contract.frequency).toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Contract ID: <span className="font-mono">{contract.id}</span>
              </div>
            </div>
          </div>

          {/* The actual contract "document" */}
          <div className="mt-6">
            <div className="text-sm font-semibold">Terms & Conditions</div>
            <div className="mt-2 rounded-lg border bg-white p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 font-sans">
                {body}
              </pre>

              {/* Signature blocks */}
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-px bg-border" />
                  <div className="text-sm font-medium">Company Representative</div>
                  <div className="text-xs text-muted-foreground">
                    Name: ______________________ <br />
                    Signature: __________________ <br />
                    Date: _______________________
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-px bg-border" />
                  <div className="text-sm font-medium">Driver</div>
                  <div className="text-xs text-muted-foreground">
                    Name: {driver.fullName} <br />
                    Signature: __________________ <br />
                    Date: _______________________
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Helpful note for admins */}
          {contract.status === ContractStatus.DRAFT ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm no-print">
              <span className="font-medium">Draft:</span> You can still edit this contract before sending it to the driver.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
