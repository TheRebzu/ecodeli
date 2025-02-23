import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Error verifying webhook signature:", err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object
      // Handle successful checkout
      console.log("Checkout completed:", session)
      // You would typically update your database here
      break
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object
      // Handle successful payment
      console.log("Payment succeeded:", paymentIntent)
      // You would typically update your database here
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

