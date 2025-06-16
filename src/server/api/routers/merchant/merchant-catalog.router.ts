import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ProductStatus, ProductCategory } from "@prisma/client";

/**
 * Router pour la gestion du catalogue commerçant selon le cahier des charges
 * Gestion complète des produits, catégories, inventory et prix
 */

// Schémas de validation
const createProductSchema = z.object({ name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  category: z.nativeEnum(ProductCategory),
  sku: z.string().min(3).max(50),

  // Prix et gestion financière
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional(), // Prix barré
  costPrice: z.number().min(0).optional(), // Prix de revient
  taxRate: z.number().min(0).max(100).default(20), // TVA en %

  // Inventory
  trackInventory: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  allowBackorder: z.boolean().default(false),

  // Attributs physiques
  weight: z.number().min(0).optional(), // kg
  dimensions: z
    .object({
      length: z.number().min(0), // cm
      width: z.number().min(0), // cm
      height: z.number().min(0), // cm
     })
    .optional(),

  // Médias et marketing
  images: z.array(z.string().url()).max(10),
  tags: z.array(z.string()).max(20),
  isVisible: z.boolean().default(true),
  isFeatured: z.boolean().default(false),

  // Livraison
  requiresSpecialHandling: z.boolean().default(false),
  shippingClass: z
    .enum(["STANDARD", "FRAGILE", "FROZEN", "OVERSIZED"])
    .default("STANDARD"),
  maxDeliveryDistance: z.number().min(1).max(100).optional(), // km

  // SEO et métadonnées
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  slug: z.string().min(3).max(100).optional()});

const updateProductSchema = createProductSchema.partial().extend({ id: z.string().cuid() });

const productFiltersSchema = z.object({ category: z.nativeEnum(ProductCategory).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  isVisible: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  search: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z
    .enum(["name", "price", "stock", "createdAt", "sales"])
    .default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0) });

const bulkUpdateSchema = z.object({ productIds: z.array(z.string().cuid()).min(1).max(50),
  updates: z.object({
    category: z.nativeEnum(ProductCategory).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    isVisible: z.boolean().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    shippingClass: z
      .enum(["STANDARD", "FRAGILE", "FROZEN", "OVERSIZED"])
      .optional() })});

const adjustInventorySchema = z.object({ productId: z.string().cuid(),
  adjustment: z.number().int(), // Peut être négatif
  reason: z.enum([
    "PURCHASE",
    "SALE",
    "DAMAGE",
    "THEFT",
    "CORRECTION",
    "RETURN"]),
  notes: z.string().max(500).optional(),
  cost: z.number().min(0).optional(), // Coût de l'ajustement
 });

export const merchantCatalogRouter = router({ /**
   * Obtenir tous les produits du commerçant
   */
  getProducts: protectedProcedure
    .input(productFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leur catalogue" });
      }

      try {
        // Récupérer le profil commerçant
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Construire les filtres
        const where: any = {
          merchantId: merchant.id,
          ...(input.category && { category: input.category }),
          ...(input.status && { status: input.status }),
          ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
          ...(input.isFeatured !== undefined && {
            isFeatured: input.isFeatured}),
          ...(input.lowStock && {
            trackInventory: true,
            stockQuantity: { lte: ctx.db.product.fields.lowStockAlert }}),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { sku: { contains: input.search, mode: "insensitive" } }]}),
          ...(input.priceMin && { price: { gte: input.priceMin } }),
          ...(input.priceMax && { price: { lte: input.priceMax } }),
          ...(input.tags && { tags: { hasSome: input.tags } })};

        // Définir l'ordre de tri
        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [products, totalCount] = await Promise.all([
          ctx.db.product.findMany({
            where,
            include: {
              inventoryMovements: {
                orderBy: { createdAt: "desc" },
                take: 5},
              count: {
                select: {
                  orderItems: {
                    where: {
                      order: { status: { in: ["COMPLETED", "DELIVERED"] } }}}}}},
            orderBy,
            skip: input.offset,
            take: input.limit}),
          ctx.db.product.count({ where  })]);

        // Formatter les données
        const formattedProducts = products.map((product) => ({ ...product,
          price: product.price.toNumber(),
          comparePrice: product.comparePrice?.toNumber(),
          costPrice: product.costPrice?.toNumber(),
          totalSales: product.count.orderItems,
          isLowStock:
            product.trackInventory &&
            product.stockQuantity <= product.lowStockAlert,
          profitMargin: product.costPrice
            ? ((product.price.toNumber() - product.costPrice.toNumber()) /
                product.price.toNumber()) *
              100
            : null }));

        return {
          success: true,
          data: formattedProducts,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des produits" });
      }
    }),

  /**
   * Créer un nouveau produit
   */
  createProduct: protectedProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent créer des produits" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Vérifier l'unicité du SKU
        const existingSku = await ctx.db.product.findFirst({
          where: {
            merchantId: merchant.id,
            sku: input.sku}});

        if (existingSku) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Ce SKU existe déjà dans votre catalogue" });
        }

        // Générer le slug s'il n'est pas fourni
        const slug = input.slug || generateSlug(input.name);

        const product = await ctx.db.product.create({
          data: {
            ...input,
            slug,
            merchantId: merchant.id,
            status: "ACTIVE"}});

        // Créer le mouvement d'inventaire initial si nécessaire
        if (input.trackInventory && input.stockQuantity > 0) {
          await ctx.db.inventoryMovement.create({
            data: {
              productId: product.id,
              type: "IN",
              quantity: input.stockQuantity,
              reason: "INITIAL_STOCK",
              notes: "Stock initial du produit",
              cost: input.costPrice
                ? input.costPrice * input.stockQuantity
                : undefined}});
        }

        return {
          success: true,
          data: {
            ...product,
            price: product.price.toNumber(),
            comparePrice: product.comparePrice?.toNumber(),
            costPrice: product.costPrice?.toNumber()},
          message: "Produit créé avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du produit" });
      }
    }),

  /**
   * Mettre à jour un produit
   */
  updateProduct: protectedProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent modifier leurs produits" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const product = await ctx.db.product.findFirst({
          where: {
            id: input.id,
            merchantId: merchant.id}});

        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Produit non trouvé" });
        }

        // Vérifier l'unicité du SKU si modifié
        if (input.sku && input.sku !== product.sku) {
          const existingSku = await ctx.db.product.findFirst({
            where: {
              merchantId: merchant.id,
              sku: input.sku,
              id: { not: input.id }}});

          if (existingSku) {
            throw new TRPCError({ code: "BAD_REQUEST",
              message: "Ce SKU existe déjà dans votre catalogue" });
          }
        }

        const { id: id, ...updateData } = input;

        const updatedProduct = await ctx.db.product.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date()}});

        return {
          success: true,
          data: {
            ...updatedProduct,
            price: updatedProduct.price.toNumber(),
            comparePrice: updatedProduct.comparePrice?.toNumber(),
            costPrice: updatedProduct.costPrice?.toNumber()},
          message: "Produit mis à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour" });
      }
    }),

  /**
   * Supprimer un produit
   */
  deleteProduct: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent supprimer leurs produits" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const product = await ctx.db.product.findFirst({
          where: {
            id: input.id,
            merchantId: merchant.id},
          include: { orderItems }});

        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Produit non trouvé" });
        }

        // Vérifier s'il y a des commandes liées
        if (product.orderItems.length > 0) {
          // Ne pas supprimer, juste désactiver
          await ctx.db.product.update({
            where: { id: input.id },
            data: {
              status: "DISCONTINUED",
              isVisible: false}});

          return {
            success: true,
            message:
              "Produit désactivé (des commandes sont liées à ce produit)"};
        }

        // Supprimer complètement
        await ctx.db.product.delete({
          where: { id: input.id }});

        return {
          success: true,
          message: "Produit supprimé avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression" });
      }
    }),

  /**
   * Ajuster l'inventaire d'un produit
   */
  adjustInventory: protectedProcedure
    .input(adjustInventorySchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent ajuster l'inventaire" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const product = await ctx.db.product.findFirst({
          where: {
            id: input.productId,
            merchantId: merchant.id,
            trackInventory: true}});

        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Produit non trouvé ou inventaire non suivi" });
        }

        const newStock = product.stockQuantity + input.adjustment;
        if (newStock < 0) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "L'ajustement rendrait le stock négatif" });
        }

        // Transaction pour mettre à jour le stock et créer le mouvement
        const result = await ctx.db.$transaction(async (tx) => {
          // Mettre à jour le stock
          const updatedProduct = await tx.product.update({
            where: { id: input.productId },
            data: {
              stockQuantity: newStock,
              lastRestockDate: input.adjustment > 0 ? new Date() : undefined}});

          // Créer le mouvement d'inventaire
          const movement = await tx.inventoryMovement.create({
            data: {
              productId: input.productId,
              type: input.adjustment > 0 ? "IN" : "OUT",
              quantity: Math.abs(input.adjustment),
              reason: input.reason,
              notes: input.notes,
              cost: input.cost,
              userId: user.id}});

          return { updatedProduct, movement };
        });

        return {
          success: true,
          data: result,
          message: `Stock ajusté: ${input.adjustment > 0 ? "+" : ""}${input.adjustment} unités`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'ajustement de l'inventaire" });
      }
    }),

  /**
   * Mise à jour en lot de produits
   */
  bulkUpdate: protectedProcedure
    .input(bulkUpdateSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les commerçants peuvent faire des mises à jour en lot" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Vérifier que tous les produits appartiennent au commerçant
        const productCount = await ctx.db.product.count({
          where: {
            id: { in: input.productIds },
            merchantId: merchant.id}});

        if (productCount !== input.productIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Certains produits ne vous appartiennent pas" });
        }

        // Effectuer la mise à jour en lot
        const result = await ctx.db.product.updateMany({
          where: {
            id: { in: input.productIds },
            merchantId: merchant.id},
          data: {
            ...input.updates,
            updatedAt: new Date()}});

        return {
          success: true,
          updatedCount: result.count,
          message: `${result.count} produits mis à jour avec succès`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour en lot" });
      }
    }),

  /**
   * Obtenir les statistiques du catalogue
   */
  getCatalogStats: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "MERCHANT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les commerçants peuvent consulter les statistiques" });
    }

    try {
      const merchant = await ctx.db.merchant.findUnique({
        where: { userId: user.id }});

      if (!merchant) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Profil commerçant non trouvé" });
      }

      const [
        totalProducts,
        activeProducts,
        lowStockProducts,
        totalValue,
        byCategory] = await Promise.all([
        ctx.db.product.count({
          where: { merchantId: merchant.id }}),
        ctx.db.product.count({
          where: {
            merchantId: merchant.id,
            status: "ACTIVE",
            isVisible: true}}),
        ctx.db.product.count({
          where: {
            merchantId: merchant.id,
            trackInventory: true,
            stockQuantity: { lte: ctx.db.product.fields.lowStockAlert }}}),
        ctx.db.product.aggregate({
          where: { merchantId: merchant.id },
          sum: { stockQuantity }}),
        ctx.db.product.groupBy({
          by: ["category"],
          where: { merchantId: merchant.id },
          count: true})]);

      return {
        success: true,
        data: {
          totalProducts,
          activeProducts,
          lowStockProducts,
          totalStockUnits: totalValue.sum.stockQuantity || 0,
          categoryBreakdown: byCategory.map((cat) => ({ category: cat.category,
            count: cat.count }))}};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques" });
    }
  })});

// Helper functions
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9]/g, "-") // Remplacer les caractères spéciaux par -
    .replace(/-+/g, "-") // Réduire les tirets multiples
    .replace(/^-|-$/g, ""); // Supprimer les tirets en début/fin
}
