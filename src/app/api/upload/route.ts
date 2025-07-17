// API Upload de fichiers sécurisé EcoDeli
import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

const uploadSchema = z.object({
  type: z.enum([
    "IDENTITY",
    "DRIVING_LICENSE",
    "INSURANCE",
    "CERTIFICATION",
    "CONTRACT",
    "OTHER",
  ]),
  category: z.enum(["document", "avatar", "proof", "invoice"]).optional(),
});

const ALLOWED_MIME_TYPES = {
  document: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  proof: ["image/jpeg", "image/png", "image/webp"],
  invoice: ["application/pdf"],
};

const MAX_FILE_SIZES = {
  document: 10 * 1024 * 1024, // 10MB
  avatar: 2 * 1024 * 1024, // 2MB
  proof: 5 * 1024 * 1024, // 5MB
  invoice: 10 * 1024 * 1024, // 10MB
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const category = (formData.get("category") as string) || "document";
    const certificationId = formData.get("certificationId") as string;
    const documentId = formData.get("documentId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 },
      );
    }

    // Validation du schéma
    const validation = uploadSchema.safeParse({ type, category });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: validation.error.errors },
        { status: 400 },
      );
    }

    // Vérification du type MIME
    const allowedTypes =
      ALLOWED_MIME_TYPES[category as keyof typeof ALLOWED_MIME_TYPES];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Vérification de la taille
    const maxSize = MAX_FILE_SIZES[category as keyof typeof MAX_FILE_SIZES];
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux. Taille maximale: ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Génération du nom de fichier unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `${user.id}_${timestamp}_${randomId}.${extension}`;

    // Convertir le fichier en base64 pour stockage en base de données
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Content = buffer.toString('base64');

    // URL pour servir le fichier via l'API
    const url = `/api/documents/${user.id}/${filename}`;

    // Enregistrement ou mise à jour en base de données
    let document;

    if (documentId || certificationId) {
      // Mettre à jour un document existant
      const existingDoc = await prisma.document.findFirst({
        where: {
          OR: [{ id: documentId }, { id: certificationId }],
          userId: user.id, // Sécurité : s'assurer que le document appartient à l'utilisateur
        },
      });

      if (existingDoc) {
        document = await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            filename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            url,
            content: base64Content, // Stocker le contenu en base64
            validationStatus: "PENDING",
            updatedAt: new Date(),
          },
        });
      } else {
        // Créer un nouveau document si pas trouvé
        document = await prisma.document.create({
          data: {
            userId: user.id,
            type: type as any,
            filename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            url,
            content: base64Content, // Stocker le contenu en base64
            validationStatus: "PENDING",
          },
        });
      }
    } else {
      // Créer un nouveau document
      document = await prisma.document.create({
        data: {
          userId: user.id,
          type: type as any,
          filename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url,
          content: base64Content, // Stocker le contenu en base64
          validationStatus: "PENDING",
        },
      });
    }

    console.log(`✅ Document uploadé avec succès: ${document.id}`);

    // TODO: Ajouter notifications et logs d'activité quand les tables seront créées
    // Note: activityLog et notification tables non implémentées pour l'instant

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        url: document.url,
        type: document.type,
        size: document.size,
        validationStatus: document.validationStatus,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Erreur upload:", error);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    // Récupérer les documents de l'utilisateur
    const where: any = { userId: user.id };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.validationStatus = status;
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        filename: true,
        originalName: true,
        url: true,
        size: true,
        validationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("❌ Erreur récupération documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "ID du document requis" },
        { status: 400 },
      );
    }

    // Vérifier que le document appartient à l'utilisateur
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404 },
      );
    }

    // Ne pas permettre la suppression de documents validés (sauf admin)
    if (document.validationStatus === "APPROVED" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Impossible de supprimer un document validé" },
        { status: 403 },
      );
    }

    // Supprimer le document de la base
    await prisma.document.delete({
      where: { id: documentId },
    });

    // TODO: Supprimer aussi le fichier physique
    // unlink(join(process.cwd(), document.url))

    console.log(`✅ Document supprimé: ${documentId}`);

    return NextResponse.json({
      success: true,
      message: "Document supprimé avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur suppression document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 },
    );
  }
}
