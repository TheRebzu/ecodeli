import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, filename } = params;

    // Vérifier les permissions - seul le propriétaire ou un admin peut accéder
    if (userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le document depuis la base de données
    const document = await db.document.findFirst({
      where: {
        userId,
        filename,
      },
    });

    if (!document || !document.content) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Convertir le base64 en buffer
    const buffer = Buffer.from(document.content, 'base64');

    // Retourner le fichier avec les bons headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': document.mimeType,
        'Content-Length': document.size.toString(),
        'Content-Disposition': `inline; filename="${document.originalName}"`,
        'Cache-Control': 'private, max-age=3600', // Cache 1 heure pour perfs
      },
    });
  } catch (error) {
    console.error("Error serving document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
} 