import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour mettre à jour une catégorie
const updateCategorySchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().min(10).max(255).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isActive: z.boolean().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Déterminer si on cherche par ID ou par slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Construire la requête en fonction du type d'identifiant
    const whereClause = isUUID ? { id } : { slug: id };

    // Récupérer la catégorie avec le nombre de services
    const category = await prisma.personalServiceCategory.findUnique({
      where: whereClause,
      include: {
        _count: {
          select: {
            services: true
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Catégorie non trouvée"
        }
      }, { status: 404 });
    }

    // Récupérer quelques services de cette catégorie
    const services = await prisma.personalService.findMany({
      where: {
        categoryId: category.id,
        isActive: true
      },
      take: 5,
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        imageUrl: true,
        provider: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        services
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la catégorie:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer la catégorie"
      }
    }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour modifier une catégorie"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent modifier des catégories"
        }
      }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    // Valider les données de mise à jour
    const validatedData = updateCategorySchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de mise à jour invalides",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    // Vérifier que la catégorie existe
    const existingCategory = await prisma.personalServiceCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Catégorie non trouvée"
        }
      }, { status: 404 });
    }

    const updateData = validatedData.data;

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà pour une autre catégorie
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameExists = await prisma.personalServiceCategory.findFirst({
        where: {
          name: {
            equals: updateData.name,
            mode: "insensitive"
          },
          id: { not: id }
        }
      });

      if (nameExists) {
        return NextResponse.json({
          success: false,
          error: {
            code: "CATEGORY_NAME_EXISTS",
            message: "Une autre catégorie avec ce nom existe déjà"
          }
        }, { status: 400 });
      }

      // Mettre à jour le slug si le nom est modifié
      const slug = updateData.name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
      
      updateData.slug = slug;
    }

    // Mise à jour de la catégorie avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour la catégorie
      const updatedCategory = await tx.personalServiceCategory.update({
        where: { id },
        data: updateData
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "PERSONAL_SERVICE_CATEGORY",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            previousName: existingCategory.name,
            newName: updateData.name || existingCategory.name,
            updatedFields: Object.keys(updateData).join(", ")
          })
        }
      });

      return updatedCategory;
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la catégorie:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de mettre à jour la catégorie"
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour supprimer une catégorie"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent supprimer des catégories"
        }
      }, { status: 403 });
    }

    const { id } = params;

    // Vérifier que la catégorie existe
    const existingCategory = await prisma.personalServiceCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            services: true
          }
        }
      }
    });

    if (!existingCategory) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Catégorie non trouvée"
        }
      }, { status: 404 });
    }

    // Vérifier si la catégorie a des services associés
    if (existingCategory._count.services > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_HAS_SERVICES",
          message: "Impossible de supprimer une catégorie qui contient des services",
          details: {
            serviceCount: existingCategory._count.services
          }
        }
      }, { status: 400 });
    }

    // Supprimer la catégorie avec transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer la catégorie
      await tx.personalServiceCategory.delete({
        where: { id }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "PERSONAL_SERVICE_CATEGORY",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            name: existingCategory.name
          })
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Catégorie supprimée avec succès"
      }
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la catégorie:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de supprimer la catégorie"
      }
    }, { status: 500 });
  }
} 