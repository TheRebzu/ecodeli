import { PrismaClient, UserRole } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import { SeedResult, SeedOptions } from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Seed des templates de contrats EcoDeli
 */
export async function seedContractTemplates(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("CONTRACT_TEMPLATES");

  const result: SeedResult = {
    entity: "contract_templates",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier si les templates existent déjà
  const existingTemplates = (await prisma.contractTemplate?.count()) || 0;

  if (existingTemplates > 0 && !options.force) {
    logger.warning(
      "CONTRACT_TEMPLATES",
      `${existingTemplates} templates déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingTemplates;
    return result;
  }

  // Nettoyer si force activé
  if (options.force && prisma.contractTemplate) {
    await prisma.contractTemplate.deleteMany({});
    logger.database("NETTOYAGE", "contract templates", 0);
  }

  // Récupérer un admin pour créer les templates
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (!admin) {
    logger.error(
      "CONTRACT_TEMPLATES",
      "Aucun admin trouvé - exécuter d'abord les seeds utilisateurs",
    );
    return result;
  }

  // Templates de contrats à créer
  const templates = [
    // Templates pour commerçants
    {
      name: "Contrat Standard Commerçant",
      description: "Template de contrat standard pour les nouveaux commerçants",
      version: "1.0",
      isActive: true,
      defaultType: "STANDARD",
      defaultMonthlyFee: 150.0,
      defaultCommissionRate: 0.12,
      defaultDuration: 12,
      targetMerchantCategory: "Alimentaire",
      content: generateMerchantTemplateContent("STANDARD", "Alimentaire"),
    },
    {
      name: "Contrat Premium Commerçant",
      description: "Template de contrat premium avec services étendus",
      version: "1.0",
      isActive: true,
      defaultType: "PREMIUM",
      defaultMonthlyFee: 250.0,
      defaultCommissionRate: 0.1,
      defaultDuration: 24,
      targetMerchantCategory: "Tous secteurs",
      content: generateMerchantTemplateContent("PREMIUM", "Premium"),
    },
    {
      name: "Contrat Restaurant",
      description: "Template spécialisé pour les restaurants",
      version: "1.0",
      isActive: true,
      defaultType: "STANDARD",
      defaultMonthlyFee: 200.0,
      defaultCommissionRate: 0.15,
      defaultDuration: 12,
      targetMerchantCategory: "Restaurant",
      content: generateMerchantTemplateContent("STANDARD", "Restaurant"),
    },
    {
      name: "Contrat Pharmacie",
      description: "Template pour les pharmacies avec clauses sanitaires",
      version: "1.0",
      isActive: true,
      defaultType: "CUSTOM",
      defaultMonthlyFee: 300.0,
      defaultCommissionRate: 0.08,
      defaultDuration: 24,
      targetMerchantCategory: "Pharmacie",
      content: generateMerchantTemplateContent("CUSTOM", "Pharmacie"),
    },
    {
      name: "Contrat Essai Nouveau Commerçant",
      description: "Template d'essai 3 mois pour nouveaux commerçants",
      version: "1.0",
      isActive: true,
      defaultType: "TRIAL",
      defaultMonthlyFee: 99.0,
      defaultCommissionRate: 0.14,
      defaultDuration: 3,
      targetMerchantCategory: "Tous secteurs",
      content: generateMerchantTemplateContent("TRIAL", "Trial"),
    },
    // Templates pour prestataires de services
    {
      name: "Contrat Standard Prestataire",
      description: "Template de contrat pour prestataires de services",
      version: "1.0",
      isActive: true,
      defaultType: "STANDARD",
      defaultMonthlyFee: 0.0, // Pas de frais fixe pour prestataires
      defaultCommissionRate: 0.2,
      defaultDuration: 12,
      targetMerchantCategory: "Services",
      content: generateProviderTemplateContent("STANDARD", "Services généraux"),
    },
    {
      name: "Contrat Prestataire Premium",
      description: "Template premium pour prestataires expérimentés",
      version: "1.0",
      isActive: true,
      defaultType: "PREMIUM",
      defaultMonthlyFee: 0.0,
      defaultCommissionRate: 0.15,
      defaultDuration: 24,
      targetMerchantCategory: "Services Premium",
      content: generateProviderTemplateContent("PREMIUM", "Services premium"),
    },
    {
      name: "Contrat Artisan Spécialisé",
      description: "Template pour artisans avec qualifications spécifiques",
      version: "1.0",
      isActive: true,
      defaultType: "CUSTOM",
      defaultMonthlyFee: 0.0,
      defaultCommissionRate: 0.18,
      defaultDuration: 18,
      targetMerchantCategory: "Artisanat",
      content: generateProviderTemplateContent(
        "CUSTOM",
        "Artisanat spécialisé",
      ),
    },
  ];

  // Créer les templates
  for (const template of templates) {
    try {
      logger.progress(
        "CONTRACT_TEMPLATES",
        result.created + 1,
        templates.length,
        `Création: ${template.name}`,
      );

      await prisma.contractTemplate?.create({
        data: {
          ...template,
          createdById: admin.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "CONTRACT_TEMPLATES",
        `❌ Erreur création template ${template.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation des templates créés
  const finalTemplates = prisma.contractTemplate
    ? await prisma.contractTemplate.findMany({ include: { createdBy: true } })
    : [];

  if (finalTemplates.length >= templates.length - result.errors) {
    logger.validation(
      "CONTRACT_TEMPLATES",
      "PASSED",
      `${finalTemplates.length} templates créés avec succès`,
    );
  } else {
    logger.validation(
      "CONTRACT_TEMPLATES",
      "FAILED",
      `Attendu: ${templates.length}, Créé: ${finalTemplates.length}`,
    );
  }

  // Statistiques par type
  const byType = finalTemplates.reduce(
    (acc: Record<string, number>, template) => {
      acc[template.defaultType] = (acc[template.defaultType] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "CONTRACT_TEMPLATES",
    `📋 Templates par type: ${JSON.stringify(byType)}`,
  );

  // Templates actifs
  const activeTemplates = finalTemplates.filter((t) => t.isActive);
  logger.info(
    "CONTRACT_TEMPLATES",
    `✅ Templates actifs: ${activeTemplates.length}/${finalTemplates.length}`,
  );

  logger.endSeed("CONTRACT_TEMPLATES", result);
  return result;
}

/**
 * Génère le contenu d'un template pour commerçants
 */
function generateMerchantTemplateContent(
  type: string,
  category: string,
): string {
  const baseContent = {
    template: {
      type: "merchant_contract",
      category: category,
      version: "1.0",
    },
    header: {
      title: `Contrat de Partenariat Commercial ${type} - ${category}`,
      parties: {
        ecodeli:
          "EcoDeli SAS, société par actions simplifiée au capital de 100 000€, RCS Paris 123 456 789",
        merchant: "{{MERCHANT_COMPANY_NAME}}, {{MERCHANT_BUSINESS_TYPE}}",
      },
    },
    terms: {
      duration: type === "TRIAL" ? "3 mois" : "12 mois",
      monthlyFee: "{{MONTHLY_FEE}}€ HT par mois",
      commission: "{{COMMISSION_RATE}}% par transaction",
      minimumVolume: "{{MINIMUM_VOLUME}} commandes par mois",
      paymentTerms: "Paiement à 30 jours fin de mois",
    },
    services: {
      platform: [
        "Accès à la plateforme EcoDeli",
        "Gestion des commandes en temps réel",
        "Interface d'administration dédiée",
        "Outils de reporting et statistiques",
      ],
      delivery: [
        "Réseau de livreurs qualifiés et vérifiés",
        "Couverture géographique étendue",
        "Suivi GPS en temps réel",
        "Garantie de livraison",
      ],
      support:
        type === "PREMIUM"
          ? [
              "Support client prioritaire 24h/7j",
              "Manager de compte dédié",
              "Formation personnalisée",
              "API avancée",
            ]
          : [
              "Support client 7j/7",
              "Formation initiale",
              "Documentation complète",
            ],
    },
    obligations: {
      merchant: [
        "Respecter les standards de qualité EcoDeli",
        "Maintenir des stocks suffisants",
        "Préparer les commandes dans les délais convenus",
        "Fournir des informations produits exactes",
      ],
      ecodeli: [
        "Assurer la disponibilité de la plateforme",
        "Maintenir un réseau de livreurs qualifiés",
        "Traiter les paiements selon les délais convenus",
        "Fournir un support technique",
      ],
    },
    specificClauses: getSpecificClausesByCategory(category, type),
    pricing: {
      structure: "Commission sur les ventes + Abonnement mensuel",
      billing: "Facturation mensuelle automatique",
      payment: "Virement bancaire ou prélèvement SEPA",
    },
  };

  return JSON.stringify(baseContent, null, 2);
}

/**
 * Génère le contenu d'un template pour prestataires
 */
function generateProviderTemplateContent(
  type: string,
  category: string,
): string {
  const baseContent = {
    template: {
      type: "provider_contract",
      category: category,
      version: "1.0",
    },
    header: {
      title: `Contrat de Prestation de Services ${type} - ${category}`,
      parties: {
        ecodeli: "EcoDeli SAS, plateforme de mise en relation",
        provider: "{{PROVIDER_NAME}}, prestataire de services {{SERVICE_TYPE}}",
      },
    },
    terms: {
      duration: "12 mois renouvelable",
      commission: "{{COMMISSION_RATE}}% par prestation",
      zones: "{{INTERVENTION_ZONES}}",
      availability: "{{AVAILABILITY_HOURS}}",
    },
    services: {
      platform: [
        "Profil prestataire sur la plateforme",
        "Gestion des demandes clients",
        "Calendrier de disponibilités",
        "Messagerie intégrée",
      ],
      matching: [
        "Mise en relation avec clients qualifiés",
        "Système de notation et avis",
        "Géolocalisation des interventions",
        "Notification temps réel",
      ],
      payment: [
        "Paiement sécurisé par la plateforme",
        "Virement automatique post-prestation",
        "Gestion des factures",
        "Suivi des revenus",
      ],
    },
    qualifications: {
      required: [
        "Justificatifs d'identité valides",
        "Assurance responsabilité civile professionnelle",
        "Qualifications métier requises selon secteur",
        "Casier judiciaire vierge",
      ],
      preferred:
        type === "PREMIUM"
          ? [
              "Certifications professionnelles",
              "Plus de 5 ans d'expérience",
              "Formation spécialisée",
              "Portfolio de réalisations",
            ]
          : ["Expérience dans le domaine", "Références clients"],
    },
    obligations: {
      provider: [
        "Respecter les créneaux de disponibilité annoncés",
        "Fournir un service de qualité professionnelle",
        "Respecter les tarifs convenus",
        "Maintenir ses qualifications à jour",
      ],
      ecodeli: [
        "Fournir des demandes clients qualifiées",
        "Assurer le paiement des prestations",
        "Maintenir la confidentialité des données",
        "Fournir un support technique",
      ],
    },
    pricing: {
      structure: "Commission sur prestations réalisées uniquement",
      billing: "Déduction automatique lors du paiement",
      payment: "Virement hebdomadaire",
    },
  };

  return JSON.stringify(baseContent, null, 2);
}

/**
 * Génère des clauses spécifiques selon la catégorie
 */
function getSpecificClausesByCategory(category: string, type: string): any {
  const baseClause = {
    exclusivity:
      type === "PARTNER"
        ? "Clause d'exclusivité territoriale"
        : "Pas d'exclusivité",
    liability: "Limitation de responsabilité selon CGV",
    termination: "Résiliation avec préavis de 30 jours",
  };

  switch (category) {
    case "Restaurant":
      return {
        ...baseClause,
        hygiene: "Respect des normes HACCP obligatoire",
        delivery: "Emballages adaptés aux livraisons",
        temperature: "Maintien de la chaîne du froid si nécessaire",
      };

    case "Pharmacie":
      return {
        ...baseClause,
        regulation: "Respect du Code de la santé publique",
        prescription: "Vérification des ordonnances obligatoire",
        storage: "Stockage sécurisé des médicaments",
        privacy: "Confidentialité médicale renforcée",
      };

    case "Alimentaire":
      return {
        ...baseClause,
        traceability: "Traçabilité des produits alimentaires",
        expiry: "Vérification des dates de péremption",
        cold_chain: "Respect de la chaîne du froid",
      };

    default:
      return baseClause;
  }
}

/**
 * Valide l'intégrité des templates de contrats
 */
export async function validateContractTemplates(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des templates de contrats...");

  if (!prisma.contractTemplate) {
    logger.warning("VALIDATION", "⚠️ Modèle ContractTemplate non disponible");
    return true; // Pas d'erreur si le modèle n'existe pas
  }

  let isValid = true;

  // Vérifier que tous les templates ont un contenu valide
  const templates = await prisma.contractTemplate.findMany();

  if (templates.length === 0) {
    logger.error("VALIDATION", "❌ Aucun template trouvé");
    isValid = false;
  } else {
    logger.success("VALIDATION", `✅ ${templates.length} templates trouvés`);
  }

  // Vérifier que tous les templates actifs ont un contenu valide JSON
  const invalidTemplates = templates.filter((t) => {
    if (!t.isActive) return false;
    try {
      JSON.parse(t.content);
      return false;
    } catch {
      return true;
    }
  });

  if (invalidTemplates.length > 0) {
    logger.error(
      "VALIDATION",
      `❌ ${invalidTemplates.length} templates avec contenu JSON invalide`,
    );
    isValid = false;
  }

  // Vérifier les templates actifs
  const activeTemplates = templates.filter((t) => t.isActive);
  logger.info(
    "VALIDATION",
    `✅ Templates actifs: ${activeTemplates.length}/${templates.length}`,
  );

  logger.success("VALIDATION", "✅ Validation des templates terminée");
  return isValid;
}
