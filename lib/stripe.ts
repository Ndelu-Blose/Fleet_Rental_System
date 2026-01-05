import Stripe from "stripe"
import { env } from "@/lib/env"

export const stripe = new Stripe(env.stripe.secretKey, {
  apiVersion: "2024-12-18.acacia",
})

export async function createCheckoutSession(paymentId: string, amountCents: number, description: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "zar",
          product_data: {
            name: "Rental Payment",
            description,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: env.stripe.successUrl,
    cancel_url: env.stripe.cancelUrl,
    metadata: {
      paymentId,
    },
  })

  return session
}
