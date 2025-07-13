import { prisma } from "@/lib/db";

export interface TimeSlot {
  id?: string;
  date: Date;
  startTime: string; // Format "HH:MM"
  endTime: string; // Format "HH:MM"
  isAvailable: boolean;
  isRecurring: boolean;
  providerId: string;
  bookingId?: string;
}

export interface RecurringAvailability {
  dayOfWeek: number; // 0 = dimanche, 1 = lundi, etc.
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilityTemplate {
  name: string;
  description?: string;
  schedule: RecurringAvailability[];
}

export interface BookingSlot {
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  serviceId: string;
  clientId: string;
  notes?: string;
}

export class AvailabilityService {
  /**
   * Créer ou mettre à jour les disponibilités récurrentes d'un prestataire
   */
  static async setRecurringAvailability(
    providerId: string,
    availabilities: RecurringAvailability[],
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Supprimer les anciennes disponibilités récurrentes
        await tx.providerAvailability.deleteMany({
          where: { providerId },
        });

        // Créer les nouvelles disponibilités
        for (const availability of availabilities) {
          await tx.providerAvailability.create({
            data: {
              providerId,
              dayOfWeek: availability.dayOfWeek,
              startTime: availability.startTime,
              endTime: availability.endTime,
              isActive: availability.isActive,
            },
          });
        }
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour des disponibilités récurrentes:",
        error,
      );
      throw error;
    }
  }

  /**
   * Générer les créneaux de disponibilité pour une période donnée
   */
  static async generateTimeSlots(
    providerId: string,
    startDate: Date,
    endDate: Date,
    serviceDuration: number = 60, // minutes
  ): Promise<TimeSlot[]> {
    try {
      // Récupérer les disponibilités récurrentes du prestataire
      const recurringAvailabilities =
        await prisma.providerAvailability.findMany({
          where: {
            providerId,
            isActive: true,
          },
        });

      const timeSlots: TimeSlot[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();

        // Trouver les disponibilités pour ce jour
        const dayAvailabilities = recurringAvailabilities.filter(
          (availability) => availability.dayOfWeek === dayOfWeek,
        );

        for (const availability of dayAvailabilities) {
          // Générer les créneaux pour cette plage horaire
          const slots = this.generateSlotsForTimeRange(
            new Date(currentDate),
            availability.startTime,
            availability.endTime,
            serviceDuration,
            providerId,
          );
          timeSlots.push(...slots);
        }

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sauvegarder les créneaux en base (si ils n'existent pas déjà)
      await this.saveTimeSlots(timeSlots);

      return timeSlots;
    } catch (error) {
      console.error("Erreur lors de la génération des créneaux:", error);
      throw error;
    }
  }

  /**
   * Générer les créneaux pour une plage horaire donnée
   */
  private static generateSlotsForTimeRange(
    date: Date,
    startTime: string,
    endTime: string,
    duration: number,
    providerId: string,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    const currentTime = new Date(startDateTime);

    while (currentTime.getTime() + duration * 60000 <= endDateTime.getTime()) {
      const slotEndTime = new Date(currentTime.getTime() + duration * 60000);

      slots.push({
        date: new Date(date),
        startTime: this.formatTime(currentTime),
        endTime: this.formatTime(slotEndTime),
        isAvailable: true,
        isRecurring: false,
        providerId,
      });

      // Passer au créneau suivant
      currentTime.setTime(currentTime.getTime() + duration * 60000);
    }

    return slots;
  }

  /**
   * Sauvegarder les créneaux en base de données
   */
  private static async saveTimeSlots(timeSlots: TimeSlot[]): Promise<void> {
    for (const slot of timeSlots) {
      // Vérifier si le créneau existe déjà
      const existing = await prisma.providerTimeSlot.findFirst({
        where: {
          providerId: slot.providerId,
          date: slot.date,
          startTime: slot.startTime,
        },
      });

      if (!existing) {
        await prisma.providerTimeSlot.create({
          data: {
            providerId: slot.providerId,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable,
            isRecurring: slot.isRecurring,
          },
        });
      }
    }
  }

  /**
   * Récupérer les créneaux disponibles d'un prestataire
   */
  static async getAvailableSlots(
    providerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimeSlot[]> {
    try {
      const slots = await prisma.providerTimeSlot.findMany({
        where: {
          providerId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          isAvailable: true,
          bookingId: null,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });

      return slots.map((slot) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
        isRecurring: slot.isRecurring,
        providerId: slot.providerId,
        bookingId: slot.bookingId || undefined,
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des créneaux:", error);
      throw error;
    }
  }

  /**
   * Réserver un créneau
   */
  static async bookTimeSlot(
    timeSlotId: string,
    bookingId: string,
  ): Promise<void> {
    try {
      await prisma.providerTimeSlot.update({
        where: { id: timeSlotId },
        data: {
          isAvailable: false,
          bookingId,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la réservation du créneau:", error);
      throw error;
    }
  }

  /**
   * Libérer un créneau (annulation)
   */
  static async releaseTimeSlot(timeSlotId: string): Promise<void> {
    try {
      await prisma.providerTimeSlot.update({
        where: { id: timeSlotId },
        data: {
          isAvailable: true,
          bookingId: null,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la libération du créneau:", error);
      throw error;
    }
  }

  /**
   * Bloquer des créneaux (congés, indisponibilité)
   */
  static async blockTimeSlots(
    providerId: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ): Promise<void> {
    try {
      await prisma.providerTimeSlot.updateMany({
        where: {
          providerId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          bookingId: null,
        },
        data: {
          isAvailable: false,
        },
      });

      // Créer une entrée de blocage pour traçabilité
      await prisma.providerAvailabilityBlock.create({
        data: {
          providerId,
          startDate,
          endDate,
          reason: reason || "Indisponibilité",
          isActive: true,
        },
      });
    } catch (error) {
      console.error("Erreur lors du blocage des créneaux:", error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques de disponibilité
   */
  static async getAvailabilityStats(
    providerId: string,
    month: number,
    year: number,
  ): Promise<any> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const [totalSlots, bookedSlots, blockedSlots] = await Promise.all([
        prisma.providerTimeSlot.count({
          where: {
            providerId,
            date: { gte: startDate, lte: endDate },
          },
        }),
        prisma.providerTimeSlot.count({
          where: {
            providerId,
            date: { gte: startDate, lte: endDate },
            bookingId: { not: null },
          },
        }),
        prisma.providerTimeSlot.count({
          where: {
            providerId,
            date: { gte: startDate, lte: endDate },
            isAvailable: false,
            bookingId: null,
          },
        }),
      ]);

      const availableSlots = totalSlots - bookedSlots - blockedSlots;
      const occupancyRate =
        totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

      return {
        totalSlots,
        bookedSlots,
        blockedSlots,
        availableSlots,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      };
    } catch (error) {
      console.error("Erreur lors du calcul des statistiques:", error);
      throw error;
    }
  }

  /**
   * Appliquer un template de disponibilité
   */
  static async applyAvailabilityTemplate(
    providerId: string,
    template: AvailabilityTemplate,
  ): Promise<void> {
    try {
      await this.setRecurringAvailability(providerId, template.schedule);
    } catch (error) {
      console.error("Erreur lors de l'application du template:", error);
      throw error;
    }
  }

  /**
   * Templates prédéfinis
   */
  static getDefaultTemplates(): AvailabilityTemplate[] {
    return [
      {
        name: "Temps plein (9h-17h)",
        description: "Disponible du lundi au vendredi de 9h à 17h",
        schedule: [
          {
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          }, // Lundi
          {
            dayOfWeek: 2,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          }, // Mardi
          {
            dayOfWeek: 3,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          }, // Mercredi
          {
            dayOfWeek: 4,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          }, // Jeudi
          {
            dayOfWeek: 5,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          }, // Vendredi
        ],
      },
      {
        name: "Temps partiel (14h-18h)",
        description: "Disponible du lundi au vendredi de 14h à 18h",
        schedule: [
          {
            dayOfWeek: 1,
            startTime: "14:00",
            endTime: "18:00",
            isActive: true,
          },
          {
            dayOfWeek: 2,
            startTime: "14:00",
            endTime: "18:00",
            isActive: true,
          },
          {
            dayOfWeek: 3,
            startTime: "14:00",
            endTime: "18:00",
            isActive: true,
          },
          {
            dayOfWeek: 4,
            startTime: "14:00",
            endTime: "18:00",
            isActive: true,
          },
          {
            dayOfWeek: 5,
            startTime: "14:00",
            endTime: "18:00",
            isActive: true,
          },
        ],
      },
      {
        name: "Week-end (10h-16h)",
        description: "Disponible le week-end de 10h à 16h",
        schedule: [
          {
            dayOfWeek: 6,
            startTime: "10:00",
            endTime: "16:00",
            isActive: true,
          }, // Samedi
          {
            dayOfWeek: 0,
            startTime: "10:00",
            endTime: "16:00",
            isActive: true,
          }, // Dimanche
        ],
      },
      {
        name: "Flexible 7j/7",
        description: "Disponible tous les jours de 8h à 20h",
        schedule: [
          {
            dayOfWeek: 0,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
          {
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
          {
            dayOfWeek: 2,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
          {
            dayOfWeek: 3,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
          {
            dayOfWeek: 4,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
          {
            dayOfWeek: 5,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
          {
            dayOfWeek: 6,
            startTime: "08:00",
            endTime: "20:00",
            isActive: true,
          },
        ],
      },
    ];
  }

  /**
   * Formater l'heure au format HH:MM
   */
  private static formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  /**
   * Vérifier les conflits de créneaux
   */
  static async checkSlotConflicts(
    providerId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    try {
      const conflicts = await prisma.providerTimeSlot.findMany({
        where: {
          providerId,
          date,
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
          isAvailable: false,
        },
      });

      return conflicts.length > 0;
    } catch (error) {
      console.error("Erreur lors de la vérification des conflits:", error);
      throw error;
    }
  }
}
