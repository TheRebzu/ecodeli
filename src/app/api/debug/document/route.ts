import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    console.log(`🔍 Searching for document: ${documentId}`);

    // Rechercher le document avec tous les détails
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
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
      console.log(`❌ Document not found: ${documentId}`);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    console.log(`✅ Document found:`, {
      id: document.id,
      type: document.type,
      originalName: document.originalName,
      hasContent: !!document.content,
      hasUrl: !!document.url,
      contentLength: document.content ? document.content.length : 0,
      size: document.size,
      userId: document.userId,
      userEmail: document.user.email,
    });

    // Retourner les détails du document
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        filename: document.filename,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        validationStatus: document.validationStatus,
        hasContent: !!document.content,
        contentLength: document.content ? document.content.length : 0,
        hasUrl: !!document.url,
        url: document.url,
        userId: document.userId,
        user: document.user,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error("Debug document error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
} 