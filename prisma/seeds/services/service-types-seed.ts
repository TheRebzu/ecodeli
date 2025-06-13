import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import { SeedResult, SeedOptions } from "../utils/seed-helpers";

/**
 * Interface pour définir une catégorie de service
 */
interface ServiceCategoryData {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  services?: ServiceTypeData[];
}

/**
 * Interface pour définir un type de service
 */
interface ServiceTypeData {
  name: string;
  description: string;
  basePrice: number;
  duration: number; // en minutes
  tags: string[];
  requirements?: string;
  isOnline: boolean;
  isAtHome: boolean;
  isAtShop: boolean;
}

/**
 * Seed des types de services EcoDeli
 * Crée les catégories de services avec configuration pour les prestataires
 */
export async function seedServiceTypes(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("SERVICE_TYPES");

  const result: SeedResult = {
    entity: "service_types",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier si des catégories existent déjà
  const existingCategories = await prisma.serviceCategory.count();

  if (existingCategories > 0 && !options.force) {
    logger.warning(
      "SERVICE_TYPES",
      `${existingCategories} catégories déjà présentes - utiliser force:true pour recréer`,
    );
    result.skipped = existingCategories;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.service.deleteMany({});
    await prisma.serviceCategory.deleteMany({});
    logger.database("NETTOYAGE", "services et catégories", 0);
  }

  // Configuration des catégories principales et services
  const CATEGORIES_CONFIG: ServiceCategoryData[] = [
    {
      name: "Plomberie",
      description: "Services de plomberie et installation sanitaire",
      icon: "🔧",
      color: "#3B82F6",
      sortOrder: 1,
      services: [
        {
          name: "Réparation fuite d'eau",
          description: "Intervention rapide pour réparer les fuites d'eau",
          basePrice: 85.0,
          duration: 90,
          tags: ["urgence", "fuite", "réparation"],
          requirements: "Accès au compteur d'eau",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Installation lavabo",
          description: "Installation complète d'un lavabo avec robinetterie",
          basePrice: 150.0,
          duration: 180,
          tags: ["installation", "sanitaire", "lavabo"],
          requirements: "Fourniture du matériel par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Débouchage canalisation",
          description: "Débouchage professionnel des canalisations",
          basePrice: 95.0,
          duration: 60,
          tags: ["débouchage", "canalisation", "urgence"],
          requirements: "Accès aux canalisations",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Installation chauffe-eau",
          description: "Installation et mise en service d'un chauffe-eau",
          basePrice: 280.0,
          duration: 240,
          tags: ["installation", "chauffe-eau", "sanitaire"],
          requirements: "Fourniture de l'appareil par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
    {
      name: "Électricité",
      description: "Services électriques et domotique",
      icon: "⚡",
      color: "#F59E0B",
      sortOrder: 2,
      services: [
        {
          name: "Installation prises électriques",
          description: "Installation de nouvelles prises électriques",
          basePrice: 65.0,
          duration: 120,
          tags: ["installation", "prise", "électricité"],
          requirements: "Fourniture du matériel par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Réparation tableau électrique",
          description: "Diagnostic et réparation de tableau électrique",
          basePrice: 120.0,
          duration: 150,
          tags: ["réparation", "tableau", "électricité"],
          requirements: "Accès au tableau électrique",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Installation éclairage LED",
          description: "Installation d'éclairage LED moderne",
          basePrice: 45.0,
          duration: 90,
          tags: ["installation", "LED", "éclairage"],
          requirements: "Fourniture des ampoules par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Dépannage panne électrique",
          description: "Intervention d'urgence pour panne électrique",
          basePrice: 110.0,
          duration: 120,
          tags: ["urgence", "panne", "dépannage"],
          requirements: "Accès au compteur électrique",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
    {
      name: "Ménage et Nettoyage",
      description: "Services de nettoyage résidentiel et commercial",
      icon: "🧽",
      color: "#10B981",
      sortOrder: 3,
      services: [
        {
          name: "Ménage appartement 3 pièces",
          description: "Nettoyage complet d'un appartement 3 pièces",
          basePrice: 45.0,
          duration: 180,
          tags: ["ménage", "appartement", "nettoyage"],
          requirements: "Produits de nettoyage fournis",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Nettoyage bureaux",
          description: "Nettoyage professionnel d'espaces de bureaux",
          basePrice: 35.0,
          duration: 120,
          tags: ["bureaux", "professionnel", "nettoyage"],
          requirements: "Accès sécurisé aux locaux",
          isOnline: false,
          isAtHome: false,
          isAtShop: true,
        },
        {
          name: "Nettoyage après travaux",
          description: "Nettoyage spécialisé après travaux de rénovation",
          basePrice: 85.0,
          duration: 240,
          tags: ["travaux", "rénovation", "nettoyage"],
          requirements: "Équipement de protection fourni",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Nettoyage vitres",
          description:
            "Nettoyage professionnel des vitres intérieures et extérieures",
          basePrice: 25.0,
          duration: 90,
          tags: ["vitres", "nettoyage", "extérieur"],
          requirements: "Accès aux vitres extérieures",
          isOnline: false,
          isAtHome: true,
          isAtShop: true,
        },
      ],
    },
    {
      name: "Jardinage",
      description: "Services d'entretien et aménagement de jardins",
      icon: "🌱",
      color: "#059669",
      sortOrder: 4,
      services: [
        {
          name: "Tonte pelouse",
          description: "Tonte professionnelle de pelouse jusqu'à 500m²",
          basePrice: 35.0,
          duration: 90,
          tags: ["tonte", "pelouse", "entretien"],
          requirements: "Accès direct au jardin",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Taille haies et arbustes",
          description: "Taille professionnelle de haies et arbustes",
          basePrice: 55.0,
          duration: 120,
          tags: ["taille", "haies", "arbustes"],
          requirements: "Évacuation des déchets verts incluse",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Plantation massif",
          description: "Création et plantation de massifs floraux",
          basePrice: 75.0,
          duration: 180,
          tags: ["plantation", "massif", "fleurs"],
          requirements: "Fourniture des plants par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Élagage arbre",
          description: "Élagage professionnel d'arbres jusqu'à 8m",
          basePrice: 125.0,
          duration: 240,
          tags: ["élagage", "arbre", "sécurite"],
          requirements: "Assurance responsabilité civile requise",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
    {
      name: "Bricolage et Réparation",
      description: "Services de bricolage et petites réparations",
      icon: "🔨",
      color: "#DC2626",
      sortOrder: 5,
      services: [
        {
          name: "Montage meuble IKEA",
          description: "Montage professionnel de meubles en kit",
          basePrice: 45.0,
          duration: 120,
          tags: ["montage", "meuble", "ikea"],
          requirements: "Tous les éléments et outils fournis",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Fixation murale TV",
          description: "Installation et fixation murale de télévision",
          basePrice: 65.0,
          duration: 90,
          tags: ["fixation", "tv", "mural"],
          requirements: "Support fourni par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Réparation porte",
          description: "Réparation de porte d'intérieur ou d'extérieur",
          basePrice: 55.0,
          duration: 120,
          tags: ["réparation", "porte", "serrurerie"],
          requirements: "Pièces de rechange à prévoir",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Installation étagères",
          description: "Installation d'étagères murales sur mesure",
          basePrice: 35.0,
          duration: 90,
          tags: ["installation", "étagères", "rangement"],
          requirements: "Étagères fournies par le client",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
    {
      name: "Support Informatique",
      description: "Assistance et dépannage informatique",
      icon: "💻",
      color: "#6366F1",
      sortOrder: 6,
      services: [
        {
          name: "Dépannage PC/Mac",
          description: "Diagnostic et réparation d'ordinateur",
          basePrice: 65.0,
          duration: 120,
          tags: ["dépannage", "ordinateur", "réparation"],
          requirements: "Sauvegarde des données recommandée",
          isOnline: true,
          isAtHome: true,
          isAtShop: true,
        },
        {
          name: "Installation logiciel",
          description: "Installation et configuration de logiciels",
          basePrice: 35.0,
          duration: 60,
          tags: ["installation", "logiciel", "configuration"],
          requirements: "Licences logiciels fournies par le client",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Formation informatique",
          description: "Formation personnalisée aux outils informatiques",
          basePrice: 45.0,
          duration: 90,
          tags: ["formation", "informatique", "apprentissage"],
          requirements: "Ordinateur fonctionnel requis",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Configuration réseau WiFi",
          description: "Installation et sécurisation du réseau WiFi",
          basePrice: 55.0,
          duration: 90,
          tags: ["réseau", "wifi", "sécurité"],
          requirements: "Box internet fonctionnelle",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
    {
      name: "Garde d'enfants",
      description: "Services de garde et accompagnement d'enfants",
      icon: "👶",
      color: "#EC4899",
      sortOrder: 7,
      services: [
        {
          name: "Garde à domicile (journée)",
          description: "Garde d'enfants à domicile en journée",
          basePrice: 12.0,
          duration: 480, // 8 heures
          tags: ["garde", "domicile", "journée"],
          requirements: "Agrément garde d'enfants requis",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Baby-sitting soirée",
          description: "Garde d'enfants en soirée et week-end",
          basePrice: 15.0,
          duration: 180, // 3 heures
          tags: ["baby-sitting", "soirée", "weekend"],
          requirements: "Références vérifiées obligatoires",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Accompagnement école",
          description: "Accompagnement scolaire et aide aux devoirs",
          basePrice: 18.0,
          duration: 120,
          tags: ["scolaire", "devoirs", "accompagnement"],
          requirements: "Niveau d'études adapté",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Garde d'urgence",
          description: "Garde d'enfants en urgence (24h/24)",
          basePrice: 20.0,
          duration: 240,
          tags: ["urgence", "garde", "24h"],
          requirements: "Disponibilité immédiate",
          isOnline: false,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
    {
      name: "Cours Particuliers",
      description: "Cours particuliers et soutien scolaire",
      icon: "📚",
      color: "#7C3AED",
      sortOrder: 8,
      services: [
        {
          name: "Cours mathématiques lycée",
          description: "Cours particuliers de mathématiques niveau lycée",
          basePrice: 25.0,
          duration: 90,
          tags: ["mathématiques", "lycée", "soutien"],
          requirements: "Niveau bac+2 minimum",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Cours français collège",
          description: "Cours de français et littérature niveau collège",
          basePrice: 22.0,
          duration: 90,
          tags: ["français", "collège", "littérature"],
          requirements: "Expérience pédagogique souhaitée",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Cours anglais conversationnel",
          description: "Cours d'anglais axé sur la conversation",
          basePrice: 28.0,
          duration: 60,
          tags: ["anglais", "conversation", "langue"],
          requirements: "Niveau bilingue ou natif",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
        {
          name: "Préparation examens",
          description: "Préparation intensive aux examens (bac, brevet)",
          basePrice: 35.0,
          duration: 120,
          tags: ["examens", "préparation", "intensif"],
          requirements: "Spécialisation dans la matière",
          isOnline: true,
          isAtHome: true,
          isAtShop: false,
        },
      ],
    },
  ];

  let totalCategories = 0;

  // Créer les catégories principales
  for (const categoryConfig of CATEGORIES_CONFIG) {
    try {
      logger.progress(
        "SERVICE_TYPES",
        totalCategories + 1,
        CATEGORIES_CONFIG.length,
        `Création catégorie: ${categoryConfig.name}`,
      );

      // Créer la catégorie principale
      await prisma.serviceCategory.create({
        data: {
          name: categoryConfig.name,
          description: categoryConfig.description,
        },
      });

      totalCategories++;
      result.created++;
    } catch (error: any) {
      logger.error(
        "SERVICE_TYPES",
        `❌ Erreur création catégorie ${categoryConfig.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation des catégories créées
  const finalCategories = await prisma.serviceCategory.findMany();

  if (finalCategories.length >= totalCategories - result.errors) {
    logger.validation(
      "SERVICE_TYPES",
      "PASSED",
      `${finalCategories.length} catégories créées avec succès`,
    );
  } else {
    logger.validation(
      "SERVICE_TYPES",
      "FAILED",
      `Attendu: ${totalCategories}, Créé: ${finalCategories.length}`,
    );
  }

  // Statistiques créées
  logger.info(
    "SERVICE_TYPES",
    `📊 Catégories créées: ${finalCategories.length}`,
  );

  // Prix moyens par catégorie
  const avgPricesInfo = CATEGORIES_CONFIG.map((cat) => {
    if (cat.services) {
      const avgPrice =
        cat.services.reduce((sum, service) => sum + service.basePrice, 0) /
        cat.services.length;
      return `${cat.name}: ${avgPrice.toFixed(2)}€`;
    }
    return `${cat.name}: N/A`;
  });

  logger.info("SERVICE_TYPES", `💰 Prix moyens: ${avgPricesInfo.join(", ")}`);

  logger.endSeed("SERVICE_TYPES", result);
  return result;
}

/**
 * Valide l'intégrité des types de services
 */
export async function validateServiceTypes(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des types de services...");

  let isValid = true;

  // Vérifier les catégories
  const categories = await prisma.serviceCategory.findMany();

  if (categories.length === 0) {
    logger.error("VALIDATION", "❌ Aucune catégorie de service trouvée");
    isValid = false;
  } else {
    logger.success("VALIDATION", `✅ ${categories.length} catégories trouvées`);
  }

  // Vérifier que toutes les catégories ont un nom et description
  const categoriesIncomplete = categories.filter(
    (cat) => !cat.name || !cat.description,
  );

  if (categoriesIncomplete.length === 0) {
    logger.success("VALIDATION", "✅ Toutes les catégories sont complètes");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${categoriesIncomplete.length} catégories incomplètes`,
    );
  }

  logger.success("VALIDATION", "✅ Validation des types de services terminée");
  return isValid;
}

// La configuration CATEGORIES_CONFIG est définie à l'intérieur de la fonction seedServiceTypes
