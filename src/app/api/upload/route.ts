import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier le type du fichier (images uniquement)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Type de fichier non supporté. Seuls JPEG, PNG et WEBP sont acceptés',
        },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (limite à 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Le fichier est trop volumineux (max: 5MB)' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Définir le chemin de sauvegarde (dans le dossier public)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadDir, fileName);

    // Écrire le fichier
    try {
      await writeFile(filePath, buffer);
    } catch (error) {
      console.error("Erreur lors de l'écriture du fichier:", error);
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la sauvegarde du fichier' },
        { status: 500 }
      );
    }

    // Renvoyer l'URL du fichier uploadé
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      message: 'Fichier uploadé avec succès',
      fileUrl,
    });
  } catch (error) {
    console.error("Erreur lors de l'upload du fichier:", error);

    return NextResponse.json(
      { success: false, message: "Échec de l'upload du fichier" },
      { status: 500 }
    );
  }
}
