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
    const verifiedOnly = searchParams.get("verified") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Find all courier users that match criteria
    const users = await prisma.user.findMany({
      where: {
        role: "COURIER",
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        } : {}),
        ...(status ? { status: status } : {})
      },
      select: {
        id: true,
        courier: {
          select: {
            id: true,
            vehicleType: true,
            licenseNumber: true,
            licensePlate: true,
            verifiedDocuments: true,
            rating: true,
            nfcCardId: true
          }
        }
      }
    });
    
    // Filter by verified documents if requested
    const filteredUsers = verifiedOnly 
      ? users.filter(user => user.courier?.verifiedDocuments)
      : users;
    
    // Get courier IDs
    const courierIds = filteredUsers
      .filter(user => user.courier)
      .map(user => user.courier?.id)
      .filter(Boolean) as string[];
    
    // Fetch full courier data for the filtered IDs
    const couriers = await prisma.courier.findMany({
      where: {
        id: {
          in: courierIds
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            phone: true,
          }
        }
      },
      orderBy: { user: { createdAt: "desc" } },
      skip,
      take: limit,
    });
    
    // Count total couriers that match the criteria
    const totalCouriers = courierIds.length;
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCouriers / limit);
    
    // Return couriers and pagination metadata
    return NextResponse.json({
      data: couriers,
      meta: {
        total: totalCouriers,
        page,
        limit,
        totalPages,
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des livreurs:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des livreurs" },
      { status: 500 }
    );
  }
} 