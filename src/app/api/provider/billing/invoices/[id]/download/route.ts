import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'

/**
 * GET - Télécharger une facture PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Profil prestataire non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que la facture appartient bien au prestataire
    const invoice = await prisma.invoice.findUnique({
      where: {
        const { id } = await params;

        id: id,
        providerId: provider.id
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    if (!invoice.pdfUrl) {
      return NextResponse.json(
        { error: 'PDF non disponible' },
        { status: 404 }
      )
    }

    // En production, vous récupéreriez le fichier depuis un service de stockage
    // Ici, nous simulons la génération d'un PDF simple
    const pdfContent = await generateSimplePDF(invoice)

    return new NextResponse(pdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture_${invoice.invoiceNumber}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error downloading invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement' },
      { status: 500 }
    )
  }
}

async function generateSimplePDF(invoice: any): Promise<Buffer> {
  // Simulation d'un PDF simple
  // En production, utilisez jsPDF ou un autre générateur PDF
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(FACTURE ECODELI) Tj
0 -20 Td
(Numero: ${invoice.invoiceNumber}) Tj
0 -20 Td
(Montant: ${invoice.total.toFixed(2)} EUR) Tj
0 -20 Td
(Date: ${invoice.createdAt.toLocaleDateString()}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000565 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
645
%%EOF
`

  return Buffer.from(pdfContent, 'utf-8')
}