import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { env } from "@/lib/env"
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

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      })

      // Generate next payment if contract is still active
      if (payment.contract.status === "ACTIVE") {
        const nextDueDate = new Date(payment.dueDate)

        if (payment.contract.frequency === "DAILY") {
          nextDueDate.setDate(nextDueDate.getDate() + 1)
        } else if (payment.contract.frequency === "WEEKLY") {
          nextDueDate.setDate(nextDueDate.getDate() + 7)
        }

        // Only create if next payment doesn't already exist
        const existingNext = await prisma.payment.findFirst({
          where: {
            contractId: payment.contractId,
            dueDate: nextDueDate,
          },
        })

        if (!existingNext) {
          await prisma.payment.create({
            data: {
              contractId: payment.contractId,
              amountCents: payment.amountCents,
              dueDate: nextDueDate,
              status: "PENDING",
            },
          })
        }
      }

      console.log("[v0] Payment completed:", payment.id)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}
