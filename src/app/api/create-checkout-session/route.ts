import { NextResponse } from "next/server"

// Désactivé temporairement en attendant la configuration de Stripe
export async function POST(req: Request) {
  try {
    // Mock response
    return NextResponse.json({
      sessionId: "mock_session_id",
      message: "Payment processing is temporarily disabled"
    })
  } catch (err) {
    console.error("Error in mock checkout:", err)
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 503 }
    )
  }
}