import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification et les autorisations
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Vérifier si l'utilisateur est un administrateur
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
    
    // Récupérer les paramètres de la requête
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Construire les conditions de filtrage
    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { trackingNumber: { contains: search, mode: "insensitive" } },
        { origin: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { sender: { name: { contains: search, mode: "insensitive" } } },
        { recipient: { name: { contains: search, mode: "insensitive" } } }
      ];
    }
    
    if (status) {
      whereConditions.status = status;
    }
    
    // Récupérer le nombre total de livraisons correspondant aux critères
    const totalShipments = await prisma.shipment.count({
      where: whereConditions
    });
    
    // Récupérer les livraisons avec pagination
    const shipments = await prisma.shipment.findMany({
      where: whereConditions,
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        origin: true,
        destination: true,
        createdAt: true,
        scheduledFor: true,
        sender: {
          select: {
            id: true,
            name: true,
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
          }
        },
        courier: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(totalShipments / limit);
    
    // Retourner les livraisons et les métadonnées de pagination
    return NextResponse.json({
      data: shipments,
      meta: {
        total: totalShipments,
        page,
        limit,
        totalPages,
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