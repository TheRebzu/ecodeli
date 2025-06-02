import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, generateFrenchPhone, generateFrenchAddress, generateFrenchEmail, hashPassword, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un prestataire
 */
interface ProviderData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  image?: string;
  status: UserStatus;
  business: any;
  services: any;
  qualifications: any;
  operationalData: any;
  address: any;
}

/**
 * Seed des utilisateurs prestataires EcoDeli
 */
export async function seedProviderUsers(
  prisma: PrismaClient, 
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PROVIDER_USERS');
  
  const result: SeedResult = {
    entity: 'provider_users',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier si les prestataires existent déjà
  const existingProviders = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER }
  });
  
  if (existingProviders.length > 0 && !options.force) {
    logger.warning('PROVIDER_USERS', `${existingProviders.length} prestataires déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingProviders.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.provider.deleteMany({});
    await prisma.user.deleteMany({ where: { role: UserRole.PROVIDER } });
    logger.database('NETTOYAGE', 'provider users', 0);
  }

  // Types de services disponibles
  const serviceCategories = [
    {
      category: 'Plomberie',
      services: ['Réparation fuite', 'Installation sanitaire', 'Débouchage canalisation', 'Remplacement robinetterie'],
      hourlyRate: { min: 45, max: 80 },
      certifications: ['Qualification RGE', 'Certification Qualibat', 'Formation gaz'],
      equipment: ['Outils spécialisés', 'Équipement soudure', 'Caméra canalisation'],
      experience: { min: 2, max: 15 }
    },
    {
      category: 'Électricité',
      services: ['Installation électrique', 'Dépannage urgence', 'Mise aux normes', 'Installation domotique'],
      hourlyRate: { min: 50, max: 90 },
      certifications: ['Habilitation électrique', 'Qualification IRVE', 'Certification Qualifelec'],
      equipment: ['Multimètre professionnel', 'Outillage isolé', 'Échafaudage'],
      experience: { min: 3, max: 20 }
    },
    {
      category: 'Ménage',
      services: ['Ménage domicile', 'Nettoyage bureaux', 'Nettoyage fin chantier', 'Entretien régulier'],
      hourlyRate: { min: 20, max: 35 },
      certifications: ['Formation HACCP', 'Certificat propreté', 'Formation produits écologiques'],
      equipment: ['Aspirateur professionnel', 'Produits écologiques', 'Matériel spécialisé'],
      experience: { min: 1, max: 10 }
    },
    {
      category: 'Jardinage',
      services: ['Entretien jardin', 'Taille haies', 'Tonte pelouse', 'Plantation'],
      hourlyRate: { min: 25, max: 45 },
      certifications: ['Certificat phytosanitaire', 'Formation élagage', 'Permis utilisation produits'],
      equipment: ['Tondeuse professionnelle', 'Taille-haie', 'Débroussailleuse'],
      experience: { min: 1, max: 12 }
    },
    {
      category: 'Peinture',
      services: ['Peinture intérieure', 'Peinture extérieure', 'Décapage', 'Papier peint'],
      hourlyRate: { min: 35, max: 60 },
      certifications: ['Qualification RGE', 'Formation éco-matériaux', 'Certificat échafaudage'],
      equipment: ['Échafaudage mobile', 'Pistolet peinture', 'Bâches protection'],
      experience: { min: 2, max: 18 }
    },
    {
      category: 'Menuiserie',
      services: ['Pose fenêtres', 'Aménagement intérieur', 'Réparation volets', 'Fabrication sur mesure'],
      hourlyRate: { min: 40, max: 75 },
      certifications: ['Qualification RGE', 'Formation bois', 'Certification Qualibois'],
      equipment: ['Outillage portatif', 'Scie circulaire', 'Perceuse professionnelle'],
      experience: { min: 3, max: 25 }
    }
  ];

  // Zones d'intervention en Île-de-France
  const interventionZones = [
    'Paris', 'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne',
    'Seine-et-Marne', 'Yvelines', 'Essonne', 'Val-d\'Oise'
  ];

  // Générer 25 prestataires avec des profils variés
  const providerUsers: ProviderData[] = [];
  
  for (let i = 0; i < 25; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const serviceCategory = getRandomElement(serviceCategories);
    const address = generateFrenchAddress();
    const isExperienced = Math.random() > 0.4; // 60% sont expérimentés
    const isCompany = Math.random() > 0.7; // 30% ont une entreprise
    const yearsExperience = isExperienced 
      ? faker.number.int({ min: 5, max: serviceCategory.experience.max })
      : faker.number.int({ min: serviceCategory.experience.min, max: 4 });

    // Statut selon l'expérience et la demande
    let status: UserStatus;
    if (isExperienced && Math.random() > 0.15) {
      status = UserStatus.ACTIVE; // 85% des expérimentés sont actifs
    } else if (Math.random() > 0.8) {
      status = UserStatus.SUSPENDED; // 20% suspendus/rejetés
    } else {
      status = UserStatus.INACTIVE; // En attente de vérification
    }

    providerUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'ProviderPass2024!',
      phoneNumber: generateFrenchPhone(),
      image: getRandomElement([
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        undefined, undefined // 30% sans photo
      ]),
      status,
      address,
      business: {
        companyName: isCompany ? generateCompanyName(serviceCategory.category, lastName) : null,
        siret: isCompany ? faker.string.numeric(14) : null,
        isIndividual: !isCompany,
        yearsFounded: isCompany && isExperienced ? 
          new Date().getFullYear() - faker.number.int({ min: 2, max: yearsExperience }) : null,
        employeeCount: isCompany ? faker.number.int({ min: 1, max: 8 }) : 1,
        insuranceNumber: status === UserStatus.ACTIVE ? faker.string.alphanumeric(12).toUpperCase() : null
      },
      services: {
        category: serviceCategory.category,
        serviceList: faker.helpers.arrayElements(serviceCategory.services, { 
          min: isExperienced ? 3 : 1, 
          max: serviceCategory.services.length 
        }),
        hourlyRate: faker.number.int({
          min: serviceCategory.hourlyRate.min + (isExperienced ? 10 : 0),
          max: serviceCategory.hourlyRate.max + (isExperienced ? 15 : 0)
        }),
        minIntervention: faker.number.int({ min: 1, max: 3 }), // heures minimum
        emergencyAvailable: isExperienced && Math.random() > 0.6,
        emergencyRate: isExperienced && Math.random() > 0.6 ? 
          faker.number.int({ min: 20, max: 50 }) : 0 // supplément urgence
      },
      qualifications: {
        yearsExperience,
        certifications: faker.helpers.arrayElements(serviceCategory.certifications, { 
          min: isExperienced ? 2 : 0, 
          max: serviceCategory.certifications.length 
        }),
        equipment: faker.helpers.arrayElements(serviceCategory.equipment, { 
          min: isExperienced ? 2 : 1, 
          max: serviceCategory.equipment.length 
        }),
        specializations: generateSpecializations(serviceCategory.category, isExperienced),
        languages: getRandomElement([
          ['français'],
          ['français', 'anglais'],
          ['français', 'espagnol'],
          ['français', 'arabe'],
          ['français', 'anglais', 'espagnol']
        ])
      },
      operationalData: {
        interventionZones: faker.helpers.arrayElements(interventionZones, { 
          min: 1, 
          max: isExperienced ? 4 : 2 
        }),
        maxDistance: faker.number.int({ min: 15, max: 50 }), // km
        workSchedule: generateWorkSchedule(serviceCategory.category),
        availability: status === UserStatus.ACTIVE ? 
          getRandomElement(['high', 'medium', 'low']) : 'unavailable',
        rating: status === UserStatus.ACTIVE && isExperienced ? 
          faker.number.float({ min: 4.0, max: 5.0 }) : null,
        completedJobs: status === UserStatus.ACTIVE ? 
          faker.number.int({ min: isExperienced ? 20 : 2, max: isExperienced ? 200 : 25 }) : 0,
        averageResponseTime: isExperienced ? 
          faker.number.int({ min: 15, max: 60 }) : faker.number.int({ min: 30, max: 120 }), // minutes
        cancellationPolicy: generateCancellationPolicy()
      }
    });
  }

  // Créer les utilisateurs prestataires par batch
  const batchSize = 5;
  for (let i = 0; i < providerUsers.length; i += batchSize) {
    const batch = providerUsers.slice(i, i + batchSize);
    
    for (const providerData of batch) {
      try {
        logger.progress('PROVIDER_USERS', i + 1, providerUsers.length, `Création: ${providerData.name}`);

        // Hasher le mot de passe
        const hashedPassword = await hashPassword(providerData.password);
        
        // Créer l'utilisateur avec le profil prestataire
        const user = await prisma.user.create({
          data: {
            name: providerData.name,
            email: providerData.email,
            password: hashedPassword,
            role: UserRole.PROVIDER,
            status: providerData.status,
            phoneNumber: providerData.phoneNumber,
            image: providerData.image,
            lastLoginAt: providerData.status === UserStatus.ACTIVE ? getRandomDate(1, 7) : getRandomDate(7, 30),
            locale: 'fr-FR',
            preferences: {
              theme: getRandomElement(['light', 'dark', 'auto']),
              notifications: {
                email: true,
                push: true,
                sms: Math.random() > 0.4, // 60% acceptent SMS
                jobAlerts: true,
                weeklyReport: providerData.status === UserStatus.ACTIVE,
                clientMessages: true
              },
              work: {
                autoAcceptJobs: providerData.status === UserStatus.ACTIVE && Math.random() > 0.7,
                preferredJobTypes: providerData.services.serviceList,
                maxDailyJobs: faker.number.int({ min: 2, max: 6 }),
                workWeekends: Math.random() > 0.5
              }
            },
            isVerified: providerData.status === UserStatus.ACTIVE,
            hasCompletedOnboarding: providerData.status !== UserStatus.INACTIVE,
            onboardingCompletionDate: providerData.status !== UserStatus.INACTIVE ? getRandomDate(30, 180) : null,
            createdAt: getRandomDate(30, 180),
            updatedAt: getRandomDate(1, 30),
            // Créer le profil prestataire associé
            provider: {
              create: {
                companyName: providerData.business.companyName,
                address: providerData.address.street,
                phone: providerData.phoneNumber,
                services: providerData.services.serviceList,
                isVerified: providerData.status === UserStatus.ACTIVE,
                rating: providerData.operationalData.rating,
                verificationDate: providerData.status === UserStatus.ACTIVE ? getRandomDate(30, 180) : null,
                serviceType: providerData.services.category,
                description: generateProviderDescription(providerData.services.category, providerData.qualifications),
                availability: generateAvailabilityText(providerData.operationalData.workSchedule),
                professionalBio: generateProfessionalBio(providerData.qualifications),
                serviceRadius: providerData.operationalData.maxDistance,
                portfolioUrls: providerData.status === UserStatus.ACTIVE && Math.random() > 0.6 ? 
                  generatePortfolioUrls() : [],
                qualifications: providerData.qualifications.certifications,
                yearsInBusiness: providerData.qualifications.yearsExperience,
                insuranceInfo: providerData.business.insuranceNumber ? {
                  provider: 'Allianz Pro',
                  policyNumber: providerData.business.insuranceNumber,
                  expiryDate: faker.date.future({ years: 1 }).toISOString()
                } : undefined,
                workSchedule: providerData.operationalData.workSchedule,
                serviceFees: {
                  hourlyRate: providerData.services.hourlyRate,
                  minimumCharge: providerData.services.minIntervention * providerData.services.hourlyRate,
                  emergencyRate: providerData.services.emergencyRate,
                  travelFee: faker.number.int({ min: 0, max: 25 }),
                  currency: 'EUR'
                },
                cancellationPolicy: providerData.operationalData.cancellationPolicy,
                languages: providerData.qualifications.languages,
                createdAt: getRandomDate(30, 180),
                updatedAt: getRandomDate(1, 30)
              }
            }
          },
          include: {
            provider: true
          }
        });

        logger.success('PROVIDER_USERS', `✅ Prestataire créé: ${user.name} - ${providerData.services.category}`);
        result.created++;
        
      } catch (error: any) {
        logger.error('PROVIDER_USERS', `❌ Erreur création prestataire ${providerData.name}: ${error.message}`);
        result.errors++;
      }
    }
    
    // Progression par batch
    if (i + batchSize < providerUsers.length) {
      logger.progress('PROVIDER_USERS', Math.min(i + batchSize, providerUsers.length), providerUsers.length);
    }
  }

  // Validation des prestataires créés
  const finalProviders = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER },
    include: { provider: true }
  });
  
  if (finalProviders.length >= providerUsers.length - result.errors) {
    logger.validation('PROVIDER_USERS', 'PASSED', `${finalProviders.length} prestataires créés avec succès`);
  } else {
    logger.validation('PROVIDER_USERS', 'FAILED', `Attendu: ${providerUsers.length}, Créé: ${finalProviders.length}`);
  }

  // Statistiques par statut
  const byStatus = finalProviders.reduce((acc, provider) => {
    acc[provider.status] = (acc[provider.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('PROVIDER_USERS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques par catégorie de service
  const byServiceType = finalProviders.reduce((acc, provider) => {
    const serviceType = provider.provider?.serviceType || 'Non défini';
    acc[serviceType] = (acc[serviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('PROVIDER_USERS', `🔧 Répartition par service: ${JSON.stringify(byServiceType)}`);

  // Statistiques de vérification
  const verifiedProviders = finalProviders.filter(provider => provider.provider?.isVerified);
  logger.info('PROVIDER_USERS', `✅ Prestataires vérifiés: ${verifiedProviders.length} (${Math.round(verifiedProviders.length / finalProviders.length * 100)}%)`);

  // Statistiques d'expérience
  const experiencedProviders = finalProviders.filter(provider => 
    provider.provider?.yearsInBusiness && provider.provider.yearsInBusiness >= 5
  );
  logger.info('PROVIDER_USERS', `🎓 Prestataires expérimentés (5+ ans): ${experiencedProviders.length} (${Math.round(experiencedProviders.length / finalProviders.length * 100)}%)`);

  logger.endSeed('PROVIDER_USERS', result);
  return result;
}

/**
 * Génère un nom de société pour les prestataires
 */
function generateCompanyName(category: string, lastName: string): string {
  const prefixes = {
    'Plomberie': ['Plomberie', 'Sanitaire', 'Chauffage'],
    'Électricité': ['Électricité', 'Électro', 'Installation'],
    'Ménage': ['Nettoyage', 'Propreté', 'Service'],
    'Jardinage': ['Jardinage', 'Espaces Verts', 'Paysage'],
    'Peinture': ['Peinture', 'Décoration', 'Revêtement'],
    'Menuiserie': ['Menuiserie', 'Bois', 'Aménagement']
  };

  const categoryPrefixes = prefixes[category as keyof typeof prefixes] || ['Service'];
  const prefix = getRandomElement(categoryPrefixes);
  
  return `${prefix} ${lastName}`;
}

/**
 * Génère des spécialisations selon la catégorie
 */
function generateSpecializations(category: string, isExperienced: boolean): string[] {
  const specializations = {
    'Plomberie': ['Rénovation salle de bain', 'Installation chauffage', 'Plomberie industrielle', 'Éco-plomberie'],
    'Électricité': ['Domotique', 'Tableau électrique', 'Éclairage LED', 'Borne recharge véhicule'],
    'Ménage': ['Nettoyage écologique', 'Nettoyage post-travaux', 'Entretien bureaux', 'Vitres professionnelles'],
    'Jardinage': ['Élagage', 'Création jardins', 'Jardins japonais', 'Permaculture'],
    'Peinture': ['Peinture décorative', 'Enduits à la chaux', 'Peinture écologique', 'Trompe-l\'œil'],
    'Menuiserie': ['Agencement cuisine', 'Escaliers sur mesure', 'Restauration meuble', 'Isolation bois']
  };

  const categorySpecs = specializations[category as keyof typeof specializations] || ['Polyvalent'];
  return faker.helpers.arrayElements(categorySpecs, { 
    min: isExperienced ? 2 : 1, 
    max: isExperienced ? 4 : 2 
  });
}

/**
 * Génère un planning de travail réaliste
 */
function generateWorkSchedule(category: string): any {
  const isWeekendWorker = ['Plomberie', 'Électricité', 'Ménage'].includes(category) && Math.random() > 0.7;
  
  return {
    monday: { available: true, hours: '08:00-18:00' },
    tuesday: { available: true, hours: '08:00-18:00' },
    wednesday: { available: true, hours: '08:00-18:00' },
    thursday: { available: true, hours: '08:00-18:00' },
    friday: { available: true, hours: '08:00-18:00' },
    saturday: { 
      available: isWeekendWorker || Math.random() > 0.6, 
      hours: isWeekendWorker ? '08:00-17:00' : '09:00-16:00' 
    },
    sunday: { 
      available: isWeekendWorker && Math.random() > 0.7, 
      hours: '10:00-16:00' 
    }
  };
}

/**
 * Génère une politique d'annulation
 */
function generateCancellationPolicy(): string {
  const policies = [
    'Annulation gratuite jusqu\'à 24h avant l\'intervention',
    'Annulation gratuite jusqu\'à 48h avant, 50% du tarif si annulation tardive',
    'Annulation possible jusqu\'à 12h avant, frais de déplacement facturés si annulation le jour même',
    'Annulation gratuite jusqu\'à 2h avant pour les interventions d\'urgence'
  ];
  
  return getRandomElement(policies);
}

/**
 * Génère une description de prestataire
 */
function generateProviderDescription(category: string, qualifications: any): string {
  const templates = {
    'Plomberie': 'Spécialisé en {category} avec {years} ans d\'expérience. Intervention rapide et devis gratuit.',
    'Électricité': 'Électricien professionnel certifié, {years} ans d\'expérience en installation et dépannage électrique.',
    'Ménage': 'Service de nettoyage professionnel avec {years} ans d\'expérience, produits écologiques privilégiés.',
    'Jardinage': 'Jardinier paysagiste avec {years} ans d\'expérience, création et entretien d\'espaces verts.',
    'Peinture': 'Artisan peintre qualifié, {years} ans d\'expérience en peinture intérieure et extérieure.',
    'Menuiserie': 'Menuisier ébéniste avec {years} ans d\'expérience, fabrication et pose sur mesure.'
  };

  const template = templates[category as keyof typeof templates] || 'Prestataire professionnel avec {years} ans d\'expérience.';
  return template.replace('{category}', category.toLowerCase()).replace('{years}', qualifications.yearsExperience.toString());
}

/**
 * Génère une bio professionnelle
 */
function generateProfessionalBio(qualifications: any): string {
  const intro = `Professionnel avec ${qualifications.yearsExperience} années d'expérience`;
  const certs = qualifications.certifications.length > 0 ? 
    `, certifié ${qualifications.certifications.slice(0, 2).join(' et ')}` : '';
  const outro = '. Travail soigné et respect des délais garantis.';
  
  return intro + certs + outro;
}

/**
 * Génère un texte de disponibilité
 */
function generateAvailabilityText(workSchedule: any): string {
  const availableDays = Object.entries(workSchedule)
    .filter(([_, schedule]: [string, any]) => schedule.available)
    .map(([day, _]) => day);
  
  if (availableDays.length === 7) {
    return 'Disponible 7j/7 y compris week-ends';
  } else if (availableDays.length >= 5) {
    return 'Disponible du lundi au vendredi, week-ends sur demande';
  } else {
    return `Disponible ${availableDays.length} jours par semaine`;
  }
}

/**
 * Génère des URLs de portfolio
 */
function generatePortfolioUrls(): string[] {
  return [
    'https://exemple-portfolio.fr/galerie1',
    'https://exemple-portfolio.fr/galerie2',
    'https://exemple-portfolio.fr/references'
  ].slice(0, faker.number.int({ min: 1, max: 3 }));
}

/**
 * Valide l'intégrité des données prestataires
 */
export async function validateProviderUsers(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des prestataires...');
  
  const providers = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER },
    include: { provider: true }
  });

  let isValid = true;

  // Vérifier que tous les prestataires ont un profil associé
  const providersWithoutProfile = providers.filter(provider => !provider.provider);
  if (providersWithoutProfile.length > 0) {
    logger.error('VALIDATION', `❌ ${providersWithoutProfile.length} prestataires sans profil`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les prestataires ont un profil associé');
  }

  // Vérifier la cohérence statut/vérification
  const activeButNotVerified = providers.filter(provider => 
    provider.status === UserStatus.ACTIVE && !provider.provider?.isVerified
  );
  
  if (activeButNotVerified.length > 0) {
    logger.error('VALIDATION', `❌ ${activeButNotVerified.length} prestataires actifs mais non vérifiés`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Cohérence statut/vérification respectée');
  }

  // Vérifier les services obligatoires
  const providersWithoutServices = providers.filter(provider => 
    !provider.provider?.services || (provider.provider.services as string[]).length === 0
  );
  
  if (providersWithoutServices.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${providersWithoutServices.length} prestataires sans services définis`);
  } else {
    logger.success('VALIDATION', '✅ Tous les prestataires ont des services définis');
  }

  // Vérifier la diversité des catégories de service
  const serviceTypes = new Set(providers.map(p => p.provider?.serviceType).filter(Boolean));
  if (serviceTypes.size < 4) {
    logger.warning('VALIDATION', `⚠️ Faible diversité de services: ${serviceTypes.size} types`);
  } else {
    logger.success('VALIDATION', `✅ Bonne diversité de services: ${serviceTypes.size} types différents`);
  }

  // Vérifier les tarifs pour les prestataires actifs
  const activeProviders = providers.filter(p => p.status === UserStatus.ACTIVE);
  const providersWithoutRates = activeProviders.filter(provider => {
    try {
      const fees = provider.provider?.serviceFees as any;
      return !fees || !fees.hourlyRate || fees.hourlyRate <= 0;
    } catch {
      return true;
    }
  });

  if (providersWithoutRates.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${providersWithoutRates.length} prestataires actifs sans tarifs définis`);
  } else {
    logger.success('VALIDATION', '✅ Tous les prestataires actifs ont des tarifs définis');
  }

  return isValid;
} 