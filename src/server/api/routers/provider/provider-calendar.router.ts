import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { DayOfWeek, AvailabilityType, BookingStatus } from "@prisma/client";

/**
 * Router pour la gestion du calendrier et des disponibilités des prestataires
 * Planification avancée, créneaux récurrents, gestion des absences selon le cahier des charges
 */

// Schémas de validation
const createAvailabilitySchema = z.object({ type: z.nativeEnum(AvailabilityType),

  // Disponibilité récurrente
  dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),

  // Disponibilité ponctuelle ou exception
  specificDate: z.date().optional(),
  endDate: z.date().optional(),

  // Configuration
  slotDuration: z.number().int().min(15).max(480).default(60), // minutes
  bufferTime: z.number().int().min(0).max(60).default(15), // minutes entre créneaux
  maxBookingsPerSlot: z.number().int().min(1).max(10).default(1),

  // Contraintes
  minimumNotice: z.number().int().min(0).max(168).default(24), // heures
  maximumAdvance: z.number().int().min(1).max(365).default(60), // jours

  // Services concernés
  serviceIds: z.array(z.string().cuid()).optional(), // Si vide, pour tous les services

  // Tarification spéciale
  priceMultiplier: z.number().min(0.5).max(3).default(1), // 0.5 = -50%, 2 = +100%

  // Métadonnées
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  isRecurring: z.boolean().default(true),

  // Paramètres avancés
  allowOverlapping: z.boolean().default(false),
  autoConfirm: z.boolean().default(false),
  sendReminders: z.boolean().default(true) });

const updateAvailabilitySchema = createAvailabilitySchema.partial().extend({ id: z.string().cuid() });

const createExceptionSchema = z.object({ date: z.date(),
  type: z.enum(["UNAVAILABLE", "SPECIAL_HOURS", "HOLIDAY"]),
  reason: z.string().min(2).max(100),

  // Pour les horaires spéciaux
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),

  // Configuration
  affectsAllServices: z.boolean().default(true),
  serviceIds: z.array(z.string().cuid()).optional(),

  // Notifications
  notifyClients: z.boolean().default(true),
  notificationMessage: z.string().max(500).optional() });

const calendarFiltersSchema = z.object({ startDate: z.date(),
  endDate: z.date(),
  serviceId: z.string().cuid().optional(),
  includeBookings: z.boolean().default(true),
  includeAvailabilities: z.boolean().default(true),
  includeExceptions: z.boolean().default(true),
  view: z.enum(["day", "week", "month"]).default("week") });

const timeSlotsSchema = z.object({ date: z.date(),
  serviceId: z.string().cuid(),
  duration: z.number().int().min(15).max(480).optional(), // Si différent de la durée standard
 });

const bulkAvailabilitySchema = z.object({ pattern: z.object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    slotDuration: z.number().int().min(15).max(480).default(60) }),
  dateRange: z.object({ startDate: z.date(),
    endDate: z.date() }),
  exceptions: z.array(z.date()).optional(), // Dates à exclure
  serviceIds: z.array(z.string().cuid()).optional()});

export const providerCalendarRouter = router({ /**
   * Obtenir le calendrier complet du prestataire
   */
  getCalendar: protectedProcedure
    .input(calendarFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent consulter leur calendrier" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        const promises: Promise<any>[] = [];

        // Disponibilités récurrentes et ponctuelles
        if (input.includeAvailabilities) {
          promises.push(
            ctx.db.providerAvailability.findMany({
              where: {
                providerId: provider.id,
                isActive: true,
                OR: [
                  { type: "RECURRING" },
                  {
                    type: "ONE_TIME",
                    specificDate: {
                      gte: input.startDate,
                      lte: input.endDate}}],
                ...(input.serviceId && {
                  OR: [
                    { serviceIds: { has: input.serviceId } },
                    { serviceIds: { isEmpty } }, // Disponible pour tous les services
                  ]})},
              include: {
                services: {
                  select: {
                    id: true,
                    name: true,
                    duration: true}}}}),
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        // Réservations existantes
        if (input.includeBookings) {
          promises.push(
            ctx.db.serviceBooking.findMany({
              where: {
                providerId: provider.id,
                scheduledAt: {
                  gte: input.startDate,
                  lte: input.endDate},
                status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
                ...(input.serviceId && { serviceId: input.serviceId })},
              include: {
                service: {
                  select: {
                    name: true,
                    duration: true,
                    category: true}},
                client: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                        phoneNumber: true}}}}},
              orderBy: { scheduledAt: "asc" }}),
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        // Exceptions et absences
        if (input.includeExceptions) {
          promises.push(
            ctx.db.providerException.findMany({
              where: {
                providerId: provider.id,
                date: {
                  gte: input.startDate,
                  lte: input.endDate},
                ...(input.serviceId && {
                  OR: [
                    { affectsAllServices },
                    { serviceIds: { has: input.serviceId } }]})}}),
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        const [availabilities, bookings, exceptions] =
          await Promise.all(promises);

        // Générer les créneaux disponibles pour la période
        const availableSlots = await generateAvailableSlots(
          ctx.db,
          provider.id,
          input.startDate,
          input.endDate,
          availabilities,
          bookings,
          exceptions,
          input.serviceId,
        );

        return {
          success: true,
          data: {
            period: {
              startDate: input.startDate,
              endDate: input.endDate,
              view: input.view},
            availabilities: availabilities.map(formatAvailability),
            bookings: bookings.map(formatBooking),
            exceptions: exceptions.map(formatException),
            availableSlots,
            summary: {
              totalAvailableHours: calculateTotalAvailableHours(availableSlots),
              bookedHours: calculateBookedHours(bookings),
              freeSlots: availableSlots.length,
              upcomingBookings: bookings.filter(
                (b) => new Date(b.scheduledAt) > new Date(),
              ).length}}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du calendrier" });
      }
    }),

  /**
   * Créer une nouvelle disponibilité
   */
  createAvailability: protectedProcedure
    .input(createAvailabilitySchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent créer des disponibilités" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        // Validation des horaires
        if (input.startTime >= input.endTime) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "L'heure de fin doit être postérieure à l'heure de début" });
        }

        // Validation des dates pour les disponibilités ponctuelles
        if (input.type === "ONE_TIME" && !input.specificDate) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "Une date spécifique est requise pour les disponibilités ponctuelles" });
        }

        // Validation des services
        if (input.serviceIds && input.serviceIds.length > 0) {
          const serviceCount = await ctx.db.service.count({
            where: {
              id: { in: input.serviceIds },
              providerId: provider.id}});

          if (serviceCount !== input.serviceIds.length) {
            throw new TRPCError({ code: "BAD_REQUEST",
              message:
                "Certains services sélectionnés ne vous appartiennent pas" });
          }
        }

        // Vérifier les conflits avec les disponibilités existantes
        const conflicts = await checkAvailabilityConflicts(
          ctx.db,
          provider.id,
          input,
          null, // Pas d'ID à exclure pour une création
        );

        if (conflicts.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Conflit détecté avec ${conflicts.length} disponibilité(s) existante(s)`});
        }

        const availability = await ctx.db.providerAvailability.create({
          data: {
            ...input,
            providerId: provider.id,
            type: input.type || (input.dayOfWeek ? "RECURRING" : "ONE_TIME"),
            isActive: true},
          include: {
            services: {
              select: {
                id: true,
                name: true}}}});

        return {
          success: true,
          data: formatAvailability(availability),
          message: "Disponibilité créée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la disponibilité" });
      }
    }),

  /**
   * Mettre à jour une disponibilité
   */
  updateAvailability: protectedProcedure
    .input(updateAvailabilitySchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les prestataires peuvent modifier leurs disponibilités" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        const availability = await ctx.db.providerAvailability.findFirst({
          where: {
            id: input.id,
            providerId: provider.id}});

        if (!availability) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Disponibilité non trouvée" });
        }

        // Vérifier s'il y a des réservations affectées par cette modification
        if (
          input.startTime ||
          input.endTime ||
          input.dayOfWeek ||
          input.specificDate
        ) {
          const affectedBookings = await getAffectedBookings(
            ctx.db,
            availability,
            input,
          );

          if (affectedBookings.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${affectedBookings.length} réservation(s) seraient affectée(s) par cette modification`});
          }
        }

        const { id: id, ...updateData } = input;

        // Vérifier les conflits
        if (
          updateData.startTime ||
          updateData.endTime ||
          updateData.dayOfWeek ||
          updateData.specificDate
        ) {
          const conflicts = await checkAvailabilityConflicts(
            ctx.db,
            provider.id,
            updateData,
            input.id,
          );

          if (conflicts.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Conflit détecté avec ${conflicts.length} disponibilité(s) existante(s)`});
          }
        }

        const updatedAvailability = await ctx.db.providerAvailability.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date()},
          include: {
            services: {
              select: {
                id: true,
                name: true}}}});

        return {
          success: true,
          data: formatAvailability(updatedAvailability),
          message: "Disponibilité mise à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour" });
      }
    }),

  /**
   * Supprimer une disponibilité
   */
  deleteAvailability: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les prestataires peuvent supprimer leurs disponibilités" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        const availability = await ctx.db.providerAvailability.findFirst({
          where: {
            id: input.id,
            providerId: provider.id}});

        if (!availability) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Disponibilité non trouvée" });
        }

        // Vérifier s'il y a des réservations futures liées
        const futureBookings = await ctx.db.serviceBooking.count({
          where: {
            providerId: provider.id,
            scheduledAt: { gte: new Date() },
            status: { in: ["PENDING", "CONFIRMED"] },
            // TODO: Ajouter la logique pour vérifier si la réservation est dans cette disponibilité
          }});

        if (futureBookings > 0) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "Impossible de supprimer une disponibilité avec des réservations futures" });
        }

        await ctx.db.providerAvailability.delete({
          where: { id: input.id }});

        return {
          success: true,
          message: "Disponibilité supprimée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression" });
      }
    }),

  /**
   * Créer une exception (absence, horaires spéciaux)
   */
  createException: protectedProcedure
    .input(createExceptionSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent créer des exceptions" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        // Vérifier qu'il n'y a pas d'jà une exception pour cette date
        const existingException = await ctx.db.providerException.findFirst({
          where: {
            providerId: provider.id,
            date: input.date}});

        if (existingException) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Une exception existe déjà pour cette date" });
        }

        // Vérifier les réservations existantes pour cette date
        const affectedBookings = await ctx.db.serviceBooking.findMany({
          where: {
            providerId: provider.id,
            scheduledAt: {
              gte: new Date(input.date.toDateString()),
              lt: new Date(input.date.getTime() + 24 * 60 * 60 * 1000)},
            status: { in: ["PENDING", "CONFIRMED"] }},
          include: {
            client: {
              include: {
                user: {
                  select: { name: true, email: true }}}}}});

        const exception = await ctx.db.providerException.create({
          data: {
            ...input,
            providerId: provider.id}});

        // Notifier les clients si demandé et si il y a des réservations affectées
        if (input.notifyClients && affectedBookings.length > 0) {
          await notifyClientsOfException(affectedBookings, input.notificationMessage, ctx.db);
        }

        return {
          success: true,
          data: formatException(exception),
          message: `Exception créée. ${affectedBookings.length} réservation(s) potentiellement affectée(s)`,
          affectedBookings: affectedBookings.length};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'exception" });
      }
    }),

  /**
   * Obtenir les créneaux disponibles pour un service et une date
   */
  getAvailableSlots: protectedProcedure
    .input(timeSlotsSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent consulter leurs créneaux" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        // Récupérer le service
        const service = await ctx.db.service.findFirst({
          where: {
            id: input.serviceId,
            providerId: provider.id}});

        if (!service) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Service non trouvé" });
        }

        const duration = input.duration || service.duration;
        const endDate = new Date(input.date.getTime() + 24 * 60 * 60 * 1000);

        // Récupérer les disponibilités, réservations et exceptions
        const [availabilities, bookings, exceptions] = await Promise.all([
          ctx.db.providerAvailability.findMany({
            where: {
              providerId: provider.id,
              isActive: true,
              OR: [
                { type: "RECURRING", dayOfWeek: input.date.getDay() },
                { type: "ONE_TIME", specificDate: input.date }],
              OR: [
                { serviceIds: { has: input.serviceId } },
                { serviceIds: { isEmpty } }]}}),
          ctx.db.serviceBooking.findMany({
            where: {
              providerId: provider.id,
              scheduledAt: {
                gte: input.date,
                lt: endDate},
              status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] }}}),
          ctx.db.providerException.findMany({
            where: {
              providerId: provider.id,
              date: input.date,
              OR: [
                { affectsAllServices },
                { serviceIds: { has: input.serviceId } }]}})]);

        const slots = await generateAvailableSlots(
          ctx.db,
          provider.id,
          input.date,
          endDate,
          availabilities,
          bookings,
          exceptions,
          input.serviceId,
          duration,
        );

        return {
          success: true,
          data: {
            date: input.date,
            serviceId: input.serviceId,
            serviceName: service.name,
            duration,
            slots: slots.map((slot) => ({ startTime: slot.startTime,
              endTime: slot.endTime,
              isAvailable: slot.isAvailable,
              price: slot.basePrice,
              priceMultiplier: slot.priceMultiplier,
              maxBookings: slot.maxBookings,
              currentBookings: slot.currentBookings }))}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des créneaux" });
      }
    }),

  /**
   * Créer plusieurs disponibilités en lot
   */
  createBulkAvailability: protectedProcedure
    .input(bulkAvailabilitySchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent créer des disponibilités" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        // Générer les dates pour la période
        const dates = generateDateRange(
          input.dateRange.startDate,
          input.dateRange.endDate,
          input.pattern.dayOfWeek,
          input.exceptions || [],
        );

        if (dates.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Aucune date valide trouvée pour cette période" });
        }

        if (dates.length > 100) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Limite de 100 créneaux par opération" });
        }

        // Créer les disponibilités
        const availabilities = await ctx.db.$transaction(
          dates.map((date) =>
            ctx.db.providerAvailability.create({
              data: {
                providerId: provider.id,
                type: "ONE_TIME",
                specificDate: date,
                startTime: input.pattern.startTime,
                endTime: input.pattern.endTime,
                slotDuration: input.pattern.slotDuration,
                serviceIds: input.serviceIds || [],
                isActive: true}}),
          ),
        );

        return {
          success: true,
          data: {
            createdCount: availabilities.length,
            dates: dates,
            pattern: input.pattern},
          message: `${availabilities.length} disponibilités créées avec succès`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création en lot" });
      }
    }),

  /**
   * Obtenir les statistiques du calendrier
   */
  getCalendarStats: protectedProcedure
    .input(
      z.object({ period: z.enum(["WEEK", "MONTH", "QUARTER"]).default("MONTH") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les prestataires peuvent consulter leurs statistiques" });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id }});

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        const { startDate: startDate, endDate: endDate } =
          calculatePeriodDates(input.period);

        const [
          totalAvailabilities,
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          totalRevenue,
          exceptions] = await Promise.all([
          ctx.db.providerAvailability.count({
            where: {
              providerId: provider.id,
              isActive: true}}),
          ctx.db.serviceBooking.count({
            where: {
              providerId: provider.id,
              scheduledAt: { gte: startDate, lte: endDate }}}),
          ctx.db.serviceBooking.count({
            where: {
              providerId: provider.id,
              scheduledAt: { gte: startDate, lte: endDate },
              status: "CONFIRMED"}}),
          ctx.db.serviceBooking.count({
            where: {
              providerId: provider.id,
              scheduledAt: { gte: startDate, lte: endDate },
              status: "CANCELLED"}}),
          ctx.db.serviceBooking.aggregate({
            where: {
              providerId: provider.id,
              scheduledAt: { gte: startDate, lte: endDate },
              status: "COMPLETED"},
            sum: { totalPrice }}),
          ctx.db.providerException.count({
            where: {
              providerId: provider.id,
              date: { gte: startDate, lte: endDate }}})]);

        // Calculer le taux d'occupation
        const occupancyRate =
          totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

        // Calculer le taux d'annulation
        const cancellationRate =
          totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

        return {
          success: true,
          data: {
            period: {
              type: input.period,
              startDate,
              endDate},
            availability: {
              totalSlots: totalAvailabilities,
              activeExceptions: exceptions},
            bookings: {
              total: totalBookings,
              confirmed: confirmedBookings,
              cancelled: cancelledBookings,
              occupancyRate: Math.round(occupancyRate * 100) / 100,
              cancellationRate: Math.round(cancellationRate * 100) / 100},
            revenue: {
              total: totalRevenue.sum.totalPrice || 0,
              averagePerBooking:
                confirmedBookings > 0
                  ? (totalRevenue.sum.totalPrice || 0) / confirmedBookings
                  : 0}}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    })});

// Helper functions
async function generateAvailableSlots(
  db: any,
  providerId: string,
  startDate: Date,
  endDate: Date,
  availabilities: any[],
  bookings: any[],
  exceptions: any[],
  serviceId?: string,
  duration?: number,
): Promise<any[]> {
  const slots: any[] = [];
  const currentDate = new Date(startDate);

  // 1. Parcourir chaque jour de la période
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // 2. Appliquer les disponibilités récurrentes pour ce jour
    const dayAvailabilities = availabilities.filter(
      (avail) =>
        (avail.type === "RECURRING" && avail.dayOfWeek === dayOfWeek) ||
        (avail.type === "SPECIFIC" &&
          new Date(avail.specificDate).toDateString() ===
            currentDate.toDateString()),
    );

    for (const availability of dayAvailabilities) {
      // 3. Vérifier les exceptions pour ce jour
      const dayExceptions = exceptions.filter(
        (exception) =>
          new Date(exception.date).toDateString() ===
          currentDate.toDateString(),
      );

      // Si jour complètement bloqué
      const fullDayException = dayExceptions.find(
        (ex) => ex.type === "UNAVAILABLE" && !ex.startTime,
      );
      if (fullDayException) continue;

      // 4. Calculer les créneaux disponibles
      const startTime = new Date(currentDate);
      const [startHour, startMinute] = availability.startTime
        .split(":")
        .map(Number);
      startTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date(currentDate);
      const [endHour, endMinute] = availability.endTime.split(":").map(Number);
      endTime.setHours(endHour, endMinute, 0, 0);

      // 5. Découper en créneaux selon la durée du service
      const slotDuration = duration || availability.slotDuration || 60;
      const slotTime = new Date(startTime);

      while (
        slotTime.getTime() + slotDuration * 60 * 1000 <=
        endTime.getTime()
      ) {
        const slotEnd = new Date(slotTime.getTime() + slotDuration * 60 * 1000);

        // Vérifier conflits avec réservations existantes
        const hasConflict = bookings.some((booking) => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          return slotTime < bookingEnd && slotEnd > bookingStart;
        });

        // Respecter le préavis minimum
        const now = new Date();
        const minimumNoticeHours = availability.minimumNotice || 24;
        const minimumStartTime = new Date(
          now.getTime() + minimumNoticeHours * 60 * 60 * 1000,
        );

        if (!hasConflict && slotTime >= minimumStartTime) {
          slots.push({
            id: `${slotTime.getTime()}_${providerId}`,
            providerId,
            serviceId,
            startTime: new Date(slotTime),
            endTime: new Date(slotEnd),
            duration: slotDuration,
            isAvailable: true,
            location: availability.location || null,
            maxBookings: availability.maxBookingsPerSlot || 1,
            currentBookings: 0});
        }

        // Passer au créneau suivant (avec buffer time)
        const bufferTime = availability.bufferTime || 15;
        slotTime.setTime(
          slotTime.getTime() + (slotDuration + bufferTime) * 60 * 1000,
        );
      }
    }

    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

async function checkAvailabilityConflicts(
  db: any,
  providerId: string,
  availability: any,
  excludeId?: string,
): Promise<any[]> {
  try {
    const conflicts: any[] = [];

    // Construire les conditions de recherche
    const whereConditions: any = {
      providerId,
      isActive: true};

    if (excludeId) {
      whereConditions.id = { not };
    }

    // Rechercher les disponibilités existantes qui pourraient entrer en conflit
    if (availability.type === "RECURRING") {
      // Pour les disponibilités récurrentes, vérifier les chevauchements sur le même jour
      whereConditions.type = "RECURRING";
      whereConditions.dayOfWeek = availability.dayOfWeek;

      const existingAvailabilities = await db.providerAvailability.findMany({ where  });

      for (const existing of existingAvailabilities) {
        // Vérifier chevauchement horaire
        const newStart = availability.startTime;
        const newEnd = availability.endTime;
        const existingStart = existing.startTime;
        const existingEnd = existing.endTime;

        if (timeOverlaps(newStart, newEnd, existingStart, existingEnd)) {
          conflicts.push({
            type: "TIME_OVERLAP",
            conflictWith: existing,
            message: `Chevauchement horaire avec la disponibilité existante de ${existingStart} à ${existingEnd}`});
        }
      }
    } else if (availability.type === "SPECIFIC") {
      // Pour les disponibilités spécifiques, vérifier sur la date exacte
      const specificDate = new Date(availability.specificDate);
      const dayOfWeek = specificDate.getDay();

      // Vérifier avec les disponibilités récurrentes du même jour
      const recurringAvailabilities = await db.providerAvailability.findMany({
        where: {
          providerId,
          type: "RECURRING",
          dayOfWeek,
          isActive: true}});

      for (const recurring of recurringAvailabilities) {
        if (
          timeOverlaps(
            availability.startTime,
            availability.endTime,
            recurring.startTime,
            recurring.endTime,
          )
        ) {
          conflicts.push({
            type: "RECURRING_CONFLICT",
            conflictWith: recurring,
            message: `Conflit avec la disponibilité récurrente du ${getDayName(dayOfWeek)}`});
        }
      }

      // Vérifier avec d'autres disponibilités spécifiques du même jour
      const specificAvailabilities = await db.providerAvailability.findMany({
        where: {
          providerId,
          type: "SPECIFIC",
          specificDate: specificDate,
          isActive: true,
          ...(excludeId && { id: { not } })}});

      for (const specific of specificAvailabilities) {
        if (
          timeOverlaps(
            availability.startTime,
            availability.endTime,
            specific.startTime,
            specific.endTime,
          )
        ) {
          conflicts.push({ type: "SPECIFIC_CONFLICT",
            conflictWith: specific,
            message: `Conflit avec une autre disponibilité spécifique sur la même date` });
        }
      }
    }

    // Vérifier les conflits avec les réservations existantes
    const bookingConflicts = await checkBookingConflicts(
      db,
      providerId,
      availability,
    );
    conflicts.push(...bookingConflicts);

    return conflicts;
  } catch (error) {
    console.error("Error checking availability conflicts:", error);
    return [];
  }
}

async function getAffectedBookings(
  db: any,
  availability: any,
  updates: any,
): Promise<any[]> {
  try {
    const affectedBookings: any[] = [];

    // Déterminer la période d'impact
    let startDate: Date;
    let endDate: Date;

    if (availability.type === "RECURRING") {
      // Pour les disponibilités récurrentes, chercher sur les 6 prochains mois
      startDate = new Date();
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);
    } else if (availability.type === "SPECIFIC") {
      // Pour les disponibilités spécifiques, chercher sur la date exacte
      startDate = new Date(availability.specificDate);
      endDate = new Date(availability.specificDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      return [];
    }

    // Rechercher les réservations dans la période concernée
    const bookings = await db.serviceBooking.findMany({
      where: {
        providerId: availability.providerId,
        startTime: {
          gte: startDate,
          lt: endDate},
        status: {
          in: ["PENDING", "CONFIRMED"]}},
      include: {
        client: {
          select: {
            name: true,
            email: true,
            phone: true}},
        service: {
          select: {
            title: true,
            duration: true}}}});

    // Filtrer les réservations qui seraient affectées
    for (const booking of bookings) {
      const isAffected = false;
      const bookingDate = new Date(booking.startTime);

      if (availability.type === "RECURRING") {
        // Vérifier si la réservation tombe sur le jour de la semaine modifié
        const bookingDayOfWeek = bookingDate.getDay();
        if (bookingDayOfWeek === availability.dayOfWeek) {
          // Vérifier si l'horaire de la réservation est affecté par les changements
          if (
            updates.startTime ||
            updates.endTime ||
            updates.isActive === false
          ) {
            const bookingTime = bookingDate.toTimeString().substring(0, 5);
            const originalStart = availability.startTime;
            const originalEnd = availability.endTime;
            const newStart = updates.startTime || originalStart;
            const newEnd = updates.endTime || originalEnd;

            // Si la réservation sort des nouveaux créneaux ou si la disponibilité est désactivée
            if (
              updates.isActive === false ||
              bookingTime < newStart ||
              bookingTime >= newEnd
            ) {
              isAffected = true;
            }
          }
        }
      } else if (availability.type === "SPECIFIC") {
        // Vérifier si la réservation tombe sur la date spécifique
        const availabilityDate = new Date(availability.specificDate);
        if (bookingDate.toDateString() === availabilityDate.toDateString()) {
          // Vérifier l'impact des modifications
          if (
            updates.isActive === false ||
            updates.startTime ||
            updates.endTime
          ) {
            isAffected = true;
          }
        }
      }

      if (isAffected) {
        affectedBookings.push({ ...booking,
          impactType:
            updates.isActive === false
              ? "CANCELLATION_REQUIRED"
              : "RESCHEDULE_REQUIRED",
          recommendedAction:
            updates.isActive === false
              ? "Annuler la réservation et notifier le client"
              : "Proposer une reprogrammation au client" });
      }
    }

    return affectedBookings;
  } catch (error) {
    console.error("Error finding affected bookings:", error);
    return [];
  }
}

function formatAvailability(availability: any): any {
  return {
    ...availability,
    // Formatage spécifique
  };
}

function formatBooking(booking: any): any {
  return {
    ...booking,
    // Formatage spécifique
  };
}

function formatException(exception: any): any {
  return {
    ...exception,
    // Formatage spécifique
  };
}

function calculateTotalAvailableHours(slots: any[]): number {
  // Calculer le total d'heures disponibles en sommant tous les créneaux
  let totalMinutes = 0;
  
  for (const slot of slots) {
    if (slot.startTime && slot.endTime) {
      // Convertir les heures en minutes pour un calcul précis
      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);
      
      // Ajouter la durée du créneau (gestion des créneaux qui traversent minuit)
      let duration = endMinutes - startMinutes;
      if (duration < 0) {
        duration += 24 * 60; // Ajouter 24h si le créneau traverse minuit
      }
      
      totalMinutes += duration;
    }
  }
  
  // Convertir en heures avec précision décimale
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function calculateBookedHours(bookings: any[]): number {
  // Calculer le total d'heures réservées
  let totalMinutes = 0;
  
  for (const booking of bookings) {
    if (booking.startTime && booking.endTime) {
      // Calculer la durée de chaque réservation
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);
      
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      
      // Ne compter que les réservations confirmées ou en attente
      if (['CONFIRMED', 'PENDING', 'IN_PROGRESS'].includes(booking.status)) {
        totalMinutes += durationMinutes;
      }
    } else if (booking.duration) {
      // Si on a directement la durée en minutes
      if (['CONFIRMED', 'PENDING', 'IN_PROGRESS'].includes(booking.status)) {
        totalMinutes += booking.duration;
      }
    }
  }
  
  // Convertir en heures avec précision décimale
  return Math.round((totalMinutes / 60) * 100) / 100;
}

// Fonction utilitaire pour convertir HH:MM en minutes
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculatePeriodDates(period: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  let startDate: Date, endDate: Date;

  switch (period) {
    case "WEEK":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case "MONTH":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "QUARTER":
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return { startDate, endDate };
}

function generateDateRange(
  startDate: Date,
  endDate: Date,
  dayOfWeek: number,
  exceptions: Date[],
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  const exceptionsSet = new Set(exceptions.map((d) => d.toDateString()));

  while (current <= endDate) {
    if (
      current.getDay() === dayOfWeek &&
      !exceptionsSet.has(current.toDateString())
    ) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Fonctions helper manquantes ajoutées pour corriger les références

function timeOverlaps(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  // Convertir les heures en minutes pour faciliter la comparaison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Vérifier si les créneaux se chevauchent
  return start1Min < end2Min && end1Min > start2Min;
}

function getDayName(dayOfWeek: number): string {
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi"];
  return days[dayOfWeek] || "Jour inconnu";
}

async function checkBookingConflicts(
  db: any,
  providerId: string,
  availability: any,
): Promise<any[]> {
  const conflicts: any[] = [];

  try {
    // Rechercher les réservations qui pourraient entrer en conflit
    const whereCondition: any = {
      providerId,
      status: { in: ["PENDING", "CONFIRMED"] }};

    if (availability.type === "RECURRING") {
      // Pour les disponibilités récurrentes, on doit chercher sur plusieurs semaines
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // 3 mois en avant

      whereCondition.startTime = { gte: startDate, lt: endDate };
    } else if (availability.type === "SPECIFIC") {
      // Pour les disponibilités spécifiques, chercher sur la date exacte
      const specificDate = new Date(availability.specificDate);
      const nextDay = new Date(specificDate);
      nextDay.setDate(nextDay.getDate() + 1);

      whereCondition.startTime = { gte: specificDate, lt: nextDay };
    }

    const existingBookings = await db.serviceBooking.findMany({
      where: whereCondition,
      include: {
        client: { select: { name: true, email: true } },
        service: { select: { title } }}});

    // Vérifier les conflits pour chaque réservation
    for (const booking of existingBookings) {
      const bookingDate = new Date(booking.startTime);
      const hasConflict = false;

      if (availability.type === "RECURRING") {
        // Vérifier si la réservation tombe sur le jour modifié
        if (bookingDate.getDay() === availability.dayOfWeek) {
          const bookingTime = bookingDate.toTimeString().substring(0, 5);
          if (
            timeOverlaps(
              bookingTime,
              bookingTime,
              availability.startTime,
              availability.endTime,
            )
          ) {
            hasConflict = true;
          }
        }
      } else if (availability.type === "SPECIFIC") {
        // Vérifier conflit sur la date spécifique
        const availDate = new Date(availability.specificDate);
        if (bookingDate.toDateString() === availDate.toDateString()) {
          hasConflict = true;
        }
      }

      if (hasConflict) {
        conflicts.push({
          type: "BOOKING_CONFLICT",
          conflictWith: booking,
          message: `Conflit avec une réservation existante pour ${booking.client.name} le ${bookingDate.toLocaleDateString()}`});
      }
    }
  } catch (error) {
    console.error("Error checking booking conflicts:", error);
  }

  return conflicts;
}

/**
 * Notifie les clients des exceptions d'horaires du prestataire
 */
async function notifyClientsOfException(
  affectedBookings: any[],
  notificationMessage: string | undefined,
  db: any
): Promise<void> {
  try {
    console.log(`📬 Notification de ${affectedBookings.length} clients pour exception d'horaires`);
    
    // Grouper les réservations par client pour éviter les notifications multiples
    const clientBookings = new Map();
    
    for (const booking of affectedBookings) {
      if (!clientBookings.has(booking.clientId)) {
        clientBookings.set(booking.clientId, []);
      }
      clientBookings.get(booking.clientId).push(booking);
    }
    
    // Créer les notifications pour chaque client
    const notifications = [];
    
    for (const [clientId, bookings] of clientBookings) {
      const bookingCount = bookings.length;
      const firstBooking = bookings[0];
      
      // Message personnalisé ou message par défaut
      const defaultMessage = bookingCount === 1 
        ? `Votre réservation du ${new Date(firstBooking.scheduledAt).toLocaleDateString('fr-FR')} pourrait être impactée par un changement d'horaires`
        : `${bookingCount} de vos réservations pourraient être impactées par un changement d'horaires`;
        
      const finalMessage = notificationMessage || defaultMessage;
      
      // Créer la notification pour ce client
      const notification = {
        userId: clientId,
        type: 'PROVIDER_SCHEDULE_EXCEPTION' as const,
        title: 'Modification d\'horaires prestataire',
        message: finalMessage,
        data: {
          providerId: firstBooking.providerId,
          providerName: firstBooking.provider?.user?.name || 'Prestataire',
          affectedBookings: bookings.map((b: any) => ({
            id: b.id,
            serviceName: b.service?.name || 'Service',
            scheduledAt: b.scheduledAt,
            status: b.status
          })),
          exceptionMessage: notificationMessage,
          requiresAction: true,
          actionUrl: `/client/bookings?provider=${firstBooking.providerId}`
        },
        priority: 'HIGH',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      };
      
      notifications.push(notification);
    }
    
    // Enregistrer toutes les notifications en base
    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications
      });
      
      console.log(`✅ ${notifications.length} notifications créées pour l'exception d'horaires`);
    }
    
    // Créer un log pour traçabilité
    await db.auditLog.create({
      data: {
        userId: affectedBookings[0]?.providerId || 'system',
        action: 'PROVIDER_EXCEPTION_CLIENT_NOTIFICATION',
        tableName: 'ProviderException',
        recordId: 'bulk-notification',
        changes: {
          affectedClients: Array.from(clientBookings.keys()),
          notificationMessage,
          bookingsCount: affectedBookings.length
        },
        ipAddress: 'system',
        userAgent: 'Provider Calendar System'
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la notification des clients:', error);
    
    // Log d'erreur même si les notifications échouent
    await db.systemLog.create({
      data: {
        type: 'CLIENT_NOTIFICATION_ERROR',
        message: `Échec notification clients pour exception prestataire`,
        level: 'ERROR',
        metadata: {
          affectedBookingsCount: affectedBookings.length,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      }
    });
  }
}
