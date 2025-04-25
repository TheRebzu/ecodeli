import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const localizationRouter = router({
  // Get all available languages
  getLanguages: publicProcedure.query(async () => {
    try {
      const languages = await prisma.language.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return languages;
    } catch (error) {
      // If the language table doesn't exist yet, return default languages
      return [
        {
          id: "fr",
          code: "fr",
          name: "Français",
          isDefault: true,
          isActive: true,
        },
        {
          id: "en",
          code: "en",
          name: "English",
          isDefault: false,
          isActive: true,
        },
        {
          id: "es",
          code: "es",
          name: "Español",
          isDefault: false,
          isActive: true,
        },
        {
          id: "de",
          code: "de",
          name: "Deutsch",
          isDefault: false,
          isActive: true,
        },
      ];
    }
  }),

  // Get translations for a specific language
  getTranslations: publicProcedure
    .input(z.object({ languageCode: z.string() }))
    .query(async ({ input }) => {
      const { languageCode } = input;

      try {
        const language = await prisma.language.findFirst({
          where: {
            code: languageCode,
            isActive: true,
          },
        });

        if (!language) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Language with code ${languageCode} not found or is not active`,
          });
        }

        const translations = await prisma.translation.findMany({
          where: {
            languageId: language.id,
          },
        });

        // Convert to key-value pairs for easy consumption by frontend
        const translationMap = translations.reduce(
          (acc, translation) => {
            acc[translation.key] = translation.value;
            return acc;
          },
          {} as Record<string, string>,
        );

        return translationMap;
      } catch (error) {
        // If tables don't exist yet, provide a small sample of translations for development
        const sampleTranslations: Record<string, Record<string, string>> = {
          en: {
            "app.welcome": "Welcome to EcoDeli",
            "app.tagline": "Eco-friendly deliveries by the community",
            "nav.home": "Home",
            "nav.services": "Services",
            "nav.about": "About",
            "nav.contact": "Contact",
            "auth.login": "Login",
            "auth.register": "Register",
          },
          fr: {
            "app.welcome": "Bienvenue à EcoDeli",
            "app.tagline": "Livraisons écologiques par la communauté",
            "nav.home": "Accueil",
            "nav.services": "Services",
            "nav.about": "À propos",
            "nav.contact": "Contact",
            "auth.login": "Connexion",
            "auth.register": "Inscription",
          },
          es: {
            "app.welcome": "Bienvenido a EcoDeli",
            "app.tagline": "Entregas ecológicas por la comunidad",
            "nav.home": "Inicio",
            "nav.services": "Servicios",
            "nav.about": "Acerca de",
            "nav.contact": "Contacto",
            "auth.login": "Iniciar sesión",
            "auth.register": "Registrarse",
          },
          de: {
            "app.welcome": "Willkommen bei EcoDeli",
            "app.tagline":
              "Umweltfreundliche Lieferungen durch die Gemeinschaft",
            "nav.home": "Startseite",
            "nav.services": "Dienstleistungen",
            "nav.about": "Über uns",
            "nav.contact": "Kontakt",
            "auth.login": "Anmelden",
            "auth.register": "Registrieren",
          },
        };

        return sampleTranslations[languageCode] || sampleTranslations.en;
      }
    }),

  // Admin-only: Add a new language
  addLanguage: adminProcedure
    .input(
      z.object({
        code: z.string().min(2).max(5),
        name: z.string().min(2).max(50),
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const { code, name, isDefault, isActive } = input;

      // Check if language already exists
      const existingLanguage = await prisma.language.findFirst({
        where: {
          code,
        },
      });

      if (existingLanguage) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Language with code ${code} already exists`,
        });
      }

      // If this language is being set as default, unset any existing default
      if (isDefault) {
        await prisma.language.updateMany({
          where: {
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return await prisma.language.create({
        data: {
          code,
          name,
          isDefault,
          isActive,
        },
      });
    }),

  // Admin-only: Update a language
  updateLanguage: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(50).optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, name, isDefault, isActive } = input;

      // Check if language exists
      const language = await prisma.language.findUnique({
        where: { id },
      });

      if (!language) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Language not found",
        });
      }

      // If this language is being set as default, unset any existing default
      if (isDefault) {
        await prisma.language.updateMany({
          where: {
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return await prisma.language.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(isDefault !== undefined && { isDefault }),
          ...(isActive !== undefined && { isActive }),
        },
      });
    }),

  // Admin-only: Add or update a translation
  upsertTranslation: adminProcedure
    .input(
      z.object({
        languageId: z.string(),
        key: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { languageId, key, value } = input;

      // Check if language exists
      const language = await prisma.language.findUnique({
        where: { id: languageId },
      });

      if (!language) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Language not found",
        });
      }

      // Check if translation already exists
      const existingTranslation = await prisma.translation.findFirst({
        where: {
          languageId,
          key,
        },
      });

      if (existingTranslation) {
        // Update existing translation
        return await prisma.translation.update({
          where: { id: existingTranslation.id },
          data: { value },
        });
      } else {
        // Create new translation
        return await prisma.translation.create({
          data: {
            languageId,
            key,
            value,
          },
        });
      }
    }),

  // Admin-only: Import translations from JSON
  importTranslations: adminProcedure
    .input(
      z.object({
        languageCode: z.string(),
        translations: z.record(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const { languageCode, translations } = input;

      // Check if language exists
      const language = await prisma.language.findFirst({
        where: { code: languageCode },
      });

      if (!language) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Language with code ${languageCode} not found`,
        });
      }

      // Prepare batch operations
      const translationEntries = Object.entries(translations);

      // Process in smaller batches to avoid timeouts
      const batchSize = 100;
      const results = [];

      for (let i = 0; i < translationEntries.length; i += batchSize) {
        const batch = translationEntries.slice(i, i + batchSize);

        // Process each translation in the batch
        const batchResults = await Promise.all(
          batch.map(async ([key, value]) => {
            const existingTranslation = await prisma.translation.findFirst({
              where: {
                languageId: language.id,
                key,
              },
            });

            if (existingTranslation) {
              return prisma.translation.update({
                where: { id: existingTranslation.id },
                data: { value },
              });
            } else {
              return prisma.translation.create({
                data: {
                  languageId: language.id,
                  key,
                  value,
                },
              });
            }
          }),
        );

        results.push(...batchResults);
      }

      return {
        success: true,
        count: results.length,
      };
    }),
});
