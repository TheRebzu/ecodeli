import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions } from '../utils/seed-helpers';
import { defaultSeedConfig } from '../seed.config';

/**
 * Seed des types de documents requis pour les vérifications par rôle
 */
export async function seedDocumentTypes(
  prisma: PrismaClient, 
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('DOCUMENT_TYPES');
  
  const result: SeedResult = {
    entity: 'document_types',
    created: 0,
    skipped: 0,
    errors: 0
  };

  const config = defaultSeedConfig;

  // Définition des types de documents par rôle
  const documentTypesByRole = [
    // Documents LIVREUR
    {
      role: UserRole.DELIVERER,
      type: 'DRIVING_LICENSE',
      name: 'Permis de conduire',
      description: 'Permis de conduire en cours de validité',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365 * 15, // 15 ans
      order: 1
    },
    {
      role: UserRole.DELIVERER,
      type: 'INSURANCE_CERTIFICATE',
      name: 'Attestation d\'assurance véhicule',
      description: 'Attestation d\'assurance du véhicule de livraison',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365, // 1 an
      order: 2
    },
    {
      role: UserRole.DELIVERER,
      type: 'VEHICLE_REGISTRATION',
      name: 'Carte grise du véhicule',
      description: 'Certificat d\'immatriculation du véhicule',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: null, // Pas d'expiration
      order: 3
    },
    {
      role: UserRole.DELIVERER,
      type: 'IDENTITY_CARD',
      name: 'Pièce d\'identité',
      description: 'Carte d\'identité ou passeport',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365 * 10, // 10 ans
      order: 4
    },
    {
      role: UserRole.DELIVERER,
      type: 'BANK_RIB',
      name: 'RIB bancaire',
      description: 'Relevé d\'identité bancaire pour les paiements',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: null,
      order: 5
    },

    // Documents COMMERÇANT
    {
      role: UserRole.MERCHANT,
      type: 'KBIS',
      name: 'Extrait Kbis',
      description: 'Extrait Kbis de moins de 3 mois',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF'],
      validityPeriod: 90, // 3 mois
      order: 1
    },
    {
      role: UserRole.MERCHANT,
      type: 'IDENTITY_CARD',
      name: 'Pièce d\'identité dirigeant',
      description: 'Pièce d\'identité du dirigeant de l\'entreprise',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365 * 10,
      order: 2
    },
    {
      role: UserRole.MERCHANT,
      type: 'BANK_RIB',
      name: 'RIB de l\'entreprise',
      description: 'Relevé d\'identité bancaire professionnel',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: null,
      order: 3
    },
    {
      role: UserRole.MERCHANT,
      type: 'TAX_CERTIFICATE',
      name: 'Attestation fiscale',
      description: 'Attestation de régularité fiscale',
      isRequired: false,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF'],
      validityPeriod: 365,
      order: 4
    },
    {
      role: UserRole.MERCHANT,
      type: 'INSURANCE_CERTIFICATE',
      name: 'Assurance responsabilité civile',
      description: 'Attestation d\'assurance responsabilité civile professionnelle',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365,
      order: 5
    },

    // Documents PRESTATAIRE
    {
      role: UserRole.PROVIDER,
      type: 'IDENTITY_CARD',
      name: 'Pièce d\'identité',
      description: 'Carte d\'identité ou passeport',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365 * 10,
      order: 1
    },
    {
      role: UserRole.PROVIDER,
      type: 'PROFESSIONAL_DIPLOMA',
      name: 'Diplôme professionnel',
      description: 'Diplôme ou certification professionnelle',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: null,
      order: 2
    },
    {
      role: UserRole.PROVIDER,
      type: 'INSURANCE_CERTIFICATE',
      name: 'Assurance responsabilité civile',
      description: 'Attestation d\'assurance RC professionnelle',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: 365,
      order: 3
    },
    {
      role: UserRole.PROVIDER,
      type: 'BANK_RIB',
      name: 'RIB bancaire',
      description: 'Relevé d\'identité bancaire',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF', 'JPG', 'PNG'],
      validityPeriod: null,
      order: 4
    },
    {
      role: UserRole.PROVIDER,
      type: 'CRIMINAL_RECORD',
      name: 'Extrait de casier judiciaire',
      description: 'Bulletin n°3 du casier judiciaire',
      isRequired: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['PDF'],
      validityPeriod: 90, // 3 mois
      order: 5
    }
  ];

  // Créer les types de documents
  for (const docTypeData of documentTypesByRole) {
    try {
      // Vérifier si le type existe déjà
      const existing = await prisma.documentType.findFirst({
        where: {
          type: docTypeData.type,
          role: docTypeData.role
        }
      });

      if (existing && !options.force) {
        logger.warning('DOCUMENT_TYPES', `Type ${docTypeData.type} pour ${docTypeData.role} déjà existant`);
        result.skipped++;
        continue;
      }

      // Supprimer l'existant si force activé
      if (existing && options.force) {
        await prisma.documentType.delete({
          where: { id: existing.id }
        });
      }

      const docType = await prisma.documentType.create({
        data: {
          type: docTypeData.type,
          role: docTypeData.role,
          name: docTypeData.name,
          description: docTypeData.description,
          isRequired: docTypeData.isRequired,
          maxFileSize: docTypeData.maxFileSize,
          allowedFormats: docTypeData.allowedFormats,
          validityPeriod: docTypeData.validityPeriod,
          order: docTypeData.order,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      logger.success('DOCUMENT_TYPES', `✅ Type créé: ${docTypeData.type} pour ${docTypeData.role}`);
      result.created++;
      
    } catch (error: any) {
      logger.error('DOCUMENT_TYPES', `❌ Erreur création type ${docTypeData.type}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des types créés
  const finalTypes = await prisma.documentType.findMany();
  if (finalTypes.length >= documentTypesByRole.length) {
    logger.validation('DOCUMENT_TYPES', 'PASSED', `${finalTypes.length} types de documents créés`);
  } else {
    logger.validation('DOCUMENT_TYPES', 'FAILED', `Attendu: ${documentTypesByRole.length}, Créé: ${finalTypes.length}`);
  }

  logger.endSeed('DOCUMENT_TYPES', result);
  return result;
}

/**
 * Vérifie l'intégrité des types de documents
 */
export async function validateDocumentTypes(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des types de documents...');
  
  const config = defaultSeedConfig;
  let isValid = true;

  // Vérifier pour chaque rôle
  const roles = [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER];
  
  for (const role of roles) {
    const requiredDocs = config.requiredDocuments[role];
    const existingTypes = await prisma.documentType.findMany({
      where: { role: role, isRequired: true }
    });

    if (existingTypes.length < requiredDocs.length) {
      logger.error('VALIDATION', 
        `❌ Documents manquants pour ${role}: ${existingTypes.length}/${requiredDocs.length}`);
      isValid = false;
    } else {
      logger.success('VALIDATION', 
        `✅ Documents ${role}: ${existingTypes.length} types configurés`);
    }
  }

  return isValid;
} 