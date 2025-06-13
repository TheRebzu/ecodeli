import { db } from "@/server/db";

/**
 * Service pour la gestion des journaux d'audit
 * Ce service permet de tracer les modifications effectuées sur les entités du système
 */
export const AuditService = {
  /**
   * Crée une entrée d'audit pour une action sur une entité
   * @param entityType Type de l'entité (ex: 'announcement', 'user', etc.)
   * @param entityId ID de l'entité concernée
   * @param action Type d'action (ex: 'create', 'update', 'delete', 'status_change')
   * @param performedById ID de l'utilisateur ayant effectué l'action
   * @param oldData Données avant modification (optionnel)
   * @param newData Données après modification (optionnel)
   */
  async createAuditLog(
    entityType: string,
    entityId: string,
    action: string,
    performedById: string,
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null,
  ) {
    try {
      // Calculer les changements entre l'ancien et le nouveau état
      const changes =
        oldData && newData
          ? this.calculateChanges(oldData, newData)
          : oldData
            ? { oldData }
            : { newData };

      // Créer l'entrée d'audit
      await db.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          performedById,
          changes,
        },
      });
    } catch (_error) {
      console.error("Erreur lors de la création du log d'audit:", error);
      // Ne pas échouer l'opération principale si l'audit échoue
    }
  },

  /**
   * Récupère les logs d'audit pour une entité spécifique
   * @param entityType Type de l'entité
   * @param entityId ID de l'entité
   * @returns Liste des logs d'audit
   */
  async getAuditLogs(entityType: string, entityId: string) {
    return db.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        performedBy: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  /**
   * Récupère tous les logs d'audit avec pagination et filtres
   * @param filters Filtres pour la recherche
   * @returns Liste paginée des logs d'audit
   */
  async getAllAuditLogs({
    entityType,
    entityId,
    performedById,
    action,
    fromDate,
    toDate,
    limit = 20,
    offset = 0,
  }: {
    entityType?: string;
    entityId?: string;
    performedById?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (performedById) where.performedById = performedById;
    if (action) where.action = action;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [logs, totalCount] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          performedBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      logs,
      totalCount,
      pagination: {
        limit,
        offset,
        hasMore: offset + logs.length < totalCount,
      },
    };
  },

  /**
   * Calcule les différences entre deux états d'un objet
   * @returns Un objet contenant les champs modifiés avec leurs anciennes et nouvelles valeurs
   */
  calculateChanges(oldData: Record<string, any>, newData: Record<string, any>) {
    const changes: Record<string, { from: any; to: any }> = {};

    // Parcourir les champs du nouveau data
    for (const key in newData) {
      // Si la valeur a changé et n'est pas undefined
      if (
        newData[key] !== undefined &&
        oldData[key] !== undefined &&
        JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
      ) {
        changes[key] = {
          from: oldData[key],
          to: newData[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  },
};
