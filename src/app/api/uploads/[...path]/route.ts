import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cette route permet d'accéder directement aux fichiers dans le répertoire uploads
// en utilisant /api/uploads/... au lieu de /uploads/...
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Récupérer le chemin du fichier à partir du segment path de l'URL
    const filePath = params.path.join('/');

    // Construire le chemin complet vers le fichier dans le répertoire public/uploads
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);

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
      // Ajouter d'autres types MIME selon vos besoins
    }

    // Préparer les entêtes de la réponse
    const headers = new Headers();
    headers.set('Content-Type', contentType);

    // Permettre l'affichage direct dans le navigateur
    headers.set('Content-Disposition', 'inline');
    
    // Définir des en-têtes de cache pour améliorer les performances
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache pendant 24h

    // Renvoyer le fichier
    return new NextResponse(fileData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Erreur lors du chargement du fichier:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du chargement du fichier' },
      { status: 500 }
    );
  }
} 