import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).default("true"),
  requiredForRole: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "usage"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
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
          message: "You must be logged in to view document types"
        }
      }, { status: 401 });
    }

    // Parse and validate query parameters
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
      search,
      isActive,
      requiredForRole,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Build filter conditions
    const whereClause: Prisma.DocumentTypeWhereInput = {};

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by active status
    if (isActive !== "all") {
      whereClause.isActive = isActive === "true";
    }

    // Filter by required for role
    if (requiredForRole) {
      whereClause.requiredForRoles = {
        has: requiredForRole
      };
    }

    // Determine sorting
    let orderBy: Prisma.DocumentTypeOrderByWithRelationInput;
    
    if (sortBy === "usage") {
      orderBy = {
        documents: {
          _count: sortOrder
        }
      };
    } else {
      orderBy = {
        [sortBy]: sortOrder
      };
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

    // Fetch document types based on criteria
    const documentTypes = await prisma.documentType.findMany({
      where: whereClause,
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        isActive: true,
        allowedMimeTypes: true,
        maxSizeKB: true,
        requiredForRoles: true,
        createdAt: true,
        ...(userFromDb.role === UserRole.ADMIN ? {
          _count: {
            select: {
              documents: true
            }
          }
        } : {})
      }
    });

    // Count document types by status
    const totalActiveCount = await prisma.documentType.count({
      where: { isActive: true }
    });

    const totalInactiveCount = await prisma.documentType.count({
      where: { isActive: false }
    });

    // Return document types with metadata
    return NextResponse.json({
      success: true,
      data: {
        documentTypes,
        meta: {
          totalCount: documentTypes.length,
          totalActiveCount,
          totalInactiveCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching document types:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch document types"
      }
    }, { status: 500 });
  }
} 