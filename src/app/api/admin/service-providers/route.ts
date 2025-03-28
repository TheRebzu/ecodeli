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
    const status = searchParams.get("status") || undefined;
    const serviceType = searchParams.get("serviceType") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Build search queries
    let whereClause = {};
    
    // Base filter: user must be a provider
    whereClause = {
      user: {
        role: "PROVIDER"
      }
    };
    
    // Add search filter if provided
    if (search) {
      whereClause = {
        ...whereClause,
        user: {
          ...whereClause.user,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        }
      };
    }
    
    // Add status filter if provided
    if (status) {
      whereClause = {
        ...whereClause,
        user: {
          ...whereClause.user,
          status
        }
      };
    }
    
    // Add service type filter if provided
    if (serviceType) {
      whereClause = {
        ...whereClause,
        serviceTypes: {
          has: serviceType
        }
      };
    }
    
    // Find service providers matching the criteria
    const providers = await prisma.provider.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            phone: true,
            address: true,
            city: true,
            createdAt: true
          }
        },
        services: {
          take: 5,
          select: {
            id: true,
            type: true,
            status: true,
            scheduledDate: true
          }
        }
      },
      orderBy: { user: { createdAt: "desc" } },
      skip,
      take: limit
    });
    
    // Count total providers matching criteria
    const totalProviders = await prisma.provider.count({
      where: whereClause
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalProviders / limit);
    
    return NextResponse.json({
      data: providers,
      meta: {
        total: totalProviders,
        page,
        limit,
        totalPages
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des prestataires:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des prestataires" },
      { status: 500 }
    );
  }
} 