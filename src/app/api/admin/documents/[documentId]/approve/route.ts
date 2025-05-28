import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { TRPCError } from '@trpc/server';
import { createTRPCContext } from '@/server/api/trpc';
import { appRouter } from '@/server/api/root';

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

    // Créer le contexte tRPC pour l'appel au routeur
    // Note: pour les routes API, on fournit un objet vide pour res et info
    const ctx = await createTRPCContext({ 
      req: req as any, 
      res: {} as any,
      info: {} as any,
      auth: { session } 
    });
    const caller = appRouter.createCaller(ctx);

    try {
      // Appeler la procédure tRPC
      const result = await caller.verification.approveDocument({
        documentId,
        notes: notes || undefined,
      });

      return NextResponse.json({ success: true, verification: result });
    } catch (error) {
      if (error instanceof TRPCError) {
        console.error('tRPC error approving document:', error);
        return NextResponse.json(
          { error: error.message },
          { status: getHttpStatusFromTRPCError(error) }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error approving document:', error);
    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 });
  }
}

// Helper pour convertir les codes d'erreur tRPC en codes HTTP
function getHttpStatusFromTRPCError(error: TRPCError): number {
  switch (error.code) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'TIMEOUT':
      return 408;
    case 'CONFLICT':
      return 409;
    case 'PRECONDITION_FAILED':
      return 412;
    case 'PAYLOAD_TOO_LARGE':
      return 413;
    case 'METHOD_NOT_SUPPORTED':
      return 405;
    case 'UNPROCESSABLE_CONTENT':
      return 422;
    case 'TOO_MANY_REQUESTS':
      return 429;
    default:
      return 500;
  }
}
