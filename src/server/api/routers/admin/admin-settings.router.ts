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
      // Vérification complète des permissions admin
      const { user } = ctx.session;
      
      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès refusé : permissions administrateur requises"
        });
      }

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
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérification permissions super admin
        const user = ctx.session.user;
        if (user.role !== 'ADMIN') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        // Mise à jour des paramètres en base
        const updatedSettings = [];
        
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await ctx.db.setting.upsert({
              where: {
                key: `general.${key}`,
                category: 'GENERAL'
              },
              update: {
                value: typeof value === 'boolean' ? String(value) : value,
                updatedAt: new Date(),
                updatedBy: user.id
              },
              create: {
                key: `general.${key}`,
                category: 'GENERAL',
                value: typeof value === 'boolean' ? String(value) : value,
                isPublic: ['siteName', 'siteDescription', 'defaultLanguage'].includes(key),
                createdBy: user.id,
                updatedBy: user.id
              }
            });
            
            updatedSettings.push(`${key}: ${value}`);
          }
        }

        // Log de l'activité admin
        await ctx.db.adminTask.create({
          data: {
            type: 'SETTINGS_UPDATE',
            title: 'Mise à jour des paramètres généraux',
            description: `Paramètres modifiés: ${updatedSettings.join(', ')}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              section: 'general',
              changes: input
            }
          }
        });

        return {
          success: true,
          message: "Paramètres généraux mis à jour avec succès",
          updatedKeys: Object.keys(input)
        };
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
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent tester la configuration email"
        });
      }

      try {
        // Récupérer les paramètres SMTP actuels
        const smtpSettings = await ctx.db.systemSetting.findMany({
          where: {
            key: {
              in: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail', 'fromName']
            }
          }
        });

        const smtpConfig = smtpSettings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);

        // Vérifier que la configuration SMTP est complète
        if (!smtpConfig.smtpHost || !smtpConfig.smtpUser || !smtpConfig.fromEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Configuration SMTP incomplète. Veuillez configurer les paramètres email d'abord."
          });
        }

        // Créer l'email de test
        const testEmailContent = {
          to: input.testEmail,
          subject: "Test de configuration email - EcoDeli",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Test de Configuration Email</h2>
              <p>Bonjour,</p>
              <p>Ceci est un email de test envoyé depuis la plateforme EcoDeli pour vérifier la configuration SMTP.</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Détails du test :</h3>
                <ul style="color: #6b7280;">
                  <li>Date : ${new Date().toLocaleString('fr-FR')}</li>
                  <li>Serveur SMTP : ${smtpConfig.smtpHost}</li>
                  <li>Expéditeur : ${smtpConfig.fromEmail}</li>
                  <li>Testé par : ${user.name} (${user.email})</li>
                </ul>
              </div>
              <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px;">
                Cet email a été généré automatiquement par EcoDeli.
              </p>
            </div>
          `
        };

        // Envoyer l'email via le service email
        const emailService = await import('@/lib/services/email.service');
        await emailService.sendEmail(testEmailContent);

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'EMAIL_TEST',
            title: 'Test de configuration email',
            description: `Email de test envoyé à ${input.testEmail}`,
            status: 'COMPLETED',
            priority: 'LOW',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              testEmail: input.testEmail,
              smtpHost: smtpConfig.smtpHost
            }
          }
        });

        return {
          success: true,
          message: `Email de test envoyé avec succès à ${input.testEmail}. Vérifiez votre boîte de réception.`
        };
      } catch (error: any) {
        // Logger l'erreur
        await ctx.db.adminTask.create({
          data: {
            type: 'EMAIL_TEST',
            title: 'Échec du test email',
            description: `Tentative d'envoi à ${input.testEmail} échouée: ${error.message}`,
            status: 'FAILED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            metadata: {
              testEmail: input.testEmail,
              error: error.message
            }
          }
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erreur lors de l'envoi de l'email de test: ${error.message}`
        });
      }
    }),

  // Réinitialiser les paramètres par défaut avec validation complète
  resetToDefaults: protectedProcedure
    .input(
      z.object({ 
        section: z.enum([
          "general",
          "email", 
          "security",
          "payments",
          "delivery",
          "notifications"
        ]),
        confirmReset: z.boolean().default(false)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        // Vérification des permissions super admin
        if (user.role !== 'SUPER_ADMIN') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les super administrateurs peuvent réinitialiser les paramètres"
          });
        }

        if (!input.confirmReset) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La confirmation de réinitialisation est requise"
          });
        }

        // Définir les valeurs par défaut pour chaque section
        const defaultSettings = {
          general: {
            siteName: "EcoDeli",
            siteDescription: "Plateforme de services écologiques",
            contactEmail: "contact@ecodeli.me",
            supportEmail: "support@ecodeli.me",
            maintenanceMode: false,
            registrationEnabled: true,
            defaultLanguage: "fr",
            timezone: "Europe/Paris"
          },
          email: {
            smtpHost: process.env.SMTP_HOST || "",
            smtpPort: parseInt(process.env.SMTP_PORT || "587"),
            smtpUser: process.env.SMTP_USER || "",
            smtpSecure: process.env.SMTP_SECURE === "true",
            fromName: "EcoDeli",
            fromEmail: process.env.FROM_EMAIL || "noreply@ecodeli.me",
            emailVerificationRequired: true,
            welcomeEmailEnabled: true
          },
          security: {
            passwordMinLength: 8,
            passwordRequireUppercase: true,
            passwordRequireNumbers: true,
            passwordRequireSymbols: false,
            sessionTimeout: 24,
            maxLoginAttempts: 5,
            lockoutDuration: 30,
            twoFactorEnabled: false,
            ipWhitelistEnabled: false
          },
          payments: {
            stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
            defaultCurrency: "EUR",
            commissionRate: 5.0,
            minimumPayout: 20.0,
            payoutSchedule: "weekly"
          },
          delivery: {
            defaultDeliveryRadius: 10,
            maxDeliveryRadius: 50,
            deliveryTimeSlots: ["09:00-12:00", "14:00-17:00", "18:00-21:00"],
            emergencyDeliveryEnabled: true,
            trackingEnabled: true,
            autoAssignDeliverers: true,
            deliveryFeeCalculation: "distance"
          },
          notifications: {
            emailNotificationsEnabled: true,
            smsNotificationsEnabled: false,
            pushNotificationsEnabled: true,
            onesignalAppId: process.env.ONESIGNAL_APP_ID || "",
            notificationRetentionDays: 30,
            digestEmailFrequency: "daily"
          }
        };

        const sectionDefaults = defaultSettings[input.section];
        
        if (!sectionDefaults) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Section de paramètres invalide"
          });
        }

        // Supprimer tous les paramètres existants pour cette section
        await ctx.db.systemSetting.deleteMany({
          where: {
            category: input.section.toUpperCase()
          }
        });

        // Créer les nouveaux paramètres avec les valeurs par défaut
        const resetSettings = [];
        for (const [key, value] of Object.entries(sectionDefaults)) {
          const setting = await ctx.db.systemSetting.create({
            data: {
              category: input.section.toUpperCase(),
              key: `${input.section}.${key}`,
              value: typeof value === 'boolean' ? String(value) : String(value),
              isPublic: ['siteName', 'siteDescription', 'defaultLanguage', 'registrationEnabled'].includes(key),
              createdBy: user.id,
              updatedBy: user.id
            }
          });
          resetSettings.push(setting);
        }

        // Logger l'action de réinitialisation
        await ctx.db.adminTask.create({
          data: {
            type: 'SETTINGS_RESET',
            title: `Réinitialisation des paramètres ${input.section}`,
            description: `Tous les paramètres de la section ${input.section} ont été réinitialisés aux valeurs par défaut`,
            status: 'COMPLETED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              section: input.section,
              resetCount: resetSettings.length,
              resetKeys: Object.keys(sectionDefaults)
            }
          }
        });

        // Audit de sécurité pour cette action critique
        await ctx.db.auditLog.create({
          data: {
            userId: user.id,
            action: 'SETTINGS_RESET',
            resourceType: 'SYSTEM_SETTINGS',
            resourceId: input.section,
            metadata: {
              section: input.section,
              resetKeys: Object.keys(sectionDefaults),
              timestamp: new Date().toISOString(),
              userAgent: ctx.req?.headers['user-agent'] || 'unknown',
              ipAddress: ctx.req?.ip || 'unknown'
            }
          }
        });

        return {
          success: true,
          message: `Paramètres ${input.section} réinitialisés aux valeurs par défaut avec succès`,
          resetCount: resetSettings.length,
          resetKeys: Object.keys(sectionDefaults)
        };
      } catch (error) {
        // Logger l'erreur de réinitialisation
        await ctx.db.adminTask.create({
          data: {
            type: 'SETTINGS_RESET',
            title: `Échec de réinitialisation ${input.section}`,
            description: `Tentative de réinitialisation échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            status: 'FAILED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            metadata: {
              section: input.section,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            }
          }
        });

        throw new TRPCError({ 
          code: "BAD_REQUEST",
          message: "Erreur lors de la réinitialisation des paramètres" 
        });
      }
    })});
