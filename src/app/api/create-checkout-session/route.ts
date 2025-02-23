import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { config } from "@/lib/config"

export async function POST(req: Request) {
  try {
    const { amount, currency = "eur" } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "EcoDeli Service",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${config.siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.siteUrl}/payment-cancelled`,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    console.error("Error creating checkout session:", err)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}

