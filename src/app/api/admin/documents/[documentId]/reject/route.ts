import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/server/db';
import { authOptions } from '@/server/auth/next-auth';
import { DocumentService } from '@/server/services/document.service';
import { TRPCError } from '@trpc/server';

// Using a string literal for verification status to avoid the enum mismatch
const REJECTED_STATUS = 'REJECTED';

const documentService = new DocumentService();

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can reject documents' },
        { status: 403 }
      );
    }

    const documentId = params.documentId;
    const { reason } = await req.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Find the document
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: { user: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update document status
    const updatedDocument = await documentService.updateDocumentFromApi(documentId, {
      isVerified: false,
      verificationStatus: REJECTED_STATUS,
      reviewerId: session.user.id,
      rejectionReason: reason,
    });

    return NextResponse.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error('Error rejecting document:', error);

    if (error instanceof TRPCError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to reject document' }, { status: 500 });
  }
}
