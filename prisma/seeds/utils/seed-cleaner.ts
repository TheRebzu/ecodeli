import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "./seed-logger";

/**
 * Interface pour définir les options de nettoyage
 */
export interface CleanOptions {
  categories?: string[];
  preserveUsers?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Interface pour les statistiques de nettoyage
 */
export interface CleanStats {
  tablesProcessed: number;
  recordsDeleted: number;
  timeElapsed: number;
  errors: string[];
}

/**
 * Utilitaire de nettoyage sélectif de la base de données
 * Gère l'ordre de suppression en respectant les contraintes de clés étrangères
 */
export class SeedCleaner {
  private prisma: PrismaClient;
  private logger: SeedLogger;

  constructor(prisma: PrismaClient, logger: SeedLogger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Nettoie la base de données selon les options fournies
   */
  async clean(options: CleanOptions = {}): Promise<CleanStats> {
    const startTime = Date.now();
    const stats: CleanStats = {
      tablesProcessed: 0,
      recordsDeleted: 0,
      timeElapsed: 0,
      errors: [],
    };

    try {
      this.logger.info(
        "CLEANER",
        "🧹 Démarrage du nettoyage de la base de données",
      );

      if (options.dryRun) {
        this.logger.info(
          "CLEANER",
          "🔍 Mode simulation - aucune suppression ne sera effectuée",
        );
      }

      // Définir l'ordre de nettoyage (inverse de l'ordre de création)
      const cleaningOrder = this.getCleaningOrder(options);

      for (const cleanOp of cleaningOrder) {
        try {
          await this.executeCleaningOperation(cleanOp, options, stats);
        } catch (error: any) {
          const errorMsg = `Erreur lors du nettoyage de ${cleanOp.table}: ${error.message}`;
          stats.errors.push(errorMsg);
          this.logger.error("CLEANER", errorMsg);

          if (!options.force) {
            throw error;
          }
        }
      }

      stats.timeElapsed = Date.now() - startTime;

      this.logger.success(
        "CLEANER",
        `✅ Nettoyage terminé: ${stats.recordsDeleted} enregistrements supprimés ` +
          `de ${stats.tablesProcessed} tables en ${stats.timeElapsed}ms`,
      );

      return stats;
    } catch (error: any) {
      stats.timeElapsed = Date.now() - startTime;
      this.logger.error("CLEANER", `❌ Échec du nettoyage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Nettoie complètement la base de données (attention: destructif!)
   */
  async cleanAll(options: CleanOptions = {}): Promise<CleanStats> {
    this.logger.warning(
      "CLEANER",
      "⚠️  NETTOYAGE COMPLET - Toutes les données seront supprimées!",
    );

    if (!options.force) {
      throw new Error("Le nettoyage complet nécessite l'option --force");
    }

    return this.clean({
      ...options,
      categories: ["all"],
      preserveUsers: false,
    });
  }

  /**
   * Définit l'ordre de nettoyage selon les dépendances
   */
  private getCleaningOrder(options: CleanOptions): CleaningOperation[] {
    const operations: CleaningOperation[] = [];

    // Si categories spécifiées, nettoyer seulement ces catégories
    if (options.categories?.length) {
      if (options.categories.includes("all")) {
        operations.push(...this.getAllTablesCleaningOrder());
      } else {
        for (const category of options.categories) {
          operations.push(...this.getCategoryCleaningOrder(category));
        }
      }
    } else {
      // Nettoyage par défaut (sans les utilisateurs si preserveUsers = true)
      operations.push(...this.getDefaultCleaningOrder(options.preserveUsers));
    }

    return operations;
  }

  /**
   * Retourne l'ordre de nettoyage pour toutes les tables
   */
  private getAllTablesCleaningOrder(): CleaningOperation[] {
    return [
      // Messages et conversations (dépendent des utilisateurs)
      { table: "Message", category: "messages", description: "Messages" },
      {
        table: "Conversation",
        category: "messages",
        description: "Conversations",
      },

      // Notifications et logs (dépendent des utilisateurs)
      {
        table: "DelivererNotification",
        category: "notifications",
        description: "Notifications de livreurs",
      },
      {
        table: "Notification",
        category: "notifications",
        description: "Notifications",
      },

      // Audit et activité (dépendent des utilisateurs)
      {
        table: "UserActivityLog",
        category: "audit",
        description: "Journaux d'activité utilisateur",
      },
      { table: "AuditLog", category: "audit", description: "Journaux d'audit" },

      // Financial (dépend des livraisons et services)
      {
        table: "BankTransfer",
        category: "financial",
        description: "Virements bancaires",
      },
      {
        table: "WithdrawalRequest",
        category: "financial",
        description: "Demandes de retrait",
      },
      {
        table: "WalletTransaction",
        category: "financial",
        description: "Transactions de portefeuille",
      },
      { table: "Wallet", category: "financial", description: "Portefeuilles" },
      {
        table: "InvoiceItem",
        category: "financial",
        description: "Lignes de facture",
      },
      { table: "Invoice", category: "financial", description: "Factures" },
      { table: "Payment", category: "financial", description: "Paiements" },
      {
        table: "FinancialTask",
        category: "financial",
        description: "Tâches financières",
      },
      {
        table: "FinancialReport",
        category: "financial",
        description: "Rapports financiers",
      },
      {
        table: "BillingCycle",
        category: "financial",
        description: "Cycles de facturation",
      },
      {
        table: "FinancialAccount",
        category: "financial",
        description: "Comptes financiers",
      },
      { table: "TaxRate", category: "financial", description: "Taux de taxe" },

      // Subscriptions et abonnements (dépendent des utilisateurs)
      {
        table: "PaymentMethod",
        category: "financial",
        description: "Moyens de paiement",
      },
      {
        table: "Subscription",
        category: "financial",
        description: "Abonnements",
      },

      // Storage (dépend des utilisateurs)
      {
        table: "BoxUsageHistory",
        category: "storage",
        description: "Historique d'utilisation des boxes",
      },
      {
        table: "BoxAvailabilitySubscription",
        category: "storage",
        description: "Abonnements de disponibilité",
      },
      {
        table: "Reservation",
        category: "storage",
        description: "Réservations",
      },
      { table: "Box", category: "storage", description: "Boxes de stockage" },
      { table: "Warehouse", category: "storage", description: "Entrepôts" },

      // Services et évaluations (dépendent des utilisateurs)
      {
        table: "ServiceReview",
        category: "services",
        description: "Évaluations de services",
      },
      {
        table: "ServiceBooking",
        category: "services",
        description: "Réservations de services",
      },
      { table: "Service", category: "services", description: "Services" },
      {
        table: "ProviderSpecialSlot",
        category: "services",
        description: "Créneaux spéciaux prestataires",
      },
      {
        table: "ProviderException",
        category: "services",
        description: "Exceptions prestataires",
      },
      {
        table: "ProviderAvailability",
        category: "services",
        description: "Disponibilités prestataires",
      },

      // Deliveries et matchings (dépendent des utilisateurs)
      {
        table: "DeliveryRating",
        category: "deliveries",
        description: "Évaluations des livraisons",
      },
      {
        table: "DeliveryProof",
        category: "deliveries",
        description: "Preuves de livraison",
      },
      {
        table: "DeliveryCoordinates",
        category: "deliveries",
        description: "Coordonnées de livraison",
      },
      {
        table: "DeliveryLog",
        category: "deliveries",
        description: "Journaux de livraison",
      },
      { table: "Delivery", category: "deliveries", description: "Livraisons" },
      {
        table: "RouteStatistics",
        category: "deliveries",
        description: "Statistiques de routes",
      },
      {
        table: "DeliveryZone",
        category: "deliveries",
        description: "Zones de livraison",
      },
      {
        table: "DelivererRoute",
        category: "deliveries",
        description: "Routes de livreurs",
      },
      {
        table: "ScheduleException",
        category: "deliveries",
        description: "Exceptions de planning",
      },
      {
        table: "DelivererSchedule",
        category: "deliveries",
        description: "Planning livreurs",
      },
      {
        table: "DelivererAvailability",
        category: "deliveries",
        description: "Disponibilités livreurs",
      },
      {
        table: "DelivererStats",
        category: "deliveries",
        description: "Statistiques livreurs",
      },
      {
        table: "DelivererPreferences",
        category: "deliveries",
        description: "Préférences livreurs",
      },

      // Candidatures et documents (dépendent des annonces et utilisateurs)
      {
        table: "DocumentValidationAudit",
        category: "verifications",
        description: "Audit validation documents",
      },
      {
        table: "ApplicationDocument",
        category: "verifications",
        description: "Documents de candidature",
      },
      {
        table: "DeliveryApplication",
        category: "deliveries",
        description: "Candidatures de livraison",
      },
      {
        table: "MatchingConfiguration",
        category: "announcements",
        description: "Configuration de matching",
      },
      {
        table: "AnnouncementMatching",
        category: "announcements",
        description: "Matching d'annonces",
      },
      {
        table: "DelivererFavorite",
        category: "announcements",
        description: "Annonces favorites",
      },
      {
        table: "Announcement",
        category: "announcements",
        description: "Annonces",
      },

      // Contracts et amendements (dépendent des utilisateurs)
      {
        table: "ContractPerformance",
        category: "contracts",
        description: "Performance des contrats",
      },
      {
        table: "ContractNegotiation",
        category: "contracts",
        description: "Négociations de contrats",
      },
      {
        table: "ContractAmendment",
        category: "contracts",
        description: "Amendements de contrats",
      },
      { table: "Contract", category: "contracts", description: "Contrats" },
      {
        table: "ContractTemplate",
        category: "contracts",
        description: "Templates de contrats",
      },

      // Verifications (dépendent des utilisateurs et documents)
      {
        table: "ProviderVerification",
        category: "verifications",
        description: "Vérifications prestataires",
      },
      {
        table: "MerchantVerification",
        category: "verifications",
        description: "Vérifications commerçants",
      },
      {
        table: "VerificationHistory",
        category: "verifications",
        description: "Historique vérifications",
      },
      {
        table: "Verification",
        category: "verifications",
        description: "Vérifications",
      },
      {
        table: "Document",
        category: "verifications",
        description: "Documents",
      },

      // Skills et adresses (dépendent des profils utilisateurs)
      {
        table: "Skill",
        category: "services",
        description: "Compétences prestataires",
      },
      { table: "Address", category: "users", description: "Adresses" },

      // **CORRECTION CRITIQUE**: Profils utilisateurs spécialisés (DOIVENT être supprimés AVANT User)
      {
        table: "Admin",
        category: "users",
        description: "Profils administrateurs",
      },
      {
        table: "Provider",
        category: "users",
        description: "Profils prestataires",
      },
      {
        table: "Merchant",
        category: "users",
        description: "Profils commerçants",
      },
      {
        table: "Deliverer",
        category: "users",
        description: "Profils livreurs",
      },
      { table: "Client", category: "users", description: "Profils clients" },

      // Auth et sessions (dépendent des utilisateurs)
      {
        table: "Account",
        category: "users",
        description: "Comptes utilisateurs",
      },
      { table: "Session", category: "users", description: "Sessions" },
      {
        table: "VerificationToken",
        category: "users",
        description: "Tokens de vérification",
      },

      // Utilisateurs principaux (après tous les profils spécialisés)
      { table: "User", category: "users", description: "Utilisateurs" },

      // Base et configuration (pas de dépendances en sortie)
      {
        table: "Commission",
        category: "financial",
        description: "Commissions",
      },
      {
        table: "PromotionRecord",
        category: "financial",
        description: "Enregistrements promotions",
      },
      {
        table: "ServiceCategory",
        category: "base",
        description: "Catégories de services",
      },
    ];
  }

  /**
   * Retourne l'ordre de nettoyage pour une catégorie spécifique
   */
  private getCategoryCleaningOrder(category: string): CleaningOperation[] {
    const allOperations = this.getAllTablesCleaningOrder();
    return allOperations.filter((op) => op.category === category);
  }

  /**
   * Retourne l'ordre de nettoyage par défaut
   */
  private getDefaultCleaningOrder(preserveUsers = false): CleaningOperation[] {
    const allOperations = this.getAllTablesCleaningOrder();

    if (preserveUsers) {
      return allOperations.filter(
        (op) => !["users", "base"].includes(op.category),
      );
    }

    return allOperations;
  }

  /**
   * Exécute une opération de nettoyage
   */
  private async executeCleaningOperation(
    operation: CleaningOperation,
    options: CleanOptions,
    stats: CleanStats,
  ): Promise<void> {
    this.logger.info(
      "CLEANER",
      `🗑️  Nettoyage de ${operation.table} (${operation.description})`,
    );

    if (options.dryRun) {
      this.logger.info(
        "CLEANER",
        `   [SIMULATION] Table ${operation.table} serait nettoyée`,
      );
      stats.tablesProcessed++;
      return;
    }

    try {
      // Compter les enregistrements avant suppression
      const countBefore = await this.getTableCount(operation.table);

      if (countBefore === 0) {
        this.logger.info("CLEANER", `   Table ${operation.table} déjà vide`);
        return;
      }

      // Effectuer la suppression
      const deleted = await this.deleteFromTable(operation.table);

      stats.recordsDeleted += deleted;
      stats.tablesProcessed++;

      this.logger.success(
        "CLEANER",
        `   ✅ ${deleted} enregistrements supprimés de ${operation.table}`,
      );
    } catch (error: any) {
      const errorMsg = `Erreur lors du nettoyage de ${operation.table}: ${error.message}`;
      this.logger.error("CLEANER", errorMsg);
      throw error;
    }
  }

  /**
   * Compte les enregistrements dans une table
   */
  private async getTableCount(tableName: string): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM ${tableName}
      `;
      return Number((result as any)[0]?.count || 0);
    } catch (error) {
      // Si la table n'existe pas, retourner 0
      return 0;
    }
  }

  /**
   * Supprime tous les enregistrements d'une table
   */
  private async deleteFromTable(tableName: string): Promise<number> {
    try {
      // Correspondance entre noms de tables et noms de modèles Prisma
      const modelNameMap: { [key: string]: string } = {
        Message: "message",
        Conversation: "conversation",
        DelivererNotification: "delivererNotification",
        Notification: "notification",
        UserActivityLog: "userActivityLog",
        AuditLog: "auditLog",
        BankTransfer: "bankTransfer",
        WithdrawalRequest: "withdrawalRequest",
        WalletTransaction: "walletTransaction",
        Wallet: "wallet",
        InvoiceItem: "invoiceItem",
        Invoice: "invoice",
        Payment: "payment",
        FinancialTask: "financialTask",
        FinancialReport: "financialReport",
        BillingCycle: "billingCycle",
        FinancialAccount: "financialAccount",
        TaxRate: "taxRate",
        PaymentMethod: "paymentMethod",
        Subscription: "subscription",
        BoxUsageHistory: "boxUsageHistory",
        BoxAvailabilitySubscription: "boxAvailabilitySubscription",
        Reservation: "reservation",
        Box: "box",
        Warehouse: "warehouse",
        ServiceReview: "serviceReview",
        ServiceBooking: "serviceBooking",
        Service: "service",
        ProviderSpecialSlot: "providerSpecialSlot",
        ProviderException: "providerException",
        ProviderAvailability: "providerAvailability",
        DeliveryRating: "deliveryRating",
        DeliveryProof: "deliveryProof",
        DeliveryCoordinates: "deliveryCoordinates",
        DeliveryLog: "deliveryLog",
        Delivery: "delivery",
        RouteStatistics: "routeStatistics",
        DeliveryZone: "deliveryZone",
        DelivererRoute: "delivererRoute",
        ScheduleException: "scheduleException",
        DelivererSchedule: "delivererSchedule",
        DelivererAvailability: "delivererAvailability",
        DelivererStats: "delivererStats",
        DelivererPreferences: "delivererPreferences",
        DocumentValidationAudit: "documentValidationAudit",
        ApplicationDocument: "applicationDocument",
        DeliveryApplication: "deliveryApplication",
        MatchingConfiguration: "matchingConfiguration",
        AnnouncementMatching: "announcementMatching",
        DelivererFavorite: "delivererFavorite",
        Announcement: "announcement",
        ContractPerformance: "contractPerformance",
        ContractNegotiation: "contractNegotiation",
        ContractAmendment: "contractAmendment",
        Contract: "contract",
        ContractTemplate: "contractTemplate",
        ProviderVerification: "providerVerification",
        MerchantVerification: "merchantVerification",
        VerificationHistory: "verificationHistory",
        Verification: "verification",
        Document: "document",
        Skill: "skill",
        Address: "address",
        Admin: "admin",
        Provider: "provider",
        Merchant: "merchant",
        Deliverer: "deliverer",
        Client: "client",
        Account: "account",
        Session: "session",
        VerificationToken: "verificationToken",
        User: "user",
        Commission: "commission",
        PromotionRecord: "promotionRecord",
        ServiceCategory: "serviceCategory",
      };

      const modelName = modelNameMap[tableName];
      if (!modelName) {
        throw new Error(`Nom de modèle non trouvé pour la table ${tableName}`);
      }

      const model = (this.prisma as any)[modelName];

      if (!model || !model.deleteMany) {
        throw new Error(
          `Modèle Prisma non trouvé pour ${tableName} -> ${modelName}`,
        );
      }

      const result = await model.deleteMany({});
      return result.count || 0;
    } catch (error: any) {
      // Fallback: utiliser une requête SQL brute si le modèle Prisma échoue
      this.logger.warning(
        "CLEANER",
        `Fallback SQL pour ${tableName}: ${error.message}`,
      );

      await this.prisma.$executeRaw`DELETE FROM ${tableName}`;
      return 0; // Impossible de connaître le nombre exact avec executeRaw
    }
  }
}

/**
 * Interface pour définir une opération de nettoyage
 */
interface CleaningOperation {
  table: string;
  category: string;
  description: string;
}

/**
 * Factory function pour créer un SeedCleaner
 */
export function createSeedCleaner(
  prisma: PrismaClient,
  logger: SeedLogger,
): SeedCleaner {
  return new SeedCleaner(prisma, logger);
}
