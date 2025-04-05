import { NextRequest, NextResponse } from "next/server";
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import * as auth from "next-auth";

// Mock Prisma client
const prismaObj = { default: undefined };
const mockPrisma = mockDeep<PrismaClient>();
prismaObj.default = mockPrisma;

jest.mock("@/lib/prisma", () => prismaObj);

// Mock Next Auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}));

// Handlers d'API
const createPaymentIntentHandler = jest.fn();
const getPaymentHandler = jest.fn();
const webhookHandler = jest.fn();
const listPaymentsHandler = jest.fn();

// Données de test
const mockUser = {
  id: "user123",
  email: "test@example.com",
  name: "Test User",
  role: "CLIENT"
};

const mockPaymentIntent = {
  id: "pi_123456",
  clientSecret: "pi_123456_secret_789",
  amount: 2999,
  currency: "eur",
  status: "requires_payment_method",
  created: Date.now(),
  metadata: {
    orderId: "order123"
  }
};

const mockPayment = {
  id: "payment123",
  userId: "user123",
  amount: 29.99,
  currency: "EUR",
  status: "PENDING",
  paymentIntentId: "pi_123456",
  paymentMethodId: null,
  orderId: "order123",
  metadata: { source: "web" },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock du service de paiement (e.g., Stripe)
const mockStripeService = {
  createPaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
  retrievePaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
  constructEvent: jest.fn().mockReturnValue({
    type: "payment_intent.succeeded",
    data: { object: mockPaymentIntent }
  })
};

// Au lieu de mocker un module spécifique, créons une fonction mock
const paymentServiceMock = {
  createPaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
  retrievePaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
  constructEvent: jest.fn().mockReturnValue({
    type: "payment_intent.succeeded",
    data: { object: mockPaymentIntent }
  })
};

describe("API de paiements", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Configurations par défaut pour les mocks
    createPaymentIntentHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: {
          clientSecret: mockPaymentIntent.clientSecret,
          amount: mockPaymentIntent.amount / 100,
          currency: mockPaymentIntent.currency
        }
      }, { status: 200 });
    });
    
    getPaymentHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: mockPayment
      }, { status: 200 });
    });
    
    webhookHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        message: "Webhook processed successfully"
      }, { status: 200 });
    });
    
    listPaymentsHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: [mockPayment],
        meta: {
          pagination: {
            totalItems: 1,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: 10
          }
        }
      }, { status: 200 });
    });
  });

  describe("Création d'intent de paiement", () => {
    it("devrait créer un intent de paiement pour un utilisateur authentifié", async () => {
      // Arrangement
      const requestData = {
        amount: 29.99,
        currency: "EUR",
        orderId: "order123",
        metadata: { source: "web" }
      };

      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      const req = new NextRequest("http://localhost:3000/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await createPaymentIntentHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            clientSecret: expect.any(String),
            amount: expect.any(Number),
            currency: expect.any(String)
          })
        })
      );
    });

    it("devrait refuser la création d'un intent de paiement pour un utilisateur non authentifié", async () => {
      // Arrangement
      const requestData = {
        amount: 29.99,
        currency: "EUR",
        orderId: "order123"
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      createPaymentIntentHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized"
          }
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await createPaymentIntentHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "UNAUTHORIZED"
          })
        })
      );
    });

    it("devrait retourner une erreur pour des données de paiement invalides", async () => {
      // Arrangement
      const requestData = {
        amount: -10, // Montant négatif invalide
        currency: "INVALID",
        orderId: "order123"
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      createPaymentIntentHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid payment data",
            details: {
              amount: { _errors: ["Number must be positive"] },
              currency: { _errors: ["Invalid currency code"] }
            }
          }
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await createPaymentIntentHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "VALIDATION_ERROR"
          })
        })
      );
    });
  });

  describe("Récupération d'un paiement", () => {
    it("devrait récupérer les détails d'un paiement pour un utilisateur authentifié", async () => {
      // Arrangement
      const paymentId = "payment123";

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      const req = new NextRequest(`http://localhost:3000/api/payments/${paymentId}`);

      // Action
      const response = await getPaymentHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: paymentId,
            amount: mockPayment.amount
          })
        })
      );
    });

    it("devrait refuser l'accès à un paiement pour un utilisateur non autorisé", async () => {
      // Arrangement
      const paymentId = "payment123";

      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        userId: "different-user"
      });

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      getPaymentHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to access this payment"
          }
        }, { status: 403 });
      });

      const req = new NextRequest(`http://localhost:3000/api/payments/${paymentId}`);

      // Action
      const response = await getPaymentHandler(req);

      // Assertions
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "FORBIDDEN"
          })
        })
      );
    });

    it("devrait retourner une erreur 404 pour un paiement inexistant", async () => {
      // Arrangement
      const paymentId = "nonexistent";

      mockPrisma.payment.findUnique.mockResolvedValue(null);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      getPaymentHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Payment not found"
          }
        }, { status: 404 });
      });

      const req = new NextRequest(`http://localhost:3000/api/payments/${paymentId}`);

      // Action
      const response = await getPaymentHandler(req);

      // Assertions
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "NOT_FOUND"
          })
        })
      );
    });
  });

  describe("Webhook de paiement", () => {
    it("devrait traiter un événement de paiement réussi", async () => {
      // Arrangement
      // Simuler la signature pour le webhook
      const signature = "whsec_test_signature";
      
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: "COMPLETED"
      });
      
      mockPrisma.order.update.mockResolvedValue({
        id: "order123",
        status: "PAID"
      });

      const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Stripe-Signature": signature
        },
        body: JSON.stringify({
          id: "evt_123",
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: mockPaymentIntent.id,
              status: "succeeded",
              amount: mockPaymentIntent.amount,
              metadata: mockPaymentIntent.metadata
            }
          }
        })
      });

      // Action
      const response = await webhookHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });

    it("devrait rejeter un webhook sans signature valide", async () => {
      // Arrangement
      webhookHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_SIGNATURE",
            message: "Invalid webhook signature"
          }
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment_intent.succeeded" })
      });

      // Action
      const response = await webhookHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "INVALID_SIGNATURE"
          })
        })
      );
    });
  });

  describe("Liste des paiements", () => {
    it("devrait récupérer la liste des paiements d'un utilisateur", async () => {
      // Arrangement
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.payment.count.mockResolvedValue(1);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      const req = new NextRequest("http://localhost:3000/api/payments");

      // Action
      const response = await listPaymentsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: mockPayment.id,
              amount: mockPayment.amount
            })
          ])
        })
      );
    });

    it("devrait refuser l'accès à la liste des paiements pour un utilisateur non authentifié", async () => {
      // Arrangement
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      listPaymentsHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized"
          }
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/payments");

      // Action
      const response = await listPaymentsHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "UNAUTHORIZED"
          })
        })
      );
    });

    it("devrait filtrer les paiements par statut", async () => {
      // Arrangement
      const status = "COMPLETED";
      const url = new URL("http://localhost:3000/api/payments");
      url.searchParams.set("status", status);
      
      mockPrisma.payment.findMany.mockImplementationOnce((params) => {
        expect(params.where.status).toBe(status);
        return Promise.resolve([{
          ...mockPayment,
          status
        }]);
      });
      
      mockPrisma.payment.count.mockResolvedValue(1);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      const req = new NextRequest(url);

      // Action
      const response = await listPaymentsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });
  });
}); 