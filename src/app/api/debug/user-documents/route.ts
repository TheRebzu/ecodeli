import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    // D'abord trouver le document pour obtenir l'ID utilisateur
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { userId: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Maintenant récupérer tous les documents de cet utilisateur
    const userDocuments = await db.document.findMany({
      where: { userId: document.userId },
      select: {
        id: true,
        type: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        validationStatus: true,
        content: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`📂 Found ${userDocuments.length} documents for user ${document.userId}`);

    // Mapper les documents avec les informations utiles
    const documentsInfo = userDocuments.map((doc) => ({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      validationStatus: doc.validationStatus,
      hasContent: !!doc.content,
      contentLength: doc.content ? doc.content.length : 0,
      hasUrl: !!doc.url,
      url: doc.url,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      userId: document.userId,
      totalDocuments: userDocuments.length,
      documents: documentsInfo,
    });
  } catch (error) {
    console.error("Debug user documents error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
} 