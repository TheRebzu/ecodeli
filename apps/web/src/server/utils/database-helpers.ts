/**
 * Utilities pour optimiser les requêtes de base de données
 * Patterns et helpers pour améliorer les performances Prisma
 */

import type { Prisma } from '@prisma/client';

/**
 * Optimise les requêtes de pagination avec cursor
 */
export function buildCursorPagination(
  cursor?: string,
  limit: number = 20,
  orderBy: any = { createdAt: 'desc' }
) {
  const take = Math.min(limit, 100); // Limiter à 100 maximum

  return {
    take,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Skip l'élément du cursor
    }),
    orderBy,
  };
}

/**
 * Sélecteurs optimisés pour différents types d'entités
 */
export const optimizedSelects = {
  // Sélection minimale pour les utilisateurs
  userBasic: {
    id: true,
    name: true,
    email: true,
    image: true,
    role: true,
  } as const,

  // Sélection pour les annonces en liste
  announcementList: {
    id: true,
    title: true,
    description: true,
    status: true,
    pickupAddress: true,
    deliveryAddress: true,
    pickupCity: true,
    deliveryCity: true,
    suggestedPrice: true,
    createdAt: true,
    updatedAt: true,
  } as const,

  // Sélection pour les livreurs en liste
  delivererList: {
    id: true,
    name: true,
    image: true,
    deliverer: {
      select: {
        averageRating: true,
        totalDeliveries: true,
        isActive: true,
        vehicleType: true,
      },
    },
  } as const,

  // Sélection pour les warehouses
  warehouseBasic: {
    id: true,
    name: true,
    address: true,
    city: true,
    latitude: true,
    longitude: true,
    isActive: true,
    isMainHub: true,
  } as const,
};

/**
 * Conditions de filtrage courantes
 */
export const commonFilters = {
  // Filtres pour les annonces actives
  activeAnnouncements: {
    status: { in: ['PUBLISHED', 'MATCHED'] },
    isActive: true,
  } as const,

  // Filtres pour les livreurs actifs
  activeDeliverers: {
    isActive: true,
    deliverer: {
      isActive: true,
      verificationStatus: 'VERIFIED',
    },
  } as const,

  // Filtres pour les entrepôts disponibles
  availableWarehouses: {
    isActive: true,
    hasAvailableSpace: true,
  } as const,
};

/**
 * Construit des conditions WHERE dynamiques
 */
export function buildDynamicWhere(filters: Record<string, any>): any {
  const where: any = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // Gestion des chaînes de recherche
    if (typeof value === 'string' && key.includes('search')) {
      where.OR = [
        { title: { contains: value, mode: 'insensitive' } },
        { description: { contains: value, mode: 'insensitive' } },
      ];
      return;
    }

    // Gestion des plages de dates
    if (key.includes('Date') && Array.isArray(value) && value.length === 2) {
      where[key.replace('Date', '')] = {
        gte: value[0],
        lte: value[1],
      };
      return;
    }

    // Gestion des tableaux (IN)
    if (Array.isArray(value)) {
      where[key] = { in: value };
      return;
    }

    // Valeur simple
    where[key] = value;
  });

  return where;
}

/**
 * Optimise les includes pour éviter les N+1
 */
export function buildOptimizedInclude(includes: string[]): any {
  const includeMap: Record<string, any> = {
    client: {
      select: optimizedSelects.userBasic,
    },
    deliverer: {
      select: optimizedSelects.delivererList,
    },
    announcement: {
      select: optimizedSelects.announcementList,
    },
    warehouse: {
      select: optimizedSelects.warehouseBasic,
    },
  };

  const result: any = {};

  includes.forEach(include => {
    if (includeMap[include]) {
      result[include] = includeMap[include];
    }
  });

  return result;
}

/**
 * Requête batch pour récupérer plusieurs entités
 */
export async function batchQuery<T>(queries: Array<() => Promise<T>>): Promise<T[]> {
  try {
    return await Promise.all(queries);
  } catch (error) {
    console.error('Batch query error:', error);
    throw error;
  }
}

/**
 * Cache simple en mémoire pour les requêtes fréquentes
 */
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

/**
 * Wrapper pour mise en cache des requêtes
 */
export async function withCache<T>(
  key: string,
  query: () => Promise<T>,
  useCache: boolean = true
): Promise<T> {
  if (!useCache) {
    return await query();
  }

  const cached = queryCache.get(key);
  if (cached) {
    return cached;
  }

  const result = await query();
  queryCache.set(key, result);
  return result;
}

/**
 * Construit des agrégations optimisées
 */
export function buildAggregations(metrics: string[]) {
  const aggregations: any = {};

  if (metrics.includes('count')) {
    aggregations._count = true;
  }

  if (metrics.includes('sum')) {
    aggregations._sum = {
      amount: true,
      price: true,
    };
  }

  if (metrics.includes('avg')) {
    aggregations._avg = {
      rating: true,
      price: true,
    };
  }

  if (metrics.includes('max')) {
    aggregations._max = {
      createdAt: true,
      price: true,
    };
  }

  if (metrics.includes('min')) {
    aggregations._min = {
      createdAt: true,
      price: true,
    };
  }

  return aggregations;
}

/**
 * Optimise les requêtes de recherche full-text
 */
export function buildTextSearch(
  searchTerm: string,
  fields: string[] = ['title', 'description']
): any {
  if (!searchTerm.trim()) return {};

  const terms = searchTerm.trim().split(/\s+/);

  return {
    OR: fields.flatMap(field =>
      terms.map(term => ({
        [field]: {
          contains: term,
          mode: 'insensitive' as const,
        },
      }))
    ),
  };
}

/**
 * Construit des requêtes géospatiales optimisées
 */
export function buildGeoQuery(latitude: number, longitude: number, radiusKm: number) {
  // Note: Pour une vraie recherche géospatiale, il faudrait utiliser PostGIS
  // Ceci est une approximation pour le développement
  const latRange = radiusKm / 111; // ~111 km par degré de latitude
  const lngRange = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

  return {
    latitude: {
      gte: latitude - latRange,
      lte: latitude + latRange,
    },
    longitude: {
      gte: longitude - lngRange,
      lte: longitude + lngRange,
    },
  };
}

/**
 * Helpers pour les transactions Prisma
 */
export async function withTransaction<T>(
  prisma: any,
  operations: (tx: any) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operations);
}

/**
 * Construit les paramètres d'ordre optimisés
 */
export function buildOrderBy(sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
  const allowedSortFields = [
    'createdAt',
    'updatedAt',
    'name',
    'title',
    'price',
    'rating',
    'distance',
  ];

  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'createdAt';
  }

  return { [sortBy]: sortOrder };
}
