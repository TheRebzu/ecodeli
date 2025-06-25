import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/features/payments/services/stripe.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature Stripe manquante' }, 
        { status: 400 }
      )
    }

    const result = await StripeService.handleWebhook(body, signature)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      type: result.type
    })

  } catch (error) {
    console.error('Erreur webhook Stripe:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur webhook' 
      }, 
      { status: 400 }
    )
  }
}