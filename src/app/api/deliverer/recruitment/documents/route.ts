import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const userId = formData.get('userId') as string;

    if (!file || !type || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Vérifier les permissions
    if (userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Vérifier que la candidature existe
    const application = await db.delivererRecruitment.findFirst({
      where: { userId }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'No recruitment application found' },
        { status: 404 }
      );
    }

    // Vérifier les types de fichiers autorisés
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPEG, PNG files are allowed' },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExtension}`;
    
    // Créer le répertoire de stockage s'il n'existe pas
    const uploadDir = join(process.cwd(), 'storage', 'recruitment', userId);
    await mkdir(uploadDir, { recursive: true });
    
    // Sauvegarder le fichier
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Supprimer l'ancien document du même type s'il existe
    const existingDoc = await db.delivererRecruitmentDocument.findFirst({
      where: {
        recruitmentId: application.id,
        type
      }
    });

    if (existingDoc) {
      await db.delivererRecruitmentDocument.delete({
        where: { id: existingDoc.id }
      });
    }

    // Enregistrer en base de données
    const document = await db.delivererRecruitmentDocument.create({
      data: {
        recruitmentId: application.id,
        type,
        name: file.name,
        fileName: fileName,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type,
        status: 'PENDING'
      }
    });

    // Notifier les admins qu'un nouveau document a été uploadé
    const admins = await db.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });

    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'SYSTEM' as const,
      title: 'Nouveau document de candidature',
      message: `Un nouveau document a été uploadé pour la candidature de ${application.firstName} ${application.lastName}`,
      priority: 'MEDIUM' as const,
      metadata: { 
        applicationId: application.id,
        documentId: document.id,
        documentType: type
      }
    }));

    await db.notification.createMany({
      data: notifications
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        name: document.name,
        status: document.status,
        uploadedAt: document.uploadedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error uploading recruitment document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}