import { prisma } from "@/lib/db";
import QRCode from "qrcode";

export interface StorageBoxRentalData {
  clientId: string;
  storageBoxId: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface StorageBoxFilter {
  locationId?: string;
  size?: string;
  isAvailable?: boolean;
  city?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface AccessCodeData {
  code: string;
  expiresAt: Date;
  uses: number;
  maxUses: number;
}

export class StorageBoxService {
  /**
   * Récupérer les box disponibles selon les critères
   */
  static async getAvailableBoxes(filters: StorageBoxFilter = {}) {
    try {
      const where: any = {};

      if (filters.locationId) {
        where.locationId = filters.locationId;
      }

      if (filters.size) {
        where.size = filters.size;
      }

      if (filters.isAvailable !== undefined) {
        where.isAvailable = filters.isAvailable;
      }

      if (filters.priceMin || filters.priceMax) {
        where.pricePerDay = {};
        if (filters.priceMin) where.pricePerDay.gte = filters.priceMin;
        if (filters.priceMax) where.pricePerDay.lte = filters.priceMax;
      }

      if (filters.city) {
        where.location = {
          city: {
            contains: filters.city,
            mode: "insensitive",
          },
        };
      }

      const boxes = await prisma.storageBox.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              postalCode: true,
              lat: true,
              lng: true,
              openingHours: true,
            },
          },
          rentals: {
            where: {
              OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
            },
            select: {
              id: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: [{ location: { city: "asc" } }, { boxNumber: "asc" }],
      });

      // Filtrer les box réellement disponibles
      const availableBoxes = boxes.filter((box) => {
        if (!box.isAvailable) return false;

        // Vérifier si le box n'est pas actuellement loué
        const hasActiveRental = box.rentals.some((rental) => {
          const now = new Date();
          return (
            (!rental.endDate || rental.endDate > now) && rental.startDate <= now
          );
        });

        return !hasActiveRental;
      });

      return availableBoxes;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Créer une location de box
   */
  static async createRental(data: StorageBoxRentalData) {
    try {
      // Vérifier que le box existe et est disponible
      const box = await prisma.storageBox.findUnique({
        where: { id: data.storageBoxId },
        include: {
          location: true,
          rentals: {
            where: {
              OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
            },
          },
        },
      });

      if (!box) {
        throw new Error("Box de stockage non trouvé");
      }

      if (!box.isAvailable) {
        throw new Error("Box de stockage non disponible");
      }

      // Vérifier qu'il n'y a pas de location active
      const hasActiveRental = box.rentals.some((rental) => {
        const now = new Date();
        return (
          (!rental.endDate || rental.endDate > now) && rental.startDate <= now
        );
      });

      if (hasActiveRental) {
        throw new Error("Box déjà loué pour cette période");
      }

      // Calculer le prix total si endDate est fournie
      let totalPrice = null;
      if (data.endDate) {
        const days = Math.ceil(
          (data.endDate.getTime() - data.startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalPrice = days * box.pricePerDay;
      }

      // Générer un code d'accès unique
      const accessCode = await this.generateAccessCode();

      // Créer la location
      const rental = await prisma.storageBoxRental.create({
        data: {
          clientId: data.clientId,
          storageBoxId: data.storageBoxId,
          startDate: data.startDate,
          endDate: data.endDate,
          accessCode,
          totalPrice,
          isPaid: false,
        },
        include: {
          client: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          storageBox: {
            include: {
              location: true,
            },
          },
        },
      });

      // Générer le QR code
      const qrCodeData = await this.generateQRCode(rental.id, accessCode);

      return {
        ...rental,
        qrCode: qrCodeData,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Prolonger une location
   */
  static async extendRental(rentalId: string, newEndDate: Date) {
    try {
      const rental = await prisma.storageBoxRental.findUnique({
        where: { id: rentalId },
        include: {
          storageBox: true,
        },
      });

      if (!rental) {
        throw new Error("Location non trouvée");
      }

      if (rental.endDate && new Date() > rental.endDate) {
        throw new Error("Location expirée");
      }

      // Calculer le nouveau prix total
      const originalDays = rental.endDate
        ? Math.ceil(
            (rental.endDate.getTime() - rental.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      const newDays = Math.ceil(
        (newEndDate.getTime() - rental.startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const additionalDays = newDays - originalDays;
      const additionalPrice = additionalDays * rental.storageBox.pricePerDay;
      const newTotalPrice = (rental.totalPrice || 0) + additionalPrice;

      const updatedRental = await prisma.storageBoxRental.update({
        where: { id: rentalId },
        data: {
          endDate: newEndDate,
          totalPrice: newTotalPrice,
        },
        include: {
          client: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          storageBox: {
            include: {
              location: true,
            },
          },
        },
      });

      return updatedRental;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Terminer une location
   */
  static async endRental(rentalId: string, endedBy?: string) {
    try {
      const rental = await prisma.storageBoxRental.findUnique({
        where: { id: rentalId },
        include: {
          storageBox: true,
        },
      });

      if (!rental) {
        throw new Error("Location non trouvée");
      }

      // Mettre à jour la location
      const updatedRental = await prisma.storageBoxRental.update({
        where: { id: rentalId },
        data: {
          endDate: new Date(),
        },
        include: {
          client: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          storageBox: {
            include: {
              location: true,
            },
          },
        },
      });

      return updatedRental;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer les locations d'un client
   */
  static async getClientRentals(clientId: string, includeExpired = false) {
    try {
      const where: any = { clientId };

      if (!includeExpired) {
        where.OR = [{ endDate: null }, { endDate: { gte: new Date() } }];
      }

      const rentals = await prisma.storageBoxRental.findMany({
        where,
        include: {
          storageBox: {
            include: {
              location: {
                select: {
                  name: true,
                  address: true,
                  city: true,
                  postalCode: true,
                  openingHours: true,
                },
              },
            },
          },
        },
        orderBy: { startDate: "desc" },
      });

      // Ajouter les QR codes pour les locations actives
      const rentalsWithQR = await Promise.all(
        rentals.map(async (rental) => {
          const isActive = !rental.endDate || rental.endDate > new Date();
          let qrCode = null;

          if (isActive) {
            qrCode = await this.generateQRCode(rental.id, rental.accessCode);
          }

          return {
            ...rental,
            qrCode,
            isActive,
          };
        }),
      );

      return rentalsWithQR;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Valider un code d'accès QR
   */
  static async validateAccessCode(code: string, boxId: string) {
    try {
      const rental = await prisma.storageBoxRental.findFirst({
        where: {
          accessCode: code,
          storageBoxId: boxId,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        include: {
          client: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          storageBox: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!rental) {
        throw new Error("Code d'accès invalide ou expiré");
      }

      // Vérifier que la location est active
      const now = new Date();
      if (rental.startDate > now) {
        throw new Error("La location n'a pas encore commencé");
      }

      if (rental.endDate && rental.endDate < now) {
        throw new Error("La location a expiré");
      }

      return {
        valid: true,
        rental,
        message: "Accès autorisé",
      };
    } catch (error) {
      return {
        valid: false,
        rental: null,
        message:
          error instanceof Error ? error.message : "Erreur de validation",
      };
    }
  }

  /**
   * Obtenir les statistiques des box
   */
  static async getStorageStats(locationId?: string) {
    try {
      const where: any = {};
      if (locationId) {
        where.locationId = locationId;
      }

      const [
        totalBoxes,
        availableBoxes,
        occupiedBoxes,
        totalRentals,
        activeRentals,
      ] = await Promise.all([
        prisma.storageBox.count({ where }),
        prisma.storageBox.count({
          where: {
            ...where,
            isAvailable: true,
            rentals: {
              none: {
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              },
            },
          },
        }),
        prisma.storageBox.count({
          where: {
            ...where,
            rentals: {
              some: {
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              },
            },
          },
        }),
        prisma.storageBoxRental.count({
          where: locationId
            ? {
                storageBox: { locationId },
              }
            : {},
        }),
        prisma.storageBoxRental.count({
          where: {
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
            ...(locationId
              ? {
                  storageBox: { locationId },
                }
              : {}),
          },
        }),
      ]);

      const occupancyRate =
        totalBoxes > 0 ? (occupiedBoxes / totalBoxes) * 100 : 0;

      return {
        totalBoxes,
        availableBoxes,
        occupiedBoxes,
        totalRentals,
        activeRentals,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Générer un code d'accès unique
   */
  private static async generateAccessCode(): Promise<string> {
    let code: string;
    let exists: boolean;

    do {
      // Générer un code alphanumérique de 8 caractères
      code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Vérifier que le code n'existe pas déjà
      const existingRental = await prisma.storageBoxRental.findFirst({
        where: {
          accessCode: code,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
      });

      exists = !!existingRental;
    } while (exists);

    return code;
  }

  /**
   * Générer un QR code pour l'accès au box
   */
  private static async generateQRCode(
    rentalId: string,
    accessCode: string,
  ): Promise<string> {
    try {
      const qrData = {
        type: "STORAGE_ACCESS",
        rentalId,
        accessCode,
        timestamp: Date.now(),
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      return qrCodeDataURL;
    } catch (error) {
      throw new Error("Erreur lors de la génération du QR code");
    }
  }

  /**
   * Rechercher des box par géolocalisation
   */
  static async findNearbyBoxes(
    lat: number,
    lng: number,
    radiusKm: number = 10,
  ) {
    try {
      // Utiliser la formule de Haversine pour calculer la distance
      const locations = await prisma.location.findMany({
        where: {
          type: { in: ["WAREHOUSE", "RELAY_POINT"] },
          isActive: true,
        },
        include: {
          storageBoxes: {
            where: {
              isAvailable: true,
            },
            include: {
              rentals: {
                where: {
                  OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                },
              },
            },
          },
        },
      });

      // Filtrer par distance et disponibilité
      const nearbyBoxes = locations
        .filter((location) => {
          const distance = this.calculateDistance(
            lat,
            lng,
            location.lat,
            location.lng,
          );
          return distance <= radiusKm;
        })
        .flatMap((location) =>
          location.storageBoxes
            .filter((box) => {
              // Vérifier qu'aucune location active n'existe
              const hasActiveRental = box.rentals.some((rental) => {
                const now = new Date();
                return (
                  (!rental.endDate || rental.endDate > now) &&
                  rental.startDate <= now
                );
              });
              return !hasActiveRental;
            })
            .map((box) => ({
              ...box,
              location: {
                id: location.id,
                name: location.name,
                address: location.address,
                city: location.city,
                postalCode: location.postalCode,
                lat: location.lat,
                lng: location.lng,
                openingHours: location.openingHours,
              },
              distance: this.calculateDistance(
                lat,
                lng,
                location.lat,
                location.lng,
              ),
            })),
        )
        .sort((a, b) => a.distance - b.distance);

      return nearbyBoxes;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculer la distance entre deux points géographiques
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
