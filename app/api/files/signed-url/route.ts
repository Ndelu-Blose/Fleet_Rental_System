import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireDriver } from "@/lib/permissions"
import { supabaseAdmin } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    // Try to get admin session first, fallback to driver
    let session
    let isAdmin = false
    try {
      session = await requireAdmin()
      isAdmin = true
    } catch {
      session = await requireDriver()
    }

    const body = await req.json()
    const { bucket, path } = body
    const expiresIn = body.expiresIn || 300 // Default 5 minutes

    if (!bucket || !path) {
      return NextResponse.json({ ok: false, error: "Missing bucket or path" }, { status: 400 })
    }

    // Validate bucket is one of our allowed buckets
    const allowedBuckets = [env.supabase.bucketDriver, env.supabase.bucketVehicle, "contract-assets"]
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ ok: false, error: "Invalid bucket" }, { status: 400 })
    }

    // Security: If driver is accessing driver-kyc bucket, verify they own the document
    if (!isAdmin && bucket === env.supabase.bucketDriver) {
      // Extract driver profile ID from path (format: {driverProfileId}/...)
      const pathParts = path.split("/")
      const driverProfileId = pathParts[0]

      // Verify this driver profile belongs to the logged-in user
      const profile = await prisma.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { userId: true },
      })

      if (!profile || profile.userId !== session.user.id) {
        return NextResponse.json({ ok: false, error: "Unauthorized: You can only access your own documents" }, { status: 403 })
      }
    }

    // Generate signed URL (expires in specified seconds, default 5 minutes)
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn)

    if (error) {
      console.error("[Signed URL] Error:", error)
      return NextResponse.json({ ok: false, error: error.message || "Failed to generate signed URL" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, url: data.signedUrl })
  } catch (error) {
    console.error("[Signed URL] Unexpected error:", error)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
}
