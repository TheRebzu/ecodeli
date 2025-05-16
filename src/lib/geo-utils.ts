/**
 * Utilitaires pour les calculs géographiques et le traitement des coordonnées
 */

// Type pour les coordonnées géographiques
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Type pour les points géographiques (format GeoJSON)
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] en format GeoJSON
}

/**
 * Calcule la distance en mètres entre deux points GPS
 * Utilise la formule de Haversine
 */
export const calculateDistance = (start: Coordinates, end: Coordinates): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Rayon de la terre en mètres
  const φ1 = toRad(start.latitude);
  const φ2 = toRad(end.latitude);
  const Δφ = toRad(end.latitude - start.latitude);
  const Δλ = toRad(end.longitude - start.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calcule le temps d'arrivée estimé en minutes
 */
export const calculateETA = (distanceInMeters: number, speedInKmh: number): number => {
  // Convertir vitesse en m/s
  const speedInMetersPerSecond = (speedInKmh * 1000) / 3600;
  const timeInSeconds = distanceInMeters / speedInMetersPerSecond;
  return timeInSeconds / 60; // Convertir en minutes
};

/**
 * Convertit un point GeoJSON en coordonnées simples
 */
export const geoPointToCoordinates = (geoPoint: GeoPoint): Coordinates => {
  return {
    latitude: geoPoint.coordinates[1],
    longitude: geoPoint.coordinates[0],
  };
};

/**
 * Convertit des coordonnées simples en point GeoJSON
 */
export const coordinatesToGeoPoint = (coordinates: Coordinates): GeoPoint => {
  return {
    type: 'Point',
    coordinates: [coordinates.longitude, coordinates.latitude],
  };
};

/**
 * Vérifie si un point est à l'intérieur d'un rayon autour d'un centre
 */
export const isPointInRadius = (
  center: Coordinates,
  point: Coordinates,
  radiusInMeters: number
): boolean => {
  const distance = calculateDistance(center, point);
  return distance <= radiusInMeters;
};

/**
 * Calcule les limites d'une zone (bounding box) à partir d'un point central et d'un rayon
 */
export const calculateBounds = (
  center: Coordinates,
  radiusInMeters: number
): { southWest: Coordinates; northEast: Coordinates } => {
  // Approximation: 1 degré de latitude = 111 km, 1 degré de longitude = 111 km * cos(latitude)
  const latDelta = radiusInMeters / 111000;
  const lngDelta = radiusInMeters / (111000 * Math.cos((center.latitude * Math.PI) / 180));

  return {
    southWest: {
      latitude: center.latitude - latDelta,
      longitude: center.longitude - lngDelta,
    },
    northEast: {
      latitude: center.latitude + latDelta,
      longitude: center.longitude + lngDelta,
    },
  };
};

/**
 * Formate une durée en minutes en texte lisible
 */
export const formatETA = (minutes: number): string => {
  if (minutes < 1) {
    return "Moins d'une minute";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  }

  return `${hours} heure${hours > 1 ? 's' : ''} et ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
};

/**
 * Détermine la condition de trafic en fonction de la vitesse
 */
export const determineTrafficCondition = (speedInKmh: number): 'LIGHT' | 'MODERATE' | 'HEAVY' => {
  if (speedInKmh > 40) return 'LIGHT';
  if (speedInKmh < 20) return 'HEAVY';
  return 'MODERATE';
};

/**
 * Calcule la vitesse moyenne à partir d'un ensemble de points de suivi
 */
export const calculateAverageSpeed = (
  positions: Array<{
    timestamp: Date;
    location: GeoPoint;
    speed?: number | null;
  }>
): number => {
  // Si les positions ont déjà des données de vitesse, utiliser ces valeurs
  const speedsFromData = positions
    .filter(pos => pos.speed !== null && pos.speed !== undefined && pos.speed > 0)
    .map(pos => pos.speed as number);

  if (speedsFromData.length > 0) {
    return speedsFromData.reduce((sum, speed) => sum + speed, 0) / speedsFromData.length;
  }

  // Sinon, calculer les vitesses à partir des distances et des temps
  if (positions.length < 2) {
    return 30; // Valeur par défaut en km/h
  }

  let totalDistance = 0;
  let totalTimeInSeconds = 0;

  for (let i = 1; i < positions.length; i++) {
    const prevPos = positions[i - 1];
    const currentPos = positions[i];

    const prevCoords = geoPointToCoordinates(prevPos.location);
    const currentCoords = geoPointToCoordinates(currentPos.location);

    const distance = calculateDistance(prevCoords, currentCoords);
    const timeInSeconds = (currentPos.timestamp.getTime() - prevPos.timestamp.getTime()) / 1000;

    // Ignorer les points trop proches dans le temps ou l'espace
    if (distance > 5 && timeInSeconds > 1) {
      totalDistance += distance;
      totalTimeInSeconds += timeInSeconds;
    }
  }

  if (totalTimeInSeconds > 0) {
    // Convertir m/s en km/h
    return (totalDistance / totalTimeInSeconds) * 3.6;
  }

  return 30; // Valeur par défaut en km/h
};
