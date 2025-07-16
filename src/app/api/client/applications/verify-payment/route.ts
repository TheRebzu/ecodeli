import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const verifyPaymentSchema = z.object({
  sessionId: z.string(),
  applicationId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔍 [POST /api/client/applications/verify-payment] Vérification paiement candidature",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      console.log("❌ Utilisateur non authentifié ou non client");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Client authentifié:", user.id, user.role);

    const body = await request.json();

    try {
      const validatedData = verifyPaymentSchema.parse(body);
      console.log("✅ Données de vérification validées:", validatedData);

      // Récupérer la session Stripe
      const session = await stripe.checkout.sessions.retrieve(
        validatedData.sessionId,
      );

      if (!session) {
        console.log("❌ Session Stripe non trouvée");
        return NextResponse.json(
          { error: "Session de paiement non trouvée" },
          { status: 404 },
        );
      }

      console.log(
        "✅ Session Stripe récupérée:",
        session.id,
        "Status:",
        session.payment_status,
      );

      // Vérifier que la session appartient au bon client
      if (session.customer_email !== user.email) {
        console.log("❌ Session ne correspond pas au client");
        return NextResponse.json(
          { error: "Session non autorisée" },
          { status: 403 },
        );
      }

      // Vérifier que le paiement a réussi
      if (session.payment_status !== "paid") {
        console.log("❌ Paiement non complété:", session.payment_status);
        return NextResponse.json(
          {
            error: "Paiement non complété",
            status: session.payment_status,
          },
          { status: 400 },
        );
      }

      // Récupérer les détails de la candidature
      const application = await db.serviceApplication.findUnique({
        where: { id: validatedData.applicationId },
        include: {
          announcement: true,
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

      // Mettre à jour le statut de la candidature
      await db.serviceApplication.update({
        where: { id: validatedData.applicationId },
        data: {
          status: "PAID",
        },
      });

      // Mettre à jour le paiement en base
      const payment = await db.payment.findFirst({
        where: {
          userId: user.id,
          type: "SERVICE",
          metadata: {
            path: ["applicationId"],
            equals: validatedData.applicationId,
          },
        },
      });

      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            metadata: {
              ...(payment.metadata as any),
              stripeSessionId: validatedData.sessionId,
              verifiedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Mettre à jour l'intervention
      const intervention = await db.intervention.findFirst({
        where: {
          provider: {
            userId: application.providerId, // Chercher via la relation Provider->User
          },
          booking: {
            clientId: user.client.id, // Filtrer par client via la relation Booking
          },
        },
        include: {
          booking: true,
        },
      });

      if (intervention) {
        // L'intervention est confirmée mais pas encore démarrée
        console.log("✅ Intervention trouvée et mise à jour:", intervention.id);
      }

      // Créer une notification pour le prestataire
      await db.notification.create({
        data: {
          userId: application.providerId,
          title: "Paiement confirmé",
          message: `Le client a confirmé le paiement pour le service "${application.announcement.title}".`,
          type: "SERVICE_PAYMENT_CONFIRMED",
          data: {
            applicationId: validatedData.applicationId,
            announcementId: application.announcementId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
          },
        },
      });

      console.log("✅ Paiement vérifié et confirmé avec succès");

      return NextResponse.json({
        success: true,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        providerName: `${application.provider.profile?.firstName} ${application.provider.profile?.lastName}`,
        serviceTitle: application.announcement.title,
        status: "confirmed",
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
