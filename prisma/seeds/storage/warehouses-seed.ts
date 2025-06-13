import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  generateFrenchAddress,
} from "../utils/seed-helpers";
import { defaultSeedConfig } from "../seed.config";
import { faker } from "@faker-js/faker";

/**
 * Seed des entrepôts de stockage EcoDeli
 */
export async function seedWarehouses(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("WAREHOUSES");

  const result: SeedResult = {
    entity: "warehouses",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  const config = defaultSeedConfig.quantities;

  // Vérifier si des entrepôts existent déjà
  const existingWarehouses = await prisma.warehouse.findMany();

  if (existingWarehouses.length > 0 && !options.force) {
    logger.warning(
      "WAREHOUSES",
      `${existingWarehouses.length} entrepôts déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingWarehouses.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    const deleted = await prisma.warehouse.deleteMany({});
    logger.database("NETTOYAGE", "warehouses", deleted.count);
  }

  // Définition des entrepôts stratégiques en France
  const warehousesData = [
    {
      name: "EcoDeli Paris Centre",
      address: "15 Rue de Rivoli",
      city: "Paris",
      zipCode: "75001",
      country: "France",
      latitude: 48.8566,
      longitude: 2.3522,
      capacity: 50,
      description: "Entrepôt principal au cœur de Paris",
      operatingHours: {
        monday: { open: "07:00", close: "20:00" },
        tuesday: { open: "07:00", close: "20:00" },
        wednesday: { open: "07:00", close: "20:00" },
        thursday: { open: "07:00", close: "20:00" },
        friday: { open: "07:00", close: "20:00" },
        saturday: { open: "08:00", close: "18:00" },
        sunday: { open: "09:00", close: "17:00" },
      },
    },
    {
      name: "EcoDeli Lyon Confluence",
      address: "112 Cours Charlemagne",
      city: "Lyon",
      zipCode: "69002",
      country: "France",
      latitude: 45.764,
      longitude: 4.8357,
      capacity: 40,
      description: "Entrepôt moderne dans le quartier Confluence",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
    {
      name: "EcoDeli Marseille Vieux-Port",
      address: "7 La Canebière",
      city: "Marseille",
      zipCode: "13001",
      country: "France",
      latitude: 43.2965,
      longitude: 5.3698,
      capacity: 35,
      description: "Entrepôt proche du Vieux-Port",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
    {
      name: "EcoDeli Toulouse Capitole",
      address: "2 Place du Capitole",
      city: "Toulouse",
      zipCode: "31000",
      country: "France",
      latitude: 43.6047,
      longitude: 1.4442,
      capacity: 30,
      description: "Entrepôt au centre de Toulouse",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
    {
      name: "EcoDeli Nice Promenade",
      address: "5 Promenade des Anglais",
      city: "Nice",
      zipCode: "06000",
      country: "France",
      latitude: 43.7102,
      longitude: 7.262,
      capacity: 25,
      description: "Entrepôt face à la Méditerranée",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
    {
      name: "EcoDeli Nantes Loire",
      address: "1 Place du Commerce",
      city: "Nantes",
      zipCode: "44000",
      country: "France",
      latitude: 47.2184,
      longitude: -1.5536,
      capacity: 30,
      description: "Entrepôt dans le centre historique",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
    {
      name: "EcoDeli Strasbourg Cathédrale",
      address: "4 Place Kléber",
      city: "Strasbourg",
      zipCode: "67000",
      country: "France",
      latitude: 48.5734,
      longitude: 7.7521,
      capacity: 25,
      description: "Entrepôt au cœur de l'Alsace",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
    {
      name: "EcoDeli Bordeaux Garonne",
      address: "12 Place de la Bourse",
      city: "Bordeaux",
      zipCode: "33000",
      country: "France",
      latitude: 44.8378,
      longitude: -0.5792,
      capacity: 35,
      description: "Entrepôt face à la Garonne",
      operatingHours: {
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "16:00" },
      },
    },
  ];

  // Créer les entrepôts
  for (const warehouseData of warehousesData) {
    try {
      const warehouse = await prisma.warehouse.create({
        data: {
          name: warehouseData.name,
          location: `${warehouseData.city}, ${warehouseData.country}`,
          address: warehouseData.address,
          capacity: warehouseData.capacity,
          description: warehouseData.description,
          isActive: true,
          latitude: warehouseData.latitude,
          longitude: warehouseData.longitude,
          openingHours: JSON.stringify(warehouseData.operatingHours),
          createdAt: faker.date.between({
            from: new Date("2023-01-01"),
            to: new Date("2023-06-01"),
          }),
          updatedAt: new Date(),
        },
      });

      logger.success(
        "WAREHOUSES",
        `✅ Entrepôt créé: ${warehouseData.name} (${warehouseData.capacity} boxes)`,
      );
      result.created++;
    } catch (error: any) {
      logger.error(
        "WAREHOUSES",
        `❌ Erreur création entrepôt ${warehouseData.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation des entrepôts créés
  const finalWarehouses = await prisma.warehouse.findMany();
  const totalCapacity = finalWarehouses.reduce((sum, w) => sum + w.capacity, 0);

  if (finalWarehouses.length >= warehousesData.length) {
    logger.validation(
      "WAREHOUSES",
      "PASSED",
      `${finalWarehouses.length} entrepôts créés (${totalCapacity} boxes total)`,
    );
  } else {
    logger.validation(
      "WAREHOUSES",
      "FAILED",
      `Attendu: ${warehousesData.length}, Créé: ${finalWarehouses.length}`,
    );
  }

  logger.endSeed("WAREHOUSES", result);
  return result;
}

/**
 * Vérifie l'intégrité des entrepôts
 */
export async function validateWarehouses(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des entrepôts...");

  const warehouses = await prisma.warehouse.findMany();
  let isValid = true;

  // Vérifier la couverture géographique
  const locations = new Set(warehouses.map((w) => w.location));
  const expectedCities = [
    "Paris",
    "Lyon",
    "Marseille",
    "Toulouse",
    "Nice",
    "Nantes",
    "Strasbourg",
    "Bordeaux",
  ];

  for (const city of expectedCities) {
    const hasCity = Array.from(locations).some((location) =>
      location.includes(city),
    );
    if (!hasCity) {
      logger.error("VALIDATION", `❌ Ville manquante: ${city}`);
      isValid = false;
    } else {
      logger.success("VALIDATION", `✅ Couverture: ${city}`);
    }
  }

  // Vérifier la capacité totale
  const totalCapacity = warehouses.reduce((sum, w) => sum + w.capacity, 0);
  if (totalCapacity < 200) {
    logger.warning(
      "VALIDATION",
      `⚠️ Capacité totale faible: ${totalCapacity} boxes`,
    );
  } else {
    logger.success("VALIDATION", `✅ Capacité totale: ${totalCapacity} boxes`);
  }

  // Vérifier que tous les entrepôts sont actifs
  const inactiveCount = warehouses.filter((w) => !w.isActive).length;
  if (inactiveCount > 0) {
    logger.warning("VALIDATION", `⚠️ ${inactiveCount} entrepôts inactifs`);
  } else {
    logger.success("VALIDATION", `✅ Tous les entrepôts sont actifs`);
  }

  logger.success(
    "VALIDATION",
    `✅ Total: ${warehouses.length} entrepôts dans le système`,
  );

  return isValid;
}
