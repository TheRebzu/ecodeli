import { z } from 'zod';
import { router, publicProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import path from 'path';
import fs from 'fs';

// Locales supportées selon la configuration i18n
const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de', 'it'];
const DEFAULT_LOCALE = 'fr';

// Schéma de validation pour les paramètres i18n
const getMessagesSchema = z.object({
  locale: z.enum(['fr', 'en', 'es', 'de', 'it']).default('fr'),
});

export const i18nRouter = router({
  // Récupérer les messages de traduction pour une locale donnée
  getMessages: publicProcedure
    .input(getMessagesSchema)
    .query(async ({ input }) => {
      try {
        const { locale } = input;

        // Chemin vers le fichier de messages
        const messagesPath = path.join(process.cwd(), 'src', 'messages', `${locale}.json`);

        // Vérifier que le fichier existe
        if (!fs.existsSync(messagesPath)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Fichier de messages non trouvé pour la locale '${locale}'`,
          });
        }

        // Lire et parser le fichier JSON
        const messagesContent = fs.readFileSync(messagesPath, 'utf-8');
        const messages = JSON.parse(messagesContent);

        return {
          locale,
          messages,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Erreur lors du chargement des messages i18n:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du chargement des messages de traduction',
        });
      }
    }),

  // Obtenir la liste des locales supportées
  getSupportedLocales: publicProcedure.query(async () => {
    return {
      supportedLocales: SUPPORTED_LOCALES,
      defaultLocale: DEFAULT_LOCALE,
      availableMessages: await getAvailableMessageFiles(),
    };
  }),

  // Vérifier si une locale est supportée
  isLocaleSupported: publicProcedure
    .input(z.object({ locale: z.string() }))
    .query(async ({ input }) => {
      const { locale } = input;
      const isSupported = SUPPORTED_LOCALES.includes(locale);
      
      return {
        locale,
        isSupported,
        alternative: isSupported ? null : DEFAULT_LOCALE,
      };
    }),
});

// Fonction utilitaire pour obtenir les fichiers de messages disponibles
async function getAvailableMessageFiles(): Promise<Array<{ locale: string; exists: boolean; path: string }>> {
  const messagesDir = path.join(process.cwd(), 'src', 'messages');
  
  return SUPPORTED_LOCALES.map(locale => {
    const filePath = path.join(messagesDir, `${locale}.json`);
    return {
      locale,
      exists: fs.existsSync(filePath),
      path: filePath,
    };
  });
}