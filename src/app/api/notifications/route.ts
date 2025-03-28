import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Query params schema for validation
const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  isRead: z.enum(["true", "false", "all"]).optional().default("all"),
  type: z.string().optional(),
  startDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)), 
    { message: "Invalid date format" }
  ),
  endDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format" }
  ),
  sortBy: z.enum(["createdAt", "expiresAt", "type"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      isRead: searchParams.get("isRead") || "all",
      type: searchParams.get("type"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    const validatedParams = queryParamsSchema.parse(queryParams);
    
    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;
    
    // Build where clause
    const whereClause: any = {
      userId: session.user.id,
    };
    
    // Filter by read status
    if (validatedParams.isRead !== "all") {
      whereClause.isRead = validatedParams.isRead === "true";
    }
    
    // Filter by notification type
    if (validatedParams.type) {
      whereClause.type = validatedParams.type;
    }
    
    // Date filtering
    if (validatedParams.startDate || validatedParams.endDate) {
      whereClause.createdAt = {};
      
      if (validatedParams.startDate) {
        whereClause.createdAt.gte = new Date(validatedParams.startDate);
      }
      
      if (validatedParams.endDate) {
        // Add one day to include the end date
        const endDate = new Date(validatedParams.endDate);
        endDate.setDate(endDate.getDate() + 1);
        whereClause.createdAt.lt = endDate;
      }
    }
    
    // Get notifications count for pagination
    const totalCount = await prisma.notification.count({
      where: whereClause,
    });
    
    // Fetch notifications with pagination and sorting
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        [validatedParams.sortBy]: validatedParams.sortOrder,
      },
      skip,
      take: validatedParams.limit,
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    
    // Return notifications with pagination metadata
    return NextResponse.json({
      data: notifications,
      meta: {
        currentPage: validatedParams.page,
        totalPages,
        totalCount,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
} 