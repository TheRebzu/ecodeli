import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour mettre à jour un tutoriel
const updateTutorialSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  content: z.string().min(50).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  estimatedDuration: z.number().int().positive().optional().nullable(),
  isPublished: z.boolean().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === UserRole.ADMIN;

    // Déterminer si on cherche par ID ou par slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Construire la requête en fonction du type d'identifiant
    const whereClause = isUUID ? { id } : { slug: id };

    // Récupérer le tutoriel avec ses détails
    const tutorial = await prisma.tutorial.findUnique({
      where: whereClause,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true
          }
        },
        comments: {
          orderBy: {
            createdAt: "desc"
          },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
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

    if (!tutorial) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TUTORIAL_NOT_FOUND",
          message: "Tutoriel non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier si l'utilisateur peut voir le tutoriel non publié
    if (!tutorial.isPublished && !isAdmin && (!session || session.user.id !== tutorial.authorId)) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TUTORIAL_NOT_AVAILABLE",
          message: "Ce tutoriel n'est pas encore publié"
        }
      }, { status: 403 });
    }

    // Mettre à jour le compteur de vues
    await prisma.tutorial.update({
      where: { id: tutorial.id },
      data: {
        views: {
          increment: 1
        }
      }
    });

    // Vérifier si l'utilisateur a aimé ce tutoriel
    let userLiked = false;
    if (session?.user) {
      const like = await prisma.tutorialLike.findUnique({
        where: {
          userId_tutorialId: {
            userId: session.user.id,
            tutorialId: tutorial.id
          }
        }
      });
      userLiked = !!like;
    }

    // Vérifier si l'utilisateur a sauvegardé ce tutoriel
    let userSaved = false;
    if (session?.user) {
      const save = await prisma.savedTutorial.findUnique({
        where: {
          userId_tutorialId: {
            userId: session.user.id,
            tutorialId: tutorial.id
          }
        }
      });
      userSaved = !!save;
    }

    // Récupérer des tutoriels similaires
    const similarTutorials = await prisma.tutorial.findMany({
      where: {
        id: { not: tutorial.id },
        isPublished: true,
        OR: [
          { categoryId: tutorial.categoryId },
          { difficulty: tutorial.difficulty },
          { tags: { hasSome: tutorial.tags || [] } }
        ]
      },
      orderBy: {
        views: "desc"
      },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverImageUrl: true,
        difficulty: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...tutorial,
        userInteractions: {
          liked: userLiked,
          saved: userSaved
        },
        similarTutorials
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du tutoriel:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer le tutoriel"
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
          message: "Vous devez être connecté pour modifier un tutoriel"
        }
      }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    // Valider les données de mise à jour
    const validatedData = updateTutorialSchema.safeParse(body);
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

    // Vérifier que le tutoriel existe
    const tutorial = await prisma.tutorial.findUnique({
      where: { id }
    });

    if (!tutorial) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TUTORIAL_NOT_FOUND",
          message: "Tutoriel non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier les permissions: soit l'auteur, soit un admin
    const isAuthor = tutorial.authorId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à modifier ce tutoriel"
        }
      }, { status: 403 });
    }

    const updateData = validatedData.data;

    // Si l'utilisateur n'est pas admin, il ne peut pas publier directement
    if (!isAdmin && updateData.isPublished === true && !tutorial.isPublished) {
      // Marquer comme en attente de publication, mais pas encore publié
      updateData.isPublished = false;
    }

    // Si la catégorie est modifiée, vérifier qu'elle existe
    if (updateData.categoryId) {
      const category = await prisma.tutorialCategory.findUnique({
        where: { id: updateData.categoryId }
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
    }

    // Si le titre est modifié, mettre à jour le slug
    let slugUpdate = {};
    if (updateData.title) {
      const slug = updateData.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
      
      const uniqueSlug = `${slug}-${id.substring(0, 8)}`;
      slugUpdate = { slug: uniqueSlug };
    }

    // Mettre à jour le tutoriel avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le tutoriel
      const updatedTutorial = await tx.tutorial.update({
        where: { id },
        data: {
          ...updateData,
          ...slugUpdate
        }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "TUTORIAL",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            previousTitle: tutorial.title,
            newTitle: updateData.title || tutorial.title,
            isPublished: updatedTutorial.isPublished
          })
        }
      });

      // Si un utilisateur normal demande la publication, notifier les administrateurs
      if (!isAdmin && updateData.isPublished === true && !tutorial.isPublished) {
        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true }
        });

        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: "Tutoriel à valider",
            message: `Le tutoriel "${updatedTutorial.title}" a été soumis pour publication par ${session.user.name || session.user.email}`,
            type: "TUTORIAL_VALIDATION",
            referenceId: updatedTutorial.id
          }))
        });
      }

      // Si un admin publie un tutoriel, notifier l'auteur
      if (isAdmin && !isAuthor && updateData.isPublished === true && !tutorial.isPublished) {
        await tx.notification.create({
          data: {
            userId: tutorial.authorId,
            title: "Votre tutoriel a été publié",
            message: `Votre tutoriel "${updatedTutorial.title}" a été approuvé et publié`,
            type: "TUTORIAL_PUBLISHED",
            referenceId: updatedTutorial.id
          }
        });
      }

      return updatedTutorial;
    });

    // Récupérer le tutoriel mis à jour avec ses détails
    const updatedTutorialWithDetails = await prisma.tutorial.findUnique({
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
      data: updatedTutorialWithDetails
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du tutoriel:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de mettre à jour le tutoriel"
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
          message: "Vous devez être connecté pour supprimer un tutoriel"
        }
      }, { status: 401 });
    }

    const { id } = params;

    // Vérifier que le tutoriel existe
    const tutorial = await prisma.tutorial.findUnique({
      where: { id },
      include: {
        comments: {
          select: { id: true }
        },
        likes: {
          select: { userId: true }
        }
      }
    });

    if (!tutorial) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TUTORIAL_NOT_FOUND",
          message: "Tutoriel non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier les permissions: soit l'auteur, soit un admin
    const isAuthor = tutorial.authorId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à supprimer ce tutoriel"
        }
      }, { status: 403 });
    }

    // Supprimer le tutoriel et ses données associées dans une transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer les commentaires
      await tx.tutorialComment.deleteMany({
        where: { tutorialId: id }
      });

      // Supprimer les likes
      await tx.tutorialLike.deleteMany({
        where: { tutorialId: id }
      });

      // Supprimer les sauvegardes
      await tx.savedTutorial.deleteMany({
        where: { tutorialId: id }
      });

      // Supprimer le tutoriel
      await tx.tutorial.delete({
        where: { id }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "TUTORIAL",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            title: tutorial.title,
            authorId: tutorial.authorId
          })
        }
      });

      // Notifier l'auteur si supprimé par un admin
      if (isAdmin && !isAuthor) {
        await tx.notification.create({
          data: {
            userId: tutorial.authorId,
            title: "Votre tutoriel a été supprimé",
            message: `Votre tutoriel "${tutorial.title}" a été supprimé par un administrateur`,
            type: "TUTORIAL_DELETED",
            referenceId: null
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Tutoriel supprimé avec succès"
      }
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du tutoriel:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de supprimer le tutoriel"
      }
    }, { status: 500 });
  }
} 