import { Prisma } from '@prisma/client';
import { db } from '../db';
import {
  CreateAvailabilityInput,
  CreateBookingInput,
  CreateServiceInput,
  SearchServicesInput,
  UpdateBookingInput,
  UpdateServiceInput,
} from '@/schemas/service.schema';
import { TRPCError } from '@trpc/server';
import { add, format, parse, addMinutes } from 'date-fns';

// Fonction utilitaire pour convertir les chaînes de date et heure en objet Date
const parseDateTime = (date: string, time: string): Date => {
  const dateObj = parse(date, 'yyyy-MM-dd', new Date());
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hours, minutes);
};

export const serviceService = {
  // Gestion des catégories de service
  async createServiceCategory(data: { name: string; description?: string | null }) {
    try {
      return await db.serviceCategory.create({
        data,
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création de la catégorie de service',
        cause: error,
      });
    }
  },

  async getServiceCategories() {
    try {
      return await db.serviceCategory.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des catégories de service',
        cause: error,
      });
    }
  },

  // Gestion des services
  async createService(providerId: string, data: CreateServiceInput) {
    try {
      return await db.service.create({
        data: {
          ...data,
          providerId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "La catégorie spécifiée n'existe pas",
          });
        }
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création du service',
        cause: error,
      });
    }
  },

  async updateService(providerId: string, data: UpdateServiceInput) {
    const { id, ...updateData } = data;

    // Vérifier que le service appartient bien au prestataire
    const service = await db.service.findFirst({
      where: { id, providerId },
    });

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: "Service non trouvé ou vous n'êtes pas autorisé à le modifier",
      });
    }

    try {
      return await db.service.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du service',
        cause: error,
      });
    }
  },

  async getServiceById(id: string) {
    try {
      const service = await db.service.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              providerBio: true,
              providerAddress: true,
              providerCity: true,
              providerZipCode: true,
              providerVerified: true,
            },
          },
          category: true,
        },
      });

      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé',
        });
      }

      return service;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération du service',
        cause: error,
      });
    }
  },

  async getProviderServices(providerId: string) {
    try {
      return await db.service.findMany({
        where: { providerId },
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des services du prestataire',
        cause: error,
      });
    }
  },

  async searchServices(params: SearchServicesInput) {
    const { categoryId, query, maxPrice, location, maxDistance, page = 1, limit = 10 } = params;

    const skip = (page - 1) * limit;

    try {
      // Construire les filtres
      const where: Prisma.ServiceWhereInput = {
        isActive: true,
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (maxPrice) {
        where.price = { lte: maxPrice };
      }

      // Si un filtre de localisation est fourni, nous devrions idéalement utiliser
      // une requête géospatiale, mais pour simplifier, nous allons filtrer après la requête

      // Compter le nombre total de résultats pour la pagination
      const totalCount = await db.service.count({ where });

      // Récupérer les services
      let services = await db.service.findMany({
        where,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              providerVerified: true,
              providerLocationLat: true,
              providerLocationLng: true,
              providerCity: true,
            },
          },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Filtrer par distance si nécessaire
      if (location && maxDistance) {
        // Fonction simple pour calculer la distance (formule de Haversine)
        const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const R = 6371; // Rayon de la Terre en km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLng = ((lng2 - lng1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        services = services.filter(service => {
          if (!service.provider.providerLocationLat || !service.provider.providerLocationLng) {
            return false;
          }

          const distance = calculateDistance(
            location.lat,
            location.lng,
            service.provider.providerLocationLat,
            service.provider.providerLocationLng
          );

          return distance <= maxDistance;
        });
      }

      return {
        services,
        pagination: {
          total: totalCount,
          pageCount: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la recherche des services',
        cause: error,
      });
    }
  },

  // Gestion des disponibilités
  async createAvailability(providerId: string, data: CreateAvailabilityInput) {
    const { dayOfWeek, startTime, endTime } = data;

    try {
      // Convertir les chaînes d'heure en objets Date pour le stockage
      const today = new Date();
      const startDateTime = parseDateTime(format(today, 'yyyy-MM-dd'), startTime);
      const endDateTime = parseDateTime(format(today, 'yyyy-MM-dd'), endTime);

      return await db.providerAvailability.create({
        data: {
          providerId,
          dayOfWeek,
          startTime: startDateTime,
          endTime: endDateTime,
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création de la disponibilité',
        cause: error,
      });
    }
  },

  async getProviderAvailabilities(providerId: string) {
    try {
      return await db.providerAvailability.findMany({
        where: { providerId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des disponibilités',
        cause: error,
      });
    }
  },

  async deleteAvailability(providerId: string, availabilityId: string) {
    // Vérifier que la disponibilité appartient bien au prestataire
    const availability = await db.providerAvailability.findFirst({
      where: { id: availabilityId, providerId },
    });

    if (!availability) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: "Disponibilité non trouvée ou vous n'êtes pas autorisé à la supprimer",
      });
    }

    try {
      return await db.providerAvailability.delete({
        where: { id: availabilityId },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la suppression de la disponibilité',
        cause: error,
      });
    }
  },

  // Gestion des créneaux horaires disponibles
  async getAvailableTimeSlots(providerId: string, serviceId: string, date: string) {
    try {
      // Récupérer le service pour connaître sa durée
      const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { duration: true },
      });

      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé',
        });
      }

      // Convertir la date en objet Date
      const dateObj = parse(date, 'yyyy-MM-dd', new Date());

      // Jour de la semaine (0-6)
      const dayOfWeek = dateObj.getDay();

      // Récupérer les disponibilités du prestataire pour ce jour
      const availabilities = await db.providerAvailability.findMany({
        where: {
          providerId,
          dayOfWeek,
        },
        orderBy: { startTime: 'asc' },
      });

      if (availabilities.length === 0) {
        return { timeSlots: [] };
      }

      // Récupérer les réservations existantes pour cette date
      const bookings = await db.serviceBooking.findMany({
        where: {
          providerId,
          startTime: {
            gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0),
          },
          endTime: {
            lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1, 0, 0, 0),
          },
          status: {
            in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'],
          },
        },
      });

      // Générer les créneaux disponibles
      const timeSlots: { startTime: string; endTime: string }[] = [];

      // Pour chaque plage de disponibilité
      for (const availability of availabilities) {
        // Début et fin de la plage horaire
        const startHour = availability.startTime.getHours();
        const startMinute = availability.startTime.getMinutes();
        const endHour = availability.endTime.getHours();
        const endMinute = availability.endTime.getMinutes();

        let currentTime = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          startHour,
          startMinute
        );

        const endTime = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          endHour,
          endMinute
        );

        // Créneaux de 15 minutes
        const slotDuration = 15;

        // Tant qu'on peut encore ajouter un service complet
        while (addMinutes(currentTime, service.duration) <= endTime) {
          const slotEndTime = addMinutes(currentTime, service.duration);

          // Vérifier que ce créneau n'est pas déjà réservé
          const isBooked = bookings.some(booking => {
            return (
              (currentTime >= booking.startTime && currentTime < booking.endTime) ||
              (slotEndTime > booking.startTime && slotEndTime <= booking.endTime) ||
              (currentTime <= booking.startTime && slotEndTime >= booking.endTime)
            );
          });

          if (!isBooked) {
            timeSlots.push({
              startTime: format(currentTime, 'HH:mm'),
              endTime: format(slotEndTime, 'HH:mm'),
            });
          }

          // Passer au créneau suivant
          currentTime = addMinutes(currentTime, slotDuration);
        }
      }

      return { timeSlots };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des créneaux disponibles',
        cause: error,
      });
    }
  },

  // Gestion des réservations
  async createBooking(clientId: string, data: CreateBookingInput) {
    const { serviceId, providerId, date, startTime, notes } = data;

    try {
      // Récupérer le service pour connaître sa durée et son prix
      const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { duration: true, price: true },
      });

      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé',
        });
      }

      // Vérifier que le prestataire existe
      const provider = await db.user.findFirst({
        where: { id: providerId, isProvider: true },
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prestataire non trouvé',
        });
      }

      // Convertir les chaînes de date et heure en objets Date
      const startDateTime = parseDateTime(date, startTime);
      const endDateTime = addMinutes(startDateTime, service.duration);

      // Vérifier que le créneau est disponible
      const overlappingBooking = await db.serviceBooking.findFirst({
        where: {
          providerId,
          OR: [
            {
              startTime: { lte: startDateTime },
              endTime: { gt: startDateTime },
            },
            {
              startTime: { lt: endDateTime },
              endTime: { gte: endDateTime },
            },
            {
              startTime: { gte: startDateTime },
              endTime: { lte: endDateTime },
            },
          ],
          status: {
            in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'],
          },
        },
      });

      if (overlappingBooking) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce créneau est déjà réservé',
        });
      }

      // Créer le paiement (simulation)
      const payment = await db.payment.create({
        data: {
          amount: service.price,
          status: 'PENDING',
        },
      });

      // Créer la réservation
      return await db.serviceBooking.create({
        data: {
          clientId,
          providerId,
          serviceId,
          startTime: startDateTime,
          endTime: endDateTime,
          totalPrice: service.price,
          paymentId: payment.id,
          notes,
        },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          payment: true,
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création de la réservation',
        cause: error,
      });
    }
  },

  async updateBookingStatus(userId: string, data: UpdateBookingInput) {
    const { id, status } = data;

    try {
      // Récupérer la réservation
      const booking = await db.serviceBooking.findUnique({
        where: { id },
        include: {
          service: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Réservation non trouvée',
        });
      }

      // Vérifier que l'utilisateur a le droit de modifier cette réservation
      const isProvider = booking.providerId === userId;
      const isClient = booking.clientId === userId;

      if (!isProvider && !isClient) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à modifier cette réservation",
        });
      }

      // Si c'est le client qui annule, il peut uniquement annuler
      if (isClient && status && status !== 'CANCELLED') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'En tant que client, vous pouvez uniquement annuler une réservation',
        });
      }

      // Mettre à jour la réservation
      return await db.serviceBooking.update({
        where: { id },
        data: { status },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour de la réservation',
        cause: error,
      });
    }
  },

  async rescheduleBooking(userId: string, data: UpdateBookingInput) {
    const { id, date, startTime } = data;

    if (!date || !startTime) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "La date et l'heure sont requises pour reprogrammer une réservation",
      });
    }

    try {
      // Récupérer la réservation
      const booking = await db.serviceBooking.findUnique({
        where: { id },
        include: {
          service: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Réservation non trouvée',
        });
      }

      // Vérifier que l'utilisateur a le droit de modifier cette réservation
      const isClient = booking.clientId === userId;

      if (!isClient) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seul le client peut reprogrammer une réservation',
        });
      }

      // Convertir les chaînes de date et heure en objets Date
      const startDateTime = parseDateTime(date, startTime);
      const endDateTime = addMinutes(startDateTime, booking.service.duration);

      // Vérifier que le nouveau créneau est disponible
      const overlappingBooking = await db.serviceBooking.findFirst({
        where: {
          providerId: booking.providerId,
          id: { not: id }, // Exclure la réservation en cours
          OR: [
            {
              startTime: { lte: startDateTime },
              endTime: { gt: startDateTime },
            },
            {
              startTime: { lt: endDateTime },
              endTime: { gte: endDateTime },
            },
            {
              startTime: { gte: startDateTime },
              endTime: { lte: endDateTime },
            },
          ],
          status: {
            in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'],
          },
        },
      });

      if (overlappingBooking) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce créneau est déjà réservé',
        });
      }

      // Mettre à jour la réservation
      return await db.serviceBooking.update({
        where: { id },
        data: {
          startTime: startDateTime,
          endTime: endDateTime,
          status: 'RESCHEDULED',
        },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la reprogrammation de la réservation',
        cause: error,
      });
    }
  },

  async getBookingById(userId: string, bookingId: string) {
    try {
      const booking = await db.serviceBooking.findUnique({
        where: { id: bookingId },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              providerBio: true,
              providerAddress: true,
              providerCity: true,
              providerZipCode: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              address: true,
              city: true,
              zipCode: true,
            },
          },
          payment: true,
          review: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Réservation non trouvée',
        });
      }

      // Vérifier que l'utilisateur a le droit de voir cette réservation
      const isProvider = booking.providerId === userId;
      const isClient = booking.clientId === userId;

      if (!isProvider && !isClient) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à voir cette réservation",
        });
      }

      return booking;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération de la réservation',
        cause: error,
      });
    }
  },

  async getClientBookings(clientId: string, status?: string) {
    try {
      const where: Prisma.ServiceBookingWhereInput = { clientId };

      if (status) {
        where.status = status as any;
      }

      return await db.serviceBooking.findMany({
        where,
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          review: true,
        },
        orderBy: { startTime: 'desc' },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des réservations client',
        cause: error,
      });
    }
  },

  async getProviderBookings(providerId: string, status?: string) {
    try {
      const where: Prisma.ServiceBookingWhereInput = { providerId };

      if (status) {
        where.status = status as any;
      }

      return await db.serviceBooking.findMany({
        where,
        include: {
          service: true,
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des réservations prestataire',
        cause: error,
      });
    }
  },

  // Gestion des évaluations
  async createReview(
    clientId: string,
    data: { bookingId: string; rating: number; comment?: string }
  ) {
    const { bookingId, rating, comment } = data;

    try {
      // Vérifier que la réservation existe et qu'elle appartient au client
      const booking = await db.serviceBooking.findFirst({
        where: {
          id: bookingId,
          clientId,
          status: 'COMPLETED',
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Réservation non trouvée ou vous n'êtes pas autorisé à l'évaluer",
        });
      }

      // Vérifier qu'il n'y a pas déjà une évaluation pour cette réservation
      const existingReview = await db.serviceReview.findUnique({
        where: { bookingId },
      });

      if (existingReview) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Une évaluation existe déjà pour cette réservation',
        });
      }

      // Créer l'évaluation
      return await db.serviceReview.create({
        data: {
          bookingId,
          rating,
          comment,
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la création de l'évaluation",
        cause: error,
      });
    }
  },

  async getServiceReviews(serviceId: string) {
    try {
      // Récupérer toutes les réservations complétées pour ce service
      const bookings = await db.serviceBooking.findMany({
        where: {
          serviceId,
          status: 'COMPLETED',
          review: { isNot: null },
        },
        include: {
          review: true,
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Extraire les évaluations
      return bookings
        .map(booking => ({
          id: booking.review?.id,
          rating: booking.review?.rating || 0,
          comment: booking.review?.comment,
          createdAt: booking.review?.createdAt,
          client: booking.client,
          bookingId: booking.id,
        }))
        .filter(review => review.id);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des évaluations',
        cause: error,
      });
    }
  },

  async getProviderReviews(providerId: string) {
    try {
      // Récupérer toutes les réservations complétées pour ce prestataire
      const bookings = await db.serviceBooking.findMany({
        where: {
          providerId,
          status: 'COMPLETED',
          review: { isNot: null },
        },
        include: {
          review: true,
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Extraire les évaluations
      return bookings
        .map(booking => ({
          id: booking.review?.id,
          rating: booking.review?.rating || 0,
          comment: booking.review?.comment,
          createdAt: booking.review?.createdAt,
          client: booking.client,
          service: booking.service,
          bookingId: booking.id,
        }))
        .filter(review => review.id);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des évaluations',
        cause: error,
      });
    }
  },

  // ===== SYSTÈME DE RATINGS ÉTENDU =====

  // Créer une évaluation détaillée
  async createDetailedReview(
    clientId: string,
    data: {
      bookingId: string;
      rating: number;
      comment?: string;
      pros?: string[];
      cons?: string[];
      wouldRecommend?: boolean;
      punctuality?: number;
      quality?: number;
      communication?: number;
      valueForMoney?: number;
    }
  ) {
    const {
      bookingId,
      rating,
      comment,
      pros,
      cons,
      wouldRecommend,
      punctuality,
      quality,
      communication,
      valueForMoney,
    } = data;

    try {
      // Vérifier que la réservation existe et qu'elle appartient au client
      const booking = await db.serviceBooking.findFirst({
        where: {
          id: bookingId,
          clientId,
          status: 'COMPLETED',
        },
        include: {
          service: { include: { provider: true } },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Réservation non trouvée ou vous n'êtes pas autorisé à l'évaluer",
        });
      }

      // Vérifier qu'il n'y a pas déjà une évaluation pour cette réservation
      const existingReview = await db.serviceReview.findUnique({
        where: { bookingId },
      });

      if (existingReview) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Une évaluation existe déjà pour cette réservation',
        });
      }

      // Créer l'évaluation détaillée
      const review = await db.serviceReview.create({
        data: {
          bookingId,
          rating,
          comment,
          pros: pros || [],
          cons: cons || [],
          wouldRecommend,
          punctuality,
          quality,
          communication,
          valueForMoney,
        },
      });

      // Mettre à jour les statistiques du prestataire
      await this.updateProviderRatingStats(booking.service.provider.id);

      return review;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la création de l'évaluation détaillée",
        cause: error,
      });
    }
  },

  // Calculer les statistiques de ratings d'un prestataire
  async getProviderRatingStats(providerId: string) {
    try {
      const result = await db.serviceReview.aggregate({
        where: {
          booking: { providerId },
        },
        _avg: {
          rating: true,
          punctuality: true,
          quality: true,
          communication: true,
          valueForMoney: true,
        },
        _count: {
          rating: true,
        },
      });

      // Calculer la distribution des notes
      const ratingDistribution = await db.serviceReview.groupBy({
        by: ['rating'],
        where: {
          booking: { providerId },
        },
        _count: {
          rating: true,
        },
        orderBy: {
          rating: 'desc',
        },
      });

      // Calculer le pourcentage de recommandations
      const recommendationStats = await db.serviceReview.aggregate({
        where: {
          booking: { providerId },
          wouldRecommend: { not: null },
        },
        _count: {
          wouldRecommend: true,
        },
      });

      const wouldRecommendCount = await db.serviceReview.count({
        where: {
          booking: { providerId },
          wouldRecommend: true,
        },
      });

      const recommendationRate =
        recommendationStats._count.wouldRecommend > 0
          ? (wouldRecommendCount / recommendationStats._count.wouldRecommend) * 100
          : 0;

      // Récupérer les commentaires récents
      const recentReviews = await db.serviceReview.findMany({
        where: {
          booking: { providerId },
          comment: { not: null },
        },
        include: {
          booking: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      return {
        averageRating: Number(result._avg.rating?.toFixed(1) || 0),
        totalReviews: result._count.rating,
        detailedAverages: {
          punctuality: Number(result._avg.punctuality?.toFixed(1) || 0),
          quality: Number(result._avg.quality?.toFixed(1) || 0),
          communication: Number(result._avg.communication?.toFixed(1) || 0),
          valueForMoney: Number(result._avg.valueForMoney?.toFixed(1) || 0),
        },
        ratingDistribution: ratingDistribution.map(item => ({
          rating: item.rating,
          count: item._count.rating,
          percentage:
            result._count.rating > 0
              ? Number(((item._count.rating / result._count.rating) * 100).toFixed(1))
              : 0,
        })),
        recommendationRate: Number(recommendationRate.toFixed(1)),
        recentReviews: recentReviews.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          pros: review.pros,
          cons: review.cons,
          wouldRecommend: review.wouldRecommend,
          punctuality: review.punctuality,
          quality: review.quality,
          communication: review.communication,
          valueForMoney: review.valueForMoney,
          createdAt: review.createdAt,
          client: review.booking.client,
          service: review.booking.service,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors du calcul des statistiques de ratings',
        cause: error,
      });
    }
  },

  // Calculer les badges de qualité d'un prestataire
  async calculateProviderBadges(providerId: string) {
    try {
      const stats = await this.getProviderRatingStats(providerId);
      const providerStats = await this.getProviderStats(providerId);

      const badges = [];

      // Badge Excellence (note moyenne >= 4.5)
      if (stats.averageRating >= 4.5 && stats.totalReviews >= 10) {
        badges.push({
          id: 'excellence',
          name: 'Excellence',
          description: 'Note moyenne de 4.5/5 ou plus avec au moins 10 avis',
          icon: '⭐',
          color: 'gold',
          level: 'premium',
        });
      }

      // Badge Qualité (note moyenne >= 4.0)
      if (stats.averageRating >= 4.0 && stats.totalReviews >= 5) {
        badges.push({
          id: 'quality',
          name: 'Qualité',
          description: 'Note moyenne de 4.0/5 ou plus',
          icon: '✨',
          color: 'blue',
          level: 'standard',
        });
      }

      // Badge Ponctualité (ponctualité >= 4.5)
      if (stats.detailedAverages.punctuality >= 4.5 && stats.totalReviews >= 5) {
        badges.push({
          id: 'punctual',
          name: 'Ponctuel',
          description: 'Excellente ponctualité',
          icon: '⏰',
          color: 'green',
          level: 'standard',
        });
      }

      // Badge Communication (communication >= 4.5)
      if (stats.detailedAverages.communication >= 4.5 && stats.totalReviews >= 5) {
        badges.push({
          id: 'communicator',
          name: 'Bon Communicant',
          description: 'Excellente communication',
          icon: '💬',
          color: 'purple',
          level: 'standard',
        });
      }

      // Badge Recommandé (taux de recommandation >= 90%)
      if (stats.recommendationRate >= 90 && stats.totalReviews >= 10) {
        badges.push({
          id: 'recommended',
          name: 'Très Recommandé',
          description: '90% des clients recommandent ce prestataire',
          icon: '👍',
          color: 'orange',
          level: 'premium',
        });
      }

      // Badge Expérience (plus de 100 réservations terminées)
      if (providerStats.bookings.completed >= 100) {
        badges.push({
          id: 'experienced',
          name: 'Expérimenté',
          description: 'Plus de 100 prestations réalisées',
          icon: '🎖️',
          color: 'bronze',
          level: 'standard',
        });
      }

      // Badge Fiabilité (taux d'annulation < 5%)
      const cancellationRate =
        providerStats.bookings.total > 0
          ? (providerStats.bookings.cancelled / providerStats.bookings.total) * 100
          : 0;

      if (cancellationRate < 5 && providerStats.bookings.total >= 20) {
        badges.push({
          id: 'reliable',
          name: 'Fiable',
          description: "Taux d'annulation très faible",
          icon: '🛡️',
          color: 'teal',
          level: 'standard',
        });
      }

      return {
        badges,
        totalBadges: badges.length,
        premiumBadges: badges.filter(b => b.level === 'premium').length,
        stats: {
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
          recommendationRate: stats.recommendationRate,
          cancellationRate: Number(cancellationRate.toFixed(1)),
          totalBookings: providerStats.bookings.total,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors du calcul des badges',
        cause: error,
      });
    }
  },

  // Mettre à jour les statistiques de rating d'un prestataire (cache)
  async updateProviderRatingStats(providerId: string) {
    try {
      const stats = await this.getProviderRatingStats(providerId);

      // Mettre à jour le profil prestataire avec les nouvelles statistiques
      await db.user.update({
        where: { id: providerId },
        data: {
          provider: {
            update: {
              rating: stats.averageRating,
              totalReviews: stats.totalReviews,
              // Ajouter d'autres champs si nécessaire
            },
          },
        },
      });

      return stats;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des stats de rating:', error);
      // Ne pas faire échouer l'opération principale
    }
  },

  // Obtenir les top prestataires par rating
  async getTopRatedProviders(limit: number = 10, categoryId?: string) {
    try {
      const whereClause: any = {
        isProvider: true,
        provider: {
          providerVerified: true,
          rating: { gt: 0 },
          totalReviews: { gte: 5 },
        },
      };

      if (categoryId) {
        whereClause.provider.services = {
          some: {
            categoryId,
            isActive: true,
          },
        };
      }

      const providers = await db.user.findMany({
        where: whereClause,
        include: {
          provider: {
            include: {
              services: {
                where: { isActive: true },
                include: { category: true },
                take: 3,
              },
            },
          },
        },
        orderBy: [{ provider: { rating: 'desc' } }, { provider: { totalReviews: 'desc' } }],
        take: limit,
      });

      return providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        image: provider.image,
        rating: provider.provider?.rating || 0,
        totalReviews: provider.provider?.totalReviews || 0,
        bio: provider.provider?.providerBio,
        city: provider.provider?.providerCity,
        verified: provider.provider?.providerVerified,
        services: provider.provider?.services || [],
      }));
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des top prestataires',
        cause: error,
      });
    }
  },

  // ===== NOUVELLES MÉTHODES ÉTENDUES =====

  // Statistiques du prestataire
  async getProviderStats(providerId: string) {
    try {
      // Compter les réservations par statut
      const [
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
      ] = await Promise.all([
        db.serviceBooking.count({ where: { providerId } }),
        db.serviceBooking.count({ where: { providerId, status: 'PENDING' } }),
        db.serviceBooking.count({ where: { providerId, status: 'CONFIRMED' } }),
        db.serviceBooking.count({ where: { providerId, status: 'COMPLETED' } }),
        db.serviceBooking.count({ where: { providerId, status: 'CANCELLED' } }),
      ]);

      // Calculer les revenus
      const revenueResult = await db.serviceBooking.aggregate({
        where: {
          providerId,
          status: { in: ['COMPLETED', 'CONFIRMED'] },
        },
        _sum: { totalPrice: true },
      });

      const totalRevenue = revenueResult._sum.totalPrice || 0;

      // Calculer la note moyenne
      const reviewsResult = await db.serviceReview.aggregate({
        where: {
          booking: { providerId },
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const averageRating = reviewsResult._avg.rating || 0;
      const totalReviews = reviewsResult._count.rating || 0;

      // Revenus par mois (6 derniers mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRevenue = await db.serviceBooking.groupBy({
        by: ['createdAt'],
        where: {
          providerId,
          status: { in: ['COMPLETED', 'CONFIRMED'] },
          createdAt: { gte: sixMonthsAgo },
        },
        _sum: { totalPrice: true },
      });

      // Services les plus demandés
      const popularServices = await db.serviceBooking.groupBy({
        by: ['serviceId'],
        where: {
          providerId,
          status: { in: ['COMPLETED', 'CONFIRMED'] },
        },
        _count: { serviceId: true },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      });

      const popularServicesWithDetails = await Promise.all(
        popularServices.map(async service => {
          const serviceDetails = await db.service.findUnique({
            where: { id: service.serviceId },
            select: { id: true, name: true, price: true },
          });
          return {
            service: serviceDetails,
            bookingCount: service._count.serviceId,
          };
        })
      );

      return {
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        revenue: {
          total: Number(totalRevenue),
          monthly: monthlyRevenue.map(item => ({
            month: item.createdAt,
            amount: Number(item._sum.totalPrice || 0),
          })),
        },
        ratings: {
          average: Number(averageRating.toFixed(1)),
          total: totalReviews,
        },
        popularServices: popularServicesWithDetails,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques',
        cause: error,
      });
    }
  },

  // Recherche de prestataires pour les clients
  async searchProviders(params: {
    query?: string;
    categoryId?: string;
    city?: string;
    maxDistance?: number;
    location?: { lat: number; lng: number };
    page?: number;
    limit?: number;
  }) {
    const { query, categoryId, city, maxDistance, location, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    try {
      // Construction des filtres
      const where: Prisma.UserWhereInput = {
        isProvider: true,
        provider: {
          isVerified: true,
          services: {
            some: {
              isActive: true,
              ...(categoryId && { categoryId }),
            },
          },
        },
      };

      // Filtres de recherche textuelle
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          {
            provider: {
              providerBio: { contains: query, mode: 'insensitive' },
            },
          },
          {
            provider: {
              services: {
                some: {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ];
      }

      // Filtre par ville
      if (city) {
        where.provider = {
          ...where.provider,
          providerCity: { contains: city, mode: 'insensitive' },
        };
      }

      // Récupérer les prestataires
      let providers = await db.user.findMany({
        where,
        include: {
          provider: {
            include: {
              services: {
                where: { isActive: true },
                include: { category: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // Filtrer par distance si nécessaire
      if (location && maxDistance) {
        const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const R = 6371; // Rayon de la Terre en km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLng = ((lng2 - lng1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        providers = providers.filter(provider => {
          if (!provider.provider?.providerLocationLat || !provider.provider?.providerLocationLng) {
            return false;
          }

          const distance = calculateDistance(
            location.lat,
            location.lng,
            provider.provider.providerLocationLat,
            provider.provider.providerLocationLng
          );

          return distance <= maxDistance;
        });
      }

      // Compter le total pour la pagination
      const totalCount = await db.user.count({ where });

      return {
        providers: providers.map(provider => ({
          id: provider.id,
          name: provider.name,
          image: provider.image,
          bio: provider.provider?.providerBio,
          city: provider.provider?.providerCity,
          verified: provider.provider?.providerVerified,
          rating: provider.provider?.rating,
          services: provider.provider?.services || [],
        })),
        pagination: {
          total: totalCount,
          pageCount: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la recherche de prestataires',
        cause: error,
      });
    }
  },

  // Profil public du prestataire
  async getProviderPublicProfile(providerId: string) {
    try {
      const provider = await db.user.findFirst({
        where: {
          id: providerId,
          isProvider: true,
        },
        include: {
          provider: {
            include: {
              services: {
                where: { isActive: true },
                include: { category: true },
              },
            },
          },
        },
      });

      if (!provider || !provider.provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prestataire non trouvé',
        });
      }

      // Calculer les statistiques publiques
      const [totalCompletedBookings, averageRatingResult] = await Promise.all([
        db.serviceBooking.count({
          where: { providerId, status: 'COMPLETED' },
        }),
        db.serviceReview.aggregate({
          where: { booking: { providerId } },
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);

      return {
        id: provider.id,
        name: provider.name,
        image: provider.image,
        bio: provider.provider.providerBio,
        address: provider.provider.providerAddress,
        city: provider.provider.providerCity,
        zipCode: provider.provider.providerZipCode,
        verified: provider.provider.providerVerified,
        rating: Number(averageRatingResult._avg.rating?.toFixed(1) || 0),
        totalReviews: averageRatingResult._count.rating,
        totalCompletedBookings,
        services: provider.provider.services,
        memberSince: provider.createdAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération du profil',
        cause: error,
      });
    }
  },

  // Services publics d'un prestataire
  async getProviderPublicServices(providerId: string) {
    try {
      const services = await db.service.findMany({
        where: {
          providerId,
          isActive: true,
        },
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              providerVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Ajouter les statistiques pour chaque service
      const servicesWithStats = await Promise.all(
        services.map(async service => {
          const [bookingCount, reviewStats] = await Promise.all([
            db.serviceBooking.count({
              where: { serviceId: service.id, status: 'COMPLETED' },
            }),
            db.serviceReview.aggregate({
              where: { booking: { serviceId: service.id } },
              _avg: { rating: true },
              _count: { rating: true },
            }),
          ]);

          return {
            ...service,
            stats: {
              totalBookings: bookingCount,
              averageRating: Number(reviewStats._avg.rating?.toFixed(1) || 0),
              totalReviews: reviewStats._count.rating,
            },
          };
        })
      );

      return servicesWithStats;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des services',
        cause: error,
      });
    }
  },
};
