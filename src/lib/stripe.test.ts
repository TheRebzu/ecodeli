import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckoutSession, getCheckoutSession } from '@/lib/stripe';

// Mock de Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123',
          }),
          retrieve: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            payment_status: 'paid',
            payment_intent: 'pi_test_123',
            customer_email: 'test@example.com',
            amount_total: 2500, // 25.00 €
            currency: 'eur',
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              payment_status: 'paid',
            },
          },
        }),
      },
      refunds: {
        create: vi.fn().mockResolvedValue({
          id: 're_test_123',
          status: 'succeeded',
        }),
      },
    })),
  };
});

describe('Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session successfully', async () => {
      const params = {
        orderId: 'order_123',
        orderNumber: 'ECO-123',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        amount: 2500, // 25.00 €
        successUrl: 'http://localhost:3000/payment/success',
        cancelUrl: 'http://localhost:3000/payment/cancel',
        items: [
          {
            name: 'Product 1',
            description: 'Description of product 1',
            amount: 1500, // 15.00 €
            quantity: 1,
          },
          {
            name: 'Product 2',
            description: 'Description of product 2',
            amount: 1000, // 10.00 €
            quantity: 1,
          },
        ],
      };

      const result = await createCheckoutSession(params);

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    });

    it('should throw an error if Stripe API fails', async () => {
      // Mock Stripe API failure
      const mockStripe = require('stripe')();
      mockStripe.checkout.sessions.create.mockRejectedValueOnce(new Error('Stripe API error'));

      const params = {
        orderId: 'order_123',
        orderNumber: 'ECO-123',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        amount: 2500,
        successUrl: 'http://localhost:3000/payment/success',
        cancelUrl: 'http://localhost:3000/payment/cancel',
        items: [
          {
            name: 'Product 1',
            description: 'Description of product 1',
            amount: 1500,
            quantity: 1,
          },
        ],
      };

      await expect(createCheckoutSession(params)).rejects.toThrow('Impossible de créer la session de paiement');
    });
  });

  describe('getCheckoutSession', () => {
    it('should retrieve a checkout session successfully', async () => {
      const sessionId = 'cs_test_123';
      const result = await getCheckoutSession(sessionId);

      expect(result).toEqual({
        id: 'cs_test_123',
        payment_status: 'paid',
        payment_intent: 'pi_test_123',
        customer_email: 'test@example.com',
        amount_total: 2500,
        currency: 'eur',
      });
    });

    it('should throw an error if session retrieval fails', async () => {
      // Mock Stripe API failure
      const mockStripe = require('stripe')();
      mockStripe.checkout.sessions.retrieve.mockRejectedValueOnce(new Error('Session not found'));

      const sessionId = 'invalid_session_id';
      await expect(getCheckoutSession(sessionId)).rejects.toThrow('Impossible de récupérer la session de paiement');
    });
  });
});
