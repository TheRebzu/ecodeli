import { NextRequest, NextResponse } from "next/server";
import { EmailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, type, subject, message } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "verification":
        // Test email de vérification
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/fr/verify-email?token=test-token-123`;
        result = await EmailService.sendVerificationEmail(email, verificationUrl, "fr");
        break;

      case "password-reset":
        // Test email de reset de mot de passe
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/fr/reset-password?token=test-reset-token-123`;
        result = await EmailService.sendPasswordResetEmail(email, resetUrl, "fr");
        break;

      case "booking-confirmation":
        // Test email de confirmation de réservation
        result = await EmailService.sendBookingConfirmationEmail(
          email,
          {
            clientName: "Test Client",
            serviceName: "Service de test",
            providerName: "Prestataire Test",
            scheduledDate: "2025-01-20",
            scheduledTime: "14:00",
            location: "Paris, France",
            totalPrice: 50.00,
            bookingId: "test-booking-123",
            notes: "Note de test"
          },
          "fr"
        );
        break;

      case "new-booking-notification":
        // Test email de notification de nouvelle réservation
        result = await EmailService.sendNewBookingNotificationEmail(
          email,
          {
            providerName: "Prestataire Test",
            clientName: "Client Test",
            serviceName: "Service de test",
            scheduledDate: "2025-01-20",
            scheduledTime: "14:00",
            location: "Paris, France",
            totalPrice: 50.00,
            bookingId: "test-booking-123",
            notes: "Note de test"
          },
          "fr"
        );
        break;

      case "custom":
        // Test email personnalisé
        if (!subject || !message) {
          return NextResponse.json(
            { error: "Sujet et message requis pour l'email personnalisé" },
            { status: 400 }
          );
        }
        result = await EmailService.sendGenericEmail(email, subject, message);
        break;

      default:
        return NextResponse.json(
          { error: "Type d'email non supporté" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Email de test envoyé avec succès (${type})`,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Erreur envoi email de test:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de l'envoi de l'email",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Test de connexion SMTP
    const result = await EmailService.testConnection();
    
    return NextResponse.json({
      success: true,
      message: "Connexion SMTP réussie",
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user: process.env.GMAIL_USER ? "configuré" : "non configuré"
      }
    });
  } catch (error) {
    console.error("Erreur test connexion SMTP:", error);
    return NextResponse.json(
      { 
        error: "Erreur de connexion SMTP",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}
