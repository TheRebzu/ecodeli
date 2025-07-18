import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Vérifier que le contenu base64 existe
    if (!document.content) {
      return NextResponse.json(
        { error: "Contenu du document non trouvé" },
        { status: 404 }
      );
    }

    // Convertir le contenu base64 en buffer
    const fileBuffer = Buffer.from(document.content, 'base64');

    // Déterminer si c'est un téléchargement ou un affichage
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "true";

    // Retourner le fichier
    const headers: Record<string, string> = {
      "Content-Type": document.mimeType,
      "Content-Length": fileBuffer.length.toString(),
    };

    // Si download=true, forcer le téléchargement, sinon afficher dans le navigateur
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(document.originalName)}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${encodeURIComponent(document.originalName)}"`;
    }

    console.log('✅ [PROVIDER DOCUMENT DOWNLOAD] Fichier servi:', {
      contentType: document.mimeType,
      fileSize: fileBuffer.length,
      originalName: document.originalName,
      isDownload: download
    });

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Erreur téléchargement document:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 