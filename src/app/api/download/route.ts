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
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }

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
    let finalPath = fullPath;
    if (!fs.existsSync(fullPath)) {
      // Si le fichier exact n'est pas trouvé, essayer de trouver un fichier similaire dans le même dossier
      const dirPath = path.dirname(fullPath);
      const targetBasename = path.basename(fullPath);

      // Vérifier si le répertoire existe
      if (!fs.existsSync(dirPath)) {
        return NextResponse.json(
          { success: false, message: 'Répertoire non trouvé' },
          { status: 404 }
        );
      }

      // Extraire l'identifiant de document du nom de fichier (format: timestamp-hash-document-id)
      // Par exemple, pour "1746623068032-4555cd05da27ca04-document-1746623068020"
      // On cherche "document-1746623068020" comme identifiant commun
      let documentId = null;
      const match = targetBasename.match(/document-(\d+)/);
      if (match && match[0]) {
        documentId = match[0]; // "document-1746623068020"

        // Lire le contenu du répertoire pour trouver un fichier correspondant
        const files = fs.readdirSync(dirPath);
        const matchingFile = files.find(file => file.includes(documentId));

        if (matchingFile) {
          finalPath = path.join(dirPath, matchingFile);
        } else {
          return NextResponse.json(
            { success: false, message: 'Fichier non trouvé' },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, message: 'Fichier non trouvé' },
          { status: 404 }
        );
      }
    }

    // Lire le fichier
    const fileBuffer = fs.readFileSync(finalPath);

    // Déterminer le type MIME en fonction de l'extension
    const fileExtension = path.extname(finalPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    };

    // Type MIME par défaut si l'extension n'est pas reconnue
    const contentType = mimeTypes[fileExtension] || 'application/octet-stream';

    // Extraire le nom de fichier pour l'en-tête Content-Disposition
    const fileName = path.basename(finalPath);

    // Créer les en-têtes de réponse
    const headers = new Headers();
    headers.set('Content-Type', contentType);

    if (forceDownload) {
      // Forcer le téléchargement au lieu de l'affichage dans le navigateur
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      // Permettre l'affichage dans le navigateur pour les images et PDFs
      headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    }

    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Cache-Control', 'no-cache');

    // Renvoyer le fichier avec les bons en-têtes
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur lors du téléchargement' },
      { status: 500 }
    );
  }
}
