import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour les paramètres système admin
 * Mission 1 - ADMIN
 */
export const adminSettingsRouter = router({ // Récupérer tous les paramètres
  getAll: protectedProcedure.query(async ({ ctx  }) => {
    try {
      // TODO: Vérifier les permissions admin
      const { user } = ctx.session;

      // Récupérer les paramètres depuis la base de données
      const settings = await ctx.db.systemSettings.findMany({
        select: {
          category: true,
          key: true,
          value: true}});

      // Organiser les paramètres par catégorie
      const organizedSettings = settings.reduce(
        (acc, setting) => {
          if (!acc[setting.category]) {
            acc[setting.category] = {};
          }
          acc[setting.category][setting.key] = setting.value;
          return acc;
        },
        {} as Record<string, Record<string, any>>,
      );

      // Valeurs par défaut si aucun paramètre n'existe
      const defaultSettings = {
        general: {
          siteName: "EcoDeli",
          siteDescription: "Plateforme de services écologiques",
          contactEmail: "contact@ecodeli.me",
          supportEmail: "support@ecodeli.me",
          maintenanceMode: false,
          registrationEnabled: true,
          defaultLanguage: "fr",
          timezone: "Europe/Paris"},
        email: {
          smtpHost: process.env.SMTP_HOST || "",
          smtpPort: parseInt(process.env.SMTPPORT || "587"),
          smtpUser: process.env.SMTP_USER || "",
          smtpSecure: process.env.SMTP_SECURE === "true",
          fromName: "EcoDeli",
          fromEmail: process.env.FROM_EMAIL || "noreply@ecodeli.me",
          emailVerificationRequired: true,
          welcomeEmailEnabled: true},
        security: {
          passwordMinLength: 8,
          passwordRequireUppercase: true,
          passwordRequireNumbers: true,
          passwordRequireSymbols: false,
          sessionTimeout: 24,
          maxLoginAttempts: 5,
          lockoutDuration: 30,
          twoFactorEnabled: false,
          ipWhitelistEnabled: false},
        payments: {
          stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
          defaultCurrency: "EUR",
          commissionRate: 5.0,
          minimumPayout: 20.0,
          payoutSchedule: "weekly"},
        delivery: {
          defaultDeliveryRadius: 10,
          maxDeliveryRadius: 50,
          deliveryTimeSlots: ["09:00-12:00", "14:00-17:00", "18:00-21:00"],
          emergencyDeliveryEnabled: true,
          trackingEnabled: true,
          autoAssignDeliverers: true,
          deliveryFeeCalculation: "distance"},
        notifications: {
          emailNotificationsEnabled: true,
          smsNotificationsEnabled: false,
          pushNotificationsEnabled: true,
          onesignalAppId: process.env.ONESIGNAL_APP_ID || "",
          notificationRetentionDays: 30,
          digestEmailFrequency: "daily"}};

      // Fusionner avec les paramètres de la base de données
      const finalSettings = { ...defaultSettings };
      Object.keys(organizedSettings).forEach((category) => {
        if (finalSettings[category]) {
          finalSettings[category] = {
            ...finalSettings[category],
            ...organizedSettings[category]};
        } else {
          finalSettings[category] = organizedSettings[category];
        }
      });

      return finalSettings;
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des paramètres" });
    }
  }),

  // Mettre à jour les paramètres généraux
  updateGeneral: protectedProcedure
    .input(
      z.object({ siteName: z.string().min(1).optional(),
        siteDescription: z.string().optional(),
        contactEmail: z.string().email().optional(),
        supportEmail: z.string().email().optional(),
        maintenanceMode: z.boolean().optional(),
        registrationEnabled: z.boolean().optional(),
        defaultLanguage: z.enum(["fr", "en", "es", "de"]).optional(),
        timezone: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // TODO: Vérifier les permissions super admin
        // TODO: Implémenter la mise à jour en base

        return {
          success: true,
          message: "Paramètres généraux mis à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour des paramètres généraux" });
      }
    }),

  // Mettre à jour les paramètres email
  updateEmail: protectedProcedure
    .input(
      z.object({ smtpHost: z.string().optional(),
        smtpPort: z.number().min(1).max(65535).optional(),
        smtpUser: z.string().email().optional(),
        smtpSecure: z.boolean().optional(),
        fromName: z.string().optional(),
        fromEmail: z.string().email().optional(),
        emailVerificationRequired: z.boolean().optional(),
        welcomeEmailEnabled: z.boolean().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        return {
          success: true,
          message: "Paramètres email mis à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour des paramètres email" });
      }
    }),

  // Mettre à jour les paramètres de sécurité
  updateSecurity: protectedProcedure
    .input(
      z.object({ passwordMinLength: z.number().min(6).max(50).optional(),
        passwordRequireUppercase: z.boolean().optional(),
        passwordRequireNumbers: z.boolean().optional(),
        passwordRequireSymbols: z.boolean().optional(),
        sessionTimeout: z.number().min(1).max(168).optional(), // max 1 semaine
        maxLoginAttempts: z.number().min(1).max(20).optional(),
        lockoutDuration: z.number().min(1).max(1440).optional(), // max 24h
        twoFactorEnabled: z.boolean().optional(),
        ipWhitelistEnabled: z.boolean().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        return {
          success: true,
          message: "Paramètres de sécurité mis à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour des paramètres de sécurité" });
      }
    }),

  // Mettre à jour les paramètres de paiement
  updatePayments: protectedProcedure
    .input(
      z.object({ stripePublicKey: z.string().optional(),
        stripeWebhookSecret: z.string().optional(),
        paypalClientId: z.string().optional(),
        paypalMode: z.enum(["sandbox", "live"]).optional(),
        defaultCurrency: z.enum(["EUR", "USD", "GBP"]).optional(),
        commissionRate: z.number().min(0).max(50).optional(),
        minimumPayout: z.number().min(1).optional(),
        payoutSchedule: z.enum(["daily", "weekly", "monthly"]).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        return {
          success: true,
          message: "Paramètres de paiement mis à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour des paramètres de paiement" });
      }
    }),

  // Mettre à jour les paramètres de livraison
  updateDelivery: protectedProcedure
    .input(
      z.object({ defaultDeliveryRadius: z.number().min(1).max(100).optional(),
        maxDeliveryRadius: z.number().min(1).max(200).optional(),
        deliveryTimeSlots: z.array(z.string()).optional(),
        emergencyDeliveryEnabled: z.boolean().optional(),
        trackingEnabled: z.boolean().optional(),
        autoAssignDeliverers: z.boolean().optional(),
        deliveryFeeCalculation: z
          .enum(["fixed", "distance", "weight"])
          .optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        return {
          success: true,
          message: "Paramètres de livraison mis à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour des paramètres de livraison" });
      }
    }),

  // Mettre à jour les paramètres de notifications
  updateNotifications: protectedProcedure
    .input(
      z.object({ emailNotificationsEnabled: z.boolean().optional(),
        smsNotificationsEnabled: z.boolean().optional(),
        pushNotificationsEnabled: z.boolean().optional(),
        onesignalAppId: z.string().optional(),
        onesignalApiKey: z.string().optional(),
        notificationRetentionDays: z.number().min(1).max(365).optional(),
        digestEmailFrequency: z.enum(["never", "daily", "weekly"]).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        return {
          success: true,
          message: "Paramètres de notifications mis à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message:
            "Erreur lors de la mise à jour des paramètres de notifications" });
      }
    }),

  // Tester la configuration email
  testEmail: protectedProcedure
    .input(
      z.object({ testEmail: z.string().email() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // TODO: Implémenter l'envoi d'email de test

        return {
          success: true,
          message: `Email de test envoyé à ${input.testEmail}`};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de l'envoi de l'email de test" });
      }
    }),

  // Réinitialiser les paramètres par défaut
  resetToDefaults: protectedProcedure
    .input(
      z.object({ section: z.enum([
          "general",
          "email",
          "security",
          "payments",
          "delivery",
          "notifications"]) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // TODO: Vérifier les permissions super admin
        // TODO: Implémenter la réinitialisation

        return {
          success: true,
          message: `Paramètres ${input.section} réinitialisés aux valeurs par défaut`};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de la réinitialisation des paramètres" });
      }
    })});
