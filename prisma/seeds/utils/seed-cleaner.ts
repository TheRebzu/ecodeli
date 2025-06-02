import { PrismaClient } from '@prisma/client';
import { SeedLogger } from './seed-logger';

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
      errors: []
    };

    try {
      this.logger.info('CLEANER', '🧹 Démarrage du nettoyage de la base de données');

      if (options.dryRun) {
        this.logger.info('CLEANER', '🔍 Mode simulation - aucune suppression ne sera effectuée');
      }

      // Définir l'ordre de nettoyage (inverse de l'ordre de création)
      const cleaningOrder = this.getCleaningOrder(options);

      for (const cleanOp of cleaningOrder) {
        try {
          await this.executeCleaningOperation(cleanOp, options, stats);
        } catch (error: any) {
          const errorMsg = `Erreur lors du nettoyage de ${cleanOp.table}: ${error.message}`;
          stats.errors.push(errorMsg);
          this.logger.error('CLEANER', errorMsg);
          
          if (!options.force) {
            throw error;
          }
        }
      }

      stats.timeElapsed = Date.now() - startTime;
      
      this.logger.success('CLEANER', 
        `✅ Nettoyage terminé: ${stats.recordsDeleted} enregistrements supprimés ` +
        `de ${stats.tablesProcessed} tables en ${stats.timeElapsed}ms`
      );

      return stats;

    } catch (error: any) {
      stats.timeElapsed = Date.now() - startTime;
      this.logger.error('CLEANER', `❌ Échec du nettoyage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Nettoie complètement la base de données (attention: destructif!)
   */
  async cleanAll(options: CleanOptions = {}): Promise<CleanStats> {
    this.logger.warning('CLEANER', '⚠️  NETTOYAGE COMPLET - Toutes les données seront supprimées!');
    
    if (!options.force) {
      throw new Error('Le nettoyage complet nécessite l\'option --force');
    }

    return this.clean({
      ...options,
      categories: ['all'],
      preserveUsers: false
    });
  }

  /**
   * Définit l'ordre de nettoyage selon les dépendances
   */
  private getCleaningOrder(options: CleanOptions): CleaningOperation[] {
    const operations: CleaningOperation[] = [];

    // Si categories spécifiées, nettoyer seulement ces catégories
    if (options.categories?.length) {
      if (options.categories.includes('all')) {
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
      // Notifications et logs (pas de dépendances)
      { table: 'NotificationLog', category: 'notifications', description: 'Logs de notifications' },
      { table: 'Notification', category: 'notifications', description: 'Notifications' },
      
      // Financial (dépend des livraisons et services)
      { table: 'CommissionPayment', category: 'financial', description: 'Paiements de commissions' },
      { table: 'WalletTransaction', category: 'financial', description: 'Transactions de portefeuille' },
      { table: 'Wallet', category: 'financial', description: 'Portefeuilles' },
      { table: 'Invoice', category: 'financial', description: 'Factures' },
      
      // Deliveries (dépend des contrats et annonces)
      { table: 'DeliveryTracking', category: 'deliveries', description: 'Suivi des livraisons' },
      { table: 'DeliveryRating', category: 'deliveries', description: 'Évaluations des livraisons' },
      { table: 'Delivery', category: 'deliveries', description: 'Livraisons' },
      
      // Services et annonces (dépendent des utilisateurs)
      { table: 'ServiceBooking', category: 'services', description: 'Réservations de services' },
      { table: 'Service', category: 'services', description: 'Services' },
      { table: 'AnnouncementProposal', category: 'announcements', description: 'Propositions d\'annonces' },
      { table: 'Announcement', category: 'announcements', description: 'Annonces' },
      
      // Contracts (dépendent des utilisateurs)
      { table: 'Contract', category: 'contracts', description: 'Contrats' },
      
      // Storage (peut dépendre des utilisateurs)
      { table: 'WarehouseCapacity', category: 'storage', description: 'Capacités d\'entrepôts' },
      { table: 'Warehouse', category: 'storage', description: 'Entrepôts' },
      
      // Verifications (dépendent des utilisateurs)
      { table: 'UserVerification', category: 'verifications', description: 'Vérifications d\'utilisateurs' },
      { table: 'DocumentVerification', category: 'verifications', description: 'Vérifications de documents' },
      { table: 'Document', category: 'verifications', description: 'Documents' },
      
      // Users (dépendent des rôles)
      { table: 'Account', category: 'users', description: 'Comptes utilisateurs' },
      { table: 'Session', category: 'users', description: 'Sessions' },
      { table: 'VerificationToken', category: 'users', description: 'Tokens de vérification' },
      { table: 'User', category: 'users', description: 'Utilisateurs' },
      
      // Base (pas de dépendances en sortie)
      { table: 'DocumentType', category: 'base', description: 'Types de documents' },
      { table: 'ServiceCategory', category: 'base', description: 'Catégories de services' },
      { table: 'Permission', category: 'base', description: 'Permissions' },
      { table: 'Role', category: 'base', description: 'Rôles' },
    ];
  }

  /**
   * Retourne l'ordre de nettoyage pour une catégorie spécifique
   */
  private getCategoryCleaningOrder(category: string): CleaningOperation[] {
    const allOperations = this.getAllTablesCleaningOrder();
    return allOperations.filter(op => op.category === category);
  }

  /**
   * Retourne l'ordre de nettoyage par défaut
   */
  private getDefaultCleaningOrder(preserveUsers = false): CleaningOperation[] {
    const allOperations = this.getAllTablesCleaningOrder();
    
    if (preserveUsers) {
      return allOperations.filter(op => 
        !['users', 'base'].includes(op.category)
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
    stats: CleanStats
  ): Promise<void> {
    this.logger.info('CLEANER', `🗑️  Nettoyage de ${operation.table} (${operation.description})`);

    if (options.dryRun) {
      this.logger.info('CLEANER', `   [SIMULATION] Table ${operation.table} serait nettoyée`);
      stats.tablesProcessed++;
      return;
    }

    try {
      // Compter les enregistrements avant suppression
      const countBefore = await this.getTableCount(operation.table);
      
      if (countBefore === 0) {
        this.logger.info('CLEANER', `   Table ${operation.table} déjà vide`);
        return;
      }

      // Effectuer la suppression
      const deleted = await this.deleteFromTable(operation.table);
      
      stats.recordsDeleted += deleted;
      stats.tablesProcessed++;
      
      this.logger.success('CLEANER', `   ✅ ${deleted} enregistrements supprimés de ${operation.table}`);

    } catch (error: any) {
      const errorMsg = `Erreur lors du nettoyage de ${operation.table}: ${error.message}`;
      this.logger.error('CLEANER', errorMsg);
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
      // Utiliser deleteMany via le modèle Prisma approprié
      const modelName = tableName.toLowerCase();
      const model = (this.prisma as any)[modelName];
      
      if (!model || !model.deleteMany) {
        throw new Error(`Modèle Prisma non trouvé pour la table ${tableName}`);
      }

      const result = await model.deleteMany({});
      return result.count || 0;
      
    } catch (error: any) {
      // Fallback: utiliser une requête SQL brute si le modèle Prisma échoue
      this.logger.warning('CLEANER', `Fallback SQL pour ${tableName}: ${error.message}`);
      
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
export function createSeedCleaner(prisma: PrismaClient, logger: SeedLogger): SeedCleaner {
  return new SeedCleaner(prisma, logger);
} 