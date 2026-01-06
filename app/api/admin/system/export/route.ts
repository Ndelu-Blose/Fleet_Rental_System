import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type ExportType = "vehicles" | "drivers" | "contracts" | "payments";

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "0.00";
  return (cents / 100).toFixed(2);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ExportType;

    if (!type || !["vehicles", "drivers", "contracts", "payments"].includes(type)) {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    let csv = "";
    let filename = "";

    switch (type) {
      case "vehicles": {
        const vehicles = await prisma.vehicle.findMany({
          include: {
            compliance: true,
            _count: {
              select: { contracts: true, maintenance: true, costs: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const headers = [
          "Registration",
          "Type",
          "Make",
          "Model",
          "Year",
          "Status",
          "License Expiry",
          "Insurance Expiry",
          "Roadworthy Expiry",
          "Active Contracts",
          "Maintenance Records",
          "Cost Records",
          "Created At",
        ];

        csv = headers.join(",") + "\n";
        csv += vehicles
          .map((v) =>
            [
              escapeCSV(v.reg),
              escapeCSV(v.type),
              escapeCSV(v.make),
              escapeCSV(v.model),
              escapeCSV(v.year),
              escapeCSV(v.status),
              escapeCSV(formatDate(v.compliance?.licenseExpiry)),
              escapeCSV(formatDate(v.compliance?.insuranceExpiry)),
              escapeCSV(formatDate(v.compliance?.roadworthyExpiry)),
              escapeCSV(v._count.contracts),
              escapeCSV(v._count.maintenance),
              escapeCSV(v._count.costs),
              escapeCSV(formatDate(v.createdAt)),
            ].join(",")
          )
          .join("\n");

        filename = `vehicles-export-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "drivers": {
        const drivers = await prisma.driverProfile.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
                createdAt: true,
              },
            },
            _count: {
              select: { documents: true, contracts: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const headers = [
          "Name",
          "Email",
          "Phone",
          "ID Number",
          "Address",
          "City",
          "Province",
          "Postal Code",
          "Verification Status",
          "Completion %",
          "Documents",
          "Active Contracts",
          "Location Verified",
          "Created At",
        ];

        csv = headers.join(",") + "\n";
        csv += drivers
          .map((d) =>
            [
              escapeCSV(d.user.name),
              escapeCSV(d.user.email),
              escapeCSV(d.user.phone),
              escapeCSV(d.idNumber),
              escapeCSV(d.addressLine1),
              escapeCSV(d.city),
              escapeCSV(d.province),
              escapeCSV(d.postalCode),
              escapeCSV(d.verificationStatus),
              escapeCSV(d.completionPercent),
              escapeCSV(d._count.documents),
              escapeCSV(d._count.contracts),
              escapeCSV(d.lastLocationAt ? "Yes" : "No"),
              escapeCSV(formatDate(d.createdAt)),
            ].join(",")
          )
          .join("\n");

        filename = `drivers-export-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "contracts": {
        const contracts = await prisma.rentalContract.findMany({
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            vehicle: {
              select: {
                reg: true,
                type: true,
                make: true,
                model: true,
              },
            },
            _count: {
              select: { payments: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const headers = [
          "Driver Name",
          "Driver Email",
          "Vehicle Registration",
          "Vehicle Type",
          "Vehicle Make/Model",
          "Fee Amount (R)",
          "Frequency",
          "Due Day",
          "Start Date",
          "End Date",
          "Status",
          "Total Payments",
          "Created At",
        ];

        csv = headers.join(",") + "\n";
        csv += contracts
          .map((c) =>
            [
              escapeCSV(c.driver.user.name),
              escapeCSV(c.driver.user.email),
              escapeCSV(c.vehicle.reg),
              escapeCSV(c.vehicle.type),
              escapeCSV(`${c.vehicle.make} ${c.vehicle.model}`),
              escapeCSV(formatCurrency(c.feeAmountCents)),
              escapeCSV(c.frequency),
              escapeCSV(c.dueWeekday ?? c.dueDayOfMonth ?? ""),
              escapeCSV(formatDate(c.startDate)),
              escapeCSV(formatDate(c.endDate)),
              escapeCSV(c.status),
              escapeCSV(c._count.payments),
              escapeCSV(formatDate(c.createdAt)),
            ].join(",")
          )
          .join("\n");

        filename = `contracts-export-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "payments": {
        const payments = await prisma.payment.findMany({
          include: {
            contract: {
              include: {
                driver: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                vehicle: {
                  select: {
                    reg: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: { dueDate: "desc" },
        });

        const headers = [
          "Driver Name",
          "Driver Email",
          "Vehicle Registration",
          "Vehicle Type",
          "Amount (R)",
          "Due Date",
          "Status",
          "Paid At",
          "Stripe Session ID",
          "Created At",
        ];

        csv = headers.join(",") + "\n";
        csv += payments
          .map((p) =>
            [
              escapeCSV(p.contract.driver.user.name),
              escapeCSV(p.contract.driver.user.email),
              escapeCSV(p.contract.vehicle.reg),
              escapeCSV(p.contract.vehicle.type),
              escapeCSV(formatCurrency(p.amountCents)),
              escapeCSV(formatDate(p.dueDate)),
              escapeCSV(p.status),
              escapeCSV(formatDate(p.paidAt)),
              escapeCSV(p.stripeSessionId),
              escapeCSV(formatDate(p.createdAt)),
            ].join(",")
          )
          .join("\n");

        filename = `payments-export-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

