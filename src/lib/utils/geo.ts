/**
 * Calcule la distance en kilomètres entre deux points géographiques
 * en utilisant la formule de Haversine
 * 
 * @param lat1 Latitude du point 1 (en degrés)
 * @param lng1 Longitude du point 1 (en degrés)
 * @param lat2 Latitude du point 2 (en degrés)
 * @param lng2 Longitude du point 2 (en degrés)
 * @returns Distance en kilomètres
 */
export function getDistanceFromLatLonInKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance en km
  return Math.round(distance * 10) / 10; // Arrondi à 1 décimale
}

/**
 * Convertit des degrés en radians
 * 
 * @param deg Angle en degrés
 * @returns Angle en radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calcule le temps de trajet estimé en fonction de la distance
 * 
 * @param distanceKm Distance en kilomètres
 * @param transportMode Mode de transport (à pied, vélo, voiture, etc.)
 * @returns Temps de trajet estimé en minutes
 */
export function getEstimatedTravelTime(
  distanceKm: number,
  transportMode: "WALKING" | "BICYCLE" | "CAR" | "PUBLIC_TRANSPORT" = "CAR"
): number {
  // Vitesses moyennes en km/h pour différents modes de transport
  const speeds = {
    WALKING: 5, // 5 km/h en moyenne à pied
    BICYCLE: 15, // 15 km/h en moyenne à vélo
    CAR: 50, // 50 km/h en moyenne en voiture (en ville + périphérie)
    PUBLIC_TRANSPORT: 30, // 30 km/h en moyenne en transport en commun
  };

  // Calcul du temps en heures
  const timeHours = distanceKm / speeds[transportMode];
  
  // Conversion en minutes et arrondi
  const timeMinutes = Math.round(timeHours * 60);
  
  // Temps minimum de 5 minutes
  return Math.max(timeMinutes, 5);
} 