"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { AnnouncementService } from "@/lib/services/client/announcement.service";
import { BidService } from "@/lib/services/client/bid.service";
import { 
  CreateAnnouncementParams, 
  UpdateAnnouncementParams,
  CreateBidParams,
  UpdateBidParams,
  Coordinates
} from "@/shared/types/announcement.types";

/**
 * Crée une nouvelle annonce
 */
export async function createAnnouncement(data: CreateAnnouncementParams) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await AnnouncementService.createAnnouncement(
      session.user.id,
      data
    );
    
    if (result.success) {
      revalidatePath("/dashboard/announcements");
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error creating announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Met à jour une annonce existante
 */
export async function updateAnnouncement(data: UpdateAnnouncementParams) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await AnnouncementService.updateAnnouncement(
      session.user.id,
      data
    );
    
    if (result.success) {
      revalidatePath(`/dashboard/announcements/${data.id}`);
      revalidatePath(`/announcements/${data.id}`);
      revalidatePath("/dashboard/announcements");
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error updating announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Supprime une annonce
 */
export async function deleteAnnouncement(announcementId: string) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await AnnouncementService.deleteAnnouncement(
      session.user.id,
      announcementId
    );
    
    if (result.success) {
      revalidatePath("/dashboard/announcements");
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Publie une annonce
 */
export async function publishAnnouncement(announcementId: string) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await AnnouncementService.publishAnnouncement(
      session.user.id,
      announcementId
    );
    
    if (result.success) {
      revalidatePath(`/dashboard/announcements/${announcementId}`);
      revalidatePath(`/announcements/${announcementId}`);
      revalidatePath("/dashboard/announcements");
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error publishing announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Récupère les annonces d'un client
 */
export async function getClientAnnouncements(filters?: {
  status?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    return await AnnouncementService.getClientAnnouncements(
      session.user.id,
      filters
    );
  } catch (error) {
    console.error("Error fetching client announcements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Récupère une annonce par son ID
 */
export async function getAnnouncementById(announcementId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    return await AnnouncementService.getAnnouncementById(
      announcementId,
      userId
    );
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Calcule un prix recommandé
 */
export async function calculateRecommendedPrice(
  pickupCoordinates: Coordinates,
  deliveryCoordinates: Coordinates,
  weight: number,
  isFragile: boolean = false,
  requiresRefrigeration: boolean = false
) {
  try {
    return AnnouncementService.calculateRecommendedPrice(
      pickupCoordinates,
      deliveryCoordinates,
      weight,
      isFragile,
      requiresRefrigeration
    );
  } catch (error) {
    console.error("Error calculating recommended price:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Crée une offre sur une annonce
 */
export async function createBid(data: CreateBidParams) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await BidService.createBid(session.user.id, data);
    
    if (result.success) {
      revalidatePath(`/announcements/${data.announcementId}`);
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error creating bid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Met à jour une offre
 */
export async function updateBid(data: UpdateBidParams) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await BidService.updateBid(session.user.id, data);
    
    if (result.success && result.data) {
      revalidatePath(`/announcements/${result.data.announcementId}`);
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error updating bid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Accepte une offre
 */
export async function acceptBid(bidId: string) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await BidService.acceptBid(session.user.id, bidId);
    
    if (result.success && result.data) {
      revalidatePath(`/dashboard/announcements/${result.data.announcementId}`);
      revalidatePath(`/announcements/${result.data.announcementId}`);
      revalidatePath("/dashboard/announcements");
      revalidatePath("/announcements");
    }
    
    return result;
  } catch (error) {
    console.error("Error accepting bid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
}

/**
 * Rejette une offre
 */
export async function rejectBid(bidId: string) {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await BidService.rejectBid(session.user.id, bidId);
    
    if (result.success && result.data) {
      revalidatePath(`/dashboard/announcements/${result.data.announcementId}`);
      revalidatePath(`/announcements/${result.data.announcementId}`);
    }
    
    return result;
  } catch (error) {
    console.error("Error rejecting bid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur est survenue",
    };
  }
} 