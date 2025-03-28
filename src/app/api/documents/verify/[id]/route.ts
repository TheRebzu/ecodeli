import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DocumentStatus, UserRole } from "@prisma/client";

// Schema for document verification request
const verifyDocumentSchema = z.object({
  status: z.enum([DocumentStatus.VERIFIED, DocumentStatus.REJECTED]),
  notes: z.string().max(1000).optional(),
  expiryDate: z.string().optional(), // ISO date string, for setting document expiry if verified
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to verify documents",
          },
        },
        { status: 401 }
      );
    }

    // Check if user is an admin
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    if (userFromDb.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only administrators can verify documents",
          },
        },
        { status: 403 }
      );
    }

    const documentId = params.id;

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        type: {
          select: { id: true, name: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Document not found",
          },
        },
        { status: 404 }
      );
    }

    // Check if document is already verified or rejected
    if (
      document.status === DocumentStatus.VERIFIED ||
      document.status === DocumentStatus.REJECTED
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: `Document is already ${document.status.toLowerCase()}`,
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = verifyDocumentSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid verification data",
            details: validatedBody.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { status, notes, expiryDate } = validatedBody.data;

    // Process the verification in a transaction
    await prisma.$transaction(async (tx) => {
      // Update document status
      await tx.document.update({
        where: { id: documentId },
        data: {
          status,
          verifiedById: session.user.id,
          verifiedAt: new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          adminNotes: notes,
        },
      });

      // Create verification record
      await tx.documentVerification.create({
        data: {
          documentId,
          status,
          notes: notes || `Document ${status === DocumentStatus.VERIFIED ? "verified" : "rejected"} by administrator`,
          userId: session.user.id,
        },
      });

      // Create notification for document owner
      await tx.notification.create({
        data: {
          userId: document.userId,
          title: `Document ${status === DocumentStatus.VERIFIED ? "Verified" : "Rejected"}`,
          message: 
            status === DocumentStatus.VERIFIED
              ? `Your document "${document.title}" has been verified by an administrator`
              : `Your document "${document.title}" has been rejected. Please check the admin notes for details.`,
          type: "DOCUMENT",
          referenceId: documentId,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: status === DocumentStatus.VERIFIED ? "VERIFY" : "REJECT",
          entityType: "DOCUMENT",
          entityId: documentId,
          userId: session.user.id,
          details: JSON.stringify({
            status,
            notes: notes || null,
            expiryDate: expiryDate || null,
            documentTitle: document.title,
            documentType: document.typeId
          })
        },
      });
    });

    // Fetch the updated document with related data
    const verifiedDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        type: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        verifications: {
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: verifiedDocument,
      message: `Document has been ${status === DocumentStatus.VERIFIED ? "verified" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Error verifying document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to verify document",
        },
      },
      { status: 500 }
    );
  }
} 