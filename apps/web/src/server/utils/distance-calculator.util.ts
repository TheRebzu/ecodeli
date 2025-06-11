/**
 * Utilitaires de calcul de distance et g�olocalisation
 */

/**
 * Interface pour les coordonn�es g�ographiques
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Calcule la distance entre deux points g�ographiques en utilisant la formule de Haversine
 * @param point1 Premier point (latitude, longitude)
 * @param point2 Deuxi�me point (latitude, longitude)
 * @returns Distance en kilom�tres
 */
export function getDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Rayon de la Terre en kilom�tres
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

  return Math.round(distance * 100) / 100; // Arrondi � 2 d�cimales
}

/**
 * Calcule le bearing (direction) entre deux points g�ographiques
 * @param point1 Point de d�part
 * @param point2 Point d'arriv�e
 * @returns Bearing en degr�s (0-360)
 */
export function getBearing(point1: GeoPoint, point2: GeoPoint): number {
  const dLon = toRadians(point2.longitude - point1.longitude);
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normaliser � 0-360
}

/**
 * Calcule un point de destination � partir d'un point de d�part, d'une distance et d'un bearing
 * @param point Point de d�part
 * @param distance Distance en kilom�tres
 * @param bearing Direction en degr�s
 * @returns Point de destination
 */
export function getDestinationPoint(
  point: GeoPoint,
  distance: number,
  bearing: number
): GeoPoint {
  const R = 6371; // Rayon de la Terre en kilom�tres
  const lat1 = toRadians(point.latitude);
  const lon1 = toRadians(point.longitude);
  const bearingRad = toRadians(bearing);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
  };
}

/**
 * Calcule si un point est � l'int�rieur d'un rayon donn� autour d'un centre
 * @param center Point central
 * @param point Point � tester
 * @param radiusKm Rayon en kilom�tres
 * @returns true si le point est dans le rayon
 */
export function isWithinRadius(center: GeoPoint, point: GeoPoint, radiusKm: number): boolean {
  return getDistance(center, point) <= radiusKm;
}

/**
 * Calcule le point le plus proche d'un point de r�f�rence dans une liste de points
 * @param reference Point de r�f�rence
 * @param points Liste de points � �valuer
 * @returns Point le plus proche et sa distance
 */
export function getClosestPoint(
  reference: GeoPoint,
  points: GeoPoint[]
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
 * Calcule le centre g�ographique (centro�de) d'une liste de points
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
 * Calcule le d�tour en pourcentage entre un itin�raire direct et un itin�raire avec escale
 * @param origin Point de d�part
 * @param destination Point d'arriv�e
 * @param waypoint Point d'escale
 * @returns Pourcentage de d�tour
 */
export function calculateDetourPercentage(
  origin: GeoPoint,
  destination: GeoPoint,
  waypoint: GeoPoint
): number {
  const directDistance = getDistance(origin, destination);
  const detourDistance = getDistance(origin, waypoint) + getDistance(waypoint, destination);

  if (directDistance === 0) return 0;

  const detourPercentage = ((detourDistance - directDistance) / directDistance) * 100;
  return Math.round(detourPercentage * 100) / 100; // Arrondi � 2 d�cimales
}

/**
 * Valide si des coordonn�es sont valides
 * @param point Coordonn�es � valider
 * @returns true si les coordonn�es sont valides
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
 * Convertit des degr�s en radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convertit des radians en degr�s
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calcule l'aire d'un polygone d�fini par des points g�ographiques
 * @param points Points du polygone (ordre important)
 * @returns Aire en kilom�tres carr�s
 */
export function calculatePolygonArea(points: GeoPoint[]): number {
  if (points.length < 3) return 0;

  const R = 6371; // Rayon de la Terre en km
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += toRadians(points[j].longitude - points[i].longitude) *
      (2 + Math.sin(toRadians(points[i].latitude)) + Math.sin(toRadians(points[j].latitude)));
  }

  area = Math.abs(area) * R * R / 2;
  return Math.round(area * 100) / 100;
}

/**
 * Trouve le point d'intersection le plus proche entre deux routes
 * @param route1 Premi�re route (tableau de points)
 * @param route2 Deuxi�me route (tableau de points)
 * @returns Informations sur l'intersection la plus proche
 */
export function findClosestIntersection(
  route1: GeoPoint[],
  route2: GeoPoint[]
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