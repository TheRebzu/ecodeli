import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Schéma de validation réutilisable pour le timeframe - RENDU OPTIONNEL pour résoudre les erreurs
const timeframeSchema = z.object({
  timeframe: z.enum(["week", "month", "year"]).default("month")
}).optional().transform(input => input ?? { timeframe: "month" as const });

export const clientDashboardRouter = createTRPCRouter({
  getStats: protectedProcedure
    .input(timeframeSchema)
    .query(async ({ input, ctx }) => {
      // Validation supplémentaire du rôle
      if (ctx.session.user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès restreint aux clients"
        });
      }

      // Validation de l'input
      if (!input || typeof input !== 'object') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paramètres d'entrée invalides"
        });
      }

      const userId = ctx.session.user.id;
      
      // Récupérer les informations du client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true }
      });

      if (!user?.client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil client non trouvé"
        });
      }

      const clientId = user.client.id;
      const now = new Date();
      let startDate: Date;

      // Calculer la période selon le timeframe
      switch (input.timeframe) {
        case "week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case "year":
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      try {
        // Récupérer les statistiques réelles depuis la base de données
        const [
          announcements,
          deliveries,
          payments,
          services,
          storageBoxes
        ] = await Promise.all([
          // Nombre d'annonces créées
          ctx.db.announcement.count({
            where: {
              clientId: clientId,
              createdAt: { gte: startDate, lte: now }
            }
          }),
          
          // Livraisons complétées
          ctx.db.delivery.count({
            where: {
              clientId: clientId,
              createdAt: { gte: startDate, lte: now },
              status: "DELIVERED"
            }
          }),

          // Total des paiements
          ctx.db.payment.aggregate({
            where: {
              userId: userId,
              createdAt: { gte: startDate, lte: now },
              status: "COMPLETED"
            },
            _sum: { amount: true }
          }),

          // Services réservés
          ctx.db.serviceBooking.count({
            where: {
              clientId: clientId,
              createdAt: { gte: startDate, lte: now }
            }
          }),

          // Boxes de stockage actives
          ctx.db.reservation.count({
            where: {
              clientId: clientId,
              status: "ACTIVE"
            }
          }),

        ]);

        // Calculer les données de la période précédente pour les comparaisons
        let prevStartDate: Date;
        switch (input.timeframe) {
          case "week":
            prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            prevStartDate = new Date(startDate);
            prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
            break;
          default: // month
            prevStartDate = new Date(startDate);
            prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        }

        const [
          prevAnnouncements,
          prevDeliveries,
          prevPayments,
          prevServices
        ] = await Promise.all([
          ctx.db.announcement.count({
            where: {
              clientId: clientId,
              createdAt: { gte: prevStartDate, lt: startDate }
            }
          }),
          ctx.db.delivery.count({
            where: {
              clientId: clientId,
              createdAt: { gte: prevStartDate, lt: startDate },
              status: "DELIVERED"
            }
          }),
          ctx.db.payment.aggregate({
            where: {
              userId: userId,
              createdAt: { gte: prevStartDate, lt: startDate },
              status: "COMPLETED"
            },
            _sum: { amount: true }
          }),
          ctx.db.serviceBooking.count({
            where: {
              clientId: clientId,
              createdAt: { gte: prevStartDate, lt: startDate }
            }
          })
        ]);

        // Calculer les pourcentages de changement
        const calculateChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const stats = [
          {
            id: "announcements",
            title: "Mes annonces",
            value: announcements,
            previousValue: prevAnnouncements,
            change: calculateChange(announcements, prevAnnouncements),
            changeType: announcements >= prevAnnouncements ? "increase" as const : "decrease" as const,
            trend: [], // TODO: Implémenter si nécessaire
            icon: "Package",
            color: "text-blue-600",
            bgColor: "bg-blue-100",
            description: `Annonces créées ${input.timeframe === "week" ? "cette semaine" : input.timeframe === "month" ? "ce mois" : "cette année"}`
          },
          {
            id: "deliveries",
            title: "Livraisons",
            value: deliveries,
            previousValue: prevDeliveries,
            change: calculateChange(deliveries, prevDeliveries),
            changeType: deliveries >= prevDeliveries ? "increase" as const : "decrease" as const,
            trend: [],
            icon: "Truck",
            color: "text-green-600",
            bgColor: "bg-green-100",
            description: "Livraisons complétées"
          },
          {
            id: "spending",
            title: "Dépenses",
            value: payments._sum.amount ? Number(payments._sum.amount) / 100 : 0, // Conversion centimes vers euros
            previousValue: prevPayments._sum.amount ? Number(prevPayments._sum.amount) / 100 : 0,
            change: calculateChange(
              payments._sum.amount ? Number(payments._sum.amount) : 0,
              prevPayments._sum.amount ? Number(prevPayments._sum.amount) : 0
            ),
            changeType: (payments._sum.amount || 0) >= (prevPayments._sum.amount || 0) ? "increase" as const : "decrease" as const,
            trend: [],
            unit: "€",
            icon: "Euro",
            color: "text-purple-600",
            bgColor: "bg-purple-100",
            description: "Total dépensé"
          },
          {
            id: "services",
            title: "Services utilisés",
            value: services,
            previousValue: prevServices,
            change: calculateChange(services, prevServices),
            changeType: services >= prevServices ? "increase" as const : "decrease" as const,
            trend: [],
            icon: "Calendar",
            color: "text-orange-600",
            bgColor: "bg-orange-100",
            description: "Services réservés"
          },
          {
            id: "storage",
            title: "Entreposage",
            value: storageBoxes,
            changeType: "neutral" as const,
            trend: [],
            unit: "boxes",
            icon: "Package",
            color: "text-indigo-600",
            bgColor: "bg-indigo-100",
            description: "Boxes actives"
          }
        ];

        return stats;
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques"
        });
      }
    }),

});

