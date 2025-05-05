import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, verifiedDelivererProcedure } from '../trpc';
import { AnnouncementService } from '../../services/announcement.service';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementFiltersSchema,
  createDeliveryApplicationSchema,
} from '../../../schemas/announcement.schema';
import { TRPCError } from '@trpc/server';
import { AnnouncementStatus } from '../../../types/announcement';

export const announcementRouter = router({
  // Récupération de toutes les annonces avec filtres
  getAll: publicProcedure.input(announcementFiltersSchema).query(async ({ input }) => {
    try {
      return await AnnouncementService.getAll(input);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        cause: error,
      });
    }
  }),

  // Récupération des annonces d'un client spécifique
  getMyAnnouncements: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(AnnouncementStatus).optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const filters = {
          clientId: ctx.session.user.id,
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        };

        return await AnnouncementService.getAll(filters);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Une erreur est survenue',
          cause: error,
        });
      }
    }),

  // Récupération d'une annonce par ID
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    try {
      return await AnnouncementService.getById(input.id);
    } catch (error) {
      if (error instanceof Error && error.message === 'Annonce non trouvée') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Annonce non trouvée',
          cause: error,
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        cause: error,
      });
    }
  }),

  // Création d'une annonce
  create: protectedProcedure.input(createAnnouncementSchema).mutation(async ({ ctx, input }) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour créer une annonce',
        });
      }

      return await AnnouncementService.create(input, ctx.session.user.id);
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        cause: error,
      });
    }
  }),

  // Mise à jour d'une annonce
  update: protectedProcedure.input(updateAnnouncementSchema).mutation(async ({ ctx, input }) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour modifier une annonce',
        });
      }

      return await AnnouncementService.update(input.id, input, ctx.session.user.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('autorisé')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message,
          cause: error,
        });
      }

      if (error instanceof Error && error.message === 'Annonce non trouvée') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Annonce non trouvée',
          cause: error,
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        cause: error,
      });
    }
  }),

  // Suppression d'une annonce
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est authentifié
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Vous devez être connecté pour supprimer une annonce',
          });
        }

        return await AnnouncementService.delete(input.id, ctx.session.user.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('autorisé')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
            cause: error,
          });
        }

        if (error instanceof Error && error.message === 'Annonce non trouvée') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Annonce non trouvée',
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Une erreur est survenue',
          cause: error,
        });
      }
    }),

  // Postuler à une annonce (pour les livreurs vérifiés uniquement)
  applyForAnnouncement: verifiedDelivererProcedure
    .input(createDeliveryApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { announcementId, proposedPrice, message } = input;

        return await AnnouncementService.applyForAnnouncement(announcementId, ctx.session.user.id, {
          proposedPrice,
          message,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('livreurs')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Une erreur est survenue',
          cause: error,
        });
      }
    }),

  // Mettre à jour le statut d'une candidature
  updateApplicationStatus: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        status: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est authentifié
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Vous devez être connecté pour gérer une candidature',
          });
        }

        const { applicationId, status } = input;

        return await AnnouncementService.updateApplicationStatus(
          applicationId,
          status,
          ctx.session.user.id
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('autorisé')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Une erreur est survenue',
          cause: error,
        });
      }
    }),

  // Publier une annonce
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est authentifié
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Vous devez être connecté pour publier une annonce',
          });
        }

        return await AnnouncementService.publishAnnouncement(input.id, ctx.session.user.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('autorisé')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Une erreur est survenue',
          cause: error,
        });
      }
    }),

  // Marquer une annonce comme complétée
  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est authentifié
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Vous devez être connecté pour compléter une annonce',
          });
        }

        return await AnnouncementService.completeAnnouncement(input.id, ctx.session.user.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('autorisé')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Une erreur est survenue',
          cause: error,
        });
      }
    }),
});
