import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartDropService, cartDropConfigSchema } from '@/features/merchant/services/cart-drop.service'

// GET - Récupère la configuration lâcher de chariot
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await CartDropService.getConfiguration(session.user.id)
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching cart drop config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Met à jour la configuration lâcher de chariot
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = cartDropConfigSchema.parse(body)

    await CartDropService.updateConfiguration(session.user.id, validatedData)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    
    console.error('Error updating cart drop config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 