import { PrismaClient, BoxType, BoxStatus, UserRole } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  generateFrenchAddress,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir une configuration de box
 */
interface BoxConfiguration {
  type: BoxType;
  sizeRange: { min: number; max: number }; // en m²
  pricePerDayRange: { min: number; max: number }; // en euros
  features: string[];
  maxWeight?: number; // en kg
  dimensions: { width: number; height: number; depth: number }[];
}

/**
 * Interface pour l'historique d'usage
 */
interface UsageHistoryEntry {
  duration: number; // en jours
  occupancyRate: number; // pourcentage
  reason: string;
}

/**
 * Seed des boxes de stockage EcoDeli
 * Crée des entrepôts géolocalisés avec boxes variées et historique
 */
export async function seedBoxes(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("BOXES");

  const result: SeedResult = {
    entity: "boxes",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier les entrepôts existants
  const existingWarehouses = await prisma.warehouse.count();

  if (existingWarehouses === 0) {
    logger.warning(
      "BOXES",
      "Aucun entrepôt trouvé - créer d'abord les seeds d'entrepôts",
    );
    return result;
  }

  // Vérifier les boxes existantes
  const existingBoxes = await prisma.box.count();

  if (existingBoxes > 50 && !options.force) {
    logger.warning(
      "BOXES",
      `${existingBoxes} boxes déjà présentes - utiliser force:true pour recréer`,
    );
    result.skipped = existingBoxes;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.boxUsageHistory.deleteMany({});
    await prisma.boxAvailabilitySubscription.deleteMany({});
    await prisma.box.deleteMany({});
    logger.database("NETTOYAGE", "boxes + usage_history + subscriptions", 0);
  }

  // Récupérer les entrepôts et clients
  const warehouses = await prisma.warehouse.findMany();
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    select: { id: true, name: true },
  });

  // Trouver le client principal (octavia.zemlak@orange.fr)
  const principalClient = await prisma.user.findUnique({
    where: { email: "octavia.zemlak@orange.fr" },
    select: { id: true, name: true },
  });

  if (!principalClient) {
    logger.warning(
      "BOXES",
      "Client principal octavia.zemlak@orange.fr non trouvé",
    );
  }

  // Configuration des types de boxes
  const BOX_CONFIGURATIONS: Record<BoxType, BoxConfiguration> = {
    [BoxType.STANDARD]: {
      type: BoxType.STANDARD,
      sizeRange: { min: 5, max: 10 },
      pricePerDayRange: { min: 8, max: 15 },
      features: ["Accès 24h/24", "Sécurisé", "Éclairage"],
      maxWeight: 200,
      dimensions: [
        { width: 2.5, height: 2.5, depth: 2 },
        { width: 3, height: 2.5, depth: 2.2 },
        { width: 2.8, height: 3, depth: 2 },
      ],
    },
    [BoxType.CLIMATE_CONTROLLED]: {
      type: BoxType.CLIMATE_CONTROLLED,
      sizeRange: { min: 4, max: 8 },
      pricePerDayRange: { min: 10, max: 18 },
      features: [
        "Accès 24h/24",
        "Sécurisé",
        "Climatisé",
        "Contrôle température",
        "Hygrométrie",
      ],
      maxWeight: 150,
      dimensions: [
        { width: 2, height: 2.5, depth: 2 },
        { width: 2.5, height: 2.5, depth: 1.8 },
        { width: 2, height: 3, depth: 2.2 },
      ],
    },
    [BoxType.SECURE]: {
      type: BoxType.SECURE,
      sizeRange: { min: 2, max: 6 },
      pricePerDayRange: { min: 6, max: 12 },
      features: [
        "Accès 24h/24",
        "Haute sécurité",
        "Double authentification",
        "Vidéosurveillance",
      ],
      maxWeight: 100,
      dimensions: [
        { width: 1.5, height: 2, depth: 1.5 },
        { width: 2, height: 2.5, depth: 1.2 },
        { width: 1.8, height: 2.2, depth: 1.8 },
      ],
    },
    [BoxType.EXTRA_LARGE]: {
      type: BoxType.EXTRA_LARGE,
      sizeRange: { min: 16, max: 30 },
      pricePerDayRange: { min: 26, max: 50 },
      features: [
        "Accès 24h/24",
        "Sécurisé",
        "Climatisé",
        "Éclairage LED",
        "Prise électrique",
        "Accès véhicule",
      ],
      maxWeight: 500,
      dimensions: [
        { width: 4, height: 3, depth: 4 },
        { width: 5, height: 3, depth: 3.5 },
        { width: 4.5, height: 3.5, depth: 4 },
      ],
    },
    [BoxType.REFRIGERATED]: {
      type: BoxType.REFRIGERATED,
      sizeRange: { min: 3, max: 8 },
      pricePerDayRange: { min: 15, max: 30 },
      features: [
        "Accès 24h/24",
        "Sécurisé",
        "Réfrigéré",
        "Contrôle température",
        "Alerte température",
      ],
      maxWeight: 200,
      dimensions: [
        { width: 2, height: 2, depth: 1.5 },
        { width: 2.5, height: 2.2, depth: 1.8 },
        { width: 2.2, height: 2.5, depth: 1.6 },
      ],
    },
    [BoxType.FRAGILE]: {
      type: BoxType.FRAGILE,
      sizeRange: { min: 1, max: 5 },
      pricePerDayRange: { min: 8, max: 20 },
      features: [
        "Accès 24h/24",
        "Sécurisé",
        "Protection anti-choc",
        "Mousse protectrice",
        "Climatisé",
      ],
      maxWeight: 50,
      dimensions: [
        { width: 1, height: 2, depth: 1 },
        { width: 1.5, height: 2.5, depth: 1.2 },
        { width: 1.2, height: 2.2, depth: 1.8 },
      ],
    },
  };

  let totalBoxes = 0;

  // Créer des boxes pour chaque entrepôt
  for (const warehouse of warehouses) {
    try {
      logger.progress(
        "BOXES",
        totalBoxes + 1,
        warehouses.length,
        `Création boxes entrepôt: ${warehouse.name}`,
      );

      // Déterminer le nombre de boxes selon la taille de l'entrepôt
      const warehouseCapacity = faker.number.int({ min: 20, max: 100 });

      // Distribution des types de boxes (réaliste)
      const boxDistribution = {
        [BoxType.STANDARD]: Math.floor(warehouseCapacity * 0.4), // 40%
        [BoxType.CLIMATE_CONTROLLED]: Math.floor(warehouseCapacity * 0.25), // 25%
        [BoxType.SECURE]: Math.floor(warehouseCapacity * 0.15), // 15%
        [BoxType.EXTRA_LARGE]: Math.floor(warehouseCapacity * 0.1), // 10%
        [BoxType.REFRIGERATED]: Math.floor(warehouseCapacity * 0.05), // 5%
        [BoxType.FRAGILE]: Math.floor(warehouseCapacity * 0.05), // 5%
      };

      let boxNumber = 1;

      // Créer les boxes pour chaque type
      for (const [boxType, count] of Object.entries(boxDistribution)) {
        const config = BOX_CONFIGURATIONS[boxType as BoxType];

        for (let i = 0; i < count; i++) {
          try {
            // Générer les caractéristiques de la box
            const size = faker.number.float({
              min: config.sizeRange.min,
              max: config.sizeRange.max,
              fractionDigits: 1,
            });

            const pricePerDay = faker.number.float({
              min: config.pricePerDayRange.min,
              max: config.pricePerDayRange.max,
              fractionDigits: 2,
            });

            const dimensions = getRandomElement(config.dimensions);
            const floorLevel = faker.number.int({ min: 0, max: 3 });

            // Déterminer si la box est occupée (70% de chance d'être libre)
            const isOccupied = faker.datatype.boolean(0.3);
            const client =
              isOccupied && clients.length > 0
                ? getRandomElement(clients)
                : null;

            // Attribuer prioritairement les boxes au client principal octavia.zemlak@orange.fr
            let selectedClient = null;
            if (isOccupied && clients.length > 0) {
              // 80% de chance d'attribuer au client principal si disponible
              if (principalClient && Math.random() > 0.2) {
                selectedClient = principalClient;
              } else {
                selectedClient = getRandomElement(clients);
              }
            }

            // Statut de la box
            let status = BoxStatus.AVAILABLE;
            if (isOccupied && selectedClient) {
              status = BoxStatus.OCCUPIED;
            } else if (faker.datatype.boolean(0.05)) {
              status = BoxStatus.MAINTENANCE;
            } else if (faker.datatype.boolean(0.1)) {
              status = BoxStatus.RESERVED;
            }

            const box = await prisma.box.create({
              data: {
                warehouseId: warehouse.id,
                name: `${boxType}-${String(boxNumber).padStart(3, "0")}`,
                size: size,
                boxType: boxType as BoxType,
                isOccupied: isOccupied,
                clientId: selectedClient?.id || null,
                pricePerDay: pricePerDay,
                description: `Box ${boxType.toLowerCase()} de ${size}m² avec ${config.features.join(", ")}`,
                locationDescription: `Niveau ${floorLevel}, Allée ${String.fromCharCode(65 + faker.number.int({ min: 0, max: 7 }))}`,
                floorLevel: floorLevel,
                maxWeight: config.maxWeight,
                dimensions: dimensions,
                features: config.features,
                status: status,
                lastInspectedAt: faker.date.past({ years: 1 }),
              },
            });

            totalBoxes++;
            result.created++;
            boxNumber++;

            // Note: historique d'usage et souscriptions désactivés temporairement
            // en raison d'incompatibilités avec le schéma actuel
          } catch (error: any) {
            logger.error(
              "BOXES",
              `❌ Erreur création box ${boxType}: ${error.message}`,
            );
            result.errors++;
          }
        }
      }
    } catch (error: any) {
      logger.error(
        "BOXES",
        `❌ Erreur traitement entrepôt ${warehouse.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Statistiques finales
  const finalBoxes = await prisma.box.findMany({
    include: {
      warehouse: true,
      client: true,
      usageHistory: true,
      subscriptions: true,
    },
  });

  // Distribution par type
  const boxesByType = finalBoxes.reduce(
    (acc: Record<BoxType, number>, box) => {
      acc[box.boxType] = (acc[box.boxType] || 0) + 1;
      return acc;
    },
    {} as Record<BoxType, number>,
  );

  // Distribution par statut
  const boxesByStatus = finalBoxes.reduce(
    (acc: Record<BoxStatus, number>, box) => {
      acc[box.status] = (acc[box.status] || 0) + 1;
      return acc;
    },
    {} as Record<BoxStatus, number>,
  );

  // Statistiques d'occupation
  const occupiedBoxes = finalBoxes.filter((box) => box.isOccupied).length;
  const occupancyRate =
    finalBoxes.length > 0
      ? ((occupiedBoxes / finalBoxes.length) * 100).toFixed(1)
      : "0";

  // Revenus potentiels
  const totalDailyRevenue = finalBoxes.reduce((sum, box) => {
    return sum + (box.isOccupied ? box.pricePerDay : 0);
  }, 0);

  const maxDailyRevenue = finalBoxes.reduce(
    (sum, box) => sum + box.pricePerDay,
    0,
  );

  // Distribution par entrepôt
  const boxesByWarehouse = finalBoxes.reduce(
    (acc: Record<string, number>, box) => {
      const warehouseName = box.warehouse.name.split(" ")[0];
      acc[warehouseName] = (acc[warehouseName] || 0) + 1;
      return acc;
    },
    {},
  );

  // Historique d'usage
  const boxesWithHistory = finalBoxes.filter(
    (box) => box.usageHistory.length > 0,
  ).length;
  const boxesWithSubscriptions = finalBoxes.filter(
    (box) => box.subscriptions.length > 0,
  ).length;

  logger.info("BOXES", `📦 Types: ${JSON.stringify(boxesByType)}`);
  logger.info("BOXES", `📊 Statuts: ${JSON.stringify(boxesByStatus)}`);
  logger.info("BOXES", `🏢 Par entrepôt: ${JSON.stringify(boxesByWarehouse)}`);
  logger.info(
    "BOXES",
    `💰 Revenus: ${totalDailyRevenue.toFixed(2)}€/jour (${occupancyRate}% occupation) sur ${maxDailyRevenue.toFixed(2)}€ max`,
  );
  logger.info(
    "BOXES",
    `📈 Historique: ${boxesWithHistory} boxes avec historique, ${boxesWithSubscriptions} avec souscriptions`,
  );

  // Validation
  if (finalBoxes.length >= totalBoxes - result.errors) {
    logger.validation(
      "BOXES",
      "PASSED",
      `${finalBoxes.length} boxes créées avec succès`,
    );
  } else {
    logger.validation(
      "BOXES",
      "FAILED",
      `Attendu: ${totalBoxes}, Créé: ${finalBoxes.length}`,
    );
  }

  logger.endSeed("BOXES", result);
  return result;
}

/**
 * Crée l'historique d'usage pour une box
 */
async function createBoxUsageHistory(
  prisma: PrismaClient,
  boxId: string,
  clients: any[],
): Promise<void> {
  const historyEntries = faker.number.int({ min: 1, max: 5 });

  for (let i = 0; i < historyEntries; i++) {
    try {
      const client = getRandomElement(clients);
      if (!client) continue;

      const startDate = faker.date.past({ years: 2 });
      const endDate = faker.date.between({ from: startDate, to: new Date() });

      await prisma.boxUsageHistory.create({
        data: {
          boxId: boxId,
          clientId: client.id,
          startDate: startDate,
          endDate: endDate,
          purpose: faker.helpers.arrayElement([
            "Stockage temporaire déménagement",
            "Archive documents entreprise",
            "Stockage meubles saisonniers",
            "Matériel professionnel",
            "Affaires personnelles",
            "Stock marchandises",
            "Équipements sportifs",
            "Stockage véhicule",
          ]),
          notes: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,
        },
      });
    } catch (error) {
      // Ignorer les erreurs d'historique pour ne pas bloquer la création de boxes
    }
  }
}

/**
 * Crée des souscriptions d'alerte pour une box
 */
async function createBoxSubscriptions(
  prisma: PrismaClient,
  boxId: string,
  clients: any[],
): Promise<void> {
  const subscriptionCount = faker.number.int({ min: 1, max: 3 });

  for (let i = 0; i < subscriptionCount; i++) {
    try {
      const client = getRandomElement(clients);
      if (!client) continue;

      await prisma.boxAvailabilitySubscription.create({
        data: {
          boxId: boxId,
          clientId: client.id,
          isActive: faker.datatype.boolean(0.8),
          notifyEmail: faker.datatype.boolean(0.9),
          notifySms: faker.datatype.boolean(0.6),
          notifyPush: faker.datatype.boolean(0.7),
          priorityLevel: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
          maxPricePerDay: faker.number.float({
            min: 5,
            max: 50,
            fractionDigits: 2,
          }),
          minDuration: faker.number.int({ min: 7, max: 90 }),
          notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
        },
      });
    } catch (error) {
      // Ignorer les erreurs de souscription pour ne pas bloquer la création de boxes
    }
  }
}

/**
 * Valide l'intégrité des boxes de stockage
 */
export async function validateBoxes(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des boxes de stockage...");

  let isValid = true;

  // Vérifier les boxes
  const boxes = await prisma.box.findMany({
    include: {
      warehouse: true,
      client: true,
      usageHistory: true,
      subscriptions: true,
    },
  });

  if (boxes.length === 0) {
    logger.error("VALIDATION", "❌ Aucune box trouvée");
    isValid = false;
  } else {
    logger.success("VALIDATION", `✅ ${boxes.length} boxes trouvées`);
  }

  // Vérifier la cohérence des statuts
  const occupiedBoxesWithoutClient = boxes.filter(
    (box) => box.isOccupied && !box.clientId,
  );

  if (occupiedBoxesWithoutClient.length === 0) {
    logger.success("VALIDATION", "✅ Cohérence des statuts d'occupation");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${occupiedBoxesWithoutClient.length} boxes occupées sans client`,
    );
  }

  // Vérifier les dimensions vs taille
  const boxesWithInconsistentSize = boxes.filter((box) => {
    try {
      const dimensions = box.dimensions as {
        width: number;
        height: number;
        depth: number;
      };
      const calculatedSize = dimensions.width * dimensions.depth;
      return Math.abs(calculatedSize - box.size) > 1; // Tolérance de 1m²
    } catch {
      return false;
    }
  });

  if (boxesWithInconsistentSize.length === 0) {
    logger.success("VALIDATION", "✅ Cohérence taille/dimensions");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${boxesWithInconsistentSize.length} boxes avec taille/dimensions incohérentes`,
    );
  }

  // Vérifier les relations entrepôt
  const boxesWithValidWarehouse = boxes.filter((box) => box.warehouse !== null);

  if (boxesWithValidWarehouse.length === boxes.length) {
    logger.success(
      "VALIDATION",
      "✅ Toutes les boxes sont rattachées à un entrepôt",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${boxes.length - boxesWithValidWarehouse.length} boxes sans entrepôt`,
    );
    isValid = false;
  }

  // Vérifier les prix
  const boxesWithValidPrice = boxes.filter((box) => box.pricePerDay > 0);

  if (boxesWithValidPrice.length === boxes.length) {
    logger.success("VALIDATION", "✅ Tous les prix sont valides");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${boxes.length - boxesWithValidPrice.length} boxes avec prix invalide`,
    );
  }

  // Statistiques d'usage
  const totalUsageHistory = boxes.reduce(
    (sum, box) => sum + box.usageHistory.length,
    0,
  );
  const totalSubscriptions = boxes.reduce(
    (sum, box) => sum + box.subscriptions.length,
    0,
  );

  logger.info(
    "VALIDATION",
    `📊 Historique d'usage: ${totalUsageHistory} entrées`,
  );
  logger.info("VALIDATION", `🔔 Souscriptions: ${totalSubscriptions} alertes`);

  logger.success("VALIDATION", "✅ Validation des boxes de stockage terminée");
  return isValid;
}
