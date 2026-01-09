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
  rentalFee: number // in rands (will be converted from cents)
  paymentFrequency: string
  startDate: Date
  endDate?: Date | null
  deposit?: number | null
  lateFeePercent?: number | null // e.g. 5 means 5%
  dueWeekday?: number | null // 0-6 (Sunday-Saturday) for WEEKLY payments
  dueDayOfMonth?: number | null // 1-31 for MONTHLY payments
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

  // Format payment due date based on frequency
  let paymentDueDateText = ""
  if (contract.paymentFrequency === "WEEKLY" && contract.dueWeekday !== null && contract.dueWeekday !== undefined) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    paymentDueDateText = `every ${weekdays[contract.dueWeekday]}`
  } else if (contract.paymentFrequency === "MONTHLY" && contract.dueDayOfMonth !== null && contract.dueDayOfMonth !== undefined) {
    const day = contract.dueDayOfMonth
    const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th"
    paymentDueDateText = `on the ${day}${suffix} day of each month`
  } else if (contract.paymentFrequency === "DAILY") {
    paymentDueDateText = "daily"
  } else {
    paymentDueDateText = `each ${freq.toLowerCase()} cycle`
  }

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
VEHICLE RENTAL AGREEMENT ("Agreement")

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
Driver's Licence: ${driverLicense}
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
4.3 Payment Due Date: Payments are due in advance ${paymentDueDateText} unless otherwise agreed in writing.
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
9.1 Where insurance applies, it is subject to the insurer's terms and conditions.
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
14.1 The Company may process the Driver's personal information for:
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
