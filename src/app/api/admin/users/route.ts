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
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Construire les conditions de filtrage
    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    
    if (role) {
      whereConditions.role = role;
    }
    
    if (status) {
      whereConditions.status = status;
    }
    
    // Récupérer le nombre total d'utilisateurs correspondant aux critères
    const totalUsers = await prisma.user.count({
      where: whereConditions
    });
    
    // Récupérer les utilisateurs avec pagination
    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(totalUsers / limit);
    
    // Retourner les utilisateurs et les métadonnées de pagination
    return NextResponse.json({
      data: users,
      meta: {
        total: totalUsers,
        page,
        limit,
        totalPages,
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
} 