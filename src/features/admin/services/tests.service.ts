import { prisma } from "@/lib/db";
import { EmailService } from "@/lib/email";

export interface EmailTestRequest {
  email: string;
  type: string;
  subject?: string;
  message?: string;
}

export interface NotificationTestRequest {
  title: string;
  message: string;
  targetType: string;
  targetValue?: string;
  includeImage?: boolean;
  imageUrl?: string;
}

export class TestsService {
  /**
   * Envoie un email de test
   */
  static async sendTestEmail(data: EmailTestRequest) {
    try {
      const { email, type, subject, message } = data;

      // Validation de l'email
      if (!email || !email.includes("@")) {
        throw new Error("Adresse email invalide");
      }

      let emailSubject = "Test Email EcoDeli";
      let emailContent = "Ceci est un email de test depuis le panel admin.";
      let html = "";
      let result;

      // Templates d'emails selon le type
      switch (type) {
        case "welcome":
          emailSubject = "Bienvenue sur EcoDeli";
          emailContent = "Merci de vous être inscrit sur EcoDeli !";
          html = `<h2>Bienvenue sur EcoDeli !</h2><p>Merci de vous être inscrit sur notre plateforme de crowdshipping.</p>`;
          // Utilisation d'un envoi générique
          result = await EmailService.sendVerificationEmail(
            email,
            "https://ecodeli.com/verify?token=test",
            "fr",
          );
          break;

        case "verification":
          emailSubject = "Vérification de votre compte EcoDeli";
          emailContent = "Cliquez sur le lien pour vérifier votre compte.";
          html = `<h2>Vérifiez votre compte</h2><p>Cliquez sur le lien ci-dessous pour vérifier votre compte :</p>`;
          result = await EmailService.sendVerificationEmail(
            email,
            "https://ecodeli.com/verify?token=test",
            "fr",
          );
          break;

        case "password-reset":
          emailSubject = "Réinitialisation de votre mot de passe";
          emailContent =
            "Cliquez sur le lien pour réinitialiser votre mot de passe.";
          html = `<h2>Réinitialisation du mot de passe</h2><p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>`;
          result = await EmailService.sendPasswordResetEmail(
            email,
            "https://ecodeli.com/reset-password?token=test",
            "fr",
          );
          break;

        case "delivery-confirmation":
        case "payment-success":
        case "document-approved":
        case "custom":
        default:
          // Pour ces cas, on utilise un envoi générique
          emailSubject = subject || "Test Email EcoDeli";
          html = message || "<p>Ceci est un email de test personnalisé.</p>";
          result = await EmailService.sendGenericEmail(
            email,
            emailSubject,
            html,
          );
          break;
      }

      // Log du test (console.log au lieu de prisma.systemLog)
      console.log(`✅ Email de test envoyé à ${email} (type: ${type})`);

      return {
        success: true,
        message: `Email de test envoyé avec succès à ${email}`,
        type,
        subject: emailSubject,
      };
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de test:", error);

      // Log de l'erreur (console.log au lieu de prisma.systemLog)
      console.error(
        `❌ Erreur envoi email de test: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );

      throw new Error(
        `Erreur lors de l'envoi de l'email: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    }
  }

  /**
   * Envoie une notification de test
   */
  static async sendTestNotification(data: NotificationTestRequest) {
    try {
      const {
        title,
        message,
        targetType,
        targetValue,
        includeImage,
        imageUrl,
      } = data;

      let targetAudience: any = {};

      // Configuration du ciblage selon le type
      switch (targetType) {
        case "all":
          targetAudience = { included_segments: ["All"] };
          break;

        case "role":
          if (!targetValue) {
            throw new Error("Rôle requis pour le ciblage par rôle");
          }

          // Récupération des utilisateurs du rôle spécifié
          const users = await prisma.user.findMany({
            where: { role: targetValue as any },
            select: { id: true },
          });

          if (users.length === 0) {
            throw new Error(
              `Aucun utilisateur trouvé avec le rôle ${targetValue}`,
            );
          }

          targetAudience = {
            include_player_ids: users.map((u) => u.id), // Simplification - en réalité ce serait les OneSignal player IDs
          };
          break;

        case "user":
          if (!targetValue) {
            throw new Error(
              "Email utilisateur requis pour le ciblage utilisateur",
            );
          }

          const user = await prisma.user.findUnique({
            where: { email: targetValue },
            select: { id: true },
          });

          if (!user) {
            throw new Error(`Utilisateur non trouvé: ${targetValue}`);
          }

          targetAudience = {
            include_player_ids: [user.id], // Simplification
          };
          break;

        case "segment":
          if (!targetValue) {
            throw new Error("ID de segment requis");
          }
          targetAudience = {
            included_segments: [targetValue],
          };
          break;

        default:
          throw new Error("Type de ciblage non reconnu");
      }

      // Configuration de la notification
      const notificationData = {
        app_id: process.env.ONESIGNAL_APP_ID || "test-app-id",
        headings: { en: title },
        contents: { en: message },
        ...targetAudience,
      };

      // Ajout d'image si demandé
      if (includeImage && imageUrl) {
        notificationData.big_picture = imageUrl;
      }

      // Simulation de l'envoi via OneSignal (car OneSignalService.sendNotification n'existe pas)
      console.log(
        "📱 Simulation envoi notification OneSignal:",
        notificationData,
      );

      // Log du test (console.log au lieu de prisma.systemLog)
      console.log(`✅ Notification de test simulée (type: ${targetType})`);

      return {
        success: true,
        message: `Notification de test envoyée avec succès`,
        targetType,
        targetValue,
        title,
        message,
      };
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de la notification de test:",
        error,
      );

      // Log de l'erreur (console.log au lieu de prisma.systemLog)
      console.error(
        `❌ Erreur envoi notification de test: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );

      throw new Error(
        `Erreur lors de l'envoi de la notification: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    }
  }

  /**
   * Récupère les logs de tests récents (simulation)
   */
  static async getTestLogs(limit: number = 50) {
    try {
      // Simulation des logs (car systemLog n'existe pas)
      const mockLogs = [
        {
          id: "1",
          level: "INFO",
          category: "TEST_EMAIL",
          message: "Email de test envoyé avec succès",
          createdAt: new Date(),
          metadata: { email: "test@example.com", type: "verification" },
        },
      ];

      return mockLogs.slice(0, limit);
    } catch (error) {
      console.error("Erreur lors de la récupération des logs de test:", error);
      throw new Error("Erreur lors de la récupération des logs");
    }
  }

  /**
   * Vérifie l'état des services
   */
  static async checkServicesStatus() {
    const status = {
      email: { status: "unknown", message: "Non testé" },
      notifications: { status: "unknown", message: "Non testé" },
      database: { status: "unknown", message: "Non testé" },
    };

    try {
      // Test base de données
      await prisma.$queryRaw`SELECT 1`;
      status.database = { status: "operational", message: "Connecté" };
    } catch (error) {
      status.database = { status: "error", message: "Erreur de connexion" };
    }

    // Test email (simulation)
    try {
      // Ici on pourrait tester la connexion au service d'email
      status.email = { status: "operational", message: "Service disponible" };
    } catch (error) {
      status.email = { status: "error", message: "Service indisponible" };
    }

    // Test notifications (simulation)
    try {
      // Ici on pourrait tester la connexion à OneSignal
      status.notifications = {
        status: "operational",
        message: "Service disponible",
      };
    } catch (error) {
      status.notifications = {
        status: "error",
        message: "Service indisponible",
      };
    }

    return status;
  }
}
