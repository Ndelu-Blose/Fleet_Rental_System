import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { PDFDocument, StandardFonts } from "pdf-lib"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"

async function fetchImageBytes(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch signature image")
  return new Uint8Array(await res.arrayBuffer())
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await requireAdmin()
    const { contractId } = await params

    const contract = await prisma.rentalContract.findUnique({
      where: { id: contractId },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
        vehicle: true,
      },
    })

    if (!contract) {
      return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 })
    }

    if (contract.status !== "SIGNED_BY_DRIVER" && contract.status !== "DRIVER_SIGNED") {
      return NextResponse.json(
        { ok: false, error: `Contract must be signed by driver. Current status: ${contract.status}` },
        { status: 400 }
      )
    }

    // 1) Generate PDF
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595, 842]) // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)

    page.drawText("FleetHub Rental Contract", { x: 50, y: 790, size: 18, font: boldFont })
    page.drawText(`Contract ID: ${contract.id}`, { x: 50, y: 760, size: 12, font })
    page.drawText(`Driver: ${contract.driver.user.name || contract.driver.user.email}`, { x: 50, y: 740, size: 12, font })
    page.drawText(`Vehicle: ${contract.vehicle.reg} (${contract.vehicle.make} ${contract.vehicle.model})`, { x: 50, y: 720, size: 12, font })
    page.drawText(`Start Date: ${contract.startDate.toISOString().slice(0, 10)}`, { x: 50, y: 700, size: 12, font })
    page.drawText(`Fee: R ${(contract.feeAmountCents / 100).toFixed(2)} (${contract.frequency})`, { x: 50, y: 680, size: 12, font })

    // Embed driver signature if available
    if (contract.driverSignaturePath && contract.driverSignatureBucket) {
      try {
        // Get signed URL for signature image
        const { data: sigUrlData } = await supabaseAdmin.storage
          .from(contract.driverSignatureBucket)
          .createSignedUrl(contract.driverSignaturePath, 60)
        
        if (sigUrlData) {
          const sigBytes = await fetchImageBytes(sigUrlData.signedUrl)
          const sigImg = await pdf.embedPng(sigBytes)
          page.drawText("Driver Signature:", { x: 50, y: 650, size: 11, font: boldFont })
          page.drawImage(sigImg, { x: 50, y: 580, width: 180, height: 60 })
          page.drawText(`Signed: ${contract.driverSignedAt?.toISOString() || "N/A"}`, { x: 50, y: 570, size: 9, font })
        }
      } catch (error) {
        console.error("[PDF] Failed to embed signature:", error)
      }
    }

    page.drawText(`Admin signed: ${new Date().toISOString()}`, { x: 50, y: 550, size: 12, font })
    
    // Add terms if available
    if (contract.termsText) {
      page.drawText("Terms:", { x: 50, y: 520, size: 11, font: boldFont })
      const termsLines = contract.termsText.split("\n").slice(0, 20)
      let y = 500
      for (const line of termsLines) {
        page.drawText(line.substring(0, 80), { x: 50, y, size: 9, font })
        y -= 12
        if (y < 100) break
      }
    }

    const pdfBytes = await pdf.save()

    // 2) Upload PDF to contract-assets bucket
    const bucket = "contract-assets"
    const pdfPath = `contracts/${contractId}.pdf`

    const { error: pdfErr } = await supabaseAdmin.storage.from(bucket).upload(pdfPath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    })

    if (pdfErr) {
      console.error("[Activate] PDF upload error:", pdfErr)
      return NextResponse.json({ ok: false, error: pdfErr.message }, { status: 500 })
    }

    // 3) Transaction: activate + assign vehicle + create payment
    const { createFirstPayment } = await import("@/lib/payments/generator")

    const updated = await prisma.$transaction(async (tx) => {
      // Update contract status to ACTIVE and store PDF info
      const contractUpdated = await tx.rentalContract.update({
        where: { id: contract.id },
        data: {
          status: "ACTIVE",
          adminSignedAt: new Date(),
          signedPdfBucket: bucket,
          signedPdfPath: pdfPath,
          signedPdfUrl: pdfPath, // Keep for backward compatibility
          signedPdfGeneratedAt: new Date(),
        },
      })

      // Assign vehicle only now that contract is ACTIVE
      await tx.vehicle.update({
        where: { id: contract.vehicleId },
        data: { status: "ASSIGNED" },
      })

      // Generate first payment now that contract is active
      await createFirstPayment(tx, {
        contractId: contract.id,
        amountCents: contract.feeAmountCents,
        startDate: contract.startDate,
        frequency: contract.frequency,
        dueWeekday: contract.dueWeekday,
        dueDayOfMonth: contract.dueDayOfMonth,
      })

      return contractUpdated
    })

    return NextResponse.json({ ok: true, contract: updated })
  } catch (error: any) {
    console.error("[Activate Contract] Error:", error)
    return NextResponse.json({ ok: false, error: error.message || "Failed to activate contract" }, { status: 500 })
  }
}
