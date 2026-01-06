import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { env } from "@/lib/env"
import { markPaymentPaid } from "@/lib/payments/markPaid"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, env.stripe.webhookSecret)
    } catch (err) {
      console.error("[v0] Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // Get payment by session ID
      const payment = await prisma.payment.findUnique({
        where: { stripeSessionId: session.id },
        include: {
          contract: true,
        },
      })

      if (!payment) {
        console.error("[v0] Payment not found for session:", session.id)
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      // Use the markPaymentPaid helper which handles next payment generation
      await markPaymentPaid(payment.id)

      console.log("[v0] Payment completed:", payment.id)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}
