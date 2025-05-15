import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/server/db';
import { authOptions } from '@/server/auth/next-auth';
import { DocumentService } from '@/server/services/document.service';
import { TRPCError } from '@trpc/server';

// Using a string literal for verification status to avoid the enum mismatch
const APPROVED_STATUS = 'APPROVED';

const documentService = new DocumentService();

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
      isVerified: true,
      verificationStatus: APPROVED_STATUS,
      reviewerId: session.user.id,
      notes: notes || null,
    });

    // Check if all required documents are now verified
    const requiredDocuments = documentService.getRequiredDocumentTypesByRole(document.user.role);

    const hasAllDocuments = await documentService.hasRequiredDocuments(
      document.user.id,
      requiredDocuments
    );

    // If all documents are verified, update user verification status
    if (hasAllDocuments) {
      await db.user.update({
        where: { id: document.user.id },
        data: {
          status: 'ACTIVE',
        },
      });
    }

    return NextResponse.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error('Error approving document:', error);

    if (error instanceof TRPCError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 });
  }
}
