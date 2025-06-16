import { z } from "zod";
import { router } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import path from "path";
import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";

// Locales supportées selon la configuration i18n
const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "it"];
const DEFAULT_LOCALE = "fr";

// Schéma de validation pour les paramètres i18n
const getMessagesSchema = z.object({ locale: z.enum(["fr", "en", "es", "de", "it"]).default("fr") });

export const i18nRouter = router({ // Récupérer les messages de traduction pour une locale donnée
  getMessages: publicProcedure
    .input(getMessagesSchema)
    .query(async ({ input  }) => {
      console.log("i18n.getMessages called with input:", input);
      
      try {
        const { locale } = input;

        // Chemin vers le fichier de messages
        const messagesPath = path.join(
          process.cwd(),
          "src",
          "messages",
          `${locale}.json`,
        );

        // Vérifier que le fichier existe
        if (!existsSync(messagesPath)) {
          // Retourner un objet vide au lieu de lancer une erreur
          console.warn(`Fichier de messages non trouvé pour la locale '${locale}', utilisation de messages vides`);
          const result = {
            locale,
            messages: {},
            timestamp: new Date().toISOString()};
          console.log("Returning empty messages:", result);
          return result;
        }

        // Lire et parser le fichier JSON
        const messagesContent = readFileSync(messagesPath, "utf-8");
        const messages = {};
        
        try {
          messages = JSON.parse(messagesContent);
        } catch (parseError) {
          console.error("Erreur lors du parsing des messages:", parseError);
          messages = {};
        }

        // S'assurer que messages est un objet
        if (!messages || typeof messages !== 'object') {
          messages = {};
        }

        const result = {
          locale,
          messages,
          timestamp: new Date().toISOString()};
        
        console.log("Returning messages result:", { locale, hasMessages: Object.keys(messages).length > 0 });
        return result;
      } catch (error) {
        console.error("Erreur lors du chargement des messages i18n:", error);

        // Retourner un objet par défaut en cas d'erreur
        const fallbackResult = {
          locale: input.locale || DEFAULT_LOCALE,
          messages: {},
          timestamp: new Date().toISOString()};
        console.log("Returning fallback result:", fallbackResult);
        return fallbackResult;
      }
    }),

  // Obtenir la liste des locales supportées
  getSupportedLocales: publicProcedure.query(async () => {
    return {
      supportedLocales: SUPPORTED_LOCALES,
      defaultLocale: DEFAULT_LOCALE,
      availableMessages: await getAvailableMessageFiles()};
  }),

  // Vérifier si une locale est supportée
  isLocaleSupported: publicProcedure
    .input(z.object({ locale: z.string()  }))
    .query(async ({ input  }) => {
      const { locale } = input;
      const isSupported = SUPPORTED_LOCALES.includes(locale);

      return {
        locale,
        isSupported,
        alternative: isSupported ? null : DEFAULT_LOCALE};
    })});

// Fonction utilitaire pour obtenir les fichiers de messages disponibles
async function getAvailableMessageFiles(): Promise<
  Array<{ locale: string; exists: boolean; path: string }>
> {
  const messagesDir = path.join(process.cwd(), "src", "messages");

  return SUPPORTED_LOCALES.map((locale) => {
    const filePath = path.join(messagesDir, `${locale}.json`);
    return {
      locale,
      exists: existsSync(filePath),
      path: filePath};
  });
}
