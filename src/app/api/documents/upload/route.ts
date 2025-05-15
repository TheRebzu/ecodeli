import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { db } from '@/server/db';
import { DocumentType } from '@prisma/client';

// Désactive le bodyParser pour permettre la lecture des FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Fonction pour s'assurer que le répertoire d'upload existe
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Middleware pour lire les données multipart/form-data
async function readFormData(req: NextRequest) {
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    form.parse(req as any, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // S'assurer que le répertoire d'upload existe
    await ensureUploadDir();

    // Lire les données du formulaire
    const { fields, files } = await readFormData(req);

    // Récupérer le fichier et les métadonnées
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const documentType = Array.isArray(fields.type) ? fields.type[0] : (fields.type as string);
    const expiryDateStr = Array.isArray(fields.expiryDate)
      ? fields.expiryDate[0]
      : (fields.expiryDate as string | undefined);

    if (!file || !documentType) {
      return NextResponse.json({ error: 'Fichier ou type manquant' }, { status: 400 });
    }

    // Générer un nom de fichier unique
    const fileName = `${uuidv4()}_${file.originalFilename}`;
    const filePath = `/uploads/${fileName}`;

    // Enregistrer les informations du document dans la base de données
    const document = await db.document.create({
      data: {
        userId: session.user.id,
        type: documentType as DocumentType,
        filename: fileName,
        fileUrl: filePath,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: file.size || 0,
        isVerified: false,
        verificationStatus: 'PENDING',
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        fileUrl: document.fileUrl,
        type: document.type,
      },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue lors du téléchargement' },
      { status: 500 }
    );
  }
}
