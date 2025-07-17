import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import { getDocumentSystemPath } from "@/lib/utils/file-path";

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

    // Construire le chemin système du fichier
    const systemPath = getDocumentSystemPath(document.url);
    
    console.log('🔍 [DOCUMENT DOWNLOAD] Chemins:', {
      documentUrl: document.url,
      systemPath: systemPath,
      documentId: documentId
    });

    // Lire le fichier
    const fileBuffer = await readFile(systemPath);

    // Vérifier que le fichier a bien été lu
    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('❌ [DOCUMENT DOWNLOAD] Fichier vide ou non lu');
      return NextResponse.json(
        { error: "File is empty or could not be read" },
        { status: 500 }
      );
    }

    // S'assurer que le Content-Type est correct pour les PDF
    let contentType = document.mimeType;
    if (document.originalName.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    }

    // Retourner le fichier
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "no-cache",
      "Accept-Ranges": "bytes",
    };

    // Si download=true, forcer le téléchargement, sinon afficher dans le navigateur
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(document.originalName)}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${encodeURIComponent(document.originalName)}"`;
    }

    console.log('✅ [DOCUMENT DOWNLOAD] Fichier servi:', {
      contentType,
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
