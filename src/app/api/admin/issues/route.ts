import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    // Retrieve query parameters
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || undefined; // e.g., "PENDING", "RESOLVED"
    const priority = searchParams.get("priority") || undefined; // e.g., "LOW", "MEDIUM", "HIGH"
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = {};
    
    // Add status filter
    if (status) {
      Object.assign(whereConditions, { status });
    }
    
    // Add priority filter
    if (priority) {
      Object.assign(whereConditions, { priority });
    }
    
    // Add date range filter
    if (startDate && endDate) {
      Object.assign(whereConditions, {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      });
    }
    
    // Add search filter
    if (search) {
      Object.assign(whereConditions, {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { reportedBy: { name: { contains: search, mode: "insensitive" } } }
        ]
      });
    }
    
    // Count total issues matching criteria
    const totalIssues = await prisma.issue.count({
      where: whereConditions
    });
    
    // Fetch issues with pagination
    const issues = await prisma.issue.findMany({
      where: whereConditions,
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        relatedTo: {
          select: {
            id: true,
            trackingNumber: true,
            status: true
          }
        }
      },
      orderBy: [
        { status: "asc" }, // Pending issues first
        { priority: "desc" }, // High priority first
        { createdAt: "desc" } // Newer issues first
      ],
      skip,
      take: limit
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalIssues / limit);
    
    // Get issue counts by status
    const statusCounts = await prisma.issue.groupBy({
      by: ["status"],
      _count: {
        _all: true
      }
    });
    
    // Transform into a more usable format
    const issueStats = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {});
    
    return NextResponse.json({
      data: issues,
      meta: {
        total: totalIssues,
        page,
        limit,
        totalPages,
        stats: issueStats
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des problèmes:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des problèmes" },
      { status: 500 }
    );
  }
} 