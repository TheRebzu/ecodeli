import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/server/db';
import { authOptions } from '@/server/auth/next-auth';
import { VerificationService } from '@/server/services/verification.service';
import { VerificationStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';

const verificationService = new VerificationService();

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can approve documents' },
        { status: 403 }
      );
    }

    const documentId = params.documentId;
    const { notes } = await req.json();

    // Utiliser VerificationService pour approuver le document
    const updatedVerification = await verificationService.reviewDocument(
      documentId,
      session.user.id,
      VerificationStatus.APPROVED,
      notes || undefined
    );

    return NextResponse.json({ success: true, verification: updatedVerification });
  } catch (error) {
    console.error('Error approving document:', error);

    if (error instanceof TRPCError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 });
  }
}
