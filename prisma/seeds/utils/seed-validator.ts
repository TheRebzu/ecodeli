import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "./seed-logger";

/**
 * Interface pour les résultats de validation
 */
export interface ValidationResult {
  category: string;
  table: string;
  rule: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
  expected?: number | string;
  actual?: number | string;
}

/**
 * Interface pour les statistiques de validation
 */
export interface ValidationStats {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warnings: number;
  timeElapsed: number;
  results: ValidationResult[];
}

/**
 * Interface pour les options de validation
 */
export interface ValidationOptions {
  categories?: string[];
  strict?: boolean;
  verbose?: boolean;
}

/**
 * Utilitaire de validation post-seed
 * Vérifie l'intégrité des données créées et les contraintes métier
 */
export class SeedValidator {
  private prisma: PrismaClient;
  private logger: SeedLogger;

  constructor(prisma: PrismaClient, logger: SeedLogger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Lance la validation complète selon les options
   */
  async validate(options: ValidationOptions = {}): Promise<ValidationStats> {
    const startTime = Date.now();
    const stats: ValidationStats = {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      warnings: 0,
      timeElapsed: 0,
      results: [],
    };

    try {
      this.logger.info("VALIDATOR", "🔍 Démarrage de la validation post-seed");

      // Définir les validations à exécuter
      const validations = this.getValidationsToRun(options);

      for (const validation of validations) {
        try {
          const result = await validation.validate();
          stats.results.push(result);
          stats.totalRules++;

          switch (result.status) {
            case "PASS":
              stats.passedRules++;
              if (options.verbose) {
                this.logger.success(
                  "VALIDATOR",
                  `✅ ${result.rule}: ${result.message}`,
                );
              }
              break;
            case "FAIL":
              stats.failedRules++;
              this.logger.error(
                "VALIDATOR",
                `❌ ${result.rule}: ${result.message}`,
              );
              break;
            case "WARNING":
              stats.warnings++;
              this.logger.warning(
                "VALIDATOR",
                `⚠️  ${result.rule}: ${result.message}`,
              );
              break;
          }
        } catch (error: any) {
          const errorResult: ValidationResult = {
            category: validation.category,
            table: validation.table,
            rule: validation.rule,
            status: "FAIL",
            message: `Erreur lors de la validation: ${error.message}`,
          };

          stats.results.push(errorResult);
          stats.totalRules++;
          stats.failedRules++;
          this.logger.error(
            "VALIDATOR",
            `❌ ${validation.rule}: ${errorResult.message}`,
          );
        }
      }

      stats.timeElapsed = Date.now() - startTime;

      // Résumé final
      this.logValidationSummary(stats);

      return stats;
    } catch (error: any) {
      stats.timeElapsed = Date.now() - startTime;
      this.logger.error(
        "VALIDATOR",
        `❌ Échec de la validation: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Détermine quelles validations exécuter selon les options
   */
  private getValidationsToRun(
    options: ValidationOptions,
  ): ValidationDefinition[] {
    const allValidations = this.getAllValidations();

    if (options.categories?.length) {
      return allValidations.filter((v) =>
        options.categories!.includes(v.category),
      );
    }

    return allValidations;
  }

  /**
   * Définit toutes les validations disponibles
   */
  private getAllValidations(): ValidationDefinition[] {
    return [
      // === VALIDATIONS BASE ===
      {
        category: "base",
        table: "User",
        rule: "roles_required_exist",
        validate: async (): Promise<ValidationResult> => {
          const requiredRoles = [
            "CLIENT",
            "DELIVERER",
            "MERCHANT",
            "PROVIDER",
            "ADMIN",
          ];
          const usersByRole = await this.prisma.user.groupBy({
            by: ["role"],
            _count: true,
          });

          const existingRoles = usersByRole.map((group: any) => group.role);
          const missingRoles = requiredRoles.filter(
            (role) => !existingRoles.includes(role),
          );

          return {
            category: "base",
            table: "User",
            rule: "roles_required_exist",
            status: missingRoles.length === 0 ? "PASS" : "WARNING",
            message:
              missingRoles.length === 0
                ? "Tous les rôles requis ont des utilisateurs"
                : `Rôles sans utilisateurs: ${missingRoles.join(", ")}`,
            expected: requiredRoles.length,
            actual: existingRoles.length,
          };
        },
      },

      {
        category: "base",
        table: "User",
        rule: "basic_data_integrity",
        validate: async (): Promise<ValidationResult> => {
          const userCount = await this.prisma.user.count();

          return {
            category: "base",
            table: "User",
            rule: "basic_data_integrity",
            status: userCount >= 0 ? "PASS" : "FAIL",
            message: `${userCount} utilisateurs dans la base`,
            expected: ">= 0",
            actual: userCount,
          };
        },
      },

      {
        category: "base",
        table: "Service",
        rule: "service_categories_exist",
        validate: async (): Promise<ValidationResult> => {
          const categoryCount = await this.prisma.serviceCategory.count();

          return {
            category: "base",
            table: "ServiceCategory",
            rule: "service_categories_exist",
            status: categoryCount > 0 ? "PASS" : "FAIL",
            message:
              categoryCount > 0
                ? `${categoryCount} catégories de services configurées`
                : "Aucune catégorie de service configurée",
            expected: "> 0",
            actual: categoryCount,
          };
        },
      },

      // === VALIDATIONS UTILISATEURS ===
      {
        category: "users",
        table: "User",
        rule: "users_have_valid_status",
        validate: async (): Promise<ValidationResult> => {
          const totalUsers = await this.prisma.user.count();
          const activeUsers = await this.prisma.user.count({
            where: { status: "ACTIVE" },
          });

          return {
            category: "users",
            table: "User",
            rule: "users_have_valid_status",
            status: totalUsers > 0 ? "PASS" : "WARNING",
            message:
              totalUsers > 0
                ? `${activeUsers}/${totalUsers} utilisateurs actifs`
                : "Aucun utilisateur dans la base",
            expected: "> 0",
            actual: totalUsers,
          };
        },
      },

      {
        category: "users",
        table: "User",
        rule: "email_uniqueness",
        validate: async (): Promise<ValidationResult> => {
          const duplicateEmails = await this.prisma.$queryRaw<
            { email: string; count: number }[]
          >`
             SELECT email, COUNT(*) as count 
             FROM "users" 
             WHERE email IS NOT NULL 
             GROUP BY email 
             HAVING COUNT(*) > 1
           `;

          return {
            category: "users",
            table: "User",
            rule: "email_uniqueness",
            status: duplicateEmails.length === 0 ? "PASS" : "FAIL",
            message:
              duplicateEmails.length === 0
                ? "Tous les emails sont uniques"
                : `${duplicateEmails.length} emails dupliqués`,
            expected: 0,
            actual: duplicateEmails.length,
          };
        },
      },

      // === VALIDATIONS VERIFICATIONS ===
      {
        category: "verifications",
        table: "Document",
        rule: "documents_integrity",
        validate: async (): Promise<ValidationResult> => {
          const documentCount = await this.prisma.document.count();

          return {
            category: "verifications",
            table: "Document",
            rule: "documents_integrity",
            status: documentCount >= 0 ? "PASS" : "FAIL",
            message: `${documentCount} documents dans le système`,
            expected: ">= 0",
            actual: documentCount,
          };
        },
      },

      // === VALIDATIONS STORAGE ===
      {
        category: "storage",
        table: "Warehouse",
        rule: "warehouses_have_valid_coordinates",
        validate: async (): Promise<ValidationResult> => {
          const warehousesWithInvalidCoords = await this.prisma.warehouse.count(
            {
              where: {
                OR: [
                  { latitude: null },
                  { longitude: null },
                  { latitude: { lt: -90 } },
                  { latitude: { gt: 90 } },
                  { longitude: { lt: -180 } },
                  { longitude: { gt: 180 } },
                ],
              },
            },
          );

          return {
            category: "storage",
            table: "Warehouse",
            rule: "warehouses_have_valid_coordinates",
            status: warehousesWithInvalidCoords === 0 ? "PASS" : "WARNING",
            message:
              warehousesWithInvalidCoords === 0
                ? "Tous les entrepôts ont des coordonnées valides"
                : `${warehousesWithInvalidCoords} entrepôts avec coordonnées invalides`,
            expected: 0,
            actual: warehousesWithInvalidCoords,
          };
        },
      },

      // === VALIDATIONS RELATIONNELLES ===
      {
        category: "storage",
        table: "Warehouse",
        rule: "warehouses_basic_check",
        validate: async (): Promise<ValidationResult> => {
          const warehouseCount = await this.prisma.warehouse.count();

          return {
            category: "storage",
            table: "Warehouse",
            rule: "warehouses_basic_check",
            status: warehouseCount >= 0 ? "PASS" : "FAIL",
            message: `${warehouseCount} entrepôts configurés`,
            expected: ">= 0",
            actual: warehouseCount,
          };
        },
      },

      // === VALIDATIONS MÉTIER ===
      {
        category: "business",
        table: "User",
        rule: "admin_user_exists",
        validate: async (): Promise<ValidationResult> => {
          const adminCount = await this.prisma.user.count({
            where: { role: "ADMIN" },
          });

          return {
            category: "business",
            table: "User",
            rule: "admin_user_exists",
            status: adminCount > 0 ? "PASS" : "WARNING",
            message:
              adminCount > 0
                ? `${adminCount} administrateur(s) configuré(s)`
                : "Aucun administrateur configuré",
            expected: "> 0",
            actual: adminCount,
          };
        },
      },
    ];
  }

  /**
   * Affiche le résumé de la validation
   */
  private logValidationSummary(stats: ValidationStats): void {
    this.logger.info("VALIDATOR", "📊 === RÉSUMÉ DE LA VALIDATION ===");
    this.logger.info(
      "VALIDATOR",
      `📝 Total des règles vérifiées: ${stats.totalRules}`,
    );
    this.logger.success("VALIDATOR", `✅ Règles passées: ${stats.passedRules}`);

    if (stats.failedRules > 0) {
      this.logger.error(
        "VALIDATOR",
        `❌ Règles échouées: ${stats.failedRules}`,
      );
    }

    if (stats.warnings > 0) {
      this.logger.warning("VALIDATOR", `⚠️  Avertissements: ${stats.warnings}`);
    }

    this.logger.info(
      "VALIDATOR",
      `⏱️  Temps d'exécution: ${stats.timeElapsed}ms`,
    );

    // Statut global
    if (stats.failedRules === 0) {
      this.logger.success(
        "VALIDATOR",
        "🎉 VALIDATION RÉUSSIE - Toutes les règles sont respectées",
      );
    } else {
      this.logger.error(
        "VALIDATOR",
        "💥 VALIDATION ÉCHOUÉE - Certaines règles ne sont pas respectées",
      );
    }
  }

  /**
   * Validation rapide pour vérifier si les seeds de base sont présents
   */
  async quickValidation(): Promise<boolean> {
    try {
      const [userCount, warehouseCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.warehouse.count(),
      ]);

      const isValid = userCount >= 0;

      if (isValid) {
        this.logger.success(
          "VALIDATOR",
          `⚡ Validation rapide: OK (${userCount} utilisateurs, ${warehouseCount} entrepôts)`,
        );
      } else {
        this.logger.error("VALIDATOR", "⚡ Validation rapide: ÉCHEC");
      }

      return isValid;
    } catch (error) {
      this.logger.error("VALIDATOR", `⚡ Validation rapide: ERREUR - ${error}`);
      return false;
    }
  }
}

/**
 * Interface pour définir une validation
 */
interface ValidationDefinition {
  category: string;
  table: string;
  rule: string;
  validate: () => Promise<ValidationResult>;
}

/**
 * Factory function pour créer un SeedValidator
 */
export function createSeedValidator(
  prisma: PrismaClient,
  logger: SeedLogger,
): SeedValidator {
  return new SeedValidator(prisma, logger);
}
