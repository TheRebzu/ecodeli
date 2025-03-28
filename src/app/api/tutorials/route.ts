import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour créer un tutoriel
const createTutorialSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  content: z.string().min(50),
  coverImageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  estimatedDuration: z.number().int().positive().optional(),
  isPublished: z.boolean().default(false)
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  categoryId: z.string().uuid().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL"]).default("ALL"),
  search: z.string().optional(),
  tag: z.string().optional(),
  sortBy: z.enum(["createdAt", "title", "views", "likes"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  isPublished: z.enum(["true", "false", "all"]).default("true"),
});

export async function GET(req: NextRequest) {
  try {
    // Authentification optionnelle
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === UserRole.ADMIN;

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
      page,
      limit,
      categoryId,
      difficulty,
      search,
      tag,
      sortBy,
      sortOrder,
      isPublished
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Construction des conditions de filtrage
    const whereClause: Prisma.TutorialWhereInput = {};

    // Filtre par statut de publication (les non-admins ne voient que les tutoriels publiés)
    if (!isAdmin) {
      whereClause.isPublished = true;
    } else if (isPublished !== "all") {
      whereClause.isPublished = isPublished === "true";
    }

    // Filtre par catégorie
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Filtre par difficulté
    if (difficulty !== "ALL") {
      whereClause.difficulty = difficulty;
    }

    // Filtre par tag
    if (tag) {
      whereClause.tags = {
        has: tag
      };
    }

    // Recherche textuelle
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { description: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { content: { contains: search, mode: "insensitive" as Prisma.QueryMode } }
      ];
    }

    // Détermination du tri
    const orderBy: Prisma.TutorialOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Comptage total des tutoriels correspondants pour la pagination
    const totalCount = await prisma.tutorial.count({
      where: whereClause
    });

    // Récupération des tutoriels
    const tutorials = await prisma.tutorial.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    // Retourner la liste avec les métadonnées de pagination
    return NextResponse.json({
      success: true,
      data: {
        tutorials,
        meta: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des tutoriels:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les tutoriels"
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
          message: "Vous devez être connecté pour créer un tutoriel"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur a les permissions nécessaires (admin ou créateur de contenu)
    const hasPermission = session.user.role === UserRole.ADMIN || 
                         session.user.role === UserRole.CONTENT_CREATOR;
    
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'avez pas les permissions pour créer un tutoriel"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = createTutorialSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de tutoriel invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const tutorialData = validatedBody.data;

    // Vérifier que la catégorie existe
    const category = await prisma.tutorialCategory.findUnique({
      where: { id: tutorialData.categoryId }
    });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "La catégorie spécifiée n'existe pas"
        }
      }, { status: 404 });
    }

    // Créer le tutoriel avec transaction pour les opérations connexes
    const result = await prisma.$transaction(async (tx) => {
      // Créer le tutoriel
      const tutorial = await tx.tutorial.create({
        data: {
          ...tutorialData,
          authorId: session.user.id,
          // Seul un admin peut publier directement, sinon le tutoriel est en attente de validation
          isPublished: session.user.role === UserRole.ADMIN ? tutorialData.isPublished : false
        }
      });

      // Générer un slug unique basé sur le titre
      const slug = tutorial.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
      
      const uniqueSlug = `${slug}-${tutorial.id.substring(0, 8)}`;
      
      // Mettre à jour le tutoriel avec le slug
      const updatedTutorial = await tx.tutorial.update({
        where: { id: tutorial.id },
        data: { slug: uniqueSlug }
      });

      // Si l'utilisateur n'est pas un admin et que le tutoriel est demandé comme publié,
      // créer une notification pour les admins pour qu'ils valident le tutoriel
      if (session.user.role !== UserRole.ADMIN && tutorialData.isPublished) {
        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true }
        });

        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: "Nouveau tutoriel à valider",
            message: `Le tutoriel "${tutorialData.title}" a été soumis pour publication par ${session.user.name || session.user.email}`,
            type: "TUTORIAL_VALIDATION",
            referenceId: tutorial.id
          }))
        });
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "TUTORIAL",
          entityId: tutorial.id,
          userId: session.user.id,
          details: JSON.stringify({
            title: tutorial.title,
            categoryId: tutorial.categoryId,
            isPublished: tutorial.isPublished
          })
        }
      });

      return updatedTutorial;
    });

    // Récupérer le tutoriel avec les détails complets
    const tutorialWithDetails = await prisma.tutorial.findUnique({
      where: { id: result.id },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: tutorialWithDetails
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du tutoriel:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer le tutoriel"
      }
    }, { status: 500 });
  }
} 