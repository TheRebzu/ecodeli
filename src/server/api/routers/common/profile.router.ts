import { router, protectedProcedure } from "@/server/api/trpc";
import { profileService } from "@/server/services/common/profile.service";
import {
  addressSchema,
  updateClientProfileSchema,
  updateDelivererProfileSchema,
  updateMerchantProfileSchema,
  updateProviderProfileSchema,
  profileSchemaMap,
} from "@/schemas/user/profile.schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const profileRouter = router({
  /**
   * Récupère le profil complet de l'utilisateur connecté
   */
  getMyProfile: protectedProcedure.query(async ({ _ctx }) => {
    const userId = ctx.session.user.id;
    return profileService.getProfileByUserId(userId);
  }),

  /**
   * Récupère le profil spécifique au rôle de l'utilisateur connecté
   */
  getMyRoleSpecificProfile: protectedProcedure.query(async ({ _ctx }) => {
    const userId = ctx.session.user.id;
    const role = ctx.session.user.role;

    if (!["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"].includes(role)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid user role",
      });
    }

    const profile = await profileService.getRoleSpecificProfile(userId, role);

    // Explicitly cast the profile to the expected type
    return profile as MerchantProfile | ProviderProfile;
  }),

  /**
   * Mise à jour du profil en fonction du rôle de l'utilisateur connecté
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        data: z.object({}).passthrough(), // Accept any data, will be validated based on role
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      // Vérifier si le rôle est valide pour la mise à jour du profil
      if (!profileSchemaMap[role]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rôle utilisateur non valide pour la mise à jour du profil",
        });
      }

      // Valider les données en fonction du rôle
      const validatedData = profileSchemaMap[role].parse(input.data);

      // Mettre à jour le profil en fonction du rôle
      switch (role) {
        case "CLIENT":
          return profileService.updateClientProfile(userId, validatedData);
        case "DELIVERER":
          return profileService.updateDelivererProfile(userId, validatedData);
        case "MERCHANT":
          return profileService.updateMerchantProfile(userId, validatedData);
        case "PROVIDER":
          return profileService.updateProviderProfile(userId, validatedData);
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Mise à jour de profil non prise en charge pour ce rôle",
          });
      }
    }),

  /**
   * Ajouter une nouvelle adresse pour un client
   */
  addClientAddress: protectedProcedure
    .input(addressSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      if (role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent ajouter des adresses",
        });
      }

      try {
        // Récupérer le client ID
        const client = await ctx.db.client.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client non trouvé",
          });
        }

        // Créer l'adresse
        const address = await ctx.db.address.create({
          data: {
            label: input.label,
            street: input.street,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            country: input.country,
            isDefault: input.isDefault,
            clientId: client.id,
          },
        });

        return address;
      } catch (_error) {
        console.error("Erreur lors de l'ajout d'une adresse:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'ajout d'une adresse",
        });
      }
    }),

  /**
   * Mettre à jour une adresse existante
   */
  updateClientAddress: protectedProcedure
    .input(
      z.object({
        addressId: z.string(),
        data: addressSchema,
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      if (role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent modifier des adresses",
        });
      }

      try {
        // Vérifier que l'adresse appartient bien au client
        const address = await ctx.db.address.findUnique({
          where: { id: input.addressId },
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
            code: "NOT_FOUND",
            message: "Adresse non trouvée",
          });
        }

        if (address.client.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'avez pas le droit de modifier cette adresse",
          });
        }

        // Mettre à jour l'adresse
        const updatedAddress = await ctx.db.address.update({
          where: { id: input.addressId },
          data: {
            label: input.data.label,
            street: input.data.street,
            city: input.data.city,
            state: input.data.state,
            postalCode: input.data.postalCode,
            country: input.data.country,
            isDefault: input.data.isDefault,
          },
        });

        return updatedAddress;
      } catch (_error) {
        console.error("Erreur lors de la modification d'une adresse:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la modification d'une adresse",
        });
      }
    }),

  /**
   * Supprimer une adresse existante
   */
  deleteClientAddress: protectedProcedure
    .input(
      z.object({
        addressId: z.string(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const userId = ctx.session.user.id;
      return profileService.deleteAddress(input.addressId, userId);
    }),

  /**
   * Définir une adresse comme adresse par défaut
   */
  setDefaultAddress: protectedProcedure
    .input(
      z.object({
        addressId: z.string(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      if (role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent définir une adresse par défaut",
        });
      }

      try {
        // Récupérer le client
        const client = await ctx.db.client.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client non trouvé",
          });
        }

        // Vérifier que l'adresse appartient bien au client
        const address = await ctx.db.address.findUnique({
          where: { id: input.addressId },
          select: { clientId: true },
        });

        if (!address || address.clientId !== client.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'avez pas le droit de modifier cette adresse",
          });
        }

        // Réinitialiser toutes les adresses par défaut
        await ctx.db.address.updateMany({
          where: { clientId: client.id },
          data: { isDefault: false },
        });

        // Définir la nouvelle adresse par défaut
        await ctx.db.address.update({
          where: { id: input.addressId },
          data: { isDefault: true },
        });

        return { success: true };
      } catch (_error) {
        console.error(
          "Erreur lors de la définition de l'adresse par défaut:",
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la définition de l'adresse par défaut",
        });
      }
    }),
});
