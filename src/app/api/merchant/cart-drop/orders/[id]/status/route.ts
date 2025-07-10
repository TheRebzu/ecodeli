import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartDropService, updateOrderStatusSchema } from '@/features/merchant/services/cart-drop.service'

// PATCH - Met à jour le statut d'une commande
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateOrderStatusSchema.parse(body)

    await CartDropService.updateOrderStatus(session.user.id, id, validatedData.status)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 