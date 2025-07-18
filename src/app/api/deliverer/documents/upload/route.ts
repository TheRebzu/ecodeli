import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const typeId = formData.get("typeId") as string;

    if (!file || !typeId) {
      return NextResponse.json(
        { error: "File and typeId are required" },
        { status: 400 },
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      "IDENTITY",
      "DRIVING_LICENSE",
      "INSURANCE",
      "CERTIFICATION",
      "CONTRACT",
      "OTHER"
    ];
    
    if (!allowedTypes.includes(typeId)) {
      return NextResponse.json(
        { error: "Invalid document type. Allowed types: " + allowedTypes.join(", ") },
        { status: 400 },
      );
    }

    // Vérifier la taille du fichier (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 },
      );
    }

    // Vérifier l'extension du fichier
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPG, JPEG, PNG" },
        { status: 400 },
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const filename = `${session.user.id}_${typeId}_${timestamp}${fileExtension}`;

    // Convertir le fichier en base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Content = buffer.toString('base64');

    // Supprimer l'ancien document du même type s'il existe
    await prisma.document.deleteMany({
      where: {
        userId: session.user.id,
        type: typeId as any,
      },
    });

    // Créer l'enregistrement du document avec le contenu base64
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: typeId as any, // Cast to match enum
        filename: filename,
        originalName: file.name,
        mimeType: file.type,
        validationStatus: "PENDING",
        size: file.size,
        content: base64Content,
        // url est maintenant optionnel car on stocke en base64
      },
    });

    // Créer une notification pour l'admin
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "DOCUMENT_UPLOADED",
        title: "Nouveau document uploadé",
        message: `Un nouveau document de type ${typeId} a été uploadé par ${session.user.name || session.user.email}`,
        data: {
          documentId: document.id,
          documentType: typeId,
          userId: session.user.id,
        },
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        filename: document.filename,
        status: document.validationStatus.toLowerCase(),
        uploadedAt: document.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
