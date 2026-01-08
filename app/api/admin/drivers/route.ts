import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { withTimeout } from "@/lib/server/timeout"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  // #region agent log
  console.log("[DEBUG] GET /api/admin/drivers entry", { url: req.url, timestamp: Date.now() });
  fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:7',message:'GET /api/admin/drivers entry',data:{url:req.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    const authStart = Date.now();
    console.log("[DEBUG] requireAdmin call start", { timestamp: authStart });
    fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:9',message:'requireAdmin call start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    await requireAdmin()
    // #region agent log
    console.log("[DEBUG] requireAdmin completed", { duration: Date.now() - authStart });
    fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:12',message:'requireAdmin completed',data:{duration:Date.now()-authStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // #region agent log
    const queryStart = Date.now();
    console.log("[DEBUG] Prisma query start - driverProfile.findMany", { timestamp: queryStart });
    fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:14',message:'Prisma query start - driverProfile.findMany',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const drivers = await withTimeout(
      prisma.driverProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isEmailVerified: true,
            isActive: true,
            activationToken: true,
          },
        },
        contracts: {
          include: {
            vehicle: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      }),
      8000
    )
    // #region agent log
    const queryDuration = Date.now() - queryStart;
    console.log("[DEBUG] Prisma query completed", { duration: queryDuration, count: drivers.length });
    fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:32',message:'Prisma query completed',data:{duration:queryDuration,count:drivers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // #region agent log
    console.log("[DEBUG] GET /api/admin/drivers success exit", { totalDuration: Date.now() });
    fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:35',message:'GET /api/admin/drivers success exit',data:{totalDuration:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(drivers)
  } catch (error) {
    // #region agent log
    const errorInfo = { errorName: error instanceof Error ? error.name : 'unknown', errorMessage: error instanceof Error ? error.message : String(error) };
    console.error("[DEBUG] GET /api/admin/drivers error", errorInfo);
    fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/drivers/route.ts:40',message:'GET /api/admin/drivers error',data:errorInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("[v0] Get drivers error:", error)
    return NextResponse.json({ ok: false, drivers: [], error: "Failed to load drivers" }, { status: 200 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const driverId = searchParams.get("driverId")
    const userId = searchParams.get("userId")

    if (!driverId && !userId) {
      return NextResponse.json({ error: "Driver ID or User ID is required" }, { status: 400 })
    }

    // Check if driver has active contracts
    if (driverId) {
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        include: {
          contracts: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      })

      if (driver && driver.contracts.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete driver with active contracts. Please end contracts first." },
          { status: 400 }
        )
      }
    }

    // Delete by driverId or userId
    // IMPORTANT: Delete User first, which cascades to DriverProfile (per schema)
    // Deleting DriverProfile alone leaves orphaned User records
    if (driverId) {
      // First get the userId from the driver profile
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        select: { userId: true },
      })

      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      }

      // Delete user (cascades to driver profile, documents, contracts, etc.)
      await prisma.user.delete({
        where: { id: driver.userId },
      })
    } else if (userId) {
      // Delete user (cascades to driver profile)
      await prisma.user.delete({
        where: { id: userId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete driver error:", error)
    return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 })
  }
}
