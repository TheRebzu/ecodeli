import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Gestionnaire GET pour accéder à un document par son ID
 * Vérifie les permissions d'accès et retourne le fichier
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const documentId = params.id;

    if (!documentId) {
      return new NextResponse('ID de document manquant', { status: 400 });
    }

    // Vérifier l'authentification
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Non autorisé', { status: 401 });
    }

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: true,
      },
    });

    if (!document) {
      return new NextResponse('Document non trouvé', { status: 404 });
    }

    // Vérifier les permissions
    const userId = session.user.id;
    const userRole = session.user.role;

    // Autoriser l'accès si:
    // 1. L'utilisateur est le propriétaire du document
    // 2. L'utilisateur est un administrateur
    const isOwner = document.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return new NextResponse('Accès non autorisé', { status: 403 });
    }

    // Lire le fichier du document
    const filePath = document.path;
    const fullPath = path.resolve(process.cwd(), filePath);

    try {
      const fileBuffer = await readFile(fullPath);

      // Déterminer le type MIME du fichier
      const contentType = document.mimeType || 'application/octet-stream';

      // Configurer les en-têtes pour le téléchargement
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Disposition', `inline; filename="${document.originalName}"`);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      return new NextResponse('Fichier introuvable', { status: 404 });
    }
  } catch (error) {
    console.error("Erreur lors de l'accès au document:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
