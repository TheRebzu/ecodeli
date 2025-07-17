import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
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

    // Vérifier que l'utilisateur a un profil de livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId },
      include: { user: true },
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

    // Convertir le fichier en base64 pour stockage en base de données
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Content = buffer.toString('base64');

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

    // Générer l'URL pour accéder au fichier via l'API
    const fileUrl = `/api/documents/${userId}/${fileName}`;

    // Enregistrer en base de données avec contenu en base64
    const document = await db.document.create({
      data: {
        userId,
        type: type as any,
        filename: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: fileUrl,
        content: base64Content, // Stocker le contenu en base64
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
