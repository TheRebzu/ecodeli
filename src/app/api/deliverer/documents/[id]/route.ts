import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import { getDocumentSystemPath } from "@/lib/utils/file-path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const documentId = (await params).id;

    // Vérifier que le document appartient à l'utilisateur
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Supprimer le fichier physique
    try {
      const systemPath = getDocumentSystemPath(document.url);
      
      console.log('🔍 [DOCUMENT DELETE] Chemins:', {
        documentUrl: document.url,
        systemPath: systemPath,
        documentId: documentId
      });
      
      await unlink(systemPath);
    } catch (error) {
      console.warn("Could not delete physical file:", error);
    }

    // Supprimer l'enregistrement de la base de données
    await prisma.document.delete({
      where: {
        id: documentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
