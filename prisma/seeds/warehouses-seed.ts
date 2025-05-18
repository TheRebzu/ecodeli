import {
  PrismaClient,
  BoxType,
  BoxStatus,
  ReservationStatus,
  BoxActionType,
  PaymentStatus,
  UserRole
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const WAREHOUSES_COUNT = 6;
const BOXES_PER_WAREHOUSE_MIN = 20;
const BOXES_PER_WAREHOUSE_MAX = 30;
const RESERVATION_ODDS = 0.3; // 30% des box sont réservées
const INSPECTION_FREQUENCY_DAYS = 14; // Inspection tous les 14 jours
const BOX_PRICING = {
  STANDARD: { min: 5, max: 10 },
  CLIMATE_CONTROLLED: { min: 12, max: 20 },
  SECURE: { min: 15, max: 25 },
  EXTRA_LARGE: { min: 20, max: 30 },
  REFRIGERATED: { min: 15, max: 25 },
  FRAGILE: { min: 12, max: 22 }
};

// Définition des entrepôts selon le cahier des charges
const WAREHOUSES = [
  {
    name: 'EcoDeli Paris',
    location: 'Paris',
    address: '12 Rue de Rivoli, 75001 Paris',
    latitude: 48.856614,
    longitude: 2.352222,
    capacity: 1000,
    contactPhone: '+33145678901',
    contactEmail: 'paris@ecodeli.me'
  },
  {
    name: 'EcoDeli Marseille',
    location: 'Marseille',
    address: '45 Boulevard Baille, 13006 Marseille',
    latitude: 43.296482,
    longitude: 5.369780,
    capacity: 800,
    contactPhone: '+33491234567',
    contactEmail: 'marseille@ecodeli.me'
  },
  {
    name: 'EcoDeli Lyon',
    location: 'Lyon',
    address: '23 Rue de la République, 69002 Lyon',
    latitude: 45.764043,
    longitude: 4.835659,
    capacity: 750,
    contactPhone: '+33472123456',
    contactEmail: 'lyon@ecodeli.me'
  },
  {
    name: 'EcoDeli Lille',
    location: 'Lille',
    address: '10 Rue Faidherbe, 59000 Lille',
    latitude: 50.637222,
    longitude: 3.063333,
    capacity: 600,
    contactPhone: '+33320987654',
    contactEmail: 'lille@ecodeli.me'
  },
  {
    name: 'EcoDeli Montpellier',
    location: 'Montpellier',
    address: '5 Place de la Comédie, 34000 Montpellier',
    latitude: 43.608495,
    longitude: 3.879613,
    capacity: 550,
    contactPhone: '+33467123456',
    contactEmail: 'montpellier@ecodeli.me'
  },
  {
    name: 'EcoDeli Rennes',
    location: 'Rennes',
    address: '32 Rue Jules Simon, 35000 Rennes',
    latitude: 48.117266,
    longitude: -1.677793,
    capacity: 500,
    contactPhone: '+33299876543',
    contactEmail: 'rennes@ecodeli.me'
  }
];

// Génère un nom aléatoire pour un box
function generateBoxName(warehouseName: string, index: number, boxType: BoxType): string {
  const typePrefix = {
    STANDARD: 'STD',
    CLIMATE_CONTROLLED: 'CLI',
    SECURE: 'SEC',
    EXTRA_LARGE: 'XL',
    REFRIGERATED: 'REF',
    FRAGILE: 'FRG'
  };

  const floorNumber = Math.floor(index / 10);
  const boxNumber = index % 10 + 1;
  
  return `${warehouseName.slice(0, 3).toUpperCase()}-${typePrefix[boxType]}-${floorNumber}${boxNumber.toString().padStart(2, '0')}`;
}

// Génère un type de box avec une distribution réaliste
function getRandomBoxType(): BoxType {
  const random = Math.random();
  if (random < 0.5) return BoxType.STANDARD; // 50% standard
  if (random < 0.7) return BoxType.CLIMATE_CONTROLLED; // 20% climatisé
  if (random < 0.8) return BoxType.SECURE; // 10% sécurisé
  if (random < 0.9) return BoxType.EXTRA_LARGE; // 10% très grand
  if (random < 0.95) return BoxType.REFRIGERATED; // 5% réfrigéré
  return BoxType.FRAGILE; // 5% pour objets fragiles
}

// Génère des dimensions selon le type de box
function generateDimensions(boxType: BoxType): any {
  switch (boxType) {
    case BoxType.STANDARD:
      return {
        width: faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
        height: faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
        depth: faker.number.float({ min: 1, max: 2, fractionDigits: 1 })
      };
    case BoxType.CLIMATE_CONTROLLED:
      return {
        width: faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 }),
        height: faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 }),
        depth: faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 })
      };
    case BoxType.SECURE:
      return {
        width: faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
        height: faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
        depth: faker.number.float({ min: 1, max: 2, fractionDigits: 1 })
      };
    case BoxType.EXTRA_LARGE:
      return {
        width: faker.number.float({ min: 3, max: 4, fractionDigits: 1 }),
        height: faker.number.float({ min: 2.5, max: 3.5, fractionDigits: 1 }),
        depth: faker.number.float({ min: 3, max: 4, fractionDigits: 1 })
      };
    case BoxType.REFRIGERATED:
      return {
        width: faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 }),
        height: faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 }),
        depth: faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 })
      };
    case BoxType.FRAGILE:
      return {
        width: faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
        height: faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
        depth: faker.number.float({ min: 1, max: 2, fractionDigits: 1 })
      };
  }
}

// Génère les fonctionnalités disponibles selon le type de box
function generateFeatures(boxType: BoxType): string[] {
  const baseFeatures = ['Accès 24/7', 'Surveillance vidéo'];
  
  const additionalFeatures = {
    STANDARD: ['Serrure sécurisée'],
    CLIMATE_CONTROLLED: ['Contrôle d\'humidité', 'Température régulée', 'Isolation renforcée'],
    SECURE: ['Alarme individuelle', 'Serrure renforcée', 'Verrou biométrique', 'Coffre-fort intégré'],
    EXTRA_LARGE: ['Rampe d\'accès', 'Portes élargies', 'Hauteur sous plafond surélevée'],
    REFRIGERATED: ['Réfrigération constante', 'Contrôle de température', 'Groupe électrogène de secours'],
    FRAGILE: ['Rembourrage mural', 'Absorbeurs de chocs', 'Emballages spécifiques disponibles']
  };
  
  return [...baseFeatures, ...additionalFeatures[boxType]];
}

// Calcule le prix par jour selon le type de box
function calculatePricePerDay(boxType: BoxType): number {
  const { min, max } = BOX_PRICING[boxType];
  return faker.number.float({ min, max, fractionDigits: 1 });
}

// Fonction principale qui exécute le seed des entrepôts et boxes
async function main() {
  console.log('🌱 Démarrage du seed des entrepôts et boxes...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Récupérer tous les utilisateurs clients existants pour les réservations
    let clientUsers: { id: string }[] = [];
    try {
      clientUsers = await prisma.user.findMany({
        where: { role: UserRole.CLIENT },
        select: { id: true }
      });
      console.log(`✅ ${clientUsers.length} clients trouvés pour les réservations potentielles`);
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les clients, création des réservations désactivée:', error);
    }

    // Créer les entrepôts
    for (let i = 0; i < WAREHOUSES.length; i++) {
      const warehouseData = WAREHOUSES[i];
      
      console.log(`🏢 Création de l'entrepôt ${warehouseData.name}...`);
      
      // Créer ou mettre à jour l'entrepôt
      let warehouse;
      try {
        // Vérifier si l'entrepôt existe déjà
        const existingWarehouse = await prisma.warehouse.findFirst({
          where: { name: warehouseData.name }
        });
        
        if (existingWarehouse) {
          warehouse = await prisma.warehouse.update({
            where: { id: existingWarehouse.id },
            data: {
              ...warehouseData,
              openingHours: {
                lundi: '7h-20h',
                mardi: '7h-20h',
                mercredi: '7h-20h',
                jeudi: '7h-20h',
                vendredi: '7h-20h',
                samedi: '8h-18h',
                dimanche: '9h-13h'
              },
              imageUrl: `https://source.unsplash.com/random/800x600/?warehouse,storage&${i}`,
              updatedAt: new Date()
            }
          });
          console.log(`✅ Entrepôt mis à jour: ${warehouse.name}`);
        } else {
          warehouse = await prisma.warehouse.create({
            data: {
              ...warehouseData,
              openingHours: {
                lundi: '7h-20h',
                mardi: '7h-20h',
                mercredi: '7h-20h',
                jeudi: '7h-20h',
                vendredi: '7h-20h',
                samedi: '8h-18h',
                dimanche: '9h-13h'
              },
              imageUrl: `https://source.unsplash.com/random/800x600/?warehouse,storage&${i}`
            }
          });
          console.log(`✅ Entrepôt créé: ${warehouse.name}`);
        }
        
        // Nombre aléatoire de boxes pour cet entrepôt
        const boxesCount = faker.number.int({ min: BOXES_PER_WAREHOUSE_MIN, max: BOXES_PER_WAREHOUSE_MAX });
        console.log(`📦 Création de ${boxesCount} boxes pour ${warehouse.name}...`);
        
        // Créer les boxes pour cet entrepôt
        let availableBoxes = 0;
        let reservedBoxes = 0;
        
        for (let j = 0; j < boxesCount; j++) {
          const boxType = getRandomBoxType();
          const dimensions = generateDimensions(boxType);
          const size = dimensions.width * dimensions.height * dimensions.depth;
          const features = generateFeatures(boxType);
          const pricePerDay = calculatePricePerDay(boxType);
          const boxName = generateBoxName(warehouse.name.split(' ')[1], j, boxType);
          const floorLevel = Math.floor(j / 10); // 10 boxes par étage
          
          // Status initial box
          let status: BoxStatus = BoxStatus.AVAILABLE;
          const randomStatusNumber = Math.random();
          
          if (randomStatusNumber < 0.05) {
            status = BoxStatus.MAINTENANCE;
          } else if (randomStatusNumber < 0.1) {
            status = BoxStatus.DAMAGED;
          } else if (randomStatusNumber < 0.15) {
            status = BoxStatus.INACTIVE;
          }
          
          if (status === BoxStatus.AVAILABLE) {
            availableBoxes++;
          }
          
          // Créer la box
          const box = await prisma.box.create({
            data: {
              warehouseId: warehouse.id,
              name: boxName,
              size,
              boxType,
              isOccupied: String(status) === 'RESERVED' || String(status) === 'OCCUPIED',
              pricePerDay,
              description: faker.lorem.sentence(),
              locationDescription: `Étage ${floorLevel}, Section ${String.fromCharCode(65 + j % 5)}, Emplacement ${(j % 10) + 1}`,
              floorLevel,
              maxWeight: boxType === BoxType.EXTRA_LARGE ? 500 : 200,
              dimensions,
              features,
              status,
              lastInspectedAt: faker.date.recent({ days: 30 })
            }
          });
          
          // Création des inspections historiques pour cette box
          await createBoxInspectionHistory(box.id);
          
          // Si des clients existent et que la box est disponible, on peut créer des réservations
          if (clientUsers.length > 0 && status === BoxStatus.AVAILABLE && Math.random() < RESERVATION_ODDS) {
            try {
              const reservation = await createBoxReservation(box.id, warehouse.id, clientUsers, pricePerDay);
              if (reservation) {
                reservedBoxes++;
                availableBoxes--;
                
                // Mettre à jour le statut de la box
                await prisma.box.update({
                  where: { id: box.id },
                  data: {
                    status: BoxStatus.RESERVED,
                    isOccupied: true,
                    clientId: reservation.clientId
                  }
                });
              }
            } catch (error) {
              console.warn(`⚠️ Échec de création de réservation pour box ${boxName}:`, error);
            }
          }
        }
        
        // Mettre à jour les statistiques de l'entrepôt
        await prisma.warehouse.update({
          where: { id: warehouse.id },
          data: {
            availableBoxes,
            reservedBoxes,
            occupied: (boxesCount - availableBoxes) / boxesCount * 100
          }
        });
        
        console.log(`📊 Entrepôt ${warehouse.name} mis à jour: ${availableBoxes} boxes disponibles, ${reservedBoxes} boxes réservées`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de la création de l'entrepôt ${warehouseData.name}:`, error);
      }
    }

    console.log('🎉 Seed des entrepôts et boxes terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Crée l'historique d'inspections pour une box
async function createBoxInspectionHistory(boxId: string) {
  // Générer des dates d'inspection (une tous les INSPECTION_FREQUENCY_DAYS jours sur les 6 derniers mois)
  const today = new Date();
  const sixMonthsAgo = sub(today, { months: 6 });
  const inspectionDates = [];
  
  let currentDate = sixMonthsAgo;
  while (currentDate <= today) {
    inspectionDates.push(new Date(currentDate));
    currentDate = add(currentDate, { days: INSPECTION_FREQUENCY_DAYS });
  }
  
  // Créer les entrées d'usage pour chaque inspection
  for (const inspectionDate of inspectionDates) {
    const randomClient = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true }
    });
    
    if (!randomClient) continue;
    
    await prisma.boxUsageHistory.create({
      data: {
        boxId,
        clientId: randomClient.id,
        actionType: BoxActionType.INSPECTION_COMPLETED,
        actionTime: inspectionDate,
        details: faker.helpers.arrayElement([
          'Inspection périodique. Aucun problème détecté.',
          'Inspection de routine. Tout est en ordre.',
          'Nettoyage effectué après inspection.',
          'Vérification des serrures et sécurité.',
          'Inspection mensuelle. Remplacement du joint d\'étanchéité.',
          'Mise à jour du système de sécurité suite à l\'inspection.'
        ]),
        ipAddress: faker.internet.ipv4(),
        deviceInfo: faker.helpers.arrayElement([
          'Tablette de service',
          'Terminal portatif',
          'Application mobile',
          'Scanner RFID',
          'Terminal d\'inspection'
        ])
      }
    });
  }
}

// Crée une réservation pour une box
async function createBoxReservation(boxId: string, warehouseId: string, clientUsers: { id: string }[], pricePerDay: number) {
  if (clientUsers.length === 0) return null;
  
  // Sélectionner un client au hasard
  const randomClient = faker.helpers.arrayElement(clientUsers);
  
  // Générer des dates de réservation (entre maintenant et 3 mois dans le futur)
  const startDate = faker.date.between({ from: new Date(), to: add(new Date(), { days: 30 }) });
  const durationDays = faker.number.int({ min: 7, max: 90 });
  const endDate = add(startDate, { days: durationDays });
  const totalPrice = pricePerDay * durationDays;
  
  // Générer un code d'accès aléatoire
  const accessCode = faker.string.numeric(6);
  
  try {
    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        boxId,
        clientId: randomClient.id,
        startDate,
        endDate,
        status: ReservationStatus.ACTIVE,
        totalPrice,
        paymentStatus: PaymentStatus.COMPLETED,
        accessCode,
        notes: faker.lorem.sentence(),
        usageHistory: {
          create: {
            boxId,
            clientId: randomClient.id,
            actionType: BoxActionType.RESERVATION_CREATED,
            details: `Réservation créée pour la période du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`,
            ipAddress: faker.internet.ipv4(),
            deviceInfo: faker.helpers.arrayElement([
              'Web App (Chrome)',
              'Application mobile (iOS)',
              'Application mobile (Android)',
              'API externe'
            ])
          }
        }
      }
    });
    
    // Générer des événements d'accès aléatoires si la réservation a déjà commencé
    if (startDate <= new Date()) {
      const accessCount = faker.number.int({ min: 1, max: 5 });
      
      for (let i = 0; i < accessCount; i++) {
        const accessDate = faker.date.between({ from: startDate, to: new Date() });
        
        await prisma.boxUsageHistory.create({
          data: {
            boxId,
            reservationId: reservation.id,
            clientId: randomClient.id,
            actionType: faker.helpers.arrayElement([BoxActionType.BOX_ACCESSED, BoxActionType.BOX_CLOSED]),
            actionTime: accessDate,
            details: faker.helpers.arrayElement([
              'Accès régulier',
              'Dépôt d\'objets',
              'Récupération d\'objets',
              'Vérification du contenu',
              'Ajout de nouveaux articles'
            ]),
            ipAddress: faker.internet.ipv4(),
            deviceInfo: faker.helpers.arrayElement([
              'Terminal sur place',
              'Application mobile',
              'Badge d\'accès',
              'Scanner QR code'
            ])
          }
        });
      }
    }
    
    return reservation;
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    return null;
  }
}

// Exécuter le seed
main()
  .then(() => console.log('✅ Seed terminé avec succès'))
  .catch((e) => {
    console.error('❌ Erreur pendant le seed:', e);
    process.exit(1);
  }); 