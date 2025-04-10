// src/lib/deliveries/index.ts
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

interface DeliveryCreationParams {
  announcementId: string;
  customerId?: string | null;
  merchantId?: string | null;
  deliveryPersonId: string;
  price: number;
  pickupDate?: Date | string | null;
  deliveryDeadline?: Date | string | null;
}

/**
 * Crée une nouvelle livraison à partir d'une annonce
 * 
 * @param prisma Instance Prisma (à l'intérieur d'une transaction)
 * @param params Paramètres de création de la livraison
 * @returns La livraison créée
 */
export async function createDelivery(
  prisma: PrismaClient | any,
  params: DeliveryCreationParams
) {
  const {
    announcementId,
    customerId,
    merchantId,
    deliveryPersonId,
    price,
    pickupDate,
    deliveryDeadline,
  } = params;
  
  // Générer un numéro de suivi unique
  const trackingNumber = `ECO-${nanoid(8).toUpperCase()}`;
  
  // Récupérer les informations de l'annonce si non fournies
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  
  if (!announcement) {
    throw new Error("Annonce non trouvée");
  }
  
  // Créer la livraison
  const delivery = await prisma.delivery.create({
    data: {
      trackingNumber,
      status: "PENDING",
      price,
      insuranceIncluded: announcement.insuranceOption !== "NONE",
      insuranceAmount: announcement.insuranceAmount,
      pickupDate: pickupDate || announcement.pickupDate,
      estimatedDelivery: deliveryDeadline || announcement.deliveryDeadline,
      // Ajouter un code de livraison unique pour la confirmation
      deliveryCode: generateDeliveryCode(),
      distance: calculateRouteDistance(announcement),
      customerId: customerId || announcement.customerId,
      merchantId: merchantId || announcement.merchantId,
      deliveryPersonId,
      announcementId,
    },
  });
  
  // Créer une première mise à jour de suivi
  await prisma.trackingUpdate.create({
    data: {
      deliveryId: delivery.id,
      status: "PENDING",
      message: "Livraison créée et en attente de ramassage",
      isPublic: true,
    },
  });
  
  return delivery;
}

/**
 * Génère un code de livraison aléatoire de 6 chiffres
 * 
 * @returns Code de livraison à 6 chiffres
 */
function generateDeliveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calcule la distance approximative du trajet à partir des coordonnées de l'annonce
 * 
 * @param announcement Annonce avec les coordonnées
 * @returns Distance en kilomètres ou null
 */
function calculateRouteDistance(announcement: any): number | null {
  if (!announcement.pickupCoordinates || !announcement.deliveryCoordinates) {
    return null;
  }
  
  try {
    const pickupCoords = announcement.pickupCoordinates as { lat: number; lng: number };
    const deliveryCoords = announcement.deliveryCoordinates as { lat: number; lng: number };
    
    // Calculer la distance à vol d'oiseau
    const earthRadius = 6371; // Rayon de la Terre en kilomètres
    
    const dLat = toRadians(deliveryCoords.lat - pickupCoords.lat);
    const dLng = toRadians(deliveryCoords.lng - pickupCoords.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(pickupCoords.lat)) * Math.cos(toRadians(deliveryCoords.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Distance à vol d'oiseau
    const directDistance = earthRadius * c;
    
    // Appliquer un facteur pour simuler un trajet routier (environ 30% plus long)
    return directDistance * 1.3;
  } catch (error) {
    console.error("Erreur lors du calcul de la distance:", error);
    return null;
  }
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
 * Met à jour le statut d'une livraison
 * 
 * @param prisma Instance Prisma
 * @param deliveryId ID de la livraison
 * @param status Nouveau statut
 * @param userId ID de l'utilisateur effectuant la mise à jour
 * @param message Message optionnel
 * @param location Emplacement optionnel
 * @param coordinates Coordonnées optionnelles
 * @returns La mise à jour de suivi créée
 */
export async function updateDeliveryStatus(
  prisma: PrismaClient,
  deliveryId: string,
  status: string,
  userId: string,
  message?: string,
  location?: string,
  coordinates?: { lat: number; lng: number }
) {
  // Mettre à jour le statut de la livraison
  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { status },
  });
  
  // Créer une mise à jour de suivi
  const trackingUpdate = await prisma.trackingUpdate.create({
    data: {
      deliveryId,
      status,
      location,
      coordinates,
      message,
      updatedBy: userId,
      isPublic: true,
    },
  });
  
  // Mettre à jour des champs spécifiques selon le statut
  if (status === "PICKED_UP") {
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { pickupDate: new Date() },
    });
  } else if (status === "DELIVERED") {
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { actualDelivery: new Date() },
    });
  }
  
  return trackingUpdate;
}

/**
 * Vérifie un code de livraison
 * 
 * @param prisma Instance Prisma
 * @param deliveryId ID de la livraison
 * @param code Code fourni
 * @returns true si le code est valide, false sinon
 */
export async function verifyDeliveryCode(
  prisma: PrismaClient,
  deliveryId: string,
  code: string
): Promise<boolean> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: { deliveryCode: true },
  });
  
  if (!delivery || !delivery.deliveryCode) {
    return false;
  }
  
  return delivery.deliveryCode === code;
}