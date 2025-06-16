import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcryptjs";

export interface SeedResult {
  entity: string;
  created: number;
  skipped: number;
  errors: number;
}

export interface SeedOptions {
  clean?: boolean;
  verbose?: boolean;
  force?: boolean;
}

/**
 * Générateur d'adresses françaises réalistes
 */
export function generateFrenchAddress() {
  const cities = [
    "Paris",
    "Marseille",
    "Lyon",
    "Toulouse",
    "Nice",
    "Nantes",
    "Montpellier",
    "Strasbourg",
    "Bordeaux",
    "Lille",
    "Rennes",
    "Reims",
    "Saint-Étienne",
    "Toulon",
    "Le Havre",
  ];

  const city = faker.helpers.arrayElement(cities);

  return {
    street: `${faker.number.int({ min: 1, max: 999 })} ${faker.location.streetAddress()}`,
    city,
    zipCode: faker.location.zipCode(),
    country: "France",
    latitude: faker.location.latitude({ min: 43.0, max: 49.0 }),
    longitude: faker.location.longitude({ min: -5.0, max: 8.0 }),
  };
}

/**
 * Générateur de SIRET français valide
 */
export function generateSiret(): string {
  const siren = faker.number.int({ min: 100000000, max: 999999999 }).toString();
  const nic = faker.number.int({ min: 10000, max: 99999 }).toString();
  return siren + nic;
}

/**
 * Générateur de numéros de téléphone français
 */
export function generateFrenchPhone(): string {
  const prefixes = ["01", "02", "03", "04", "05", "06", "07", "09"];
  const prefix = faker.helpers.arrayElement(prefixes);
  const number = faker.number.int({ min: 10000000, max: 99999999 }).toString();
  return `${prefix}${number}`;
}

/**
 * Générateur d'emails avec domaines français
 */
export function generateFrenchEmail(
  firstName?: string,
  lastName?: string,
): string {
  const domains = [
    "gmail.com",
    "orange.fr",
    "wanadoo.fr",
    "free.fr",
    "hotmail.fr",
    "yahoo.fr",
  ];
  const domain = faker.helpers.arrayElement(domains);

  if (firstName && lastName) {
    const cleanFirst = firstName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const cleanLast = lastName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return `${cleanFirst}.${cleanLast}@${domain}`;
  }

  return faker.internet.email({ provider: domain });
}

/**
 * Générateur de dates dans une plage
 */
export function generateDateInRange(startDate: Date, endDate: Date): Date {
  return faker.date.between({ from: startDate, to: endDate });
}

/**
 * Générateur de prix en centimes (pour éviter les problèmes de décimales)
 */
export function generatePriceInCents(
  min: number = 100,
  max: number = 50000,
): number {
  return faker.number.int({ min, max });
}

/**
 * Sélecteur pondéré d'éléments
 */
export function weightedSelect<T>(items: { item: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = faker.number.int({ min: 0, max: totalWeight });

  for (const item of items) {
    if (random <= item.weight) {
      return item.item;
    }
    random -= item.weight;
  }

  return items[items.length - 1].item;
}

/**
 * Générateur de statuts basé sur des probabilités réalistes
 */
export function generateRealisticStatus<T extends string>(
  statuses: { status: T; probability: number }[],
): T {
  return weightedSelect(
    statuses.map((s) => ({ item: s.status, weight: s.probability })),
  );
}

/**
 * Nettoyeur de table avec vérification de contraintes
 */
export async function cleanTable(
  prisma: PrismaClient,
  tableName: string,
  options: { force?: boolean } = {},
): Promise<number> {
  try {
    // @ts-ignore - Accès dynamique aux tables Prisma
    const result = await prisma[tableName].deleteMany({});
    return result.count;
  } catch (error) {
    if (!options.force) {
      console.warn(`⚠️  Impossible de nettoyer ${tableName}:`, error);
      return 0;
    }
    throw error;
  }
}

/**
 * Créateur d'entité avec gestion d'erreurs
 */
export async function createEntity<T>(
  createFn: () => Promise<T>,
  entityName: string,
  options: SeedOptions = {},
): Promise<{ entity?: T; success: boolean; error?: string }> {
  try {
    const entity = await createFn();
    if (options.verbose) {
      console.log(`✅ Créé: ${entityName}`);
    }
    return { entity, success: true };
  } catch (error: any) {
    const errorMsg = error.message || "Erreur inconnue";
    if (options.verbose) {
      console.error(
        `❌ Erreur lors de la création de ${entityName}:`,
        errorMsg,
      );
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Générateur de batch avec gestion de la concurrence
 */
export async function createBatch<T>(
  items: any[],
  createFn: (item: any) => Promise<T>,
  entityName: string,
  options: SeedOptions & { batchSize?: number } = {},
): Promise<SeedResult> {
  const batchSize = options.batchSize || 10;
  const result: SeedResult = {
    entity: entityName,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const promises = batch.map((item) =>
      createEntity(() => createFn(item), entityName, options),
    );

    const results = await Promise.all(promises);

    results.forEach((res) => {
      if (res.success) {
        result.created++;
      } else {
        result.errors++;
      }
    });

    if (options.verbose && i + batchSize < items.length) {
      console.log(
        `📊 Progression ${entityName}: ${Math.min(i + batchSize, items.length)}/${items.length}`,
      );
    }
  }

  return result;
}

/**
 * Hasher un mot de passe avec bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Sélectionner un élément aléatoire dans un tableau
 */
export function getRandomElement<T>(array: T[]): T {
  return faker.helpers.arrayElement(array);
}

/**
 * Générer une date aléatoire dans le passé (en jours)
 */
export function getRandomDate(minDaysAgo: number, maxDaysAgo: number): Date {
  // S'assurer que min est plus petit que max
  const minDays = Math.min(minDaysAgo, maxDaysAgo);
  const maxDays = Math.max(minDaysAgo, maxDaysAgo);
  return faker.date.recent({
    days: faker.number.int({ min: minDays, max: maxDays }),
  });
}

/**
 * Générateur de données de test cohérentes
 */
export class DataGenerator {
  private usedEmails = new Set<string>();
  private usedSirets = new Set<string>();

  generateUniqueEmail(firstName?: string, lastName?: string): string {
    let email: string;
    do {
      email = generateFrenchEmail(firstName, lastName);
    } while (this.usedEmails.has(email));

    this.usedEmails.add(email);
    return email;
  }

  generateUniqueSiret(): string {
    let siret: string;
    do {
      siret = generateSiret();
    } while (this.usedSirets.has(siret));

    this.usedSirets.add(siret);
    return siret;
  }

  reset(): void {
    this.usedEmails.clear();
    this.usedSirets.clear();
  }
}

/**
 * Instance globale du générateur pour cohérence entre seeds
 */
export const dataGenerator = new DataGenerator();
