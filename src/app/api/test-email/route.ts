import { NextResponse } from "next/server";
import { EmailService } from "@/lib/email";

/**
 * Route de test pour l'envoi d'emails
 * ATTENTION: Ne pas utiliser en production ou limiter l'accès à cette route
 */
export async function POST(req: Request) {
  // Route protégée pour l'environnement de production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: "Cette route n'est pas disponible en production" },
      { status: 403 }
    );
  }

  try {
    const { email, template = 'welcome' } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email requis" },
        { status: 400 }
      );
    }

    let result;

    switch (template) {
      case 'welcome':
        result = await EmailService.sendWelcomeEmail(
          email,
          "Utilisateur Test",
          "https://ecodeli.me/verify-email?token=test-token-123456"
        );
        break;
      case 'reset':
        result = await EmailService.sendPasswordResetEmail(
          email,
          "Utilisateur Test",
          "https://ecodeli.me/reset-password?token=test-token-123456"
        );
        break;
      case 'verification':
        result = await EmailService.sendActionConfirmationEmail(
          email,
          "Utilisateur Test",
          "vérification d'email",
          "Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter pleinement des services EcoDeli."
        );
        break;
      case 'security':
        result = await EmailService.sendSecurityAlertEmail(
          email,
          "Utilisateur Test",
          {
            type: "Connexion inhabituelle",
            details: "Nous avons détecté une connexion à votre compte depuis un nouvel appareil ou un nouvel emplacement.",
            time: new Date().toLocaleString('fr-FR'),
            location: "Paris, France",
            device: "Chrome sur Windows",
            ip: "123.45.67.89",
            actionLink: "https://ecodeli.me/account/security",
            actionText: "Vérifier l'activité de mon compte"
          }
        );
        break;
      case 'delivery':
        result = await EmailService.sendDeliveryNotificationEmail(
          email,
          "Utilisateur Test",
          {
            id: "DEL123456",
            trackingCode: "ECO-987654",
            status: "EN COURS DE LIVRAISON",
            estimatedDelivery: "Demain, entre 10h et 12h",
            origin: "Paris",
            destination: "Lyon",
            details: "Votre colis est en route. Le livreur vous contactera à l'approche.",
            trackingLink: "https://ecodeli.me/track/DEL123456"
          }
        );
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Template d'email non reconnu" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Email de test '${template}' envoyé à ${email}`,
      result
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de test:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue lors de l'envoi de l'email",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}