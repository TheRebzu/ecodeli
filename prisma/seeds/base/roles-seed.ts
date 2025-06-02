import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions } from '../utils/seed-helpers';

/**
 * Seed des rôles utilisateur de base EcoDeli
 */
export async function seedRoles(
  prisma: PrismaClient, 
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('ROLES');
  
  const result: SeedResult = {
    entity: 'roles',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier si les rôles existent déjà
  const existingRoles = await prisma.userRole.findMany();
  
  if (existingRoles.length > 0 && !options.force) {
    logger.warning('ROLES', `${existingRoles.length} rôles déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingRoles.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    const deleted = await prisma.userRole.deleteMany();
    logger.database('NETTOYAGE', 'userRole', deleted.count);
  }

  // Définition des rôles EcoDeli avec leurs permissions
  const roles = [
    {
      name: UserRole.ADMIN,
      description: 'Administrateur système avec accès complet',
      permissions: [
        'USER_MANAGEMENT',
        'SYSTEM_SETTINGS',
        'FINANCIAL_REPORTS',
        'AUDIT_LOGS',
        'CONTRACT_MANAGEMENT',
        'VERIFICATION_MANAGEMENT',
        'SUPPORT_MANAGEMENT'
      ],
      isActive: true,
    },
    {
      name: UserRole.CLIENT,
      description: 'Client utilisant les services de livraison et stockage',
      permissions: [
        'CREATE_ANNOUNCEMENT',
        'MANAGE_DELIVERIES',
        'BOOK_STORAGE',
        'BOOK_SERVICES',
        'VIEW_INVOICES',
        'MANAGE_PROFILE'
      ],
      isActive: true,
    },
    {
      name: UserRole.DELIVERER,
      description: 'Livreur partenaire effectuant les livraisons',
      permissions: [
        'VIEW_DELIVERY_REQUESTS',
        'ACCEPT_DELIVERIES',
        'UPDATE_DELIVERY_STATUS',
        'MANAGE_ROUTES',
        'VIEW_EARNINGS',
        'MANAGE_PROFILE'
      ],
      isActive: true,
    },
    {
      name: UserRole.MERCHANT,
      description: 'Commerçant partenaire proposant des produits',
      permissions: [
        'CREATE_MERCHANT_ANNOUNCEMENT',
        'MANAGE_PRODUCTS',
        'VIEW_SALES_REPORTS',
        'MANAGE_CONTRACT',
        'VIEW_INVOICES',
        'MANAGE_PROFILE'
      ],
      isActive: true,
    },
    {
      name: UserRole.PROVIDER,
      description: 'Prestataire de services spécialisés',
      permissions: [
        'MANAGE_SERVICES',
        'MANAGE_AVAILABILITY',
        'VIEW_BOOKINGS',
        'MANAGE_CONTRACT',
        'VIEW_EARNINGS',
        'MANAGE_PROFILE'
      ],
      isActive: true,
    }
  ];

  // Créer les rôles
  for (const roleData of roles) {
    try {
      const role = await prisma.userRole.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          isActive: roleData.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      logger.success('ROLES', `✅ Rôle créé: ${roleData.name}`);
      result.created++;
      
    } catch (error: any) {
      logger.error('ROLES', `❌ Erreur création rôle ${roleData.name}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des rôles créés
  const finalRoles = await prisma.userRole.findMany();
  if (finalRoles.length === roles.length) {
    logger.validation('ROLES', 'PASSED', `${finalRoles.length} rôles créés avec succès`);
  } else {
    logger.validation('ROLES', 'FAILED', `Attendu: ${roles.length}, Créé: ${finalRoles.length}`);
  }

  logger.endSeed('ROLES', result);
  return result;
}

/**
 * Vérifie l'intégrité des rôles
 */
export async function validateRoles(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des rôles...');
  
  const requiredRoles = [
    UserRole.ADMIN,
    UserRole.CLIENT, 
    UserRole.DELIVERER,
    UserRole.MERCHANT,
    UserRole.PROVIDER
  ];

  let isValid = true;

  for (const roleName of requiredRoles) {
    const role = await prisma.userRole.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      logger.error('VALIDATION', `❌ Rôle manquant: ${roleName}`);
      isValid = false;
    } else if (!role.isActive) {
      logger.warning('VALIDATION', `⚠️  Rôle inactif: ${roleName}`);
    } else {
      logger.success('VALIDATION', `✅ Rôle valide: ${roleName}`);
    }
  }

  return isValid;
} 