import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    let fileBuffer: Buffer;

    // NOUVEAU: Gestion rétrocompatibilité
    if (document.content) {
      // Nouveau système: contenu base64
      console.log('📄 [DOCUMENT] Serving from base64 content');
      fileBuffer = Buffer.from(document.content, 'base64');
    } else if (document.url) {
      // Ancien système: fichier sur le disque
      console.log('📁 [DOCUMENT] Serving from filesystem (legacy)');
      
      try {
        // Construire le chemin du fichier depuis l'URL
        let filePath: string;
        
        if (document.url.startsWith('/api/storage/recruitment/')) {
          // Format: /api/storage/recruitment/userId/filename
          const pathParts = document.url.split('/');
          const userId = pathParts[4];
          const filename = pathParts[5];
          filePath = join(process.cwd(), "storage", "recruitment", userId, filename);
        } else if (document.url.startsWith('/uploads/documents/')) {
          // Format: /uploads/documents/filename  
          const filename = document.url.split('/').pop();
          filePath = join(process.cwd(), "uploads", "documents", filename!);
        } else if (document.url.startsWith('/api/uploads/documents/')) {
          // Format: /api/uploads/documents/filename
          const filename = document.url.split('/').pop();
          filePath = join(process.cwd(), "uploads", "documents", filename!);
        } else {
          throw new Error("Format d'URL non reconnu");
        }
        
        if (!existsSync(filePath)) {
          console.error(`❌ File not found on disk: ${filePath}`);
          return NextResponse.json(
            { error: "Document file not found on disk" },
            { status: 404 },
          );
        }
        
        fileBuffer = await readFile(filePath);
        console.log(`✅ File loaded from disk: ${filePath} (${fileBuffer.length} bytes)`);
        
      } catch (fileError) {
        console.error("❌ Error reading file from disk:", fileError);
        return NextResponse.json(
          { error: "Error reading document file" },
          { status: 500 },
        );
      }
    } else {
      // Aucun contenu disponible
      console.error("❌ Document has no content and no URL");
      return NextResponse.json(
        { error: "Document content not available" },
        { status: 404 },
      );
    }

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
      isDownload: download,
      source: document.content ? 'base64' : 'filesystem'
    });

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
} 