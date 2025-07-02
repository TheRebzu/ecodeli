import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { generateProviderInvoicePDF } from '@/features/invoices/services/invoice-generator.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['PROVIDER', 'ADMIN'])
    const { id } = await params

    // Récupérer la facture
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        invoiceItems: {
          include: {
            booking: {
              include: {
                client: {
                  include: {
                    user: {
                      include: {
                        profile: true
                      }
                    }
                  }
                }
              }
            },
            service: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (user.role === 'PROVIDER') {
      const provider = await db.provider.findUnique({
        where: { userId: user.id }
      })
      
      if (!provider || invoice.providerId !== provider.id) {
        return NextResponse.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        )
      }
    }

    // Générer le PDF
    const pdfBuffer = await generateProviderInvoicePDF(invoice)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.number}.pdf"`
      }
    })
  } catch (error) {
    console.error('❌ Erreur download invoice:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}