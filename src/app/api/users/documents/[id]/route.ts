import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    // Fetch the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if the document belongs to the current user or the user is an admin
    if (document.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You don't have permission to access this document" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: document });
  } catch (error: unknown) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    // Fetch the document to check ownership
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if the document belongs to the current user or the user is an admin
    if (document.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You don't have permission to delete this document" },
        { status: 403 }
      );
    }

    // Check if the document is already approved and required for verification
    if (
      document.status === "APPROVED" &&
      (session.user.role === "DELIVERY_PERSON" || session.user.role === "MERCHANT") &&
      ["ID_CARD", "DRIVING_LICENSE", "PASSPORT"].includes(document.type)
    ) {
      // Check if there are other approved documents of the same type
      const otherApprovedDocuments = await prisma.document.count({
        where: {
          userId: session.user.id,
          type: document.type,
          status: "APPROVED",
          id: { not: documentId },
        },
      });

      if (otherApprovedDocuments === 0) {
        return NextResponse.json(
          {
            error: "Cannot delete this document as it is required for verification. Please upload a replacement first.",
          },
          { status: 403 }
        );
      }
    }

    // Delete the document
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Create audit log for the document deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DOCUMENT_DELETE",
        entityType: "DOCUMENT",
        entityId: documentId,
        details: `User deleted ${document.type} document`,
      },
    });

    return NextResponse.json({
      message: "Document deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
} 