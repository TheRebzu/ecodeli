import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, generateFrenchPhone, hashPassword, getRandomElement, getRandomDate } from '../utils/seed-helpers';

/**
 * Interface pour définir un administrateur
 */
interface AdminData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber: string;
  department: string;
  permissions: string[];
  twoFactorEnabled: boolean;
  image?: string;
  lastLoginAt?: Date;
  locale: string;
  preferences: any;
}

/**
 * Seed des utilisateurs administrateurs EcoDeli
 */
export async function seedAdminUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('ADMIN_USERS');
  
  const result: SeedResult = {
    entity: 'admin_users',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier si les admins existent déjà
  const existingAdmins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN }
  });
  
  if (existingAdmins.length > 0 && !options.force) {
    logger.warning('ADMIN_USERS', `${existingAdmins.length} administrateurs déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingAdmins.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.admin.deleteMany({});
    await prisma.user.deleteMany({ where: { role: UserRole.ADMIN } });
    logger.database('NETTOYAGE', 'admin users', 0);
  }

  // Définition des données d'administrateurs
  const adminUsers: AdminData[] = [
    // === SUPER ADMINISTRATEURS ===
    {
      name: 'Jean-Pierre Dubois',
      email: 'jp.dubois@ecodeli.fr',
      password: 'SuperAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Direction Générale',
      permissions: [
        'SYSTEM_ADMIN', 'USER_MANAGEMENT', 'FINANCIAL_MANAGEMENT', 
        'AUDIT_LOGS', 'PLATFORM_SETTINGS', 'EMERGENCY_ACCESS',
        'DATA_EXPORT', 'SECURITY_MANAGEMENT'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      lastLoginAt: getRandomDate(1, 7), // Connecté dans les 7 derniers jours
      locale: 'fr-FR',
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          sms: false,
          criticalAlerts: true
        },
        dashboard: {
          defaultView: 'analytics',
          autoRefresh: true
        }
      }
    },
    {
      name: 'Marie-Claire Rousseau',
      email: 'mc.rousseau@ecodeli.fr',
      password: 'SuperAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Direction Technique',
      permissions: [
        'SYSTEM_ADMIN', 'USER_MANAGEMENT', 'TECHNICAL_MANAGEMENT',
        'API_MANAGEMENT', 'INTEGRATION_SETTINGS', 'PERFORMANCE_MONITORING',
        'BACKUP_MANAGEMENT', 'SECURITY_MANAGEMENT'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      lastLoginAt: getRandomDate(1, 3),
      locale: 'fr-FR',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: true,
          criticalAlerts: true
        },
        dashboard: {
          defaultView: 'technical',
          autoRefresh: false
        }
      }
    },
    {
      name: 'Alexandre Martin',
      email: 'a.martin@ecodeli.fr',
      password: 'SuperAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.INACTIVE, // En congés
      phoneNumber: generateFrenchPhone(),
      department: 'Direction Opérationnelle',
      permissions: [
        'SYSTEM_ADMIN', 'OPERATIONS_MANAGEMENT', 'DELIVERY_OVERSIGHT',
        'PARTNER_MANAGEMENT', 'QUALITY_CONTROL', 'DISPUTE_RESOLUTION',
        'REPORTING_ACCESS'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      lastLoginAt: getRandomDate(15, 30), // Pas connecté depuis 2-4 semaines
      locale: 'fr-FR',
      preferences: {
        theme: 'auto',
        notifications: {
          email: false, // En congés
          push: false,
          sms: false,
          criticalAlerts: true
        },
        dashboard: {
          defaultView: 'operations',
          autoRefresh: true
        }
      }
    },

    // === ADMINISTRATEURS SUPPORT ===
    {
      name: 'Sophie Lefevre',
      email: 's.lefevre@ecodeli.fr',
      password: 'SupportAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Support Client',
      permissions: [
        'USER_MANAGEMENT', 'SUPPORT_TOOLS', 'TICKET_MANAGEMENT',
        'USER_VERIFICATION', 'COMMUNICATION_TOOLS', 'REFUND_PROCESSING'
      ],
      twoFactorEnabled: false,
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      lastLoginAt: getRandomDate(1, 2),
      locale: 'fr-FR',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
          criticalAlerts: false
        },
        dashboard: {
          defaultView: 'support',
          autoRefresh: true
        }
      }
    },
    {
      name: 'Thomas Moreau',
      email: 't.moreau@ecodeli.fr',
      password: 'SupportAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Vérifications',
      permissions: [
        'USER_VERIFICATION', 'DOCUMENT_REVIEW', 'IDENTITY_CHECKS',
        'BACKGROUND_VERIFICATION', 'COMPLIANCE_MONITORING'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      lastLoginAt: getRandomDate(1, 5),
      locale: 'fr-FR',
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          sms: false,
          criticalAlerts: true
        },
        dashboard: {
          defaultView: 'verification',
          autoRefresh: false
        }
      }
    },
    {
      name: 'Émilie Petit',
      email: 'e.petit@ecodeli.fr',
      password: 'SupportAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Relations Partenaires',
      permissions: [
        'PARTNER_MANAGEMENT', 'MERCHANT_ONBOARDING', 'DELIVERER_RECRUITMENT',
        'PROVIDER_CERTIFICATION', 'COMMUNICATION_TOOLS'
      ],
      twoFactorEnabled: false,
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150',
      lastLoginAt: getRandomDate(1, 3),
      locale: 'fr-FR',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: true,
          criticalAlerts: false
        },
        dashboard: {
          defaultView: 'partners',
          autoRefresh: true
        }
      }
    },
    {
      name: 'Nicolas Garnier',
      email: 'n.garnier@ecodeli.fr',
      password: 'SupportAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.SUSPENDED, // Incident de sécurité
      phoneNumber: generateFrenchPhone(),
      department: 'Support Technique',
      permissions: [
        'TECHNICAL_SUPPORT', 'APP_MONITORING', 'ERROR_RESOLUTION',
        'USER_ASSISTANCE', 'BUG_TRACKING'
      ],
      twoFactorEnabled: false,
      image: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150',
      lastLoginAt: getRandomDate(10, 20),
      locale: 'fr-FR',
      preferences: {
        theme: 'dark',
        notifications: {
          email: false,
          push: false,
          sms: false,
          criticalAlerts: false
        },
        dashboard: {
          defaultView: 'technical',
          autoRefresh: false
        }
      }
    },
    {
      name: 'Camille Roux',
      email: 'c.roux@ecodeli.fr',
      password: 'SupportAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Formation',
      permissions: [
        'TRAINING_MANAGEMENT', 'CONTENT_CREATION', 'USER_EDUCATION',
        'TUTORIAL_MANAGEMENT', 'CERTIFICATION_TRACKING'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      lastLoginAt: getRandomDate(1, 4),
      locale: 'fr-FR',
      preferences: {
        theme: 'auto',
        notifications: {
          email: true,
          push: false,
          sms: false,
          criticalAlerts: false
        },
        dashboard: {
          defaultView: 'training',
          autoRefresh: false
        }
      }
    },

    // === ADMINISTRATEURS FINANCIERS ===
    {
      name: 'Laurent Durand',
      email: 'l.durand@ecodeli.fr',
      password: 'FinanceAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Direction Financière',
      permissions: [
        'FINANCIAL_MANAGEMENT', 'PAYMENT_PROCESSING', 'INVOICE_MANAGEMENT',
        'COMMISSION_CALCULATION', 'TAX_REPORTING', 'AUDIT_FINANCIAL',
        'BUDGET_MANAGEMENT', 'REVENUE_ANALYTICS'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      lastLoginAt: getRandomDate(1, 2),
      locale: 'fr-FR',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: true,
          criticalAlerts: true
        },
        dashboard: {
          defaultView: 'financial',
          autoRefresh: true
        }
      }
    },
    {
      name: 'Isabelle Blanc',
      email: 'i.blanc@ecodeli.fr',
      password: 'FinanceAdmin2024!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: generateFrenchPhone(),
      department: 'Comptabilité',
      permissions: [
        'ACCOUNTING_MANAGEMENT', 'INVOICE_VALIDATION', 'EXPENSE_TRACKING',
        'FINANCIAL_REPORTING', 'COMPLIANCE_FINANCIAL', 'BANK_RECONCILIATION'
      ],
      twoFactorEnabled: true,
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      lastLoginAt: getRandomDate(1, 3),
      locale: 'fr-FR',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          sms: false,
          criticalAlerts: true
        },
        dashboard: {
          defaultView: 'accounting',
          autoRefresh: false
        }
      }
    }
  ];

  // Créer les utilisateurs administrateurs
  for (let i = 0; i < adminUsers.length; i++) {
    const adminData = adminUsers[i];
    
    try {
      logger.progress('ADMIN_USERS', i + 1, adminUsers.length, `Création: ${adminData.name}`);

      // Hasher le mot de passe
      const hashedPassword = await hashPassword(adminData.password);

      // Créer l'utilisateur avec le profil admin
      const user = await prisma.user.create({
        data: {
          name: adminData.name,
          email: adminData.email,
          password: hashedPassword,
          role: adminData.role,
          status: adminData.status,
          phoneNumber: adminData.phoneNumber,
          image: adminData.image,
          lastLoginAt: adminData.lastLoginAt,
          twoFactorEnabled: adminData.twoFactorEnabled,
          locale: adminData.locale,
          preferences: adminData.preferences,
          isVerified: true,
          hasCompletedOnboarding: true,
          onboardingCompletionDate: getRandomDate(30, 180), // Onboarding complété il y a 1-6 mois
          createdAt: getRandomDate(30, 180), // Créé il y a 1-6 mois
          updatedAt: getRandomDate(1, 30), // Mis à jour récemment
          // Créer le profil admin associé
          admin: {
            create: {
              permissions: adminData.permissions,
              department: adminData.department,
              twoFactorEnabled: adminData.twoFactorEnabled,
              createdAt: getRandomDate(30, 180),
              updatedAt: getRandomDate(1, 30)
            }
          }
        },
        include: {
          admin: true
        }
      });

      logger.success('ADMIN_USERS', `✅ Admin créé: ${user.name} (${adminData.department})`);
      result.created++;

    } catch (error: any) {
      logger.error('ADMIN_USERS', `❌ Erreur création admin ${adminData.name}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des administrateurs créés
  const finalAdmins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    include: { admin: true }
  });
  
  if (finalAdmins.length >= adminUsers.length - result.errors) {
    logger.validation('ADMIN_USERS', 'PASSED', `${finalAdmins.length} administrateurs créés avec succès`);
  } else {
    logger.validation('ADMIN_USERS', 'FAILED', `Attendu: ${adminUsers.length}, Créé: ${finalAdmins.length}`);
  }

  // Statistiques par département
  const byDepartment = finalAdmins.reduce((acc, admin) => {
    const dept = admin.admin?.department || 'Non défini';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('ADMIN_USERS', `📊 Répartition par département: ${JSON.stringify(byDepartment)}`);

  logger.endSeed('ADMIN_USERS', result);
  return result;
}

/**
 * Valide l'intégrité des données administrateurs
 */
export async function validateAdminUsers(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des administrateurs...');
  
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    include: { admin: true }
  });

  let isValid = true;

  // Vérifier qu'il y a au moins un super-admin actif
  const activeSuperAdmins = admins.filter(admin => 
    admin.status === UserStatus.ACTIVE && 
    admin.admin?.permissions?.includes('SYSTEM_ADMIN')
  );

  if (activeSuperAdmins.length === 0) {
    logger.error('VALIDATION', '❌ Aucun super-administrateur actif trouvé');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${activeSuperAdmins.length} super-administrateur(s) actif(s)`);
  }

  // Vérifier que tous les admins ont un profil associé
  const adminsWithoutProfile = admins.filter(admin => !admin.admin);
  if (adminsWithoutProfile.length > 0) {
    logger.error('VALIDATION', `❌ ${adminsWithoutProfile.length} administrateurs sans profil`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les administrateurs ont un profil associé');
  }

  // Vérifier l'activation 2FA pour les rôles critiques
  const criticalAdminsWithout2FA = admins.filter(admin => 
    admin.admin?.permissions?.includes('SYSTEM_ADMIN') && !admin.twoFactorEnabled
  );
  
  if (criticalAdminsWithout2FA.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${criticalAdminsWithout2FA.length} administrateurs critiques sans 2FA`);
  }

  return isValid;
} 