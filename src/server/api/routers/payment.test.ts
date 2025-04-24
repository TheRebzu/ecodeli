import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { OrderStatus, PaymentStatus, PaymentType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// Mock des fonctions Stripe
vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({
    sessionId: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
  }),
  getCheckoutSession: vi.fn().mockResolvedValue({
    id: 'cs_test_123',
    payment_status: 'paid',
    payment_intent: 'pi_test_123',
    customer_email: 'test@example.com',
    amount_total: 2500,
    currency: 'eur',
  }),
}));

// Mock du contexte tRPC
const mockCtx = {
  session: {
    user: {
      id: 'user_123',
      role: 'CLIENT',
    },
  },
  db: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
};

// Import des fonctions mockées
import { createCheckoutSession, getCheckoutSession } from '@/lib/stripe';

// Création d'un routeur de test
const createTestRouter = () => {
  return createTRPCRouter({
    createCheckoutSession: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const order = await ctx.db.order.findUnique({
          where: { id: input.orderId },
          include: {
            client: true,
            store: true,
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        });
        
        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Commande introuvable',
          });
        }
        
        if (order.clientId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à payer cette commande',
          });
        }
        
        if (order.paymentStatus !== PaymentStatus.PENDING) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette commande a déjà été payée ou annulée',
          });
        }
        
        const items = order.orderItems.map(item => ({
          name: item.product.name,
          description: item.product.description.substring(0, 100),
          amount: Math.round(item.unitPrice * 100),
          quantity: item.quantity,
        }));
        
        const baseUrl = 'http://localhost:3000';
        
        const { sessionId, url } = await createCheckoutSession({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerEmail: order.client.email,
          customerName: order.client.name || 'Client',
          amount: Math.round(order.totalAmount * 100),
          successUrl: `${baseUrl}/payment/success`,
          cancelUrl: `${baseUrl}/payment/cancel?orderId=${order.id}`,
          items,
        });
        
        await ctx.db.payment.create({
          data: {
            amount: order.totalAmount,
            type: PaymentType.ORDER,
            status: PaymentStatus.PENDING,
            externalId: sessionId,
            orderId: order.id,
          },
        });
        
        return { sessionId, url };
      }),
      
    checkPaymentStatus: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const session = await getCheckoutSession(input.sessionId);
        
        const payment = await ctx.db.payment.findFirst({
          where: { externalId: input.sessionId },
          include: {
            order: true,
          },
        });
        
        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement introuvable',
          });
        }
        
        if (
          payment.order?.clientId !== ctx.session.user.id && 
          ctx.session.user.role !== 'ADMIN' &&
          ctx.session.user.role !== 'MERCHANT'
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à voir ce paiement',
          });
        }
        
        if (session.payment_status === 'paid' && payment.status === PaymentStatus.PENDING) {
          await ctx.db.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.COMPLETED },
          });
          
          if (payment.orderId) {
            await ctx.db.order.update({
              where: { id: payment.orderId },
              data: { 
                paymentStatus: PaymentStatus.COMPLETED,
                status: OrderStatus.CONFIRMED,
              },
            });
          }
        }
        
        return {
          paymentStatus: session.payment_status,
          paymentIntent: session.payment_intent,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          orderId: payment.orderId,
        };
      }),
  });
};

describe('Payment Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session for a valid order', async () => {
      // Mock order data
      const mockOrder = {
        id: 'order_123',
        orderNumber: 'ECO-123',
        clientId: 'user_123',
        paymentStatus: PaymentStatus.PENDING,
        totalAmount: 25.00,
        client: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User',
        },
        store: {
          id: 'store_123',
          name: 'Test Store',
        },
        orderItems: [
          {
            id: 'item_1',
            product: {
              id: 'product_1',
              name: 'Product 1',
              description: 'Description of product 1',
            },
            unitPrice: 15.00,
            quantity: 1,
          },
          {
            id: 'item_2',
            product: {
              id: 'product_2',
              name: 'Product 2',
              description: 'Description of product 2',
            },
            unitPrice: 10.00,
            quantity: 1,
          },
        ],
      };

      // Setup mocks
      mockCtx.db.order.findUnique.mockResolvedValueOnce(mockOrder);
      mockCtx.db.payment.create.mockResolvedValueOnce({
        id: 'payment_123',
        externalId: 'cs_test_123',
      });

      // Create router
      const router = createTestRouter();

      // Call procedure
      const result = await router.createCheckoutSession.call({
        ctx: mockCtx,
        input: { orderId: 'order_123' },
        path: 'createCheckoutSession',
        rawInput: { orderId: 'order_123' },
        type: 'mutation',
      });

      // Assertions
      expect(mockCtx.db.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        include: {
          client: true,
          store: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      expect(createCheckoutSession).toHaveBeenCalled();
      expect(mockCtx.db.payment.create).toHaveBeenCalled();

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    });

    it('should throw an error if order is not found', async () => {
      // Setup mocks
      mockCtx.db.order.findUnique.mockResolvedValueOnce(null);

      // Create router
      const router = createTestRouter();

      // Call procedure and expect error
      await expect(
        router.createCheckoutSession.call({
          ctx: mockCtx,
          input: { orderId: 'non_existent_order' },
          path: 'createCheckoutSession',
          rawInput: { orderId: 'non_existent_order' },
          type: 'mutation',
        })
      ).rejects.toThrow('Commande introuvable');
    });

    it('should throw an error if user is not authorized', async () => {
      // Mock order data with different client ID
      const mockOrder = {
        id: 'order_123',
        orderNumber: 'ECO-123',
        clientId: 'different_user_id',
        paymentStatus: PaymentStatus.PENDING,
        client: {
          id: 'different_user_id',
          email: 'other@example.com',
        },
        store: {},
        orderItems: [],
      };

      // Setup mocks
      mockCtx.db.order.findUnique.mockResolvedValueOnce(mockOrder);

      // Create router
      const router = createTestRouter();

      // Call procedure and expect error
      await expect(
        router.createCheckoutSession.call({
          ctx: mockCtx,
          input: { orderId: 'order_123' },
          path: 'createCheckoutSession',
          rawInput: { orderId: 'order_123' },
          type: 'mutation',
        })
      ).rejects.toThrow('Vous n\'êtes pas autorisé à payer cette commande');
    });
  });

  describe('checkPaymentStatus', () => {
    it('should check payment status and update order if paid', async () => {
      // Mock payment data
      const mockPayment = {
        id: 'payment_123',
        externalId: 'cs_test_123',
        status: PaymentStatus.PENDING,
        orderId: 'order_123',
        order: {
          id: 'order_123',
          clientId: 'user_123',
        },
      };

      // Setup mocks
      mockCtx.db.payment.findFirst.mockResolvedValueOnce(mockPayment);
      mockCtx.db.payment.update.mockResolvedValueOnce({
        id: 'payment_123',
        status: PaymentStatus.COMPLETED,
      });
      mockCtx.db.order.update.mockResolvedValueOnce({
        id: 'order_123',
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.COMPLETED,
      });

      // Create router
      const router = createTestRouter();

      // Call procedure
      const result = await router.checkPaymentStatus.call({
        ctx: mockCtx,
        input: { sessionId: 'cs_test_123' },
        path: 'checkPaymentStatus',
        rawInput: { sessionId: 'cs_test_123' },
        type: 'query',
      });

      // Assertions
      expect(getCheckoutSession).toHaveBeenCalledWith('cs_test_123');
      expect(mockCtx.db.payment.findFirst).toHaveBeenCalledWith({
        where: { externalId: 'cs_test_123' },
        include: {
          order: true,
        },
      });

      expect(mockCtx.db.payment.update).toHaveBeenCalled();
      expect(mockCtx.db.order.update).toHaveBeenCalled();

      expect(result).toEqual({
        paymentStatus: 'paid',
        paymentIntent: 'pi_test_123',
        customerEmail: 'test@example.com',
        amountTotal: 25,
        currency: 'eur',
        orderId: 'order_123',
      });
    });
  });
});
