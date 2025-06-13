/**
 * Utilities pour les calculs géographiques optimisés
 * Utilisé par le système de matching et de performance d'EcoDeli
 */

// Cache pour optimiser les calculs répétés
const distanceCache = new Map<string, number>();
const CACHE_MAX_SIZE = 1000;

/**
 * Calcule la distance entre deux points géographiques en utilisant la formule de Haversine
 * Optimisé avec cache et vérifications rapides
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  // Validation des entrées
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    throw new Error("Coordonnées géographiques invalides");
  }

  // Optimisation: vérification rapide si les coordonnées sont identiques
  if (lat1 === lat2 && lng1 === lng2) return 0;

  // Vérifier le cache d'abord
  const cacheKey = createCacheKey(lat1, lng1, lat2, lng2);
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }

  // Optimisation: vérification de proximité immédiate (< 100m)
  const latDiff = Math.abs(lat2 - lat1);
  const lngDiff = Math.abs(lng2 - lng1);
  if (latDiff < 0.001 && lngDiff < 0.001) {
    // Approximation linéaire pour très courtes distances (plus rapide)
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // 111 km par degré
    cacheDistance(cacheKey, distance);
    return distance;
  }

  // Calcul Haversine complet pour distances moyennes/longues
  const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);
  cacheDistance(cacheKey, distance);
  return distance;
}

/**
 * Calcul Haversine pur (pour usage interne)
 */
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcule le score de distance pour le matching (0-1)
 * Plus la distance est courte, plus le score est élevé
 */
export function calculateDistanceScore(
  distance: number,
  maxDistance: number = 50,
): number {
  if (distance <= 0) return 1;
  if (distance >= maxDistance) return 0;

  // Score logarithmique pour favoriser les courtes distances
  return Math.max(0, 1 - Math.log(distance + 1) / Math.log(maxDistance + 1));
}

/**
 * Calcule la distance d'un trajet multi-points
 */
export function calculateRouteDistance(
  points: Array<{ latitude: number; longitude: number }>,
): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude,
    );
  }

  return totalDistance;
}

/**
 * Trouve le point le plus proche d'une liste
 */
export function findNearestPoint(
  targetLat: number,
  targetLng: number,
  points: Array<{ latitude: number; longitude: number; id?: string }>,
): { point: any; distance: number } | null {
  if (points.length === 0) return null;

  let nearestPoint = points[0];
  let minDistance = calculateDistance(
    targetLat,
    targetLng,
    nearestPoint.latitude,
    nearestPoint.longitude,
  );

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(
      targetLat,
      targetLng,
      points[i].latitude,
      points[i].longitude,
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = points[i];
    }
  }

  return { point: nearestPoint, distance: minDistance };
}

/**
 * Vérifie si des coordonnées sont dans un rayon donné
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number,
): boolean {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusKm;
}

/**
 * Convertit des degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Valide des coordonnées géographiques
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Crée une clé de cache pour les distances
 */
function createCacheKey(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string {
  // Arrondir à 6 décimales pour optimiser le cache (précision ~11cm)
  return [lat1, lng1, lat2, lng2].map((coord) => coord.toFixed(6)).join(",");
}

/**
 * Met en cache une distance calculée
 */
function cacheDistance(key: string, distance: number): void {
  // Limiter la taille du cache pour éviter une fuite mémoire
  if (distanceCache.size >= CACHE_MAX_SIZE) {
    // Supprimer les entrées les plus anciennes (stratégie FIFO simple)
    const firstKey = distanceCache.keys().next().value;
    if (firstKey) {
      distanceCache.delete(firstKey);
    }
  }

  distanceCache.set(key, distance);
}

/**
 * Efface le cache de distances (utile pour les tests)
 */
export function clearDistanceCache(): void {
  distanceCache.clear();
}

/**
 * Statistiques du cache (pour monitoring)
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: number;
} {
  // Note: pour un vrai monitoring, il faudrait tracker les hits/misses
  return {
    size: distanceCache.size,
    maxSize: CACHE_MAX_SIZE,
    hitRate: 0, // Placeholder - nécessiterait un compteur de hits/misses
  };
}
