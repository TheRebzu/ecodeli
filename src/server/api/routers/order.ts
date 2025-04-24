import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { OrderStatus, PaymentStatus, ProductStatus, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const orderRouter = createTRPCRouter({
  // Procédures pour les produits
  getProducts: publicProcedure
    .input(
      z.object({
        storeId: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        status: z.nativeEnum(ProductStatus).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeId, category, search, status, limit, cursor } = input;
      
      const where = {
        ...(storeId && { storeId }),
        ...(category && { category }),
        ...(search && { 
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(status && { status }),
        status: { not: ProductStatus.INACTIVE },
      };
      
      const products = await ctx.db.product.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      });
      
      let nextCursor: typeof cursor | undefined = undefined;
      if (products.length > limit) {
        const nextItem = products.pop();
        nextCursor = nextItem?.id;
      }
      
      return {
        products,
        nextCursor,
      };
    }),
    
  getProductById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              address: true,
              city: true,
              postalCode: true,
            },
          },
        },
      });
      
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }
      
      return product;
    }),
    
  createProduct: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(1),
        price: z.number().positive(),
        imageUrl: z.string().url().optional(),
        category: z.string().min(1),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        weight: z.number().positive().optional(),
        dimensions: z.string().optional(),
        stockQuantity: z.number().int().optional(),
        storeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est un commerçant
      if (ctx.session.user.role !== UserRole.MERCHANT && ctx.session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only merchants can create products",
        });
      }
      
      // Vérifier que le commerce appartient à l'utilisateur
      if (ctx.session.user.role === UserRole.MERCHANT) {
        const store = await ctx.db.store.findUnique({
          where: { id: input.storeId },
        });
        
        if (!store || store.merchantId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to add products to this store",
          });
        }
      }
      
      // Créer le produit
      const product = await ctx.db.product.create({
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          imageUrl: input.imageUrl,
          category: input.category,
          sku: input.sku,
          barcode: input.barcode,
          weight: input.weight,
          dimensions: input.dimensions,
          stockQuantity: input.stockQuantity,
          inStock: input.stockQuantity ? input.stockQuantity > 0 : true,
          storeId: input.storeId,
        },
      });
      
      return product;
    }),
    
  updateProduct: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).optional(),
        price: z.number().positive().optional(),
        imageUrl: z.string().url().optional(),
        category: z.string().min(1).optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        weight: z.number().positive().optional(),
        dimensions: z.string().optional(),
        stockQuantity: z.number().int().optional(),
        status: z.nativeEnum(ProductStatus).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier que le produit existe
      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
        include: { store: true },
      });
      
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à modifier ce produit
      if (
        ctx.session.user.role !== UserRole.ADMIN &&
        (ctx.session.user.role !== UserRole.MERCHANT || product.store.merchantId !== ctx.session.user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this product",
        });
      }
      
      // Mettre à jour le produit
      const updatedProduct = await ctx.db.product.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description && { description: input.description }),
          ...(input.price && { price: input.price }),
          ...(input.imageUrl && { imageUrl: input.imageUrl }),
          ...(input.category && { category: input.category }),
          ...(input.sku && { sku: input.sku }),
          ...(input.barcode && { barcode: input.barcode }),
          ...(input.weight && { weight: input.weight }),
          ...(input.dimensions && { dimensions: input.dimensions }),
          ...(input.stockQuantity !== undefined && { 
            stockQuantity: input.stockQuantity,
            inStock: input.stockQuantity > 0,
          }),
          ...(input.status && { status: input.status }),
        },
      });
      
      return updatedProduct;
    }),
    
  deleteProduct: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que le produit existe
      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
        include: { store: true },
      });
      
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à supprimer ce produit
      if (
        ctx.session.user.role !== UserRole.ADMIN &&
        (ctx.session.user.role !== UserRole.MERCHANT || product.store.merchantId !== ctx.session.user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this product",
        });
      }
      
      // Supprimer le produit (ou le marquer comme inactif)
      await ctx.db.product.update({
        where: { id: input.id },
        data: { status: ProductStatus.INACTIVE },
      });
      
      return { success: true };
    }),
  
  // Procédures pour les commandes
  getOrders: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(OrderStatus).optional(),
        storeId: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, storeId, limit, cursor } = input;
      
      // Construire la requête en fonction du rôle de l'utilisateur
      let where = {};
      
      if (ctx.session.user.role === UserRole.CLIENT) {
        // Les clients ne peuvent voir que leurs propres commandes
        where = {
          clientId: ctx.session.user.id,
          ...(status && { status }),
          ...(storeId && { storeId }),
        };
      } else if (ctx.session.user.role === UserRole.MERCHANT) {
        // Les commerçants ne peuvent voir que les commandes de leurs commerces
        const stores = await ctx.db.store.findMany({
          where: { merchantId: ctx.session.user.id },
          select: { id: true },
        });
        
        const storeIds = stores.map(store => store.id);
        
        where = {
          storeId: { in: storeIds },
          ...(status && { status }),
          ...(storeId && { storeId }),
        };
      } else if (ctx.session.user.role === UserRole.DELIVERER) {
        // Les livreurs ne peuvent voir que les commandes qui leur sont assignées
        const deliveries = await ctx.db.delivery.findMany({
          where: { 
            announcementId: {
              in: await ctx.db.announcement.findMany({
                where: { delivererId: ctx.session.user.id },
                select: { id: true },
              }).then(announcements => announcements.map(a => a.id)),
            },
          },
          select: { id: true },
        });
        
        const deliveryIds = deliveries.map(delivery => delivery.id);
        
        where = {
          deliveryId: { in: deliveryIds },
          ...(status && { status }),
          ...(storeId && { storeId }),
        };
      } else if (ctx.session.user.role === UserRole.ADMIN) {
        // Les admins peuvent voir toutes les commandes
        where = {
          ...(status && { status }),
          ...(storeId && { storeId }),
        };
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view orders",
        });
      }
      
      const orders = await ctx.db.order.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
          delivery: {
            select: {
              id: true,
              status: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });
      
      let nextCursor: typeof cursor | undefined = undefined;
      if (orders.length > limit) {
        const nextItem = orders.pop();
        nextCursor = nextItem?.id;
      }
      
      return {
        orders,
        nextCursor,
      };
    }),
    
  getOrderById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
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
          store: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              address: true,
              city: true,
              postalCode: true,
            },
          },
          orderItems: {
            include: {
              product: true,
            },
          },
          delivery: {
            include: {
              locationUpdates: {
                orderBy: { timestamp: "desc" },
              },
            },
          },
          payments: true,
        },
      });
      
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à voir cette commande
      if (ctx.session.user.role === UserRole.CLIENT && order.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view this order",
        });
      }
      
      if (ctx.session.user.role === UserRole.MERCHANT) {
        const store = await ctx.db.store.findUnique({
          where: { id: order.storeId },
        });
        
        if (!store || store.merchantId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this order",
          });
        }
      }
      
      if (ctx.session.user.role === UserRole.DELIVERER && order.delivery) {
        const delivery = await ctx.db.delivery.findUnique({
          where: { id: order.deliveryId! },
          include: {
            announcement: true,
          },
        });
        
        if (!delivery?.announcement || delivery.announcement.delivererId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this order",
          });
        }
      }
      
      return order;
    }),
    
  createOrder: protectedProcedure
    .input(
      z.object({
        storeId: z.string(),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().int().positive(),
            notes: z.string().optional(),
          })
        ),
        shippingAddress: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est un client
      if (ctx.session.user.role !== UserRole.CLIENT && ctx.session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only clients can create orders",
        });
      }
      
      // Vérifier que le commerce existe
      const store = await ctx.db.store.findUnique({
        where: { id: input.storeId },
      });
      
      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }
      
      // Récupérer les produits pour calculer le montant total
      const productIds = input.items.map(item => item.productId);
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: productIds },
          storeId: input.storeId,
        },
      });
      
      // Vérifier que tous les produits existent et appartiennent au commerce
      if (products.length !== productIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more products not found or not available in this store",
        });
      }
      
      // Calculer le montant total et préparer les éléments de commande
      let totalAmount = 0;
      const orderItems = input.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Product ${item.productId} not found`,
          });
        }
        
        const totalPrice = product.price * item.quantity;
        totalAmount += totalPrice;
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice,
          notes: item.notes,
        };
      });
      
      // Calculer les frais de livraison et les taxes
      const shippingFee = 5.0; // Frais de livraison fixe pour l'exemple
      const taxRate = 0.2; // TVA à 20% pour l'exemple
      const tax = totalAmount * taxRate;
      
      totalAmount += shippingFee + tax;
      
      // Générer un numéro de commande unique
      const orderNumber = `ECO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Créer la commande avec ses éléments
      const order = await ctx.db.order.create({
        data: {
          orderNumber,
          clientId: ctx.session.user.id,
          storeId: input.storeId,
          totalAmount,
          shippingAddress: input.shippingAddress,
          shippingFee,
          tax,
          notes: input.notes,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });
      
      return order;
    }),
    
  updateOrderStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(OrderStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier que la commande existe
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
        include: {
          store: true,
        },
      });
      
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à modifier cette commande
      if (ctx.session.user.role === UserRole.CLIENT) {
        // Les clients ne peuvent annuler que leurs propres commandes en statut PENDING
        if (
          order.clientId !== ctx.session.user.id ||
          input.status !== OrderStatus.CANCELLED ||
          order.status !== OrderStatus.PENDING
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this order",
          });
        }
      } else if (ctx.session.user.role === UserRole.MERCHANT) {
        // Les commerçants ne peuvent mettre à jour que les commandes de leurs commerces
        if (order.store.merchantId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this order",
          });
        }
        
        // Les commerçants ne peuvent pas marquer une commande comme livrée
        if (input.status === OrderStatus.DELIVERED) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Merchants cannot mark orders as delivered",
          });
        }
      } else if (ctx.session.user.role === UserRole.DELIVERER) {
        // Les livreurs ne peuvent mettre à jour que les commandes qui leur sont assignées
        // et uniquement pour les statuts IN_TRANSIT et DELIVERED
        if (
          !order.deliveryId ||
          ![OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(input.status)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this order",
          });
        }
        
        const delivery = await ctx.db.delivery.findUnique({
          where: { id: order.deliveryId },
          include: {
            announcement: true,
          },
        });
        
        if (!delivery?.announcement || delivery.announcement.delivererId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this order",
          });
        }
      } else if (ctx.session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this order",
        });
      }
      
      // Mettre à jour le statut de la commande
      const updatedOrder = await ctx.db.order.update({
        where: { id: input.id },
        data: { status: input.status },
      });
      
      // Si la commande est livrée, mettre à jour la livraison également
      if (input.status === OrderStatus.DELIVERED && order.deliveryId) {
        await ctx.db.delivery.update({
          where: { id: order.deliveryId },
          data: {
            status: "DELIVERED",
            endTime: new Date(),
          },
        });
      }
      
      return updatedOrder;
    }),
    
  // Procédures pour le panier (cart)
  getCart: protectedProcedure
    .query(async ({ ctx }) => {
      // Récupérer le panier depuis la session ou la base de données
      // Pour cet exemple, nous utilisons une approche simplifiée avec localStorage côté client
      // Dans une implémentation réelle, vous pourriez stocker le panier dans la base de données
      
      return { message: "Cart functionality should be implemented client-side with localStorage" };
    }),
});
