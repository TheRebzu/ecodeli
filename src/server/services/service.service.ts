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
};
