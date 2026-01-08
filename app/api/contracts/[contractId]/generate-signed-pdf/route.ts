import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { supabaseAdmin } from "@/lib/supabase/server"
import { env } from "@/lib/env"

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
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Require contract is signed by driver
    if (
      contract.status !== "SIGNED_BY_DRIVER" &&
      contract.status !== "DRIVER_SIGNED" &&
      contract.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { error: `Contract must be signed by driver. Current status: ${contract.status}` },
        { status: 400 }
      )
    }

    // Require driver signature
    if (!contract.driverSignedAt || !contract.driverSignatureUrl) {
      return NextResponse.json({ error: "Driver signature is missing." }, { status: 400 })
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 800

    // Title
    page.drawText("FleetHub Vehicle Rental Contract", {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    })
    y -= 30

    // Contract details
    const details = [
      `Contract ID: ${contract.id}`,
      `Driver: ${contract.driver.user.name || contract.driver.user.email || "N/A"}`,
      `Vehicle: ${contract.vehicle.reg} (${contract.vehicle.make} ${contract.vehicle.model}${contract.vehicle.year ? ` ${contract.vehicle.year}` : ""})`,
      `Start Date: ${new Date(contract.startDate).toLocaleDateString()}`,
      `End Date: ${contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Ongoing"}`,
      `Rate: R ${(contract.feeAmountCents / 100).toFixed(2)} ${contract.frequency.toLowerCase()}`,
      "",
      "Terms and Conditions:",
    ]

    for (const line of details) {
      page.drawText(line, { x: 50, y, size: 11, font: line.startsWith("Contract ID") ? boldFont : font })
      y -= 16
    }

    // Terms text (if available)
    if (contract.termsText) {
      const termsLines = contract.termsText.split("\n")
      y -= 10
      for (const line of termsLines.slice(0, 30)) {
        // Limit to prevent overflow
        if (y < 200) break
        page.drawText(line.substring(0, 80), { x: 50, y, size: 9, font })
        y -= 12
      }
    } else {
      page.drawText("(Standard rental terms apply)", { x: 50, y, size: 9, font })
      y -= 12
    }

    y -= 20

    // Driver signature section
    try {
      const sigBytes = await fetchImageBytes(contract.driverSignatureUrl)
      const sigImg = await pdfDoc.embedPng(sigBytes)

      page.drawText("Driver Signature:", { x: 50, y, size: 11, font: boldFont })
      y -= 20

      page.drawImage(sigImg, {
        x: 50,
        y: y - 60,
        width: 180,
        height: 60,
      })

      page.drawText(`Signed At: ${new Date(contract.driverSignedAt).toLocaleString()}`, {
        x: 50,
        y: y - 70,
        size: 9,
        font,
      })
    } catch (error) {
      console.error("[PDF] Failed to embed signature:", error)
      page.drawText("Driver Signature: (Signature image unavailable)", {
        x: 50,
        y,
        size: 9,
        font,
      })
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save()
    const bucket = env.supabase.bucketDriver
    const pdfPath = `contracts/${contract.id}/signed-contract.pdf`

    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(pdfPath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    })

    if (upErr) {
      console.error("[PDF] Upload error:", upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(pdfPath)
    const signedPdfUrl = pub.publicUrl

    // Generate first payment when contract becomes active
    const { createFirstPayment } = await import("@/lib/payments/generator")
    
    await prisma.$transaction(async (tx) => {
      await tx.rentalContract.update({
        where: { id: contract.id },
        data: {
          signedPdfUrl,
          signedPdfGeneratedAt: new Date(),
          status: "ACTIVE",
        },
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
    })

    return NextResponse.json({ ok: true, signedPdfUrl })
  } catch (error: any) {
    console.error("[PDF] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate PDF" }, { status: 500 })
  }
}
