import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { readFile } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: documentId } = await params;

    // Récupérer le document
    const document = await db.delivererRecruitmentDocument.findUnique({
      where: { id: documentId },
      include: {
        recruitment: {
          select: {
            userId: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    if (document.recruitment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Lire le fichier
    const fileBuffer = await readFile(document.filePath);

    // Retourner le fichier
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'Content-Length': document.fileSize.toString()
      }
    });
  } catch (error) {
    console.error('Error downloading recruitment document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}