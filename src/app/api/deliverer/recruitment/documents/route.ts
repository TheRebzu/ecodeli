import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const userId = formData.get("userId") as string;

    if (!file || !type || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Vérifier les permissions
    if (userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier que la candidature existe
    const deliverer = await db.deliverer.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "No deliverer profile found" },
        { status: 404 },
      );
    }

    // Vérifier les types de fichiers autorisés
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, JPEG, PNG files are allowed" },
        { status: 400 },
      );
    }

    // Vérifier la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large. Maximum 10MB allowed" },
        { status: 400 },
      );
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split(".").pop();
    const fileName = `${nanoid()}.${fileExtension}`;

    // Créer le répertoire de stockage s'il n'existe pas
    const uploadDir = join(process.cwd(), "storage", "recruitment", userId);
    await mkdir(uploadDir, { recursive: true });

    // Sauvegarder le fichier
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Supprimer l'ancien document du même type s'il existe
    const existingDoc = await db.document.findFirst({
      where: {
        userId,
        type: type as any, // Type de document (IDENTITY, DRIVING_LICENSE, etc.)
      },
    });

    if (existingDoc) {
      await db.document.delete({
        where: { id: existingDoc.id },
      });
    }

    // Générer l'URL relative pour accéder au fichier via l'API
    const fileUrl = `/api/storage/recruitment/${userId}/${fileName}`;

    // Enregistrer en base de données
    const document = await db.document.create({
      data: {
        userId,
        type: type as any,
        filename: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: fileUrl,
        validationStatus: "PENDING",
      },
    });

    // Les notifications ont été retirées selon les demandes du client

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        name: document.originalName,
        status: document.validationStatus,
        uploadedAt: document.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading recruitment document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
