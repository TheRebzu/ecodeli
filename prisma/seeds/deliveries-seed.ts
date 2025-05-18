import {
  DeliveryStatus,
  DeliveryIssueType,
  IssueSeverity,
  IssueStatus,
  CheckpointType,
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Configuration des options pour générer des données réalistes
const DELIVERY_COUNT = 30;
const DELIVERY_STATUSES = [
  {
    status: DeliveryStatusEnum.CREATED,
    percentage: 0.1, // 10% des livraisons
  },
  {
    status: DeliveryStatusEnum.ASSIGNED,
    percentage: 0.1, // 10% des livraisons
  },
  {
    status: DeliveryStatusEnum.PENDING_PICKUP,
    percentage: 0.1, // 10% des livraisons
  },
  {
    status: DeliveryStatusEnum.PICKED_UP,
    percentage: 0.1, // 10% des livraisons
  },
  {
    status: DeliveryStatusEnum.IN_TRANSIT,
    percentage: 0.2, // 20% des livraisons
  },
  {
    status: DeliveryStatusEnum.NEARBY,
    percentage: 0.05, // 5% des livraisons
  },
  {
    status: DeliveryStatusEnum.DELIVERED,
    percentage: 0.2, // 20% des livraisons
  },
  {
    status: DeliveryStatusEnum.NOT_DELIVERED,
    percentage: 0.05, // 5% des livraisons
  },
  {
    status: DeliveryStatusEnum.CANCELLED,
    percentage: 0.1, // 10% des livraisons
  },
];

// Coordonnées approximatives des grandes villes françaises pour des adresses cohérentes
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

/**
 * Génère une adresse aléatoire basée sur les villes françaises configurées
 */
function generateRandomAddress() {
  const city = faker.helpers.arrayElement(FRENCH_CITIES);
  const street = faker.location.streetAddress();
  const address = `${street}, ${city.postalCode} ${city.name}, France`;
  
  return {
    address,
    latitude: city.lat + (Math.random() * 0.05) - 0.025, // Ajoute une petite variation dans la ville
    longitude: city.lng + (Math.random() * 0.05) - 0.025,
    city: city.name,
    postalCode: city.postalCode,
  };
}

// Problèmes potentiels pour les livraisons
const DELIVERY_ISSUES = [
  {
    type: DeliveryIssueType.ACCESS_PROBLEM,
    description: "Impossible d'accéder à l'immeuble, code d'entrée invalide.",
    severity: IssueSeverity.MEDIUM,
  },
  {
    type: DeliveryIssueType.ADDRESS_NOT_FOUND,
    description: "L'adresse fournie est introuvable sur les systèmes GPS.",
    severity: IssueSeverity.HIGH,
  },
  {
    type: DeliveryIssueType.CUSTOMER_ABSENT,
    description: "Client absent lors de la tentative de livraison.",
    severity: IssueSeverity.MEDIUM,
  },
  {
    type: DeliveryIssueType.DAMAGED_PACKAGE,
    description: "Colis endommagé pendant le transport.",
    severity: IssueSeverity.HIGH,
  },
  {
    type: DeliveryIssueType.DELIVERY_REFUSED,
    description: "Livraison refusée par le client.",
    severity: IssueSeverity.MEDIUM,
  },
  {
    type: DeliveryIssueType.VEHICLE_BREAKDOWN,
    description: "Panne de véhicule pendant la livraison.",
    severity: IssueSeverity.HIGH,
  },
  {
    type: DeliveryIssueType.TRAFFIC_JAM,
    description: "Embouteillage important causant un retard significatif.",
    severity: IssueSeverity.LOW,
  },
  {
    type: DeliveryIssueType.WEATHER_CONDITION,
    description: "Conditions météorologiques défavorables empêchant la livraison.",
    severity: IssueSeverity.MEDIUM,
  },
  {
    type: DeliveryIssueType.SECURITY_ISSUE,
    description: "Problème de sécurité dans la zone de livraison.",
    severity: IssueSeverity.HIGH,
  },
];

// Commentaires typiques pour les mises à jour de statut
const STATUS_COMMENTS = {
  [DeliveryStatusEnum.CREATED]: [
    "Livraison créée et en attente d'assignation",
    "Nouvelle livraison enregistrée dans le système",
    "Livraison prête à être assignée à un livreur"
  ],
  [DeliveryStatusEnum.ASSIGNED]: [
    "Livraison assignée au livreur",
    "Livreur a accepté la mission",
    "Mission de livraison attribuée avec succès"
  ],
  [DeliveryStatusEnum.PENDING_PICKUP]: [
    "Livreur en route vers le point de collecte",
    "En attente de ramassage par le livreur",
    "Préparation du colis pour le ramassage"
  ],
  [DeliveryStatusEnum.PICKED_UP]: [
    "Colis récupéré par le livreur",
    "Ramassage effectué avec succès",
    "Colis en possession du livreur"
  ],
  [DeliveryStatusEnum.IN_TRANSIT]: [
    "Colis en cours de livraison",
    "Livreur en route vers l'adresse de livraison",
    "Transport en cours, livraison selon planning"
  ],
  [DeliveryStatusEnum.NEARBY]: [
    "Livreur à proximité du point de livraison",
    "Arrivée imminente à l'adresse de livraison",
    "Moins de 5 minutes avant l'arrivée"
  ],
  [DeliveryStatusEnum.ARRIVED]: [
    "Livreur arrivé à l'adresse de livraison",
    "Tentative de livraison en cours",
    "Recherche du client à l'adresse indiquée"
  ],
  [DeliveryStatusEnum.ATTEMPT_DELIVERY]: [
    "Tentative de livraison effectuée",
    "Livreur essaie de joindre le client",
    "Nouvelle tentative prévue"
  ],
  [DeliveryStatusEnum.DELIVERED]: [
    "Colis livré avec succès",
    "Livraison effectuée et signée par le client",
    "Mission de livraison complétée"
  ],
  [DeliveryStatusEnum.NOT_DELIVERED]: [
    "Livraison impossible",
    "Client absent, colis ramené au dépôt",
    "Échec de la livraison, nouvelle tentative programmée"
  ],
  [DeliveryStatusEnum.RESCHEDULED]: [
    "Livraison reprogrammée à la demande du client",
    "Nouvelle date de livraison fixée",
    "Livraison reportée suite à l'indisponibilité du client"
  ],
  [DeliveryStatusEnum.RETURNED]: [
    "Colis retourné à l'expéditeur",
    "Retour du colis suite à plusieurs tentatives infructueuses",
    "Colis non livrable, retour effectué"
  ],
  [DeliveryStatusEnum.CANCELLED]: [
    "Livraison annulée",
    "Annulation à la demande du client",
    "Mission de livraison annulée par le système"
  ],
};

/**
 * Génère un code de vérification de livraison aléatoire
 * Format: 6 caractères alphanumériques
 */
function generateVerificationCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Génère un historique de points GPS pour une livraison active
 * @param pickupLat Latitude du point de ramassage
 * @param pickupLng Longitude du point de ramassage
 * @param deliveryLat Latitude du point de livraison
 * @param deliveryLng Longitude du point de livraison
 * @param status Statut actuel de la livraison
 * @returns Liste de points GPS avec horodatage
 */
function generateTrackingPoints(
  pickupLat: number, 
  pickupLng: number, 
  deliveryLat: number, 
  deliveryLng: number, 
  status: DeliveryStatusEnum
): Array<{ timestamp: Date; location: any; accuracy: number; heading: number; speed: number; }> {
  const points: Array<{ timestamp: Date; location: any; accuracy: number; heading: number; speed: number; }> = [];
  
  // Si la livraison n'est pas active, retourner un tableau vide
  if (![
    DeliveryStatusEnum.PICKED_UP,
    DeliveryStatusEnum.IN_TRANSIT,
    DeliveryStatusEnum.NEARBY,
    DeliveryStatusEnum.ARRIVED,
    DeliveryStatusEnum.ATTEMPT_DELIVERY
  ].includes(status)) {
    return points;
  }
  
  // Calculer la progression maximale en fonction du statut
  let maxProgress = 0;
  switch (status) {
    case DeliveryStatusEnum.PICKED_UP:
      maxProgress = 0.1; // 10% du trajet
      break;
    case DeliveryStatusEnum.IN_TRANSIT:
      maxProgress = 0.7; // 70% du trajet
      break;
    case DeliveryStatusEnum.NEARBY:
      maxProgress = 0.9; // 90% du trajet
      break;
    case DeliveryStatusEnum.ARRIVED:
    case DeliveryStatusEnum.ATTEMPT_DELIVERY:
      maxProgress = 1.0; // 100% du trajet
      break;
    default:
      maxProgress = 0;
  }
  
  // Générer entre 5 et 20 points de suivi
  const pointCount = faker.number.int({ min: 5, max: 20 });
  
  // Date de départ (entre 1h et 3h dans le passé)
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - faker.number.int({ min: 1, max: 3 }));
  
  for (let i = 0; i < pointCount; i++) {
    const progress = Math.min((i / pointCount) * 1.1, maxProgress); // Assurer que nous ne dépassons pas maxProgress
    
    // Interpolation linéaire entre les points de départ et d'arrivée
    const lat = pickupLat + (deliveryLat - pickupLat) * progress;
    const lng = pickupLng + (deliveryLng - pickupLng) * progress;
    
    // Ajouter une petite variation aléatoire pour simuler un trajet réel
    const jitterLat = (Math.random() * 0.002) - 0.001;
    const jitterLng = (Math.random() * 0.002) - 0.001;
    
    // Timestamp: répartis uniformément entre le début et maintenant
    const timestamp = new Date(startDate.getTime() + ((new Date().getTime() - startDate.getTime()) * (i / pointCount)));
    
    // Calcul d'un cap approximatif (direction en degrés)
    const deltaLat = deliveryLat - pickupLat;
    const deltaLng = deliveryLng - pickupLng;
    const heading = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
    
    // Vitesse entre 0 et 50 km/h, plus élevée au milieu du trajet
    let speed = 0;
    if (progress > 0.1 && progress < 0.9) {
      speed = faker.number.float({ min: 20, max: 50 });
    } else if (progress <= 0.1) {
      speed = faker.number.float({ min: 0, max: 20 });
    } else {
      speed = faker.number.float({ min: 0, max: 10 });
    }
    
    points.push({
      timestamp,
      location: { 
        type: "Point", 
        coordinates: [lng + jitterLng, lat + jitterLat] 
      },
      accuracy: faker.number.float({ min: 3, max: 15 }), // Précision en mètres
      heading: heading + faker.number.float({ min: -20, max: 20 }), // Variation de direction
      speed, // Vitesse en km/h
    });
  }
  
  return points;
}

/**
 * Génère un historique de statuts pour une livraison
 * @param currentStatus Statut actuel de la livraison
 * @param createdAt Date de création de la livraison
 * @param delivererId ID du livreur
 * @returns Liste des statuts avec horodatage et commentaires
 */
function generateStatusHistory(
  currentStatus: DeliveryStatusEnum,
  createdAt: Date,
  delivererId: string | null,
  clientId: string
): Array<{ 
  status: DeliveryStatusEnum; 
  timestamp: Date; 
  updatedById: string; 
  notes: string | null;
  previousStatus: DeliveryStatusEnum | null;
}> {
  const statusHistory: Array<{ 
    status: DeliveryStatusEnum; 
    timestamp: Date; 
    updatedById: string; 
    notes: string | null;
    previousStatus: DeliveryStatusEnum | null;
  }> = [];
  
  const now = new Date();
  
  // Déterminer les statuts à inclure dans l'historique
  const statuses = Object.values(DeliveryStatusEnum);
  const currentStatusIndex = statuses.indexOf(currentStatus);
  
  // Si le statut n'existe pas ou c'est le statut initial, on retourne juste le statut actuel
  if (currentStatusIndex === -1 || currentStatus === DeliveryStatusEnum.CREATED) {
    return [{
      status: DeliveryStatusEnum.CREATED,
      timestamp: createdAt,
      updatedById: clientId,
      notes: faker.helpers.arrayElement(STATUS_COMMENTS[DeliveryStatusEnum.CREATED]),
      previousStatus: null
    }];
  }
  
  // Récupérer tous les statuts jusqu'au statut actuel
  const relevantStatuses = statuses.slice(0, currentStatusIndex + 1);
  
  // Intervalle de temps total pour la distribution des timestamps
  const totalTimeInterval = now.getTime() - createdAt.getTime();
  
  let previousStatus: DeliveryStatusEnum | null = null;
  
  // Pour chaque statut pertinent, générer une entrée d'historique
  relevantStatuses.forEach((status, index) => {
    // Déterminer le timestamp en fonction de la progression
    const progressRatio = index / relevantStatuses.length;
    const timestamp = new Date(createdAt.getTime() + (totalTimeInterval * progressRatio));
    
    // Pour les statuts nécessitant un livreur, vérifier qu'il existe
    if ([
      DeliveryStatusEnum.ASSIGNED,
      DeliveryStatusEnum.PENDING_PICKUP,
      DeliveryStatusEnum.PICKED_UP,
      DeliveryStatusEnum.IN_TRANSIT,
      DeliveryStatusEnum.NEARBY,
      DeliveryStatusEnum.ARRIVED,
      DeliveryStatusEnum.ATTEMPT_DELIVERY,
      DeliveryStatusEnum.DELIVERED,
      DeliveryStatusEnum.NOT_DELIVERED,
    ].includes(status) && !delivererId) {
      return; // Ignorer ce statut si pas de livreur assigné
    }
    
    // Générer un commentaire pour ce statut
    const notes = STATUS_COMMENTS[status] 
      ? faker.helpers.arrayElement(STATUS_COMMENTS[status]) 
      : null;
    
    statusHistory.push({
      status,
      timestamp,
      updatedById: status === DeliveryStatusEnum.CREATED ? clientId : (delivererId || clientId),
      notes,
      previousStatus
    });
    
    previousStatus = status;
  });
  
  return statusHistory;
}

/**
 * Génère des données factices pour le système de livraison.
 * Cette fonction ne sauvegarde pas les données, elle fournit juste un modèle pour alimenter la base
 */
function generateDeliveryData() {
  console.log('🚚 Génération des données factices pour le système de livraison et tracking...');
  
  const deliveries = [];
  
  for (let i = 0; i < DELIVERY_COUNT; i++) {
    // Générer des IDs fictifs
    const clientId = `client_${i+1}`;
    const delivererId = `deliverer_${faker.number.int({ min: 1, max: 10 })}`;
    
    // Déterminer un statut aléatoire basé sur les pourcentages configurés
    const randomValue = Math.random();
    let cumulativePercentage = 0;
    let statusToAssign = DeliveryStatusEnum.CREATED;
    
    for (const statusConfig of DELIVERY_STATUSES) {
      cumulativePercentage += statusConfig.percentage;
      if (randomValue <= cumulativePercentage) {
        statusToAssign = statusConfig.status;
        break;
      }
    }
    
    // Déterminer si un livreur doit être assigné en fonction du statut
    const needsDeliverer = statusToAssign !== DeliveryStatusEnum.CREATED;
    const actualDelivererId = needsDeliverer ? delivererId : null;
    
    // Générer des adresses aléatoires pour le ramassage et la livraison
    const pickupLocation = generateRandomAddress();
    const deliveryLocation = generateRandomAddress();
    
    // Dates de livraison
    const createdAt = faker.date.recent({ days: 14 });
    const pickupDate = new Date(createdAt);
    pickupDate.setHours(pickupDate.getHours() + faker.number.int({ min: 1, max: 24 }));
    
    const estimatedDeliveryDate = new Date(pickupDate);
    estimatedDeliveryDate.setHours(estimatedDeliveryDate.getHours() + faker.number.int({ min: 1, max: 48 }));
    
    // Générer le code de vérification pour les livraisons
    const verificationCode = generateVerificationCode();
    
    // Créer la livraison de base
    const deliveryData = {
      id: `delivery_${i+1}`,
      status: statusToAssign === DeliveryStatusEnum.DELIVERED ? DeliveryStatusModel.DELIVERED : 
              statusToAssign === DeliveryStatusEnum.CANCELLED ? DeliveryStatusModel.CANCELLED : DeliveryStatusModel.PENDING,
      pickupAddress: pickupLocation.address,
      deliveryAddress: deliveryLocation.address,
      pickupDate: pickupDate,
      deliveryDate: estimatedDeliveryDate,
      currentLat: pickupLocation.latitude,
      currentLng: pickupLocation.longitude,
      lastLocationUpdate: new Date(),
      confirmationCode: verificationCode,
      clientId: clientId,
      delivererId: actualDelivererId,
      currentStatus: statusToAssign,
      estimatedArrival: estimatedDeliveryDate,
      actualArrival: statusToAssign === DeliveryStatusEnum.DELIVERED ? new Date() : null,
      trackingEnabled: true,
      deliveryCode: verificationCode,
    };
    
    // Générer l'historique des statuts
    const statusHistory = generateStatusHistory(
      statusToAssign,
      createdAt,
      actualDelivererId,
      clientId
    );
    
    // Générer les points de suivi GPS
    const trackingPoints = generateTrackingPoints(
      pickupLocation.latitude,
      pickupLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude,
      statusToAssign
    );
    
    // Créer les checkpoints
    const checkpoints = [];
    
    // Ajouter un point de départ obligatoire
    checkpoints.push({
      id: `checkpoint_start_${i+1}`,
      type: CheckpointType.DEPARTURE,
      location: { 
        type: "Point", 
        coordinates: [pickupLocation.longitude, pickupLocation.latitude] 
      },
      address: pickupLocation.address,
      name: "Point de départ",
      plannedTime: createdAt,
      actualTime: statusToAssign !== DeliveryStatusEnum.CREATED ? pickupDate : null,
      completedBy: actualDelivererId,
      notes: "Départ pour la mission de livraison",
    });
    
    // Ajouter un point de ramassage si applicable
    if (statusToAssign !== DeliveryStatusEnum.CREATED && statusToAssign !== DeliveryStatusEnum.ASSIGNED) {
      const pickupTime = new Date(pickupDate);
      pickupTime.setMinutes(pickupTime.getMinutes() + faker.number.int({ min: 5, max: 30 }));
      
      checkpoints.push({
        id: `checkpoint_pickup_${i+1}`,
        type: CheckpointType.PICKUP,
        location: { 
          type: "Point", 
          coordinates: [pickupLocation.longitude, pickupLocation.latitude] 
        },
        address: pickupLocation.address,
        name: "Ramassage du colis",
        plannedTime: pickupDate,
        actualTime: pickupTime,
        completedBy: actualDelivererId,
        notes: faker.datatype.boolean(0.7) ? "Colis récupéré sans problème" : "Léger retard au ramassage",
        confirmationCode: verificationCode,
      });
    }
    
    // Ajouter des points intermédiaires aléatoires si en transit
    if ([DeliveryStatusEnum.IN_TRANSIT, DeliveryStatusEnum.NEARBY, DeliveryStatusEnum.ARRIVED, DeliveryStatusEnum.DELIVERED].includes(statusToAssign)) {
      const waypointCount = faker.number.int({ min: 1, max: 3 });
      
      for (let j = 0; j < waypointCount; j++) {
        // Interpolation entre départ et arrivée
        const progress = (j + 1) / (waypointCount + 1);
        const lat = pickupLocation.latitude + (deliveryLocation.latitude - pickupLocation.latitude) * progress;
        const lng = pickupLocation.longitude + (deliveryLocation.longitude - pickupLocation.longitude) * progress;
        
        // Ajouter une légère variation
        const jitterLat = (Math.random() * 0.01) - 0.005;
        const jitterLng = (Math.random() * 0.01) - 0.005;
        
        // Timestamp intermédiaire
        const waypointTime = new Date(pickupDate.getTime() + (estimatedDeliveryDate.getTime() - pickupDate.getTime()) * progress);
        
        checkpoints.push({
          id: `checkpoint_waypoint_${i+1}_${j+1}`,
          type: CheckpointType.WAYPOINT,
          location: { 
            type: "Point", 
            coordinates: [lng + jitterLng, lat + jitterLat] 
          },
          address: `Point de passage ${j+1}`,
          name: `Étape ${j+1}`,
          plannedTime: waypointTime,
          actualTime: statusToAssign !== DeliveryStatusEnum.DELIVERED ? null : waypointTime,
          completedBy: actualDelivererId,
          notes: faker.helpers.arrayElement([
            "Passage sans encombre", 
            "Léger détour pour éviter les travaux", 
            "Point de contrôle validé"
          ]),
        });
      }
    }
    
    // Ajouter le point de livraison final si applicable
    if ([DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.NOT_DELIVERED].includes(statusToAssign)) {
      checkpoints.push({
        id: `checkpoint_delivery_${i+1}`,
        type: statusToAssign === DeliveryStatusEnum.DELIVERED ? CheckpointType.DELIVERY : CheckpointType.DELIVERY_ATTEMPT,
        location: { 
          type: "Point", 
          coordinates: [deliveryLocation.longitude, deliveryLocation.latitude] 
        },
        address: deliveryLocation.address,
        name: statusToAssign === DeliveryStatusEnum.DELIVERED ? "Livraison finale" : "Tentative de livraison",
        plannedTime: estimatedDeliveryDate,
        actualTime: new Date(),
        completedBy: actualDelivererId,
        notes: statusToAssign === DeliveryStatusEnum.DELIVERED 
          ? "Livraison effectuée avec succès" 
          : "Tentative de livraison échouée, client absent",
        confirmationCode: statusToAssign === DeliveryStatusEnum.DELIVERED ? verificationCode : null,
      });
    }
    
    // Simuler un problème aléatoire pour certaines livraisons
    let deliveryIssue = null;
    if (statusToAssign === DeliveryStatusEnum.NOT_DELIVERED || 
        statusToAssign === DeliveryStatusEnum.CANCELLED || 
        (statusToAssign === DeliveryStatusEnum.IN_TRANSIT && faker.datatype.boolean(0.3))) {
      
      const issue = faker.helpers.arrayElement(DELIVERY_ISSUES);
      const issueTime = new Date();
      issueTime.setHours(issueTime.getHours() - faker.number.int({ min: 1, max: 4 }));
      
      deliveryIssue = {
        id: `issue_${i+1}`,
        type: issue.type,
        reportedById: actualDelivererId || clientId,
        reportedAt: issueTime,
        description: issue.description,
        severity: issue.severity,
        status: faker.helpers.arrayElement([IssueStatus.OPEN, IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED]),
        location: {
          type: "Point",
          coordinates: [
            deliveryLocation.longitude + (Math.random() * 0.01 - 0.005),
            deliveryLocation.latitude + (Math.random() * 0.01 - 0.005)
          ]
        }
      };
      
      // Si le problème est résolu, ajouter les détails de résolution
      if (deliveryIssue.status === IssueStatus.RESOLVED) {
        const resolutionTime = new Date(issueTime);
        resolutionTime.setHours(resolutionTime.getHours() + faker.number.int({ min: 1, max: 8 }));
        
        deliveryIssue.resolvedAt = resolutionTime;
        deliveryIssue.resolvedById = actualDelivererId;
        deliveryIssue.resolution = faker.helpers.arrayElement([
          "Problème résolu après contact avec le client",
          "Livraison reprogrammée pour le lendemain",
          "Adresse alternative trouvée pour la livraison",
          "Intervention du support client pour débloquer la situation",
          "Livreur de remplacement assigné pour finaliser la livraison"
        ]);
      }
    }
    
    // Combiner toutes les données pour cette livraison
    deliveries.push({
      ...deliveryData,
      statusHistory,
      trackingPoints,
      checkpoints,
      issue: deliveryIssue
    });
    
    console.log(`✓ Livraison #${i+1} générée avec statut ${statusToAssign}`);
  }
  
  // Statistiques sur les livraisons générées
  const statusCounts = {};
  deliveries.forEach(delivery => {
    statusCounts[delivery.currentStatus] = (statusCounts[delivery.currentStatus] || 0) + 1;
  });
  
  console.log('📊 Statistiques des livraisons générées:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`- ${count} livraisons en statut ${status}`);
  });
  
  console.log('🎉 Génération des données factices terminée!');
  
  return deliveries;
}

/**
 * Fonction principale
 */
function main() {
  console.log('⚠️ Ce script génère des données factices pour le système de livraison et tracking.');
  console.log('⚠️ Pour l\'utiliser avec un vrai seed, importez les fonctions dans votre script de seed principal.');
  
  // Générer et afficher quelques exemples
  const deliveryData = generateDeliveryData();
  
  console.log(`\n🔍 Exemple de livraison générée (${deliveryData.length} au total):`);
  console.log(JSON.stringify(deliveryData[0], null, 2).substring(0, 500) + '...');
}

// Détecter si le fichier est exécuté directement (et non importé)
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

// Exécution de la fonction principale
if (isMainModule) {
  main();
}

export {
  generateDeliveryData,
  generateRandomAddress,
  generateTrackingPoints,
  generateStatusHistory,
  generateVerificationCode
}; 