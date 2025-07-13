import { prisma } from "@/lib/db";
import { z } from "zod";

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  subcategory?: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images: string[];
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED";
  tags: string[];
  attributes: Record<string, any>;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity: number;
  reason: string;
  reference?: string;
  userId: string;
  createdAt: Date;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "OVERSTOCK" | "EXPIRY_WARNING";
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isRead: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  slug: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  subcategories?: Category[];
}

export interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  totalCostValue: number;
  profitMargin: number;
  turnoverRate: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    soldQuantity: number;
    revenue: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    productCount: number;
    totalValue: number;
    percentage: number;
  }>;
}

export class MerchantInventoryService {
  /**
   * Récupère tous les produits d'un commerçant
   */
  static async getProducts(
    merchantId: string,
    filters?: {
      category?: string;
      status?: string;
      search?: string;
      lowStock?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    },
  ): Promise<{
    products: Product[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      // Construction des filtres
      const where: any = {
        merchantId,
      };

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { sku: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters?.lowStock) {
        where.stockQuantity = {
          lte: prisma.product.fields.minStockLevel,
        };
      }

      // Construction du tri
      const orderBy: any = {};
      if (filters?.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || "asc";
      } else {
        orderBy.createdAt = "desc";
      }

      // Récupération des produits
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            _count: {
              select: {
                stockMovements: true,
                orderItems: true,
              },
            },
          },
        }),
        prisma.product.count({ where }),
      ]);

      return {
        products: products.map(this.formatProduct),
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Erreur récupération produits:", error);
      throw error;
    }
  }

  /**
   * Récupère un produit par ID
   */
  static async getProductById(
    productId: string,
    merchantId: string,
  ): Promise<Product | null> {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          merchantId,
        },
        include: {
          stockMovements: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: {
              stockMovements: true,
              orderItems: true,
            },
          },
        },
      });

      return product ? this.formatProduct(product) : null;
    } catch (error) {
      console.error("Erreur récupération produit:", error);
      throw error;
    }
  }

  /**
   * Crée un nouveau produit
   */
  static async createProduct(
    merchantId: string,
    productData: Omit<Product, "id" | "merchantId" | "createdAt" | "updatedAt">,
  ): Promise<Product> {
    try {
      // Vérifier l'unicité du SKU
      const existingSku = await prisma.product.findFirst({
        where: {
          merchantId,
          sku: productData.sku,
        },
      });

      if (existingSku) {
        throw new Error("Un produit avec ce SKU existe déjà");
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          merchantId,
          dimensions: productData.dimensions
            ? JSON.stringify(productData.dimensions)
            : null,
          attributes: JSON.stringify(productData.attributes || {}),
          images: JSON.stringify(productData.images || []),
          tags: JSON.stringify(productData.tags || []),
        },
      });

      // Créer un mouvement de stock initial
      if (productData.stockQuantity > 0) {
        await this.addStockMovement(product.id, {
          type: "IN",
          quantity: productData.stockQuantity,
          reason: "Stock initial",
          userId: merchantId,
        });
      }

      return this.formatProduct(product);
    } catch (error) {
      console.error("Erreur création produit:", error);
      throw error;
    }
  }

  /**
   * Met à jour un produit
   */
  static async updateProduct(
    productId: string,
    merchantId: string,
    updates: Partial<Product>,
  ): Promise<Product> {
    try {
      // Vérifier que le produit appartient au commerçant
      const existingProduct = await prisma.product.findFirst({
        where: {
          id: productId,
          merchantId,
        },
      });

      if (!existingProduct) {
        throw new Error("Produit non trouvé");
      }

      // Vérifier l'unicité du SKU si modifié
      if (updates.sku && updates.sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findFirst({
          where: {
            merchantId,
            sku: updates.sku,
            id: { not: productId },
          },
        });

        if (existingSku) {
          throw new Error("Un produit avec ce SKU existe déjà");
        }
      }

      // Préparer les données de mise à jour
      const updateData: any = { ...updates };

      if (updates.dimensions) {
        updateData.dimensions = JSON.stringify(updates.dimensions);
      }

      if (updates.attributes) {
        updateData.attributes = JSON.stringify(updates.attributes);
      }

      if (updates.images) {
        updateData.images = JSON.stringify(updates.images);
      }

      if (updates.tags) {
        updateData.tags = JSON.stringify(updates.tags);
      }

      delete updateData.id;
      delete updateData.merchantId;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      const product = await prisma.product.update({
        where: { id: productId },
        data: updateData,
      });

      return this.formatProduct(product);
    } catch (error) {
      console.error("Erreur mise à jour produit:", error);
      throw error;
    }
  }

  /**
   * Supprime un produit
   */
  static async deleteProduct(
    productId: string,
    merchantId: string,
  ): Promise<void> {
    try {
      // Vérifier que le produit appartient au commerçant
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          merchantId,
        },
      });

      if (!product) {
        throw new Error("Produit non trouvé");
      }

      // Vérifier qu'il n'y a pas de commandes en cours
      const activeOrders = await prisma.orderItem.count({
        where: {
          productId,
          order: {
            status: {
              in: ["PENDING", "CONFIRMED", "PROCESSING"],
            },
          },
        },
      });

      if (activeOrders > 0) {
        throw new Error(
          "Impossible de supprimer un produit avec des commandes en cours",
        );
      }

      // Supprimer le produit (soft delete)
      await prisma.product.update({
        where: { id: productId },
        data: {
          status: "DISCONTINUED",
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Erreur suppression produit:", error);
      throw error;
    }
  }

  /**
   * Gestion des mouvements de stock
   */
  static async addStockMovement(
    productId: string,
    movement: {
      type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
      quantity: number;
      reason: string;
      reference?: string;
      userId: string;
    },
  ): Promise<StockMovement> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Créer le mouvement
        const stockMovement = await tx.stockMovement.create({
          data: {
            productId,
            ...movement,
          },
        });

        // Mettre à jour le stock du produit
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error("Produit non trouvé");
        }

        let newQuantity = product.stockQuantity;

        switch (movement.type) {
          case "IN":
            newQuantity += movement.quantity;
            break;
          case "OUT":
            newQuantity -= movement.quantity;
            break;
          case "ADJUSTMENT":
            newQuantity = movement.quantity;
            break;
          case "TRANSFER":
            newQuantity -= movement.quantity;
            break;
        }

        // Empêcher le stock négatif
        if (newQuantity < 0) {
          throw new Error("Stock insuffisant");
        }

        // Mettre à jour le stock
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: newQuantity,
            status:
              newQuantity === 0
                ? "OUT_OF_STOCK"
                : newQuantity <= product.minStockLevel
                  ? "ACTIVE"
                  : "ACTIVE",
          },
        });

        // Créer des alertes si nécessaire
        await this.checkStockAlerts(
          productId,
          newQuantity,
          product.minStockLevel,
          product.maxStockLevel,
        );

        return this.formatStockMovement(stockMovement);
      });
    } catch (error) {
      console.error("Erreur mouvement stock:", error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des mouvements de stock
   */
  static async getStockMovements(
    productId: string,
    filters?: {
      type?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    movements: StockMovement[];
    total: number;
  }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { productId };

      if (filters?.type) {
        where.type = filters.type;
      }

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return {
        movements: movements.map(this.formatStockMovement),
        total,
      };
    } catch (error) {
      console.error("Erreur historique stock:", error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques d'inventaire
   */
  static async getInventoryStats(merchantId: string): Promise<InventoryStats> {
    try {
      const [
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        productValues,
        topSelling,
        categories,
      ] = await Promise.all([
        // Total produits
        prisma.product.count({
          where: { merchantId },
        }),

        // Produits actifs
        prisma.product.count({
          where: {
            merchantId,
            status: "ACTIVE",
          },
        }),

        // Produits en stock faible
        prisma.product.count({
          where: {
            merchantId,
            stockQuantity: {
              lte: prisma.product.fields.minStockLevel,
            },
            status: "ACTIVE",
          },
        }),

        // Produits en rupture
        prisma.product.count({
          where: {
            merchantId,
            stockQuantity: 0,
          },
        }),

        // Valeurs de stock
        prisma.product.findMany({
          where: { merchantId },
          select: {
            price: true,
            costPrice: true,
            stockQuantity: true,
          },
        }),

        // Top ventes (simulé)
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            order: {
              merchantId,
              status: "COMPLETED",
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
              },
            },
          },
          _sum: {
            quantity: true,
            price: true,
          },
          orderBy: {
            _sum: {
              quantity: "desc",
            },
          },
          take: 10,
        }),

        // Répartition par catégories
        prisma.product.groupBy({
          by: ["category"],
          where: { merchantId },
          _count: true,
          _sum: {
            stockQuantity: true,
          },
        }),
      ]);

      // Calculs des valeurs
      const totalValue = productValues.reduce(
        (sum, p) => sum + p.price * p.stockQuantity,
        0,
      );
      const totalCostValue = productValues.reduce(
        (sum, p) => sum + p.costPrice * p.stockQuantity,
        0,
      );
      const profitMargin =
        totalValue > 0 ? ((totalValue - totalCostValue) / totalValue) * 100 : 0;

      // Top produits vendus
      const topSellingProducts = await Promise.all(
        topSelling.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });

          return {
            productId: item.productId,
            name: product?.name || "Produit supprimé",
            soldQuantity: item._sum.quantity || 0,
            revenue: item._sum.price || 0,
          };
        }),
      );

      // Répartition par catégories
      const totalCategoryProducts = categories.reduce(
        (sum, cat) => sum + cat._count,
        0,
      );
      const categoryBreakdown = categories.map((cat) => ({
        category: cat.category,
        productCount: cat._count,
        totalValue: cat._sum.stockQuantity || 0,
        percentage:
          totalCategoryProducts > 0
            ? (cat._count / totalCategoryProducts) * 100
            : 0,
      }));

      return {
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue,
        totalCostValue,
        profitMargin,
        turnoverRate: 0, // À calculer avec les vraies données de ventes
        topSellingProducts,
        categoryBreakdown,
      };
    } catch (error) {
      console.error("Erreur statistiques inventaire:", error);
      throw error;
    }
  }

  /**
   * Récupère les alertes d'inventaire
   */
  static async getInventoryAlerts(
    merchantId: string,
  ): Promise<InventoryAlert[]> {
    try {
      // Simuler les alertes pour l'instant
      // Dans une vraie app, récupérer depuis une table alerts

      const lowStockProducts = await prisma.product.findMany({
        where: {
          merchantId,
          stockQuantity: {
            lte: prisma.product.fields.minStockLevel,
          },
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          minStockLevel: true,
        },
      });

      const alerts: InventoryAlert[] = lowStockProducts.map((product) => ({
        id: `alert-${product.id}`,
        productId: product.id,
        type: product.stockQuantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        message:
          product.stockQuantity === 0
            ? `${product.name} est en rupture de stock`
            : `${product.name} a un stock faible (${product.stockQuantity} restants)`,
        severity: product.stockQuantity === 0 ? "CRITICAL" : "HIGH",
        isRead: false,
        createdAt: new Date(),
      }));

      return alerts;
    } catch (error) {
      console.error("Erreur alertes inventaire:", error);
      throw error;
    }
  }

  /**
   * Gestion des catégories
   */
  static async getCategories(merchantId: string): Promise<Category[]> {
    try {
      // Pour l'instant, retourner des catégories par défaut
      // Dans une vraie app, récupérer depuis la base de données

      const defaultCategories: Category[] = [
        {
          id: "alimentaire",
          name: "Alimentaire",
          description: "Produits alimentaires et boissons",
          slug: "alimentaire",
          isActive: true,
          sortOrder: 1,
          subcategories: [
            {
              id: "fruits-legumes",
              name: "Fruits et Légumes",
              slug: "fruits-legumes",
              parentId: "alimentaire",
              isActive: true,
              sortOrder: 1,
            },
            {
              id: "epicerie",
              name: "Épicerie",
              slug: "epicerie",
              parentId: "alimentaire",
              isActive: true,
              sortOrder: 2,
            },
          ],
        },
        {
          id: "vetements",
          name: "Vêtements",
          description: "Mode et accessoires",
          slug: "vetements",
          isActive: true,
          sortOrder: 2,
        },
        {
          id: "electronique",
          name: "Électronique",
          description: "Appareils et accessoires électroniques",
          slug: "electronique",
          isActive: true,
          sortOrder: 3,
        },
      ];

      return defaultCategories;
    } catch (error) {
      console.error("Erreur récupération catégories:", error);
      throw error;
    }
  }

  // Méthodes utilitaires privées
  private static formatProduct(product: any): Product {
    return {
      ...product,
      dimensions: product.dimensions
        ? JSON.parse(product.dimensions)
        : undefined,
      attributes: product.attributes ? JSON.parse(product.attributes) : {},
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
    };
  }

  private static formatStockMovement(movement: any): StockMovement {
    return {
      id: movement.id,
      productId: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      reference: movement.reference,
      userId: movement.userId,
      createdAt: movement.createdAt,
    };
  }

  private static async checkStockAlerts(
    productId: string,
    currentStock: number,
    minLevel: number,
    maxLevel: number,
  ): Promise<void> {
    // Logique pour créer des alertes automatiques
    // À implémenter selon les besoins
  }
}

// Schémas de validation
export const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z
    .string()
    .min(10, "La description doit faire au moins 10 caractères"),
  sku: z.string().min(1, "Le SKU est requis"),
  category: z.string().min(1, "La catégorie est requise"),
  subcategory: z.string().optional(),
  price: z.number().positive("Le prix doit être positif"),
  costPrice: z.number().positive("Le prix de revient doit être positif"),
  stockQuantity: z.number().int().min(0, "Le stock ne peut pas être négatif"),
  minStockLevel: z
    .number()
    .int()
    .min(0, "Le niveau minimum ne peut pas être négatif"),
  maxStockLevel: z
    .number()
    .int()
    .min(0, "Le niveau maximum ne peut pas être négatif"),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export const stockMovementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT", "TRANSFER"]),
  quantity: z.number().int().positive("La quantité doit être positive"),
  reason: z.string().min(1, "La raison est requise"),
  reference: z.string().optional(),
});
