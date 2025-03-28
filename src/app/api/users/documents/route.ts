import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DocumentType, VerificationStatus } from "@prisma/client";

// Schema for document upload
const documentUploadSchema = z.object({
  fileUrl: z.string().url("Valid file URL is required"),
  type: z.nativeEnum(DocumentType, {
    errorMap: () => ({ message: "Invalid document type" }),
  }),
  expiryDate: z.string().datetime().optional(),
});

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user documents
    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadDate: "desc" },
    });

    return NextResponse.json({ data: documents });
  } catch (error: unknown) {
    console.error("Error fetching user documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch user documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = documentUploadSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Check if a similar document already exists and is pending or approved
    const existingDocument = await prisma.document.findFirst({
      where: {
        userId: session.user.id,
        type: validatedData.data.type,
        status: {
          in: [VerificationStatus.PENDING, VerificationStatus.APPROVED],
        },
      },
    });

    if (existingDocument) {
      return NextResponse.json(
        {
          error: "A document of this type is already uploaded and pending or approved",
          existingDocument,
        },
        { status: 409 }
      );
    }

    // Create new document record
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileUrl: validatedData.data.fileUrl,
        type: validatedData.data.type,
        status: VerificationStatus.PENDING,
        uploadDate: new Date(),
        expiryDate: validatedData.data.expiryDate
          ? new Date(validatedData.data.expiryDate)
          : null,
      },
    });

    // Create audit log for the document upload
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DOCUMENT_UPLOAD",
        entityType: "DOCUMENT",
        entityId: document.id,
        details: `User uploaded ${validatedData.data.type} document`,
      },
    });

    // If the user's verification status is pending, notify admin for verification
    if (session.user.role === "DELIVERY_PERSON" || session.user.role === "MERCHANT") {
      // Create a notification for admin to review the document
      await prisma.notification.create({
        data: {
          userId: "admin", // Assuming there's an admin user or system account
          type: "INFO",
          title: "New Document for Verification",
          message: `User ${session.user.id} has uploaded a new ${validatedData.data.type} document for verification.`,
          isRead: false,
        },
      });

      // Optionally create a support ticket for document verification
      await prisma.supportTicket.create({
        data: {
          userId: session.user.id,
          subject: "Document Verification Request",
          description: `Please verify my ${validatedData.data.type} document.`,
          priority: "MEDIUM",
          status: "OPEN",
          category: "ACCOUNT",
        },
      });
    }

    return NextResponse.json({
      data: document,
      message: "Document uploaded successfully and pending verification",
    });
  } catch (error: unknown) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
} 