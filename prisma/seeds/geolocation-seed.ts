import { PrismaClient, DeliveryStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Coordonnées des grandes villes françaises (centre-ville approximatif)
const FRENCH_CITIES = [
  { name: 'Paris', postalCode: '75000', lat: 48.8566, lng: 2.3522 },
  { name: 'Marseille', postalCode: '13000', lat: 43.2965, lng: 5.3698 },
  { name: 'Lyon', postalCode: '69000', lat: 45.7578, lng: 4.8320 },
  { name: 'Toulouse', postalCode: '31000', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', postalCode: '06000', lat: 43.7102, lng: 7.2620 },
  { name: 'Nantes', postalCode: '44000', lat: 47.2184, lng: -1.5536 },
  { name: 'Strasbourg', postalCode: '67000', lat: 48.5734, lng: 7.7521 },
  { name: 'Montpellier', postalCode: '34000', lat: 43.6108, lng: 3.8767 },
  { name: 'Bordeaux', postalCode: '33000', lat: 44.8378, lng: -0.5792 },
  { name: 'Lille', postalCode: '59000', lat: 50.6292, lng: 3.0573 },
];

// Points d'intérêt par ville
const POINTS_OF_INTEREST = {
  'Paris': [
    { name: 'Parking Tour Eiffel', type: 'PARKING', lat: 48.8584, lng: 2.2945 },
    { name: 'Point Relais Champs Élysées', type: 'RELAY_POINT', lat: 48.8698, lng: 2.3075 },
    { name: 'Parking Louvre', type: 'PARKING', lat: 48.8606, lng: 2.3376 },
    { name: 'Hub Logistique Gare du Nord', type: 'LOGISTICS_HUB', lat: 48.8809, lng: 2.3553 }
  ],
  'Lyon': [
    { name: 'Parking Part-Dieu', type: 'PARKING', lat: 45.7612, lng: 4.8614 },
    { name: 'Point Relais Bellecour', type: 'RELAY_POINT', lat: 45.7575, lng: 4.8320 },
    { name: 'Hub Logistique Lyon Sud', type: 'LOGISTICS_HUB', lat: 45.7233, lng: 4.8233 }
  ],
  'Marseille': [
    { name: 'Parking Vieux Port', type: 'PARKING', lat: 43.2951, lng: 5.3650 },
    { name: 'Point Relais Canebière', type: 'RELAY_POINT', lat: 43.2982, lng: 5.3756 },
    { name: 'Hub Logistique Marseille Nord', type: 'LOGISTICS_HUB', lat: 43.3502, lng: 5.4052 }
  ],
  'Toulouse': [
    { name: 'Parking Capitole', type: 'PARKING', lat: 43.6042, lng: 1.4436 },
    { name: 'Point Relais Canal du Midi', type: 'RELAY_POINT', lat: 43.6121, lng: 1.4307 }
  ],
  'Bordeaux': [
    { name: 'Parking Quinconces', type: 'PARKING', lat: 44.8429, lng: -0.5783 },
    { name: 'Point Relais Sainte-Catherine', type: 'RELAY_POINT', lat: 44.8394, lng: -0.5715 }
  ]
};

/**
 * Génère un point aléatoire dans un rayon autour d'un point central
 */
function generateRandomPointInRadius(centerLat: number, centerLng: number, radiusInKm: number) {
  // Convertir le rayon de km en degrés (approximatif)
  const radiusInDeg = radiusInKm / 111.32;
  
  // Générer un angle aléatoire en radians
  const angle = Math.random() * Math.PI * 2;
  
  // Générer une distance aléatoire dans le rayon
  const distance = Math.sqrt(Math.random()) * radiusInDeg;
  
  // Calculer le décalage en latitude et longitude
  const latOffset = distance * Math.cos(angle);
  const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
  
  return {
    latitude: centerLat + latOffset,
    longitude: centerLng + lngOffset
  };
}

/**
 * Génère un trajet simulé entre deux points avec points intermédiaires
 */
function generateRoutePoints(startLat: number, startLng: number, endLat: number, endLng: number, pointCount: number) {
  const points = [];
  
  // Ajouter le point de départ
  points.push({ 
    latitude: startLat, 
    longitude: startLng,
    timestamp: new Date(Date.now() - (pointCount + 1) * 5 * 60000) // 5 minutes par point dans le passé
  });
  
  // Calculer la distance totale (approximative)
  const totalDistance = Math.sqrt(
    Math.pow((endLat - startLat) * 111.32, 2) + 
    Math.pow((endLng - startLng) * 111.32 * Math.cos(startLat * Math.PI / 180), 2)
  );
  
  // Vitesse moyenne en km/h
  const avgSpeed = 30;
  
  // Calculer le temps total estimé en heures
  const totalTimeHours = totalDistance / avgSpeed;
  
  // Générer des points intermédiaires
  for (let i = 1; i <= pointCount; i++) {
    const ratio = i / (pointCount + 1);
    
    // Interpolation linéaire avec une légère variation aléatoire
    const lat = startLat + (endLat - startLat) * ratio + (Math.random() - 0.5) * 0.005;
    const lng = startLng + (endLng - startLng) * ratio + (Math.random() - 0.5) * 0.005;
    
    // Timestamp avec progression dans le temps
    const timestamp = new Date(Date.now() - (pointCount + 1 - i) * 5 * 60000);
    
    points.push({ latitude: lat, longitude: lng, timestamp });
  }
  
  return {
    points,
    estimatedTimeMinutes: Math.round(totalTimeHours * 60),
    distanceKm: totalDistance
  };
}

/**
 * Génère une zone de couverture pour un livreur ou prestataire
 */
function generateCoverageZone(centerLat: number, centerLng: number, radiusKm: number) {
  const points = [];
  const segments = 12; // Nombre de points pour définir le polygone
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // Ajouter une variation au rayon pour un polygone plus naturel
    const variableRadius = radiusKm * (0.8 + Math.random() * 0.4);
    
    // Conversion en coordonnées lat/lng
    const lat = centerLat + (variableRadius / 111.32) * Math.cos(angle);
    const lng = centerLng + (variableRadius / 111.32) * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
    
    points.push({ lat, lng });
  }
  
  return points;
}

/**
 * Calcule la distance approximative entre deux points en km
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Enrichissement des clients avec coordonnées GPS
 */
async function enrichClientAddresses() {
  console.log('Enrichissement des adresses clients avec coordonnées GPS...');
  
  const clients = await prisma.client.findMany({
    include: {
      deliveryAddresses: true,
      user: true
    }
  });
  
  let enrichedCount = 0;
  
  for (const client of clients) {
    // Vérifier que le client a une adresse principale
    if (client.address) {
      // Choisir une ville française aléatoire pour le client
      const clientCity = faker.helpers.arrayElement(FRENCH_CITIES);
      
      // Générer des coordonnées dans cette ville avec variation
      const point = generateRandomPointInRadius(
        clientCity.lat, 
        clientCity.lng, 
        3 // Rayon de 3km autour du centre-ville
      );
      
      // Mettre à jour l'adresse du client si nécessaire
      await prisma.client.update({
        where: { id: client.id },
        data: {
          address: client.address.includes(clientCity.name) 
            ? client.address 
            : `${client.address}, ${clientCity.postalCode} ${clientCity.name}, France`,
          city: clientCity.name,
          postalCode: clientCity.postalCode,
          country: 'France'
        }
      });
      
      enrichedCount++;
    }
    
    // Enrichir les adresses de livraison
    for (const address of client.deliveryAddresses) {
      // Choisir une ville française aléatoire pour cette adresse
      const addressCity = faker.helpers.arrayElement(FRENCH_CITIES);
      
      // Générer des coordonnées dans cette ville avec variation
      const point = generateRandomPointInRadius(
        addressCity.lat, 
        addressCity.lng, 
        5 // Rayon de 5km autour du centre-ville
      );
      
      // Mettre à jour l'adresse
      await prisma.address.update({
        where: { id: address.id },
        data: {
          city: addressCity.name,
          postalCode: addressCity.postalCode,
          country: 'France'
        }
      });
      
      enrichedCount++;
    }
  }
  
  console.log(`✅ ${enrichedCount} adresses client enrichies`);
}

/**
 * Enrichissement des livreurs avec zones de couverture et position actuelle
 */
async function enrichDeliverers() {
  console.log('Enrichissement des livreurs avec zones de couverture...');
  
  const deliverers = await prisma.deliverer.findMany({
    include: {
      user: true
    }
  });
  
  for (const deliverer of deliverers) {
    // Choisir une ville française aléatoire pour le livreur
    const city = faker.helpers.arrayElement(FRENCH_CITIES);
    
    // Générer une position actuelle aléatoire dans cette ville
    const currentPosition = generateRandomPointInRadius(city.lat, city.lng, 5);
    
    // Générer une zone de couverture autour de cette ville
    const coverageRadius = faker.number.int({ min: 5, max: 20 }); // Entre 5 et 20 km
    const coverageZone = generateCoverageZone(city.lat, city.lng, coverageRadius);
    
    // Mettre à jour le livreur
    await prisma.deliverer.update({
      where: { id: deliverer.id },
      data: {
        currentLocation: `${currentPosition.latitude},${currentPosition.longitude}`,
        serviceZones: coverageZone as any, // Stocker le polygone comme JSON
        address: deliverer.address || `${faker.location.streetAddress()}, ${city.postalCode} ${city.name}, France`
      }
    });
  }
  
  console.log(`✅ ${deliverers.length} livreurs enrichis avec zones de couverture`);
}

/**
 * Enrichissement des prestataires avec localisation et rayon de service
 */
async function enrichProviders() {
  console.log('Enrichissement des prestataires avec localisation et rayon de service...');
  
  const providers = await prisma.provider.findMany({
    include: {
      user: true
    }
  });
  
  for (const provider of providers) {
    // Choisir une ville française aléatoire pour le prestataire
    const city = faker.helpers.arrayElement(FRENCH_CITIES);
    
    // Générer une position pour le prestataire
    const position = generateRandomPointInRadius(city.lat, city.lng, 3);
    
    // Générer un rayon de service aléatoire
    const serviceRadius = faker.number.int({ min: 10, max: 50 }); // Entre 10 et 50 km
    
    // Mettre à jour le prestataire
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        serviceRadius,
        address: provider.address.includes(city.name)
          ? provider.address
          : `${provider.address}, ${city.postalCode} ${city.name}, France`
      }
    });
    
    // Mettre à jour l'utilisateur associé
    await prisma.user.update({
      where: { id: provider.userId },
      data: {
        providerLocationLat: position.latitude,
        providerLocationLng: position.longitude,
        providerAddress: `${faker.location.streetAddress()}, ${city.postalCode} ${city.name}`,
        providerZipCode: city.postalCode,
        providerCity: city.name
      }
    });
  }
  
  console.log(`✅ ${providers.length} prestataires enrichis avec localisation`);
}

/**
 * Générer des trajets pour les livraisons en cours
 */
async function generateDeliveryRoutes() {
  console.log('Génération des trajets pour les livraisons en cours...');
  
  // Récupérer toutes les livraisons (nous filtrerons manuellement)
  const deliveries = await prisma.delivery.findMany({
    include: {
      coordinates: true
    }
  });
  
  // On ne traite que les livraisons qui sont en cours
  const activeDeliveries = deliveries.filter(delivery => 
    ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status.toString())
  );
  
  console.log(`Traitement de ${activeDeliveries.length} livraisons actives...`);
  
  let routesGenerated = 0;
  
  for (const delivery of activeDeliveries) {
    // Choisir des villes différentes pour l'origine et la destination
    const originCity = faker.helpers.arrayElement(FRENCH_CITIES);
    let destinationCity;
    do {
      destinationCity = faker.helpers.arrayElement(FRENCH_CITIES);
    } while (destinationCity.name === originCity.name);
    
    // Générer des points précis avec variation dans chaque ville
    const originPoint = generateRandomPointInRadius(originCity.lat, originCity.lng, 2);
    const destinationPoint = generateRandomPointInRadius(destinationCity.lat, destinationCity.lng, 2);
    
    // Nombre de points intermédiaires selon le statut
    let pointCount = 2; // Par défaut
    
    // Conversion en chaîne pour la comparaison
    const statusStr = delivery.status.toString();
    
    if (statusStr === 'ACCEPTED') {
      pointCount = 1;
    } else if (statusStr === 'PICKED_UP') {
      pointCount = 3;
    } else if (statusStr === 'IN_TRANSIT') {
      pointCount = 6;
    }
    
    // Générer le trajet
    const route = generateRoutePoints(
      originPoint.latitude,
      originPoint.longitude,
      destinationPoint.latitude,
      destinationPoint.longitude,
      pointCount
    );
    
    // Supprimer les anciennes coordonnées si elles existent
    if (delivery.coordinates && delivery.coordinates.length > 0) {
      await prisma.deliveryCoordinates.deleteMany({
        where: {
          deliveryId: delivery.id
        }
      });
    }
    
    // Stocker les points du trajet
    for (const point of route.points) {
      await prisma.deliveryCoordinates.create({
        data: {
          deliveryId: delivery.id,
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: point.timestamp
        }
      });
    }
    
    // Mettre à jour la livraison avec les informations de localisation actuelle
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        pickupAddress: `${faker.location.streetAddress()}, ${originCity.postalCode} ${originCity.name}, France`,
        deliveryAddress: `${faker.location.streetAddress()}, ${destinationCity.postalCode} ${destinationCity.name}, France`,
        currentLat: route.points[route.points.length - 1].latitude,
        currentLng: route.points[route.points.length - 1].longitude,
        lastLocationUpdate: new Date(),
        estimatedArrival: new Date(Date.now() + route.estimatedTimeMinutes * 60 * 1000)
      }
    });
    
    routesGenerated++;
  }
  
  console.log(`✅ ${routesGenerated} trajets de livraison générés`);
}

/**
 * Ajouter des points d'intérêt pertinents
 */
async function createPointsOfInterest() {
  console.log('Création des points d\'intérêt...');
  
  // Cette fonction pourrait créer une nouvelle table pour les points d'intérêt,
  // ou les ajouter comme données à une table existante selon la structure du projet
  
  // Pour l'exemple, nous allons simplement afficher les points d'intérêt
  // qui pourraient être intégrés dans une future implémentation
  
  let poiCount = 0;
  
  for (const city in POINTS_OF_INTEREST) {
    const pois = POINTS_OF_INTEREST[city as keyof typeof POINTS_OF_INTEREST];
    for (const poi of pois) {
      console.log(`POI: ${poi.name} (${poi.type}) à ${city} - Lat: ${poi.lat}, Lng: ${poi.lng}`);
      poiCount++;
    }
  }
  
  console.log(`✅ ${poiCount} points d'intérêt identifiés`);
  
  // Exemple d'implémentation si une table PointOfInterest existait:
  /*
  for (const city in POINTS_OF_INTEREST) {
    const pois = POINTS_OF_INTEREST[city];
    for (const poi of pois) {
      await prisma.pointOfInterest.create({
        data: {
          name: poi.name,
          type: poi.type,
          latitude: poi.lat,
          longitude: poi.lng,
          city: city,
          country: 'France'
        }
      });
    }
  }
  */
}

/**
 * Fonction principale pour générer les données géolocalisées
 */
async function main() {
  console.log('🌍 Démarrage du seed de géolocalisation...');

  try {
    // 1. Enrichir les adresses clients
    await enrichClientAddresses();
    
    // 2. Enrichir les livreurs
    await enrichDeliverers();
    
    // 3. Enrichir les prestataires
    await enrichProviders();
    
    // 4. Générer des trajets pour les livraisons
    await generateDeliveryRoutes();
    
    // 5. Ajouter des points d'intérêt
    await createPointsOfInterest();
    
    console.log('🎉 Seed de géolocalisation terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant le seed de géolocalisation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 