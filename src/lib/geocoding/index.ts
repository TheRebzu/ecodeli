// src/lib/geocoding/index.ts

/**
 * Convertit une adresse en coordonnées géographiques (latitude, longitude)
 * Utilise l'API de géocodage OpenStreetMap (Nominatim)
 * 
 * @param address Adresse à géocoder
 * @returns Coordonnées géographiques {lat, lng}
 */
export async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Encoder l'adresse pour l'URL
    const encodedAddress = encodeURIComponent(address);
    
    // Faire une requête à l'API Nominatim d'OpenStreetMap
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          // Ajouter un User-Agent pour respecter les conditions d'utilisation de Nominatim
          "User-Agent": "EcoDeli/1.0",
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Erreur de géocodage: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const result = data[0];
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
  } catch (error) {
    console.error("Erreur lors du géocodage de l'adresse:", error);
    return null;
  }
}

/**
 * Calcule la distance entre deux points en kilomètres.
 * Utilise la formule de Haversine pour calculer la distance sur une sphère.
 * 
 * @param lat1 Latitude du premier point
 * @param lng1 Longitude du premier point
 * @param lat2 Latitude du deuxième point
 * @param lng2 Longitude du deuxième point
 * @returns Distance en kilomètres
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Rayon de la Terre en kilomètres
  const earthRadius = 6371;
  
  // Convertir les degrés en radians
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  // Formule de Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance en kilomètres
  const distance = earthRadius * c;
  
  return distance;
}

/**
 * Convertit les degrés en radians
 * 
 * @param degrees Angle en degrés
 * @returns Angle en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Trouve les annonces à proximité d'une position
 * 
 * @param announcements Liste des annonces
 * @param lat Latitude de la position
 * @param lng Longitude de la position
 * @param maxDistance Distance maximale en kilomètres
 * @returns Liste des annonces à proximité avec la distance ajoutée
 */
export function findNearbyAnnouncements(
  announcements: any[],
  lat: number,
  lng: number,
  maxDistance: number
): any[] {
  return announcements
    .filter((announcement) => {
      // Vérifier si les coordonnées sont disponibles
      if (!announcement.pickupCoordinates || !announcement.deliveryCoordinates) {
        return false;
      }
      
      // Coordonnées de ramassage et de livraison
      const pickupCoords = announcement.pickupCoordinates as { lat: number; lng: number };
      const deliveryCoords = announcement.deliveryCoordinates as { lat: number; lng: number };
      
      // Calculer les distances
      const pickupDistance = calculateDistance(
        lat,
        lng,
        pickupCoords.lat,
        pickupCoords.lng
      );
      
      const deliveryDistance = calculateDistance(
        lat,
        lng,
        deliveryCoords.lat,
        deliveryCoords.lng
      );
      
      // Distance minimale entre le point de ramassage et le point de livraison
      const minDistance = Math.min(pickupDistance, deliveryDistance);
      
      // Ajouter la distance à l'annonce
      announcement.distance = minDistance;
      
      // Retourner true si au moins un des points est à moins de la distance maximale
      return minDistance <= maxDistance;
    })
    .sort((a, b) => a.distance - b.distance); // Trier par distance croissante
}