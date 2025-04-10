// src/components/announcements/announcement-stats.tsx
import prisma from "@/lib/prisma";

interface AnnouncementStatsResult {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  inProgressCount: number;
  cancelledCount: number;
  pendingBidsCount: number;
  totalSpent: number;
  avgPrice: number;
  completedPercentage: number;
}

/**
 * Récupère les statistiques des annonces pour un utilisateur
 * 
 * @param userId ID de l'utilisateur
 * @returns Statistiques des annonces
 */
export async function AnnouncementStats({ 
  userId 
}: { 
  userId: string 
}): Promise<AnnouncementStatsResult> {
  // Récupérer toutes les annonces de l'utilisateur
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { customerId: userId },
        { courier: { userId } },
      ],
    },
    include: {
      _count: {
        select: {
          bids: {
            where: {
              status: "PENDING",
            },
          },
        },
      },
      delivery: {
        select: {
          price: true,
        },
      },
    },
  });
  
  // Calculer les statistiques
  const totalCount = announcements.length;
  
  const activeCount = announcements.filter(
    (a) => a.status === "ACTIVE" || a.status === "PENDING"
  ).length;
  
  const completedCount = announcements.filter(
    (a) => a.status === "COMPLETED" || a.status === "DELIVERED"
  ).length;
  
  const inProgressCount = announcements.filter(
    (a) => a.status === "ASSIGNED" || a.status === "IN_TRANSIT"
  ).length;
  
  const cancelledCount = announcements.filter(
    (a) => a.status === "CANCELLED" || a.status === "EXPIRED"
  ).length;
  
  // Compter les offres en attente sur les annonces actives
  const pendingBidsCount = announcements
    .filter((a) => a.status === "ACTIVE")
    .reduce((sum, announcement) => sum + announcement._count.bids, 0);
  
  // Calculer les dépenses totales (pour les clients)
  const totalSpent = announcements
    .filter((a) => a.customerId === userId && a.delivery?.price)
    .reduce((sum, announcement) => sum + (announcement.delivery?.price || 0), 0);
  
  // Calculer le prix moyen par livraison
  const deliveriesWithPrice = announcements.filter(
    (a) => a.customerId === userId && a.delivery?.price
  ).length;
  
  const avgPrice = deliveriesWithPrice > 0
    ? Math.round((totalSpent / deliveriesWithPrice) * 100) / 100
    : 0;
  
  // Calculer le pourcentage de complétion
  const totalNonCancelled = announcements.filter(
    (a) => a.status !== "CANCELLED" && a.status !== "EXPIRED"
  ).length;
  
  const completedPercentage = totalNonCancelled > 0
    ? Math.round((completedCount / totalNonCancelled) * 100)
    : 0;
  
  return {
    totalCount,
    activeCount,
    completedCount,
    inProgressCount,
    cancelledCount,
    pendingBidsCount,
    totalSpent,
    avgPrice,
    completedPercentage,
  };
}