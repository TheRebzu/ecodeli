import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { 
  AnnouncementStatus, 
  ApplicationStatus, 
  LocationType, 
  PackageSize, 
  PaymentStatus, 
  Prisma 
} from "@prisma/client";

export const announcementRouter = createTRPCRouter({
  // Créer une nouvelle annonce
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(100),
        description: z.string().min(10),
        pickupAddress: z.string().min(5),
        deliveryAddress: z.string().min(5),
        packageSize: z.nativeEnum(PackageSize),
        packageWeight: z.number().positive(),
        packageValue: z.number().nonnegative(),
        deadline: z.date().min(new Date()),
        price: z.number().positive(),
        requiresInsurance: z.boolean().default(false),
        pickupLatitude: z.number().optional(),
        pickupLongitude: z.number().optional(),
        deliveryLatitude: z.number().optional(),
        deliveryLongitude: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur a le rôle CLIENT
      if (ctx.session.user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent créer des annonces",
        });
      }

      // Créer l'annonce
      const announcement = await ctx.db.announcement.create({
        data: {
          title: input.title,
          description: input.description,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          packageSize: input.packageSize,
          packageWeight: input.packageWeight,
          packageValue: input.packageValue,
          deadline: input.deadline,
          price: input.price,
          requiresInsurance: input.requiresInsurance,
          status: AnnouncementStatus.OPEN,
          paymentStatus: PaymentStatus.PENDING,
          client: {
            connect: {
              id: ctx.session.user.id,
            },
          },
        },
      });

      // Ajouter les coordonnées géographiques si disponibles
      if (input.pickupLatitude && input.pickupLongitude) {
        await ctx.db.announcementLocation.create({
          data: {
            latitude: input.pickupLatitude,
            longitude: input.pickupLongitude,
            locationType: LocationType.PICKUP,
            announcement: {
              connect: {
                id: announcement.id,
              },
            },
          },
        });
      }

      if (input.deliveryLatitude && input.deliveryLongitude) {
        await ctx.db.announcementLocation.create({
          data: {
            latitude: input.deliveryLatitude,
            longitude: input.deliveryLongitude,
            locationType: LocationType.DELIVERY,
            announcement: {
              connect: {
                id: announcement.id,
              },
            },
          },
        });
      }

      return announcement;
    }),

  // Mettre à jour une annonce existante
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(5).max(100).optional(),
        description: z.string().min(10).optional(),
        pickupAddress: z.string().min(5).optional(),
        deliveryAddress: z.string().min(5).optional(),
        packageSize: z.nativeEnum(PackageSize).optional(),
        packageWeight: z.number().positive().optional(),
        packageValue: z.number().nonnegative().optional(),
        deadline: z.date().min(new Date()).optional(),
        price: z.number().positive().optional(),
        requiresInsurance: z.boolean().optional(),
        pickupLatitude: z.number().optional(),
        pickupLongitude: z.number().optional(),
        deliveryLatitude: z.number().optional(),
        deliveryLongitude: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.id },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'utilisateur est le propriétaire de l'annonce ou un admin
      if (announcement.clientId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à modifier cette annonce",
        });
      }

      // Vérifier que l'annonce est modifiable (statut OPEN)
      if (announcement.status !== AnnouncementStatus.OPEN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette annonce ne peut plus être modifiée",
        });
      }

      // Mettre à jour l'annonce
      const updatedAnnouncement = await ctx.db.announcement.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          packageSize: input.packageSize,
          packageWeight: input.packageWeight,
          packageValue: input.packageValue,
          deadline: input.deadline,
          price: input.price,
          requiresInsurance: input.requiresInsurance,
        },
      });

      // Mettre à jour les coordonnées géographiques si fournies
      if (input.pickupLatitude && input.pickupLongitude) {
        await ctx.db.announcementLocation.upsert({
          where: {
            announcementId_locationType: {
              announcementId: input.id,
              locationType: LocationType.PICKUP,
            },
          },
          update: {
            latitude: input.pickupLatitude,
            longitude: input.pickupLongitude,
          },
          create: {
            latitude: input.pickupLatitude,
            longitude: input.pickupLongitude,
            locationType: LocationType.PICKUP,
            announcementId: input.id,
          },
        });
      }

      if (input.deliveryLatitude && input.deliveryLongitude) {
        await ctx.db.announcementLocation.upsert({
          where: {
            announcementId_locationType: {
              announcementId: input.id,
              locationType: LocationType.DELIVERY,
            },
          },
          update: {
            latitude: input.deliveryLatitude,
            longitude: input.deliveryLongitude,
          },
          create: {
            latitude: input.deliveryLatitude,
            longitude: input.deliveryLongitude,
            locationType: LocationType.DELIVERY,
            announcementId: input.id,
          },
        });
      }

      return updatedAnnouncement;
    }),

  // Supprimer une annonce
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.id },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'utilisateur est le propriétaire de l'annonce ou un admin
      if (announcement.clientId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à supprimer cette annonce",
        });
      }

      // Vérifier que l'annonce est supprimable (statut OPEN)
      if (announcement.status !== AnnouncementStatus.OPEN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette annonce ne peut plus être supprimée",
        });
      }

      // Supprimer l'annonce
      await ctx.db.announcement.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Récupérer une annonce par son ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          locations: true,
          applications: {
            include: {
              deliverer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          reviews: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              target: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      return announcement;
    }),

  // Récupérer toutes les annonces avec pagination et filtres
  getAll: publicProcedure
    .input(
      z.object({
        status: z.nativeEnum(AnnouncementStatus).optional(),
        packageSize: z.nativeEnum(PackageSize).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        searchTerm: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        maxDistance: z.number().optional(), // en kilomètres
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Construire les filtres
      const filters: Prisma.AnnouncementWhereInput = {
        status: input.status,
        packageSize: input.packageSize,
        price: {
          gte: input.minPrice,
          lte: input.maxPrice,
        },
      };

      // Ajouter le filtre de recherche textuelle
      if (input.searchTerm) {
        filters.OR = [
          { title: { contains: input.searchTerm, mode: "insensitive" } },
          { description: { contains: input.searchTerm, mode: "insensitive" } },
          { pickupAddress: { contains: input.searchTerm, mode: "insensitive" } },
          { deliveryAddress: { contains: input.searchTerm, mode: "insensitive" } },
        ];
      }

      // Récupérer les annonces
      const announcements = await ctx.db.announcement.findMany({
        where: filters,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          locations: true,
        },
      });

      // Gérer la pagination
      let nextCursor: string | undefined = undefined;
      if (announcements.length > input.limit) {
        const nextItem = announcements.pop();
        nextCursor = nextItem?.id;
      }

      // Filtrer par distance si des coordonnées sont fournies
      let filteredAnnouncements = announcements;
      if (input.latitude && input.longitude && input.maxDistance) {
        filteredAnnouncements = announcements.filter((announcement) => {
          // Chercher les coordonnées de ramassage
          const pickupLocation = announcement.locations.find(
            (loc) => loc.locationType === LocationType.PICKUP
          );

          if (!pickupLocation) return false;

          // Calculer la distance
          const distance = calculateDistance(
            input.latitude!,
            input.longitude!,
            pickupLocation.latitude,
            pickupLocation.longitude
          );

          return distance <= input.maxDistance!;
        });
      }

      return {
        announcements: filteredAnnouncements,
        nextCursor,
      };
    }),

  // Récupérer les annonces d'un utilisateur
  getUserAnnouncements: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(AnnouncementStatus).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const announcements = await ctx.db.announcement.findMany({
        where: {
          clientId: ctx.session.user.id,
          status: input.status,
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          applications: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (announcements.length > input.limit) {
        const nextItem = announcements.pop();
        nextCursor = nextItem?.id;
      }

      return {
        announcements,
        nextCursor,
      };
    }),

  // Récupérer les annonces assignées à un livreur
  getDelivererAnnouncements: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(AnnouncementStatus).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur a le rôle DELIVERER
      if (ctx.session.user.role !== "DELIVERER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à ces annonces",
        });
      }

      const announcements = await ctx.db.announcement.findMany({
        where: {
          delivererId: ctx.session.user.id,
          status: input.status,
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          locations: true,
        },
      });

      let nextCursor: string | undefined = undefined;
      if (announcements.length > input.limit) {
        const nextItem = announcements.pop();
        nextCursor = nextItem?.id;
      }

      return {
        announcements,
        nextCursor,
      };
    }),

  // Changer le statut d'une annonce
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(AnnouncementStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.id },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier les autorisations selon le statut demandé
      if (input.status === AnnouncementStatus.CANCELLED) {
        // Seul le client ou un admin peut annuler
        if (announcement.clientId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à annuler cette annonce",
          });
        }
      } else if (input.status === AnnouncementStatus.IN_TRANSIT || input.status === AnnouncementStatus.DELIVERED) {
        // Seul le livreur assigné ou un admin peut mettre à jour ces statuts
        if (announcement.delivererId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à mettre à jour le statut de cette annonce",
          });
        }
      }

      // Vérifier les transitions de statut valides
      const validTransitions: Record<AnnouncementStatus, AnnouncementStatus[]> = {
        [AnnouncementStatus.OPEN]: [AnnouncementStatus.ASSIGNED, AnnouncementStatus.CANCELLED],
        [AnnouncementStatus.ASSIGNED]: [AnnouncementStatus.IN_TRANSIT, AnnouncementStatus.CANCELLED],
        [AnnouncementStatus.IN_TRANSIT]: [AnnouncementStatus.DELIVERED, AnnouncementStatus.CANCELLED],
        [AnnouncementStatus.DELIVERED]: [],
        [AnnouncementStatus.CANCELLED]: [],
      };

      if (!validTransitions[announcement.status].includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Impossible de passer du statut ${announcement.status} au statut ${input.status}`,
        });
      }

      // Mettre à jour le statut
      const updatedAnnouncement = await ctx.db.announcement.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return updatedAnnouncement;
    }),

  // Postuler pour une annonce (en tant que livreur)
  applyForAnnouncement: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        message: z.string().optional(),
        price: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur a le rôle DELIVERER
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent postuler pour des annonces",
        });
      }

      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'annonce est ouverte
      if (announcement.status !== AnnouncementStatus.OPEN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette annonce n'est plus ouverte aux candidatures",
        });
      }

      // Vérifier que le livreur n'a pas déjà postulé
      const existingApplication = await ctx.db.announcementApplication.findUnique({
        where: {
          announcementId_delivererId: {
            announcementId: input.announcementId,
            delivererId: ctx.session.user.id,
          },
        },
      });

      if (existingApplication) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous avez déjà postulé pour cette annonce",
        });
      }

      // Créer la candidature
      const application = await ctx.db.announcementApplication.create({
        data: {
          message: input.message,
          price: input.price ?? announcement.price,
          status: ApplicationStatus.PENDING,
          announcement: {
            connect: {
              id: input.announcementId,
            },
          },
          deliverer: {
            connect: {
              id: ctx.session.user.id,
            },
          },
        },
      });

      return application;
    }),

  // Accepter une candidature (en tant que client)
  acceptApplication: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer la candidature
      const application = await ctx.db.announcementApplication.findUnique({
        where: { id: input.applicationId },
        include: {
          announcement: true,
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidature introuvable",
        });
      }

      // Vérifier que l'utilisateur est le propriétaire de l'annonce
      if (application.announcement.clientId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accepter cette candidature",
        });
      }

      // Vérifier que l'annonce est toujours ouverte
      if (application.announcement.status !== AnnouncementStatus.OPEN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette annonce n'est plus ouverte aux candidatures",
        });
      }

      // Mettre à jour la candidature et l'annonce dans une transaction
      const [updatedApplication] = await ctx.db.$transaction([
        // Mettre à jour la candidature
        ctx.db.announcementApplication.update({
          where: { id: input.applicationId },
          data: { status: ApplicationStatus.ACCEPTED },
        }),
        
        // Mettre à jour l'annonce
        ctx.db.announcement.update({
          where: { id: application.announcementId },
          data: {
            status: AnnouncementStatus.ASSIGNED,
            delivererId: application.delivererId,
            price: application.price, // Utiliser le prix proposé par le livreur
          },
        }),
        
        // Rejeter toutes les autres candidatures
        ctx.db.announcementApplication.updateMany({
          where: {
            announcementId: application.announcementId,
            id: { not: input.applicationId },
          },
          data: { status: ApplicationStatus.REJECTED },
        }),
      ]);

      return updatedApplication;
    }),

  // Ajouter une évaluation
  addReview: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        targetId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'annonce est terminée
      if (announcement.status !== AnnouncementStatus.DELIVERED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous ne pouvez évaluer qu'une livraison terminée",
        });
      }

      // Déterminer le type d'évaluation
      let reviewType;
      if (ctx.session.user.id === announcement.clientId && input.targetId === announcement.delivererId) {
        reviewType = "CLIENT_TO_DELIVERER";
      } else if (ctx.session.user.id === announcement.delivererId && input.targetId === announcement.clientId) {
        reviewType = "DELIVERER_TO_CLIENT";
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous n'êtes pas autorisé à laisser cette évaluation",
        });
      }

      // Vérifier qu'une évaluation n'existe pas déjà
      const existingReview = await ctx.db.announcementReview.findFirst({
        where: {
          announcementId: input.announcementId,
          reviewerId: ctx.session.user.id,
          targetId: input.targetId,
        },
      });

      if (existingReview) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous avez déjà évalué cet utilisateur pour cette annonce",
        });
      }

      // Créer l'évaluation
      const review = await ctx.db.announcementReview.create({
        data: {
          rating: input.rating,
          comment: input.comment,
          reviewType,
          announcement: {
            connect: {
              id: input.announcementId,
            },
          },
          reviewer: {
            connect: {
              id: ctx.session.user.id,
            },
          },
          target: {
            connect: {
              id: input.targetId,
            },
          },
        },
      });

      return review;
    }),

  // Envoyer un message
  sendMessage: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        receiverId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'utilisateur est impliqué dans l'annonce
      const isClient = announcement.clientId === ctx.session.user.id;
      const isDeliverer = announcement.delivererId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "ADMIN";

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à envoyer des messages pour cette annonce",
        });
      }

      // Vérifier que le destinataire est impliqué dans l'annonce
      const isReceiverClient = announcement.clientId === input.receiverId;
      const isReceiverDeliverer = announcement.delivererId === input.receiverId;

      if (!isReceiverClient && !isReceiverDeliverer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le destinataire n'est pas impliqué dans cette annonce",
        });
      }

      // Créer le message
      const message = await ctx.db.announcementMessage.create({
        data: {
          content: input.content,
          announcement: {
            connect: {
              id: input.announcementId,
            },
          },
          sender: {
            connect: {
              id: ctx.session.user.id,
            },
          },
          receiver: {
            connect: {
              id: input.receiverId,
            },
          },
        },
      });

      return message;
    }),

  // Récupérer les messages d'une annonce
  getMessages: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'utilisateur est impliqué dans l'annonce
      const isClient = announcement.clientId === ctx.session.user.id;
      const isDeliverer = announcement.delivererId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "ADMIN";

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à voir les messages de cette annonce",
        });
      }

      // Récupérer les messages
      const messages = await ctx.db.announcementMessage.findMany({
        where: {
          announcementId: input.announcementId,
          OR: [
            { senderId: ctx.session.user.id },
            { receiverId: ctx.session.user.id },
          ],
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Marquer les messages comme lus
      await ctx.db.announcementMessage.updateMany({
        where: {
          announcementId: input.announcementId,
          receiverId: ctx.session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      // Gérer la pagination
      let nextCursor: string | undefined = undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),

  // Créer un litige
  createDispute: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        defenderId: z.string(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'utilisateur est impliqué dans l'annonce
      const isClient = announcement.clientId === ctx.session.user.id;
      const isDeliverer = announcement.delivererId === ctx.session.user.id;

      if (!isClient && !isDeliverer) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à créer un litige pour cette annonce",
        });
      }

      // Vérifier que le défendeur est impliqué dans l'annonce
      const isDefenderClient = announcement.clientId === input.defenderId;
      const isDefenderDeliverer = announcement.delivererId === input.defenderId;

      if (!isDefenderClient && !isDefenderDeliverer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le défendeur n'est pas impliqué dans cette annonce",
        });
      }

      // Vérifier que le créateur n'est pas le défendeur
      if (ctx.session.user.id === input.defenderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous ne pouvez pas créer un litige contre vous-même",
        });
      }

      // Créer le litige
      const dispute = await ctx.db.announcementDispute.create({
        data: {
          reason: input.reason,
          status: "OPEN",
          announcement: {
            connect: {
              id: input.announcementId,
            },
          },
          creator: {
            connect: {
              id: ctx.session.user.id,
            },
          },
          defender: {
            connect: {
              id: input.defenderId,
            },
          },
        },
      });

      return dispute;
    }),
});

// Fonction utilitaire pour calculer la distance entre deux points géographiques
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance en km
  return distance;
}
