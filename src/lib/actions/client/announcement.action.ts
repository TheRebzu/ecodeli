'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Actions related to announcement functionality
 */

/**
 * Type pour les données d'annonce
 */
type AnnouncementInput = {
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoordinates?: { lat: number; lng: number };
  deliveryCoordinates?: { lat: number; lng: number };
  packageType: string;
  weight?: string | number;
  insuranceAmount?: string | number;
  packageContents?: string;
  isFragile: boolean;
  requiresRefrigeration: boolean;
  price: string | number;
  deliveryDeadline: string | Date;
  insuranceOption: string;
};

/**
 * Create a new announcement
 */
export async function createAnnouncementData(data: AnnouncementInput) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Création d'une annonce dans la base de données
    const announcement = await prisma.$queryRaw`
      INSERT INTO "Announcement" (
        "title", "description", "origin", "destination", 
        "originCoordinates", "destCoordinates", "packageSize", 
        "packageWeight", "packageValue", "packageContents", 
        "containsFragile", "needsRefrigeration", "offeredPrice", 
        "datePosted", "deadlineDate", "status", "isInsured", 
        "viewCount", "isDeleted", "customerId"
      ) VALUES (
        ${data.title}, 
        ${data.description}, 
        ${data.pickupAddress}, 
        ${data.deliveryAddress},
        ${data.pickupCoordinates ? JSON.stringify(data.pickupCoordinates) : null}, 
        ${data.deliveryCoordinates ? JSON.stringify(data.deliveryCoordinates) : null},
        ${data.packageType}, 
        ${parseFloat(data.weight?.toString() || "0") || 0}, 
        ${data.insuranceAmount ? parseFloat(data.insuranceAmount.toString()) : null}, 
        ${data.packageContents || null},
        ${data.isFragile || false}, 
        ${data.requiresRefrigeration || false}, 
        ${parseFloat(data.price.toString()) || 0},
        ${new Date()}, 
        ${new Date(data.deliveryDeadline)}, 
        ${'DRAFT'}, 
        ${data.insuranceOption !== 'NONE'}, 
        ${0}, 
        ${false}, 
        ${session.user.id}
      )
      RETURNING *
    `;
    
    revalidatePath('/client/announcements')
    return { success: true, data: announcement }
  } catch (error) {
    console.error('Error in createAnnouncementData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }
  }
}

/**
 * Get all announcements for the current user
 */
export async function getAnnouncementData() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Récupération des annonces depuis la base de données
    const announcements = await prisma.$queryRaw`
      SELECT * FROM "Announcement"
      WHERE "customerId" = ${session.user.id}
      AND "isDeleted" = false
      ORDER BY "datePosted" DESC
    `;
    
    return { success: true, data: announcements }
  } catch (error) {
    console.error('Error in getAnnouncementData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }
  }
}

/**
 * Get announcement by ID
 */
export async function getAnnouncementById(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    const announcement = await prisma.$queryRaw`
      SELECT * FROM "Announcement"
      WHERE "id" = ${id}
      AND "customerId" = ${session.user.id}
    `;

    if (!announcement || !Array.isArray(announcement) || announcement.length === 0) {
      return { success: false, error: 'Announcement not found' }
    }

    return { success: true, data: announcement[0] }
  } catch (error) {
    console.error('Error in getAnnouncementById:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }
  }
}

/**
 * Update announcement
 */
export async function updateAnnouncementData(id: string, data: AnnouncementInput) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Vérifier que l'annonce appartient à l'utilisateur
    const existingAnnouncement = await prisma.$queryRaw`
      SELECT * FROM "Announcement"
      WHERE "id" = ${id}
      AND "customerId" = ${session.user.id}
    `;

    if (!existingAnnouncement || !Array.isArray(existingAnnouncement) || existingAnnouncement.length === 0) {
      return { success: false, error: 'Announcement not found or you do not have permission to update it' }
    }

    // Mettre à jour l'annonce
    const updatedAnnouncement = await prisma.$queryRaw`
      UPDATE "Announcement"
      SET 
        "title" = ${data.title},
        "description" = ${data.description},
        "origin" = ${data.pickupAddress},
        "destination" = ${data.deliveryAddress},
        "originCoordinates" = ${data.pickupCoordinates ? JSON.stringify(data.pickupCoordinates) : null},
        "destCoordinates" = ${data.deliveryCoordinates ? JSON.stringify(data.deliveryCoordinates) : null},
        "packageSize" = ${data.packageType},
        "packageWeight" = ${parseFloat(data.weight?.toString() || "0") || 0},
        "packageValue" = ${data.insuranceAmount ? parseFloat(data.insuranceAmount.toString()) : null},
        "packageContents" = ${data.packageContents || null},
        "containsFragile" = ${data.isFragile || false},
        "needsRefrigeration" = ${data.requiresRefrigeration || false},
        "offeredPrice" = ${parseFloat(data.price.toString()) || 0},
        "deadlineDate" = ${new Date(data.deliveryDeadline)},
        "isInsured" = ${data.insuranceOption !== 'NONE'}
      WHERE "id" = ${id}
      RETURNING *
    `;

    revalidatePath('/client/announcements')
    revalidatePath(`/client/announcements/${id}`)
    return { success: true, data: updatedAnnouncement[0] }
  } catch (error) {
    console.error('Error in updateAnnouncementData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }
  }
}

/**
 * Delete announcement
 */
export async function deleteAnnouncementData(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Vérifier que l'annonce appartient à l'utilisateur
    const existingAnnouncement = await prisma.$queryRaw`
      SELECT * FROM "Announcement"
      WHERE "id" = ${id}
      AND "customerId" = ${session.user.id}
    `;

    if (!existingAnnouncement || !Array.isArray(existingAnnouncement) || existingAnnouncement.length === 0) {
      return { success: false, error: 'Announcement not found or you do not have permission to delete it' }
    }

    // Mettre à jour l'annonce (soft delete)
    await prisma.$queryRaw`
      UPDATE "Announcement"
      SET 
        "isDeleted" = true,
        "status" = 'CANCELLED'
      WHERE "id" = ${id}
    `;

    revalidatePath('/client/announcements')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteAnnouncementData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }
  }
}

/**
 * Publish announcement
 */
export async function publishAnnouncementData(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Vérifier que l'annonce appartient à l'utilisateur
    const existingAnnouncement = await prisma.$queryRaw`
      SELECT * FROM "Announcement"
      WHERE "id" = ${id}
      AND "customerId" = ${session.user.id}
    `;

    if (!existingAnnouncement || !Array.isArray(existingAnnouncement) || existingAnnouncement.length === 0) {
      return { success: false, error: 'Announcement not found or you do not have permission to publish it' }
    }

    // Publier l'annonce
    const publishedAnnouncement = await prisma.$queryRaw`
      UPDATE "Announcement"
      SET "status" = 'OPEN'
      WHERE "id" = ${id}
      RETURNING *
    `;

    revalidatePath('/client/announcements')
    revalidatePath(`/client/announcements/${id}`)
    return { success: true, data: publishedAnnouncement[0] }
  } catch (error) {
    console.error('Error in publishAnnouncementData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }
  }
}
