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
    const { id: contractId } = await params;

    const merchant = await db.merchant.findFirst({
      where: { userId: user.id }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const contract = await db.contract.findFirst({
      where: { 
        id: contractId,
        merchantId: merchant.id
      }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (!contract.signedDocumentPath) {
      return NextResponse.json({ 
        error: 'Signed document not available' 
      }, { status: 404 });
    }

    try {
      const filePath = join(process.cwd(), contract.signedDocumentPath);
      const fileBuffer = await readFile(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="contract_${contract.id}.pdf"`
        }
      });
    } catch (fileError) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error downloading contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}