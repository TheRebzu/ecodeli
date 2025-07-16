import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

const applicationSchema = z.object({
  price: z.number().positive("Le prix doit être positif"),
  estimatedDuration: z.number().positive("La durée doit être positive"),
  message: z.string().min(10, "Le message doit faire au moins 10 caractères"),
  availableDates: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🔍 [POST /api/provider/service-requests/[id]/apply] Candidature prestataire",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      console.log("❌ Utilisateur non authentifié ou non prestataire");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Prestataire authentifié:", user.id, user.role);

    const { id: announcementId } = await params;
    const body = await request.json();

    try {
      const validatedData = applicationSchema.parse(body);
      console.log("✅ Données de candidature validées");

      // Récupérer le profil prestataire
      const provider = await db.provider.findUnique({
        where: { userId: user.id },
      });

      if (!provider) {
        console.log("❌ Profil prestataire non trouvé");
        return NextResponse.json(
          { error: "Profil prestataire non trouvé" },
          { status: 404 },
        );
      }

      // Vérifier que la demande de service existe et est active
      const serviceRequest = await db.announcement.findUnique({
        where: {
          id: announcementId,
          type: "HOME_SERVICE",
          status: "ACTIVE",
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!serviceRequest) {
        console.log("❌ Demande de service non trouvée ou non active");
        return NextResponse.json(
          { error: "Demande de service non trouvée" },
          { status: 404 },
        );
      }

      // Vérifier que le prestataire n'a pas déjà candidaté
      const existingApplication = await db.serviceApplication.findFirst({
        where: {
          announcementId: announcementId,
          providerId: provider.userId, // Utiliser userId car la relation ServiceApplication.provider -> User
        },
      });

      if (existingApplication) {
        console.log("❌ Candidature déjà existante");
        return NextResponse.json(
          {
            error: "Vous avez déjà candidaté à cette demande de service",
          },
          { status: 400 },
        );
      }

      console.log("🔍 Création de la candidature...");

      // Créer la candidature avec gestion des doublons
      let application;
      try {
        application = await db.serviceApplication.create({
          data: {
            announcementId: announcementId,
            providerId: provider.userId, // Utiliser userId car la relation ServiceApplication.provider -> User
            proposedPrice: validatedData.price,
            estimatedDuration: validatedData.estimatedDuration,
            message: validatedData.message,
            status: "PENDING",
            availableDates: validatedData.availableDates || [],
          },
          include: {
          provider: {
            include: {
              profile: true,
            },
          },
          announcement: {
            include: {
              author: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      });
      } catch (error: any) {
        // Gérer l'erreur de contrainte unique (candidature déjà existante)
        if (error.code === 'P2002') {
          console.log("❌ Candidature déjà existante (contrainte unique)");
          return NextResponse.json(
            {
              error: "Vous avez déjà candidaté à cette demande de service",
            },
            { status: 400 },
          );
        }
        // Re-lancer les autres erreurs
        throw error;
      }

      console.log("✅ Candidature créée avec succès");

      // Créer une notification pour le client
      await db.notification.create({
        data: {
          userId: serviceRequest.authorId,
          title: "Nouvelle candidature reçue",
          message: `Un prestataire a candidaté à votre demande "${serviceRequest.title}"`,
          type: "SERVICE_APPLICATION",
          data: {
            announcementId: announcementId,
            applicationId: application.id,
            providerId: provider.userId,
          },
        },
      });

      // Créer une notification pour le prestataire
      await db.notification.create({
        data: {
          userId: user.id,
          title: "Candidature envoyée",
          message: `Votre candidature pour "${serviceRequest.title}" a été envoyée avec succès`,
          type: "SERVICE_APPLICATION_SENT",
          data: {},
        },
      });

      return NextResponse.json({
        success: true,
        application: {
          id: application.id,
          proposedPrice: application.proposedPrice,
          estimatedDuration: application.estimatedDuration,
          message: application.message,
          status: application.status,
          createdAt: application.createdAt,
        },
      });
    } catch (validationError) {
      console.error("❌ Erreur de validation:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Données invalides", details: validationError.issues },
          { status: 400 },
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error("❌ Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
