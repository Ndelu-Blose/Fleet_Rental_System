import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireDriver } from "@/lib/permissions"
import { createCheckoutSession } from "@/lib/stripe"
import { createCheckoutSessionSchema } from "@/lib/validations/payment"

export async function POST(req: NextRequest) {
  try {
    const session = await requireDriver()
    const body = await req.json()

    // Validate input
    const validationResult = createCheckoutSessionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { paymentId } = validationResult.data

    // Get payment details
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Verify payment belongs to this driver
    if (payment.contract.driver.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if payment is already paid
    if (payment.status === "PAID") {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 })
    }

    // Create Stripe checkout session
    const description = `Rental payment for ${payment.contract.vehicle.reg}`
    const stripeSession = await createCheckoutSession(payment.id, payment.amountCents, description)

    // Update payment with session ID
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        stripeSessionId: stripeSession.id,
      },
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (error) {
    console.error("[v0] Create checkout session error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
