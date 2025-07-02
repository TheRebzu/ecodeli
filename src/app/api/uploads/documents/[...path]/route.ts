import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/utils';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    const filename = path.join('/');
    
    // Construire le chemin du fichier
    const filePath = join(process.cwd(), 'uploads', 'documents', filename);
    
    // Vérifier que le fichier existe
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Lire le fichier
    const fileBuffer = await readFile(filePath);
    
    // Déterminer le type MIME
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    
    const contentType = mimeTypes[extension || ''] || 'application/octet-stream';

    // Retourner le fichier
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 