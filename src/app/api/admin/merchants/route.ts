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
    const contractType = searchParams.get("contractType") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Prepare filters
    const userFilter = {
      role: "MERCHANT",
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } }
        ]
      } : {}),
      ...(status ? { status: status } : {})
    };
    
    const merchantFilter = {
      ...(contractType ? { contractType: contractType } : {})
    };
    
    // Count total merchants
    const totalMerchants = await prisma.merchant.count({
      where: {
        ...merchantFilter,
        user: userFilter
      }
    });
    
    // Fetch merchants with pagination
    const merchants = await prisma.merchant.findMany({
      where: {
        ...merchantFilter,
        user: userFilter
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        products: {
          select: {
            id: true,
            name: true
          },
          take: 5 // limit to 5 most recent products
        },
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { user: { createdAt: "desc" } },
      skip,
      take: limit,
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalMerchants / limit);
    
    // Return merchants and pagination metadata
    return NextResponse.json({
      data: merchants,
      meta: {
        total: totalMerchants,
        page,
        limit,
        totalPages,
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des commerçants:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commerçants" },
      { status: 500 }
    );
  }
} 