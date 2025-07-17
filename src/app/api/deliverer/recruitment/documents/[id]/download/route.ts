import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: documentId } = await params;
    
    // Vérifier si on veut télécharger ou afficher le fichier
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "true";

    // Récupérer le document
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Vérifier les permissions
    if (document.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier que le contenu existe
    if (!document.content) {
      return NextResponse.json(
        { error: "Document content not found" },
        { status: 404 },
      );
    }

    // Convertir le contenu base64 en buffer
    const fileBuffer = Buffer.from(document.content, 'base64');

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

    console.log('✅ [DOCUMENT DOWNLOAD] Fichier servi:', {
      contentType: document.mimeType,
      fileSize: fileBuffer.length,
      originalName: document.originalName,
      isDownload: download
    });

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Error downloading recruitment document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
