import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DocumentStatus, Prisma, UserRole } from "@prisma/client";

// Schema for creating a document
const createDocumentSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  typeId: z.string().uuid(),
  file: z.object({
    url: z.string().url(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number().int().positive(),
  }),
  expiryDate: z.string().optional(), // ISO date string
  isPublic: z.boolean().default(false),
  metadata: z.record(z.string()).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  typeId: z.string().uuid().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view documents"
        }
      }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Invalid query parameters",
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const {
      page,
      limit,
      search,
      typeId,
      status,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereClause: Prisma.DocumentWhereInput = {};

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by document type
    if (typeId) {
      whereClause.typeId = typeId;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Get user role for permissions
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!userFromDb) {
      return NextResponse.json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      }, { status: 404 });
    }

    // Regular users can only see their own documents
    // Admins can see all documents
    if (userFromDb.role !== UserRole.ADMIN) {
      whereClause.userId = userFromDb.id;
    }

    // Determine sorting
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Count total matching documents for pagination
    const totalCount = await prisma.document.count({
      where: whereClause
    });

    // Fetch documents
    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        fileUrl: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        expiryDate: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        type: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        verifiedBy: userFromDb.role === UserRole.ADMIN ? {
          select: {
            id: true, 
            name: true,
            image: true
          }
        } : undefined,
        metadata: true
      }
    });

    // Return list with pagination metadata
    return NextResponse.json({
      success: true,
      data: {
        documents,
        meta: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch documents"
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to upload a document"
        }
      }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const validatedBody = createDocumentSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid document data",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const {
      title,
      description,
      typeId,
      file,
      expiryDate,
      isPublic,
      metadata
    } = validatedBody.data;

    // Verify if the document type exists
    const documentType = await prisma.documentType.findUnique({
      where: { 
        id: typeId,
        isActive: true
      }
    });

    if (!documentType) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TYPE_NOT_FOUND",
          message: "Selected document type does not exist or is not active"
        }
      }, { status: 404 });
    }

    // Check file type against allowed mime types for this document type
    if (documentType.allowedMimeTypes && documentType.allowedMimeTypes.length > 0) {
      if (!documentType.allowedMimeTypes.includes(file.mimeType)) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_FILE_TYPE",
            message: `This document type only accepts: ${documentType.allowedMimeTypes.join(", ")}`
          }
        }, { status: 400 });
      }
    }

    // Check file size against document type maximum size (if specified)
    if (documentType.maxSizeKB && file.size > documentType.maxSizeKB * 1024) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: `Maximum file size for this document type is ${documentType.maxSizeKB}KB`
        }
      }, { status: 400 });
    }

    // Create document with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the document
      const document = await tx.document.create({
        data: {
          title,
          description,
          typeId,
          userId: session.user.id,
          fileUrl: file.url,
          filename: file.filename,
          mimeType: file.mimeType,
          fileSize: file.size,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isPublic,
          status: DocumentStatus.PENDING,
          metadata: metadata || {}
        }
      });

      // Create initial verification record
      await tx.documentVerification.create({
        data: {
          documentId: document.id,
          status: DocumentStatus.PENDING,
          notes: "Document submitted and pending verification",
          userId: session.user.id
        }
      });

      // Create notifications for admins about new document
      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true }
      });

      await tx.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: "New Document Uploaded",
          message: `New document uploaded: ${title}`,
          type: "DOCUMENT",
          referenceId: document.id
        }))
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "DOCUMENT",
          entityId: document.id,
          userId: session.user.id,
          details: JSON.stringify({
            title,
            typeId,
            fileSize: file.size
          })
        }
      });

      return document;
    });

    // Fetch complete created document with related data
    const createdDocument = await prisma.document.findUnique({
      where: { id: result.id },
      include: {
        type: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: createdDocument
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to upload document"
      }
    }, { status: 500 });
  }
} 