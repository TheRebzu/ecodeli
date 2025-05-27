import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';

/**
 * API pour télécharger des fichiers avec le bon type MIME
 * Cette API vérifie les autorisations et envoie le fichier avec les bons en-têtes
 */
export async function GET(request: NextRequest) {
  try {
    // Obtenir le chemin du fichier à partir de l'URL
    const url = new URL(request.url);
    const filePath = url.searchParams.get('path');
    const forceDownload = url.searchParams.get('download') === 'true';

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: 'Paramètre de chemin manquant' },
        { status: 400 }
      );
    }

    // Sécurité: s'assurer que le chemin est dans le répertoire uploads
    const normalizedPath = path.normalize(filePath).replace(/^\/+/, '');
    if (!normalizedPath.startsWith('uploads/') && !filePath.startsWith('/uploads/')) {
      return NextResponse.json({ success: false, message: 'Chemin non autorisé' }, { status: 403 });
    }

    // Chemin complet du fichier sur le serveur
    // Supprimer le slash initial s'il existe avant de joindre au chemin public
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const fullPath = path.join(process.cwd(), 'public', cleanPath);

    // Vérifier si le fichier existe
    if (!fs.existsSync(fullPath)) {
      console.error(`Fichier non trouvé: ${fullPath}`);
      return NextResponse.json({ success: false, message: 'Fichier non trouvé' }, { status: 404 });
    }

    // Lire le fichier
    const fileData = fs.readFileSync(fullPath);
    const fileExt = path.extname(fullPath).toLowerCase();

    // Déterminer le type MIME basé sur l'extension
    let contentType = 'application/octet-stream';
    switch (fileExt) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // Préparer les entêtes de la réponse
    const headers = new Headers();
    headers.set('Content-Type', contentType);

    if (forceDownload) {
      const fileName = path.basename(fullPath);
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      headers.set('Content-Disposition', 'inline');
    }

    // Renvoyer le fichier
    return new NextResponse(fileData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du téléchargement du fichier' },
      { status: 500 }
    );
  }
}
