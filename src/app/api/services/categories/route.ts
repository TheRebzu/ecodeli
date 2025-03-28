import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).default("true"),
  sortBy: z.enum(["name", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authentification facultative pour cette route
    const session = await getServerSession(authOptions);

    // Analyse des paramètres de requête
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Paramètres de requête invalides",
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const {
      search,
      isActive,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Construction des conditions de filtrage
    const whereClause: Prisma.ServiceCategoryWhereInput = {};

    // Filtre par recherche
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    // Filtre par statut actif
    if (isActive !== "all") {
      whereClause.isActive = isActive === "true";
    }

    // Récupération des catégories
    const categories = await prisma.serviceCategory.findMany({
      where: whereClause,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        _count: {
          select: {
            services: true
          }
        }
      }
    });

    // Retourner la liste
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les catégories"
      }
    }, { status: 500 });
  }
} 