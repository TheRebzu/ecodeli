import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
  type ClientProfile,
  type DelivererProfile,
  type MerchantProfile,
  type ProviderProfile,
  type UpdateClientProfile,
  type UpdateDelivererProfile,
  type UpdateMerchantProfile,
  type UpdateProviderProfile,
} from '@/schemas/profile.schema';
import { Prisma, UserRole } from '@prisma/client';

class ProfileService {
  /**
   * Récupère le profil complet d'un utilisateur en fonction de son rôle
   */
  async getProfileByUserId(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          include: {
            deliveryAddresses: true,
          },
        },
        deliverer: true,
        merchant: true,
        provider: {
          include: {
            skills: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    return user;
  }

  /**
   * Récupère uniquement les données du profil spécifique au rôle
   */
  async getRoleSpecificProfile(userId: string, role: UserRole) {
    const profileMap = {
      CLIENT: async () =>
        await db.client.findUnique({
          where: { userId },
          include: {
            deliveryAddresses: true,
          },
        }),
      DELIVERER: async () =>
        await db.deliverer.findUnique({
          where: { userId },
        }),
      MERCHANT: async () =>
        await db.merchant.findUnique({
          where: { userId },
          select: {
            companyName: true,
            businessAddress: true,
            vatNumber: true,
          },
        }),
      PROVIDER: async () =>
        await db.provider.findUnique({
          where: { userId },
          select: {
            companyName: true,
            serviceType: true,
            serviceRadius: true,
          },
        }),
      ADMIN: async () =>
        await db.admin.findUnique({
          where: { userId },
        }),
    };

    if (!profileMap[role]) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Rôle utilisateur non valide',
      });
    }

    const profile = await profileMap[role]();

    if (!profile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil spécifique non trouvé',
      });
    }

    return profile;
  }

  /**
   * Met à jour les informations de base de l'utilisateur
   */
  async updateUserBaseInfo(
    userId: string,
    data: { name?: string; email?: string; phoneNumber?: string; image?: string }
  ) {
    const { name, email, phoneNumber, image } = data;

    const updateData: Prisma.UserUpdateInput = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (image) updateData.image = image;

    if (Object.keys(updateData).length === 0) {
      return { success: false, message: 'Aucune donnée à mettre à jour' };
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { success: true };
  }

  /**
   * Met à jour le profil client
   */
  async updateClientProfile(userId: string, data: UpdateClientProfile) {
    // Extraire les données spécifiques de l'utilisateur de base
    const { name, email, phoneNumber, image, ...clientData } = data;

    // Extraire les adresses de livraison si présentes
    const { deliveryAddresses, ...clientProfileData } = clientData;

    try {
      // Mettre à jour l'utilisateur de base si nécessaire
      if (name || email || phoneNumber || image) {
        await this.updateUserBaseInfo(userId, { name, email, phoneNumber, image });
      }

      // Mettre à jour le profil client
      if (Object.keys(clientProfileData).length > 0) {
        await db.client.update({
          where: { userId },
          data: clientProfileData,
        });
      }

      // Gérer les adresses si elles sont fournies
      if (deliveryAddresses && deliveryAddresses.length > 0) {
        // Récupérer le client ID
        const client = await db.client.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Client non trouvé',
          });
        }

        for (const address of deliveryAddresses) {
          if (address.id) {
            // Mettre à jour l'adresse existante
            await db.address.update({
              where: { id: address.id },
              data: {
                label: address.label,
                street: address.street,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
                isDefault: address.isDefault,
              },
            });
          } else {
            // Créer une nouvelle adresse
            await db.address.create({
              data: {
                label: address.label,
                street: address.street,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
                isDefault: address.isDefault,
                clientId: client.id,
              },
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil client:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du profil',
      });
    }
  }

  /**
   * Met à jour le profil livreur
   */
  async updateDelivererProfile(userId: string, data: UpdateDelivererProfile) {
    const { name, email, phoneNumber, image, ...delivererData } = data;

    try {
      // Mettre à jour l'utilisateur de base si nécessaire
      if (name || email || phoneNumber || image) {
        await this.updateUserBaseInfo(userId, { name, email, phoneNumber, image });
      }

      // Mettre à jour le profil livreur
      if (Object.keys(delivererData).length > 0) {
        await db.deliverer.update({
          where: { userId },
          data: delivererData,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil livreur:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du profil',
      });
    }
  }

  /**
   * Met à jour le profil commerçant
   */
  async updateMerchantProfile(userId: string, data: UpdateMerchantProfile) {
    const { name, email, phoneNumber, image, ...merchantData } = data;

    try {
      // Mettre à jour l'utilisateur de base si nécessaire
      if (name || email || phoneNumber || image) {
        await this.updateUserBaseInfo(userId, { name, email, phoneNumber, image });
      }

      // Mettre à jour le profil commerçant
      if (Object.keys(merchantData).length > 0) {
        await db.merchant.update({
          where: { userId },
          data: merchantData,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil commerçant:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du profil',
      });
    }
  }

  /**
   * Met à jour le profil prestataire
   */
  async updateProviderProfile(userId: string, data: UpdateProviderProfile) {
    const { name, email, phoneNumber, image, ...providerData } = data;

    try {
      // Mettre à jour l'utilisateur de base si nécessaire
      if (name || email || phoneNumber || image) {
        await this.updateUserBaseInfo(userId, { name, email, phoneNumber, image });
      }

      // Mettre à jour le profil prestataire
      if (Object.keys(providerData).length > 0) {
        await db.provider.update({
          where: { userId },
          data: providerData,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil prestataire:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du profil',
      });
    }
  }

  /**
   * Supprime une adresse de livraison
   */
  async deleteAddress(addressId: string, userId: string) {
    try {
      // Vérifier que l'adresse appartient bien au client
      const address = await db.address.findUnique({
        where: { id: addressId },
        include: {
          client: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!address) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Adresse non trouvée',
        });
      }

      if (address.client.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas le droit de supprimer cette adresse",
        });
      }

      await db.address.delete({
        where: { id: addressId },
      });

      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la suppression de l'adresse:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la suppression de l'adresse",
      });
    }
  }
}

export const profileService = new ProfileService();
