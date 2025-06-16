import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { AuditService } from "@/server/services/admin/audit.service";
import { UserRole } from "@prisma/client";

// Schéma pour filtrer les logs d'audit
const auditLogFilterSchema = z.object({ entityType: z.string().optional(),
  entityId: z.string().optional(),
  performedById: z.string().optional(),
  action: z.string().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0) });

/**
 * Routeur pour la gestion des logs d'audit
 * Ces endpoints sont protégés et accessibles uniquement par les administrateurs
 */
export const auditRouter = router({ /**
   * Récupère tous les logs d'audit avec filtres et pagination
   */
  getAuditLogs: protectedProcedure
    .input(auditLogFilterSchema)
    .query(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder aux logs d'audit" });
      }

      return AuditService.getAllAuditLogs(input);
    }),

  /**
   * Récupère les logs d'audit pour une entité spécifique
   */
  getEntityAuditLogs: protectedProcedure
    .input(
      z.object({ entityType: z.string(),
        entityId: z.string() }),
    )
    .query(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder aux logs d'audit" });
      }

      return AuditService.getAuditLogs(input.entityType, input.entityId);
    }),

  /**
   * Récupère les logs d'audit pour les dernières annonces modifiées
   */
  getRecentAnnouncementAudits: protectedProcedure
    .input(
      z.object({ limit: z.number().int().min(1).max(50).default(10) }),
    )
    .query(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder aux logs d'audit" });
      }

      // Récupérer les derniers logs d'audit pour les annonces
      return AuditService.getAllAuditLogs({ entityType: "announcement",
        limit: input.limit,
        offset: 0 });
    })});
