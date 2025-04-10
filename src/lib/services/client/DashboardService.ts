import { db } from "@/lib/db";

// Utiliser le mock de Prisma au lieu d'instancier PrismaClient directement
const prisma = db;

export class DashboardService {
  /**
   * Récupère les statistiques pour le tableau de bord client
   */
  static async getDashboardStats(userId: string) {
    try {
      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          customer: true,
          subscription: true,
        },
      });

      if (!user || !user.customer) {
        throw new Error("Client non trouvé");
      }

      // Récupérer le nombre de livraisons en cours
      const activeDeliveries = await prisma.announcement.count({
        where: {
          customerId: userId,
          status: {
            in: ["ASSIGNED", "IN_TRANSIT"],
          },
          deletedAt: null,
        },
      });

      // Récupérer le nombre total de colis
      const totalPackages = await prisma.announcement.count({
        where: {
          customerId: userId,
          deletedAt: null,
        },
      });

      // Récupérer le nombre de boîtes de stockage
      const storageBoxes = await prisma.storageBox.count({
        where: {
          customerId: userId,
          deletedAt: null,
        },
      });

      // Récupérer la capacité totale de stockage autorisée selon l'abonnement
      const storageCapacity = user.subscription?.storageBoxLimit || 5;

      // Récupérer l'abonnement actuel
      const subscription = user.subscription ? {
        plan: user.subscription.plan,
        expiresAt: user.subscription.expiresAt,
        remainingDays: user.subscription.expiresAt ? 
          Math.max(0, Math.ceil((user.subscription.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 
          0,
      } : null;

      // Récupérer l'activité récente
      const recentActivity = await prisma.announcement.findMany({
        where: {
          customerId: userId,
          deletedAt: null,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 5,
        include: {
          deliveryPerson: {
            include: {
              user: {
                select: {
                  name: true,
                  image: true,
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        data: {
          activeDeliveries,
          totalPackages,
          storageBoxes,
          storageCapacity,
          subscription,
          recentActivity,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
} 