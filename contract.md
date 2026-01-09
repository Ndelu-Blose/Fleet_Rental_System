Yes — for non-technical users, the preview should look like a **real contract document**, not a “card with a text box”.

Below is a **complete implementation pack** to upgrade your **Contract Preview** into a proper, print-ready contract with:

* Company details (from settings)
* Driver full details (name, ID/passport, phone, email, address)
* Vehicle full details (make/model, reg, VIN, year, colour)
* Contract terms section with placeholders filled (driver name + vehicle details inside the text)
* Signature blocks (Admin/Company + Driver)
* Buttons: **Print / Download PDF later / Back**
* Works even when opened in a new tab (Back fallback)

---

## 1) Create a reusable “contract text builder”

### Create: `lib/contracts/contractText.ts`

```ts
import { formatZAR } from "@/lib/money"

type Company = {
  name?: string
  email?: string
  phone?: string
  address?: string
}

type Driver = {
  fullName: string
  idNumber?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

type Vehicle = {
  registration: string
  make: string
  model: string
  year?: number | null
  vin?: string | null
  color?: string | null
}

type Contract = {
  rentalFee: number
  paymentFrequency: string
  startDate: Date
}

export function buildContractBody(args: {
  company: Company
  driver: Driver
  vehicle: Vehicle
  contract: Contract
}) {
  const { company, driver, vehicle, contract } = args

  const startDate = contract.startDate.toLocaleDateString("en-ZA")
  const fee = formatZAR(contract.rentalFee)

  return `
VEHICLE RENTAL AGREEMENT

This Vehicle Rental Agreement ("Agreement") is entered into between:

1) Company (Lessor): ${company.name ?? "FleetHub"} 
   Email: ${company.email ?? "—"}
   Phone: ${company.phone ?? "—"}
   Address: ${company.address ?? "—"}

AND

2) Driver (Lessee): ${driver.fullName}
   ID/Passport: ${driver.idNumber ?? "—"}
   Email: ${driver.email ?? "—"}
   Phone: ${driver.phone ?? "—"}
   Address: ${driver.address ?? "—"}

VEHICLE DETAILS
- Registration: ${vehicle.registration}
- Make & Model: ${vehicle.make} ${vehicle.model}
- Year: ${vehicle.year ?? "—"}
- VIN: ${vehicle.vin ?? "—"}
- Colour: ${vehicle.color ?? "—"}

RENTAL TERMS
- Rental fee: ${fee} (${contract.paymentFrequency.toUpperCase()})
- Start date: ${startDate}

DRIVER RESPONSIBILITIES
1. Pay the rental fee on time as agreed.
2. Keep the vehicle in good condition and report any issues immediately.
3. Use the vehicle lawfully and responsibly.
4. Return the vehicle in the same condition (normal wear and tear excepted).
5. The driver is responsible for fines/penalties during the rental period.

DEFAULT / TERMINATION
- Failure to comply may result in contract termination.
- The company may end the contract if payments are overdue or the vehicle is misused.

SIGNATURES
By signing below, both parties agree to the terms of this agreement.
  `.trim()
}
```

---

## 2) Upgrade the preview page to a real “document layout”

### Update: `app/admin/contracts/[contractId]/preview/page.tsx`

This assumes you already fetch the contract. Replace the UI with this structured one.

```tsx
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { formatZAR } from "@/lib/money"
import { buildContractBody } from "@/lib/contracts/contractText"
import { ContractStatus } from "@prisma/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ContractPreviewPage({
  params,
}: {
  params: { contractId: string }
}) {
  await requireAdmin()

  const contract = await prisma.rentalContract.findUnique({
    where: { id: params.contractId },
    include: {
      driver: true,
      vehicle: true,
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
  }

  const driverFullName =
    (contract.driver as any)?.fullName ??
    `${(contract.driver as any)?.firstName ?? ""} ${(contract.driver as any)?.lastName ?? ""}`.trim() ||
    "Driver"

  const driver = {
    fullName: driverFullName,
    idNumber: (contract.driver as any)?.idNumber ?? null,
    email: (contract.driver as any)?.email ?? null,
    phone: (contract.driver as any)?.phone ?? null,
    address: (contract.driver as any)?.address ?? null,
  }

  const vehicle = {
    registration: (contract.vehicle as any)?.registration ?? (contract.vehicle as any)?.plateNumber ?? "—",
    make: (contract.vehicle as any)?.make ?? "—",
    model: (contract.vehicle as any)?.model ?? "—",
    year: (contract.vehicle as any)?.year ?? null,
    vin: (contract.vehicle as any)?.vin ?? null,
    color: (contract.vehicle as any)?.color ?? null,
  }

  const body = buildContractBody({
    company,
    driver,
    vehicle,
    contract: {
      rentalFee: Number(contract.rentalFee),
      paymentFrequency: String(contract.paymentFrequency),
      startDate: new Date(contract.startDate),
    },
  })

  const statusLabel = String(contract.status)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contract Preview</h1>
          <p className="text-sm text-muted-foreground">Read-only preview of contract details</p>
        </div>

        <div className="flex items-center gap-2">
          {/* IMPORTANT: don’t rely on router.back for new tabs */}
          <Button asChild variant="outline">
            <Link href="/admin/contracts">Back to Contracts</Link>
          </Button>

          <Button
            onClick={() => {
              "use client"
            }}
            className="hidden"
          >
            {/* placeholder to keep file server-safe */}
          </Button>

          {/* Print uses a client component below */}
          <PrintButton />
        </div>
      </div>

      {/* Document header */}
      <Card className="overflow-hidden">
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
                <div>VIN: {vehicle.vin ?? "—"}</div>
                <div>Colour: {vehicle.color ?? "—"}</div>
              </div>
            </div>
          </div>

          {/* Rental summary */}
          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Rental Fee</div>
                <div className="text-lg font-semibold">
                  {formatZAR(Number(contract.rentalFee))}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {String(contract.paymentFrequency).toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Contract ID: <span className="font-mono">{contract.id}</span>
              </div>
            </div>
          </div>

          {/* The actual contract “document” */}
          <div className="mt-6">
            <div className="text-sm font-semibold">Terms & Conditions</div>
            <div className="mt-2 rounded-lg border bg-white p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
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
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <span className="font-medium">Draft:</span> You can still edit this contract before sending it to the driver.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Client Print button (kept in same file for simplicity)
 * If you prefer, move to components.
 */
function PrintButton() {
  "use client"
  return (
    <Button
      onClick={() => window.print()}
      variant="default"
    >
      Print
    </Button>
  )
}
```

✅ Result: The preview will now show:

* Driver details (inside the contract + also in the top detail cards)
* Vehicle details (inside the contract + also in the top detail cards)
* A proper agreement layout
* Print-ready output

---

## 3) Make it look like a real printed document when printing

### Add (optional but recommended) to: `app/globals.css`

```css
@media print {
  nav, header, footer, .no-print {
    display: none !important;
  }
  body {
    background: white !important;
  }
  .print-area {
    box-shadow: none !important;
    border: none !important;
  }
}
```

Then add `print-area` class to the card container if you want.

---

## 4) (Optional) Add more “full details” if your DB has them

If your Prisma schema includes these fields, add them:

Driver extras:

* Driver license number
* License expiry date
* Next of kin
* Emergency contact

Vehicle extras:

* Insurance expiry
* Roadworthy expiry
* Odometer at handover

Add these in:

* the top “Driver” and “Vehicle” cards
* and the `buildContractBody()` string

---

## 5) Why this is better for non-technical users

* It matches what they expect a “contract” to look like
* Clear sections (Driver, Vehicle, Payment, Terms, Signatures)
* One-click printing (for physical signing)
* No “developer vibe” UI

-Got you. The current text is “placeholder-y”. Let’s make it feel like a **real South African vehicle rental agreement** (clear sections, proper wording, dates, parties, signatures, payment rules, late fees, handover/return condition, insurance, fines, POPIA, disputes, etc.).

Below is a **drop-in upgrade** you can paste in, and it will automatically insert the **driver name + vehicle details + fee + dates** into the agreement.

> Quick note: I’m not a lawyer — this is a strong professional template, but if you want it “court-ready”, you should have a legal person review it once.

---

## 1) Replace your contract builder with a “real agreement”

### Update: `lib/contracts/contractText.ts`

```ts
import { formatZAR } from "@/lib/money"

type Company = {
  name?: string
  email?: string
  phone?: string
  address?: string
  regNumber?: string
}

type Driver = {
  fullName: string
  idNumber?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  driverLicense?: string | null
}

type Vehicle = {
  registration: string
  make: string
  model: string
  year?: number | null
  vin?: string | null
  color?: string | null
}

type Contract = {
  rentalFee: number
  paymentFrequency: string
  startDate: Date
  endDate?: Date | null
  deposit?: number | null
  lateFeePercent?: number | null // e.g. 5 means 5%
}

function fmtDate(d?: Date | null) {
  if (!d) return "—"
  return d.toLocaleDateString("en-ZA")
}

function upper(v: string) {
  return (v || "").toUpperCase()
}

export function buildContractBody(args: {
  company: Company
  driver: Driver
  vehicle: Vehicle
  contract: Contract
}) {
  const { company, driver, vehicle, contract } = args

  const fee = formatZAR(contract.rentalFee)
  const deposit = contract.deposit ? formatZAR(contract.deposit) : "R 0.00"
  const lateFeePercent = contract.lateFeePercent ?? 0

  const startDate = fmtDate(contract.startDate)
  const endDate = fmtDate(contract.endDate ?? null)
  const freq = upper(contract.paymentFrequency || "WEEKLY")

  const companyName = company.name ?? "FleetHub"
  const companyEmail = company.email ?? "—"
  const companyPhone = company.phone ?? "—"
  const companyAddress = company.address ?? "—"
  const companyReg = company.regNumber ? `Reg No: ${company.regNumber}` : ""

  const driverId = driver.idNumber ?? "—"
  const driverEmail = driver.email ?? "—"
  const driverPhone = driver.phone ?? "—"
  const driverAddress = driver.address ?? "—"
  const driverLicense = driver.driverLicense ?? "—"

  const vehicleYear = vehicle.year ?? "—"
  const vehicleVin = vehicle.vin ?? "—"
  const vehicleColor = vehicle.color ?? "—"

  return `
VEHICLE RENTAL AGREEMENT (“Agreement”)

1. PARTIES
This Agreement is entered into on the Start Date below, between:

1.1 Lessor (Company):
${companyName} ${companyReg}
Email: ${companyEmail}
Phone: ${companyPhone}
Address: ${companyAddress}

1.2 Lessee (Driver):
Full Name: ${driver.fullName}
ID/Passport: ${driverId}
Driver’s Licence: ${driverLicense}
Email: ${driverEmail}
Phone: ${driverPhone}
Residential Address: ${driverAddress}

2. VEHICLE DETAILS
Registration: ${vehicle.registration}
Make/Model: ${vehicle.make} ${vehicle.model}
Year: ${vehicleYear}
VIN/Chassis: ${vehicleVin}
Colour: ${vehicleColor}

3. TERM
3.1 Start Date: ${startDate}
3.2 End Date (if applicable): ${endDate}
3.3 If no End Date is specified, the Agreement continues until terminated in terms of Clause 12.

4. RENTAL FEE & PAYMENT
4.1 Rental Fee: ${fee} per ${freq}.
4.2 Deposit (if applicable): ${deposit}. The deposit may be applied to unpaid fees, damages, cleaning, penalties or losses.
4.3 Payment Due Date: Payments are due in advance each ${freq} cycle unless otherwise agreed in writing.
4.4 Payment Method: As configured in the FleetHub system or as instructed by the Company.
4.5 Late Payment: If payment is overdue, the Company may:
   (a) restrict access to the vehicle; and/or
   (b) suspend the rental; and/or
   (c) terminate the Agreement.
4.6 Late Fee: If enabled, a late fee of ${lateFeePercent}% may be added on overdue amounts (subject to applicable law and company policy).

5. HANDOVER, CONDITION & RETURN
5.1 Handover: The vehicle is handed over to the Driver in good working order unless otherwise recorded.
5.2 Driver Inspection: The Driver must inspect the vehicle at handover and report any existing damage within 24 hours.
5.3 Return Condition: The Driver must return the vehicle:
   (a) in the same condition as received (fair wear and tear excepted);
   (b) with all keys, accessories, and documents provided; and
   (c) reasonably clean (or cleaning fees may apply).
5.4 The Company may inspect the vehicle upon return and charge for damage, missing items, repairs, towing or cleaning.

6. DRIVER OBLIGATIONS
6.1 The Driver must:
   (a) keep the vehicle secure and roadworthy;
   (b) use the vehicle lawfully and responsibly;
   (c) immediately report accidents, theft, breakdowns or defects;
   (d) not overload the vehicle or use it for illegal activity; and
   (e) not allow an unauthorised person to drive the vehicle.
6.2 The Driver must comply with all road traffic laws and regulations.

7. FINES, TOLLS & OFFENCES
7.1 The Driver is responsible for all fines, penalties, tolls, and offences incurred during the rental period.
7.2 The Company may recover these costs from the Driver and/or deduct from the deposit where applicable.

8. MAINTENANCE & REPAIRS
8.1 The Driver must not repair or modify the vehicle without written approval.
8.2 Emergency repairs required for safe operation must be reported immediately and supported by receipts.
8.3 The Driver will be liable for repairs caused by misuse, negligence or unauthorised repairs.

9. INSURANCE & RISK
9.1 Where insurance applies, it is subject to the insurer’s terms and conditions.
9.2 The Driver remains responsible for:
   (a) excess payments (if applicable),
   (b) damages not covered by insurance, and
   (c) losses caused by negligence, reckless driving, or breach of this Agreement.

10. LOSS, THEFT OR ACCIDENT
10.1 The Driver must report theft/accident immediately to:
   (a) the Company; and
   (b) SAPS (where required), and obtain a case number.
10.2 The Driver must cooperate with claims, statements, and investigations.

11. PROHIBITED USE
The Driver may not:
(a) use the vehicle for racing, reckless driving, or off-road misuse (unless agreed);
(b) carry illegal goods;
(c) sub-rent the vehicle; or
(d) tamper with tracking devices (if installed).

12. TERMINATION
12.1 The Company may terminate immediately if:
   (a) payments are overdue,
   (b) the vehicle is misused or unlawfully used,
   (c) the vehicle is not returned when requested,
   (d) the Driver breaches material terms of this Agreement.
12.2 Upon termination, the Driver must return the vehicle immediately.

13. LIMITATION OF LIABILITY
13.1 To the extent permitted by law, the Company is not liable for:
   (a) loss of income, indirect damages, or consequential loss; or
   (b) personal items left in the vehicle.
13.2 Nothing limits liability that cannot be limited under applicable law.

14. POPIA (DATA PRIVACY)
14.1 The Company may process the Driver’s personal information for:
   (a) contract administration,
   (b) payment management,
   (c) verification and compliance,
   (d) legal and safety purposes.
14.2 The Company will take reasonable steps to protect personal data.

15. DISPUTES & GOVERNING LAW
15.1 This Agreement is governed by the laws of the Republic of South Africa.
15.2 Parties will attempt to resolve disputes amicably before legal action.

16. ENTIRE AGREEMENT
16.1 This document and the FleetHub record constitute the entire agreement.
16.2 Any amendments must be in writing or recorded in the FleetHub system and accepted by both parties.

SIGNATURES

Company Representative (Lessor)
Name: ______________________________
Signature: __________________________
Date: _______________________________

Driver (Lessee)
Name: ${driver.fullName}
Signature: __________________________
Date: _______________________________
`.trim()
}
```

---

## 2) Small but important UX improvement for “non-tech” users

In your Preview page, label the contract area like a document:

* Title: **“Vehicle Rental Agreement”**
* Add a small note: **“This is the agreement the driver will sign”**
* Add buttons: **Print**, **Back to Contracts**, **Send to Driver**

---

## 3) What else will make it feel *real* (recommended)

If you want it to look 10/10 professional, add these sections (I can wire them once you confirm the fields):

1. **Payment instructions** (bank details / Payfast / Stripe reference)
2. **Vehicle handover checklist** (fuel level, mileage, photos, existing scratches)
3. **Driver emergency contact**
4. **Insurance details** (provider, policy number, excess)
5. **Rules for repo / vehicle collection** (if payment overdue)

---

## Quick question (so I don’t guess wrong)

Do you want the rental fee stored as:

* **Rands (e.g., 2000)**, OR
* **Cents (e.g., 200000)**?

Because that’s the reason you saw weird formatting earlier (2000 became 2,000.00 *or* looked like 20,000 depending on whether your UI multiplied by 100).

If you tell me which one your DB uses, I’ll lock the formatting everywhere (dashboard, contracts list, preview, payments) so it’s consistent.
