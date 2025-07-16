import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const paymentSchema = z.object({
  paymentMethod: z.enum(["CARD", "WALLET", "BANK_TRANSFER"]),
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🔍 [POST /api/client/applications/[id]/pay] Paiement service par client",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      console.log("❌ Utilisateur non authentifié ou non client");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Client authentifié:", user.id, user.role);

    // Vérifier que le profil client existe
    if (!user.client) {
      console.log("❌ Profil client introuvable");
      return NextResponse.json(
        { error: "Profil client introuvable" },
        { status: 400 },
      );
    }

    const { id: applicationId } = await params;
    const body = await request.json();

    try {
      const validatedData = paymentSchema.parse(body);
      console.log("✅ Données de paiement validées:", validatedData);

      // Vérifier que la candidature existe et a été acceptée
      const application = await db.serviceApplication.findUnique({
        where: { id: applicationId },
        include: {
          announcement: {
            include: {
              author: true,
              ServiceAnnouncement: true,
            },
          },
          provider: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!application) {
        console.log("❌ Candidature non trouvée");
        return NextResponse.json(
          { error: "Candidature non trouvée" },
          { status: 404 },
        );
      }

      // Vérifier que le client est bien l'auteur de la demande de service
      if (application.announcement.authorId !== user.id) {
        console.log("❌ Accès non autorisé à cette candidature");
        return NextResponse.json(
          { error: "Accès non autorisé" },
          { status: 403 },
        );
      }

      // Vérifier que la candidature a été acceptée ou est en attente de paiement (retry)
      console.log("🔍 Statut actuel de la candidature:", application.status);
      if (!["ACCEPTED", "PAYMENT_PENDING"].includes(application.status)) {
        console.log("❌ Candidature non acceptée - statut:", application.status);
        return NextResponse.json(
          {
            error: `Cette candidature n'a pas été acceptée (statut: ${application.status})`,
          },
          { status: 400 },
        );
      }

      // Vérifier que le service n'a pas déjà été payé avec succès
      const existingPayment = await db.payment.findFirst({
        where: {
          userId: user.id,
          type: "SERVICE",
          metadata: {
            path: ["applicationId"],
            equals: applicationId,
          },
        },
      });

      if (existingPayment && existingPayment.status === "COMPLETED") {
        console.log("❌ Service déjà payé avec succès");
        return NextResponse.json(
          {
            error: "Ce service a déjà été payé",
          },
          { status: 400 },
        );
      }

      // Si un paiement existe mais n'est pas completed, le supprimer pour permettre un retry propre
      if (existingPayment && existingPayment.status !== "COMPLETED") {
        console.log("🔍 Suppression du paiement existant non completed pour retry propre");
        await db.payment.delete({
          where: { id: existingPayment.id },
        });
      }

      console.log("🔍 Création du paiement Stripe...");

      // Créer le PaymentIntent Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(validatedData.amount * 100), // Stripe utilise les centimes
        currency: validatedData.currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          applicationId: applicationId,
          announcementId: application.announcementId,
          providerId: application.providerId,
          proposedPrice: application.proposedPrice?.toString() || "0",
          estimatedDuration: application.estimatedDuration?.toString() || "0",
          type: "service_payment",
        },
        description: `Paiement service - ${application.announcement.title}`,
        receipt_email: user.email,
      });

      // Créer l'enregistrement de paiement en base
      const payment = await db.payment.create({
        data: {
          userId: user.id,
          amount: validatedData.amount,
          currency: validatedData.currency,
          status: "PENDING",
          type: "SERVICE",
          paymentMethod: validatedData.paymentMethod,
          stripePaymentId: paymentIntent.id,
          metadata: {
            applicationId: applicationId,
            announcementId: application.announcementId,
            providerId: application.providerId,
            proposedPrice: application.proposedPrice,
            estimatedDuration: application.estimatedDuration,
            stripePaymentIntentId: paymentIntent.id,
          },
        },
      });

      console.log("✅ PaymentIntent Stripe créé:", paymentIntent.id);
      console.log("✅ Paiement en base créé:", payment.id);

      // Mettre à jour le statut de la candidature (en attente de confirmation Stripe)
      await db.serviceApplication.update({
        where: { id: applicationId },
        data: {
          status: "PAYMENT_PENDING",
        },
      });

      console.log("✅ Candidature mise à jour: PAYMENT_PENDING");

      // Créer une notification pour le prestataire
      await db.notification.create({
        data: {
          userId: application.provider.id,
          title: "Paiement en cours",
          message: `Le client a initié le paiement pour le service "${application.announcement.title}".`,
          type: "SERVICE_PAYMENT_PENDING",
          data: {
            applicationId: applicationId,
            announcementId: application.announcementId,
            paymentId: payment.id,
            amount: validatedData.amount,
          },
        },
      });

      console.log("✅ Notification créée pour le prestataire");

      // Récupérer le Provider correspondant au User
      const providerProfile = await db.provider.findUnique({
        where: { userId: application.providerId }
      });

      if (!providerProfile) {
        console.error("❌ Aucun profil prestataire trouvé pour l'utilisateur:", application.providerId);
        return NextResponse.json(
          { 
            success: false, 
            error: "PROVIDER_NOT_FOUND",
            message: "Profil prestataire introuvable" 
          },
          { status: 404 }
        );
      }

      console.log("✅ Profil prestataire trouvé:", providerProfile.id);

      // Créer ou récupérer un service basé sur l'annonce
      let service = await db.service.findFirst({
        where: {
          providerId: providerProfile.id,
          name: application.announcement.title,
          type: application.announcement.ServiceAnnouncement?.serviceType || "HOME_SERVICE"
        }
      });

      if (!service) {
        // Créer un service temporaire basé sur l'annonce
        service = await db.service.create({
          data: {
            providerId: providerProfile.id,
            name: application.announcement.title,
            description: application.announcement.description || "Service basé sur une demande client",
            type: application.announcement.ServiceAnnouncement?.serviceType || "HOME_SERVICE",
            basePrice: validatedData.amount,
            priceUnit: "FLAT",
            duration: application.estimatedDuration || 60,
            isActive: true,
          }
        });
        console.log("✅ Service temporaire créé:", service.id);
      } else {
        console.log("✅ Service existant trouvé:", service.id);
      }

      // Créer d'abord un booking après validation du paiement
      const booking = await db.booking.create({
        data: {
          clientId: user.client.id,
          providerId: providerProfile.id, // Utiliser l'ID du Provider, pas du User
          serviceId: service.id, // Utiliser l'ID du Service créé ou trouvé
          status: "CONFIRMED",
          scheduledDate: new Date(), // À adapter selon les besoins
          scheduledTime: "09:00", // Heure par défaut, à adapter
          duration: application.estimatedDuration || 60,
          address: {
            address: "À définir",
            city: "À définir", 
            postalCode: "00000",
            lat: 0,
            lng: 0
          },
          totalPrice: validatedData.amount,
          notes: `Réservation automatique suite au paiement de la candidature ${applicationId}`,
        },
      });

      console.log("✅ Booking créé:", booking.id);

      // Trouver le provider correspondant au user de l'application
      const provider = await db.provider.findUnique({
        where: { userId: application.providerId },
      });

      if (!provider) {
        console.log("❌ Provider non trouvé pour userId:", application.providerId);
        throw new Error(`Provider non trouvé pour l'utilisateur ${application.providerId}`);
      }

      console.log("✅ Provider trouvé:", provider.id);

      // Créer l'intervention liée au booking
      const intervention = await db.intervention.create({
        data: {
          bookingId: booking.id,
          providerId: provider.id,
          isCompleted: false,
        },
      });

      console.log("✅ Intervention créée (liée au booking):", intervention.id);

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
        },
        stripe: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        },
        booking: {
          id: booking.id,
          status: booking.status,
          scheduledDate: booking.scheduledDate,
        },
        intervention: {
          id: intervention.id,
          isCompleted: intervention.isCompleted,
        },
      });
    } catch (validationError) {
      console.error("❌ Erreur de validation:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Données invalides", details: validationError.errors },
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
