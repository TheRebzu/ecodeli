import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DocumentStatus, Prisma, UserRole } from "@prisma/client";

// Schema for updating a document
const updateDocumentSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  typeId: z.string().uuid().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  isPublic: z.boolean().optional(),
  expiryDate: z.string().optional().nullable(), // ISO date string
  metadata: z.record(z.string()).optional(),
  adminNotes: z.string().max(1000).optional().nullable(),
});

export async function GET(
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
            message: "You must be logged in to view document details",
          },
        },
        { status: 401 }
      );
    }

    const documentId = params.id;

    // Fetch the document with related data
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        type: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            requiredForRoles: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        verifications: {
          orderBy: {
            createdAt: "desc",
          },
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

    // Verify user has permission to view this document
    // Users can view their own documents
    // Admins can view all documents
    // Public documents can be viewed by anyone
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

    const isOwner = document.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;
    const isPublic = document.isPublic;

    if (!isOwner && !isAdmin && !isPublic) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to view this document",
          },
        },
        { status: 403 }
      );
    }

    // Return the document
    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch document",
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
            message: "You must be logged in to update a document",
          },
        },
        { status: 401 }
      );
    }

    const documentId = params.id;

    // Fetch the current state of the document
    const currentDocument = await prisma.document.findUnique({
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

    if (!currentDocument) {
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

    // Verify permissions based on user role
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

    const isOwner = currentDocument.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = updateDocumentSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid update data",
            details: validatedBody.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updateData = validatedBody.data;

    // Permission restrictions
    // 1. Regular users can update their own documents but not change status
    // 2. Admins can update any document and change status
    
    // Default update data
    const baseUpdateData: Prisma.DocumentUpdateInput = {};

    // Check if user can make these updates
    if (isOwner && !isAdmin) {
      // Owners cannot change status or add admin notes
      if (updateData.status || updateData.adminNotes) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You don't have permission to change status or add admin notes",
            },
          },
          { status: 403 }
        );
      }

      // Apply basic updates for owners
      if (updateData.title) baseUpdateData.title = updateData.title;
      if (updateData.description !== undefined) baseUpdateData.description = updateData.description;
      if (updateData.typeId) baseUpdateData.typeId = updateData.typeId;
      if (updateData.isPublic !== undefined) baseUpdateData.isPublic = updateData.isPublic;
      if (updateData.expiryDate !== undefined) {
        baseUpdateData.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null;
      }
      if (updateData.metadata) baseUpdateData.metadata = updateData.metadata;
    } else if (isAdmin) {
      // Admins can update any field
      if (updateData.title) baseUpdateData.title = updateData.title;
      if (updateData.description !== undefined) baseUpdateData.description = updateData.description;
      if (updateData.typeId) baseUpdateData.typeId = updateData.typeId;
      if (updateData.isPublic !== undefined) baseUpdateData.isPublic = updateData.isPublic;
      if (updateData.expiryDate !== undefined) {
        baseUpdateData.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null;
      }
      if (updateData.metadata) baseUpdateData.metadata = updateData.metadata;
      if (updateData.adminNotes !== undefined) baseUpdateData.adminNotes = updateData.adminNotes;
      
      // Handle status updates - only admin can do this
      if (updateData.status) {
        baseUpdateData.status = updateData.status;
        
        // If status is set to verified, update the verifiedById and verifiedAt
        if (updateData.status === DocumentStatus.VERIFIED) {
          baseUpdateData.verifiedById = session.user.id;
          baseUpdateData.verifiedAt = new Date();
        } else if (updateData.status === DocumentStatus.REJECTED) {
          // If document is rejected, clear verification info
          baseUpdateData.verifiedById = null;
          baseUpdateData.verifiedAt = null;
        }
      }
    } else {
      // Not authorized to update this document
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to update this document",
          },
        },
        { status: 403 }
      );
    }

    // If there's nothing to update, return an error
    if (Object.keys(baseUpdateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_UPDATE",
            message: "No valid update fields provided",
          },
        },
        { status: 400 }
      );
    }

    // If there's a status change, record it
    const hasStatusChange = updateData.status && updateData.status !== currentDocument.status;

    // Verify document type exists if changing
    if (updateData.typeId) {
      const documentType = await prisma.documentType.findUnique({
        where: { 
          id: updateData.typeId,
          isActive: true
        },
      });

      if (!documentType) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TYPE_NOT_FOUND",
              message: "Selected document type does not exist or is not active",
            },
          },
          { status: 404 }
        );
      }
    }

    // Update the document in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the document data
      await tx.document.update({
        where: { id: documentId },
        data: baseUpdateData,
      });

      // Create verification record if status has changed
      if (hasStatusChange) {
        await tx.documentVerification.create({
          data: {
            documentId,
            status: updateData.status!,
            notes: updateData.adminNotes || `Status updated to ${updateData.status}`,
            userId: session.user.id,
          },
        });

        // Create notification for the document owner
        if (isAdmin && currentDocument.userId !== session.user.id) {
          await tx.notification.create({
            data: {
              userId: currentDocument.userId,
              title: "Document Status Updated",
              message: `Your document "${currentDocument.title}" status has been updated to ${updateData.status}`,
              type: "DOCUMENT",
              referenceId: documentId,
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "DOCUMENT",
          entityId: documentId,
          userId: session.user.id,
          details: JSON.stringify({
            updatedFields: Object.keys(baseUpdateData),
            statusChange: hasStatusChange ? {
              from: currentDocument.status,
              to: updateData.status
            } : undefined
          })
        },
      });
    });

    // Fetch the updated document with related data
    const updatedDocument = await prisma.document.findUnique({
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
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to update document",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
            message: "You must be logged in to delete a document",
          },
        },
        { status: 401 }
      );
    }

    const documentId = params.id;

    // Fetch the current state of the document
    const currentDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!currentDocument) {
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

    // Verify permissions
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

    const isOwner = currentDocument.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;

    // Only the owner or an admin can delete a document
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to delete this document",
          },
        },
        { status: 403 }
      );
    }

    // Process the deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // First delete associated verifications
      await tx.documentVerification.deleteMany({
        where: { documentId },
      });

      // Delete document
      await tx.document.delete({
        where: { id: documentId },
      });

      // Create notification for the document owner if admin deleted it
      if (isAdmin && !isOwner) {
        await tx.notification.create({
          data: {
            userId: currentDocument.userId,
            title: "Document Deleted",
            message: `Your document "${currentDocument.title}" has been deleted by an administrator`,
            type: "DOCUMENT",
            referenceId: null,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "DOCUMENT",
          entityId: documentId,
          userId: session.user.id,
          details: JSON.stringify({
            documentTitle: currentDocument.title,
            documentType: currentDocument.typeId,
            deletedBy: isOwner ? "owner" : "admin"
          })
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to delete document",
        },
      },
      { status: 500 }
    );
  }
} 