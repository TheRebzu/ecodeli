import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: billingId } = await params;

    const merchant = await db.merchant.findFirst({
      where: { userId: user.id }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const billing = await db.merchantBilling.findFirst({
      where: { 
        id: billingId,
        merchantId: merchant.id
      }
    });

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    if (!billing.invoicePath) {
      return NextResponse.json({ 
        error: 'Invoice not available' 
      }, { status: 404 });
    }

    try {
      const filePath = join(process.cwd(), billing.invoicePath);
      const fileBuffer = await readFile(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice_${billing.invoiceNumber || billing.id}.pdf"`
        }
      });
    } catch (fileError) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}