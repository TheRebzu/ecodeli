/**
 * Utilitaires de calcul de distance et géolocalisation
 */

/**
 * Interface pour les coordonnées géographiques
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Calcule la distance entre deux points géographiques en utilisant la formule de Haversine
 * @param point1 Premier point (latitude, longitude)
 * @param point2 Deuxième point (latitude, longitude)
 * @returns Distance en kilomètres
 */
export function getDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Arrondi à 2 décimales
}

/**
 * Calcule le bearing (direction) entre deux points géographiques
 * @param point1 Point de départ
 * @param point2 Point d'arrivée
 * @returns Bearing en degrés (0-360)
 */
export function getBearing(point1: GeoPoint, point2: GeoPoint): number {
  const dLon = toRadians(point2.longitude - point1.longitude);
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x);
  return (bearing + 360) % 360; // Normaliser à 0-360
}

/**
 * Calcule un point de destination à partir d'un point de départ, d'une distance et d'un bearing
 * @param point Point de départ
 * @param distance Distance en kilomètres
 * @param bearing Direction en degrés
 * @returns Point de destination
 */
export function getDestinationPoint(
  point: GeoPoint,
  distance: number,
  bearing: number,
): GeoPoint {
  const R = 6371; // Rayon de la Terre en kilomètres
  const lat1 = toRadians(point.latitude);
  const lon1 = toRadians(point.longitude);
  const bearingRad = toRadians(bearing);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad),
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
  };
}

/**
 * Calcule si un point est à l'intérieur d'un rayon donné autour d'un centre
 * @param center Point central
 * @param point Point à tester
 * @param radiusKm Rayon en kilomètres
 * @returns true si le point est dans le rayon
 */
export function isWithinRadius(
  center: GeoPoint,
  point: GeoPoint,
  radiusKm: number,
): boolean {
  return getDistance(center, point) <= radiusKm;
}

/**
 * Calcule le point le plus proche d'un point de référence dans une liste de points
 * @param reference Point de référence
 * @param points Liste de points à évaluer
 * @returns Point le plus proche et sa distance
 */
export function getClosestPoint(
  reference: GeoPoint,
  points: GeoPoint[],
): { point: GeoPoint; distance: number } | null {
  if (points.length === 0) return null;

  let closestPoint = points[0];
  let minDistance = getDistance(reference, closestPoint);

  for (let i = 1; i < points.length; i++) {
    const distance = getDistance(reference, points[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = points[i];
    }
  }

  return { point: closestPoint, distance: minDistance };
}

/**
 * Calcule le centre géographique (centroïde) d'une liste de points
 * @param points Liste de points
 * @returns Point central
 */
export function getCentroid(points: GeoPoint[]): GeoPoint | null {
  if (points.length === 0) return null;

  const totalLat = points.reduce((sum, point) => sum + point.latitude, 0);
  const totalLon = points.reduce((sum, point) => sum + point.longitude, 0);

  return {
    latitude: totalLat / points.length,
    longitude: totalLon / points.length,
  };
}

/**
 * Calcule le détour en pourcentage entre un itinéraire direct et un itinéraire avec escale
 * @param origin Point de départ
 * @param destination Point d'arrivée
 * @param waypoint Point d'escale
 * @returns Pourcentage de détour
 */
export function calculateDetourPercentage(
  origin: GeoPoint,
  destination: GeoPoint,
  waypoint: GeoPoint,
): number {
  const directDistance = getDistance(origin, destination);
  const detourDistance =
    getDistance(origin, waypoint) + getDistance(waypoint, destination);

  if (directDistance === 0) return 0;

  const detourPercentage =
    ((detourDistance - directDistance) / directDistance) * 100;
  return Math.round(detourPercentage * 100) / 100; // Arrondi à 2 décimales
}

/**
 * Valide si des coordonnées sont valides
 * @param point Coordonnées à valider
 * @returns true si les coordonnées sont valides
 */
export function isValidGeoPoint(point: GeoPoint): boolean {
  return (
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

/**
 * Convertit des degrés en radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convertit des radians en degrés
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calcule l'aire d'un polygone défini par des points géographiques
 * @param points Points du polygone (ordre important)
 * @returns Aire en kilomètres carrés
 */
export function calculatePolygonArea(points: GeoPoint[]): number {
  if (points.length < 3) return 0;

  const R = 6371; // Rayon de la Terre en km
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area +=
      toRadians(points[j].longitude - points[i].longitude) *
      (2 +
        Math.sin(toRadians(points[i].latitude)) +
        Math.sin(toRadians(points[j].latitude)));
  }

  area = (Math.abs(area) * R * R) / 2;
  return Math.round(area * 100) / 100;
}

/**
 * Trouve le point d'intersection le plus proche entre deux routes
 * @param route1 Première route (tableau de points)
 * @param route2 Deuxième route (tableau de points)
 * @returns Informations sur l'intersection la plus proche
 */
export function findClosestIntersection(
  route1: GeoPoint[],
  route2: GeoPoint[],
): {
  point1: GeoPoint;
  point2: GeoPoint;
  distance: number;
} | null {
  if (route1.length === 0 || route2.length === 0) return null;

  let minDistance = Infinity;
  let closestPoint1 = route1[0];
  let closestPoint2 = route2[0];

  for (const point1 of route1) {
    for (const point2 of route2) {
      const distance = getDistance(point1, point2);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint1 = point1;
        closestPoint2 = point2;
      }
    }
  }

  return {
    point1: closestPoint1,
    point2: closestPoint2,
    distance: minDistance,
  };
}
