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
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = {
      ...(status ? { status: status } : {}),
      ...(startDate && endDate ? {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      } : {}),
      ...(search ? {
        OR: [
          { trackingNumber: { contains: search, mode: "insensitive" } },
          { client: { user: { name: { contains: search, mode: "insensitive" } } } },
          { fromAddress: { contains: search, mode: "insensitive" } },
          { toAddress: { contains: search, mode: "insensitive" } }
        ]
      } : {})
    };
    
    // Count total shipments matching the criteria
    const totalShipments = await prisma.shipment.count({
      where: whereConditions
    });
    
    // Fetch shipments with pagination
    const shipments = await prisma.shipment.findMany({
      where: whereConditions,
      include: {
        client: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        announcement: {
          select: {
            id: true,
            title: true
          }
        },
        couriers: {
          include: {
            courier: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    phone: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalShipments / limit);
    
    return NextResponse.json({
      data: shipments,
      meta: {
        total: totalShipments,
        page,
        limit,
        totalPages
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des livraisons:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des livraisons" },
      { status: 500 }
    );
  }
} 