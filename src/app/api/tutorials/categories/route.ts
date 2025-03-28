import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour créer une catégorie
const createCategorySchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(255).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  includeCount: z.enum(["true", "false"]).default("false")
});

export async function GET(req: NextRequest) {
  try {
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

    const { includeCount } = validatedQuery.data;
    const shouldIncludeCount = includeCount === "true";

    // Récupérer toutes les catégories avec le nombre de tutoriels associés
    const categories = await prisma.tutorialCategory.findMany({
      orderBy: {
        name: "asc"
      },
      ...(shouldIncludeCount ? {
        include: {
          _count: {
            select: {
              tutorials: {
                where: {
                  isPublished: true
                }
              }
            }
          }
        }
      } : {})
    });

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
        message: "Impossible de récupérer les catégories de tutoriels"
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour créer une catégorie"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des catégories"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = createCategorySchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de catégorie invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const categoryData = validatedBody.data;

    // Vérifier si une catégorie avec le même nom existe déjà
    const existingCategory = await prisma.tutorialCategory.findFirst({
      where: {
        name: {
          equals: categoryData.name,
          mode: "insensitive" as Prisma.QueryMode
        }
      }
    });

    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_EXISTS",
          message: "Une catégorie avec ce nom existe déjà"
        }
      }, { status: 400 });
    }

    // Créer la catégorie avec transaction pour l'audit log
    const result = await prisma.$transaction(async (tx) => {
      // Créer la catégorie
      const category = await tx.tutorialCategory.create({
        data: categoryData
      });

      // Générer un slug basé sur le nom
      const slug = category.name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');

      // Mettre à jour la catégorie avec le slug
      const updatedCategory = await tx.tutorialCategory.update({
        where: { id: category.id },
        data: { slug }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "TUTORIAL_CATEGORY",
          entityId: category.id,
          userId: session.user.id,
          details: JSON.stringify({
            name: category.name
          })
        }
      });

      return updatedCategory;
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la catégorie:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer la catégorie de tutoriels"
      }
    }, { status: 500 });
  }
} 