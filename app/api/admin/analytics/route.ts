import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    // Financial metrics
    const allPayments = await prisma.payment.findMany({
      include: {
        contract: true,
      },
    })

    const totalPaid = allPayments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amountCents, 0)

    const totalPending = allPayments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amountCents, 0)

    const now = new Date()
    const totalOverdue = allPayments
      .filter((p) => p.status === "PENDING" && new Date(p.dueDate) < now)
      .reduce((sum, p) => sum + p.amountCents, 0)

    // Vehicle metrics
    const vehicles = await prisma.vehicle.findMany({
      include: {
        compliance: true,
      },
    })

    const vehiclesByStatus = {
      AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
      ASSIGNED: vehicles.filter((v) => v.status === "ASSIGNED").length,
      MAINTENANCE: vehicles.filter((v) => v.status === "MAINTENANCE").length,
      INACTIVE: vehicles.filter((v) => v.status === "INACTIVE").length,
    }

    // Contract metrics
    const contracts = await prisma.rentalContract.findMany()
    const activeContracts = contracts.filter((c) => c.status === "ACTIVE").length

    // Driver metrics
    const drivers = await prisma.driverProfile.findMany()
    const verifiedDrivers = drivers.filter((d) => d.verificationStatus === "VERIFIED").length
    const pendingVerification = drivers.filter((d) => d.verificationStatus === "IN_REVIEW").length

    // Compliance alerts
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const complianceAlerts = vehicles
      .filter((v) => v.compliance)
      .flatMap((v) => {
        const alerts = []

        if (v.compliance!.licenseExpiry) {
          const expiry = new Date(v.compliance!.licenseExpiry)
          if (expiry <= thirtyDaysFromNow) {
            alerts.push({
              vehicleId: v.id,
              vehicleReg: v.reg,
              type: "LICENSE",
              expiryDate: v.compliance!.licenseExpiry,
              daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            })
          }
        }

        if (v.compliance!.insuranceExpiry) {
          const expiry = new Date(v.compliance!.insuranceExpiry)
          if (expiry <= thirtyDaysFromNow) {
            alerts.push({
              vehicleId: v.id,
              vehicleReg: v.reg,
              type: "INSURANCE",
              expiryDate: v.compliance!.insuranceExpiry,
              daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            })
          }
        }

        if (v.compliance!.roadworthyExpiry) {
          const expiry = new Date(v.compliance!.roadworthyExpiry)
          if (expiry <= thirtyDaysFromNow) {
            alerts.push({
              vehicleId: v.id,
              vehicleReg: v.reg,
              type: "ROADWORTHY",
              expiryDate: v.compliance!.roadworthyExpiry,
              daysUntil: Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            })
          }
        }

        return alerts
      })

    // Maintenance alerts
    const upcomingMaintenance = await prisma.vehicleMaintenance.findMany({
      where: {
        status: "PLANNED",
        scheduledAt: {
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        vehicle: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    })

    // Recent activity
    const recentPayments = await prisma.payment.findMany({
      where: {
        status: "PAID",
      },
      include: {
        contract: {
          include: {
            driver: {
              include: {
                user: true,
              },
            },
            vehicle: true,
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
      take: 5,
    })

    // Driver performance (payment reliability)
    const driverPerformance = await prisma.driverProfile.findMany({
      where: {
        contracts: {
          some: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        user: true,
        contracts: {
          where: {
            status: "ACTIVE",
          },
          include: {
            payments: true,
          },
        },
      },
    })

    const driverStats = driverPerformance.map((driver) => {
      const allPayments = driver.contracts.flatMap((c) => c.payments)
      const totalPayments = allPayments.length
      const paidOnTime = allPayments.filter((p) => {
        if (p.status !== "PAID" || !p.paidAt) return false
        return new Date(p.paidAt) <= new Date(p.dueDate)
      }).length

      return {
        driverId: driver.id,
        driverName: driver.user.name || driver.user.email,
        totalPayments,
        paidOnTime,
        onTimeRate: totalPayments > 0 ? Math.round((paidOnTime / totalPayments) * 100) : 0,
      }
    })

    // Vehicle costs summary
    const vehicleCosts = await prisma.vehicleCost.findMany({
      where: {
        occurredAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 6, 1), // Last 6 months
        },
      },
      include: {
        vehicle: true,
      },
    })

    const costsByVehicle = vehicleCosts.reduce(
      (acc, cost) => {
        const key = cost.vehicleId
        if (!acc[key]) {
          acc[key] = {
            vehicleId: cost.vehicleId,
            vehicleReg: cost.vehicle.reg,
            totalCostCents: 0,
          }
        }
        acc[key].totalCostCents += cost.amountCents
        return acc
      },
      {} as Record<string, { vehicleId: string; vehicleReg: string; totalCostCents: number }>,
    )

    const topCostVehicles = Object.values(costsByVehicle)
      .sort((a, b) => b.totalCostCents - a.totalCostCents)
      .slice(0, 5)

    return NextResponse.json({
      financial: {
        totalPaid,
        totalPending,
        totalOverdue,
      },
      vehicles: {
        total: vehicles.length,
        byStatus: vehiclesByStatus,
      },
      contracts: {
        active: activeContracts,
        total: contracts.length,
      },
      drivers: {
        total: drivers.length,
        verified: verifiedDrivers,
        pendingVerification,
      },
      alerts: {
        compliance: complianceAlerts,
        maintenance: upcomingMaintenance,
      },
      recentPayments,
      driverPerformance: driverStats,
      vehicleCosts: topCostVehicles,
    })
  } catch (error) {
    console.error("[v0] Get analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
