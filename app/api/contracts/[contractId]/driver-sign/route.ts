import { type NextRequest, NextResponse } from "next/server"
import { requireDriver } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import crypto from "crypto"

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/)
  if (!match) throw new Error("Invalid signature format")
  return Buffer.from(match[1], "base64")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await requireDriver()
    const { contractId } = await params

    const { signatureDataUrl, acceptance } = await req.json()

    // Validate acceptance
    if (!acceptance?.agreeTerms || !acceptance?.agreePayments) {
      return NextResponse.json({ error: "You must accept the terms." }, { status: 400 })
    }

    const contract = await prisma.rentalContract.findUnique({
      where: { id: contractId },
      include: { driver: true },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Ensure this contract belongs to this driver
    if (contract.driverId !== session.user.driverProfile?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (contract.status !== "SENT_TO_DRIVER") {
      return NextResponse.json({ error: "Contract is not ready for signing." }, { status: 400 })
    }

    const buffer = dataUrlToBuffer(signatureDataUrl)

    const filePath = `contracts/${contract.id}/driver-signature.png`
    const bucket = env.supabase.bucketDriver

    // Upload signature image
    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
      contentType: "image/png",
      upsert: true,
    })

    if (upErr) {
      console.error("[Driver Sign] Upload error:", upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    // Get public URL (or use signed URL if bucket is private)
    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
    const signatureUrl = pub.publicUrl

    // Hash terms for audit trail
    const termsText = contract.termsText ?? ""
    const termsHash = crypto.createHash("sha256").update(termsText).digest("hex")

    await prisma.rentalContract.update({
      where: { id: contract.id },
      data: {
        driverSignedAt: new Date(),
        driverSignatureUrl: signatureUrl,
        termsHash,
        status: "DRIVER_SIGNED",
        lockedAt: contract.lockedAt ?? new Date(),
      },
    })

    return NextResponse.json({ ok: true, signatureUrl })
  } catch (error: any) {
    console.error("[Driver Sign] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to sign contract" }, { status: 500 })
  }
}
