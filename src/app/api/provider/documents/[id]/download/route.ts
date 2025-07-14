import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const { id: documentId } = await params;

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    if (
      document.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Accès interdit" },
        { status: 403 }
      );
    }

    // Construire le chemin du fichier
    const uploadsDir = path.join(process.cwd(), "uploads", "documents");
    const filePath = path.join(uploadsDir, document.filename);

    try {
      // Lire le fichier
      const fileBuffer = await readFile(filePath);

      // Retourner le fichier
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": document.mimeType,
          "Content-Disposition": `attachment; filename="${document.originalName}"`,
          "Content-Length": document.size.toString(),
        },
      });
    } catch (fileError) {
      console.error("Erreur lecture fichier:", fileError);
      
      // Si le fichier n'existe pas localement, essayer de rediriger vers l'URL
      if (document.url && document.url.startsWith("http")) {
        return NextResponse.redirect(document.url);
      }
      
      return NextResponse.json(
        { error: "Fichier non trouvé" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Erreur téléchargement document:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 