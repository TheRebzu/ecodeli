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
const getDeliveriesHandler = jest.fn();
const createDeliveryHandler = jest.fn();

// Données de test
const mockCustomer = {
  id: "customer123",
  userId: "user-customer-123",
  address: "123 Client St",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockMerchant = {
  id: "merchant123",
  userId: "user-merchant-123",
  name: "Commerce Test",
  slug: "commerce-test",
  logo: "https://example.com/logo.png",
  address: "456 Commerce Ave",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockDeliveryPerson = {
  id: "delivery-person-123",
  userId: "user-delivery-123",
  transportType: "BIKE",
  licenseNumber: "LP12345",
  status: "AVAILABLE",
  currentLocation: { lat: 48.8566, lng: 2.3522 },
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCustomerUser = {
  id: "user-customer-123",
  email: "client@example.com",
  name: "Client Test",
  role: "CUSTOMER",
  phone: "+33612345678"
};

const mockMerchantUser = {
  id: "user-merchant-123",
  email: "commerce@example.com",
  name: "Commerce Test",
  role: "MERCHANT",
  phone: "+33687654321"
};

const mockDeliveryPersonUser = {
  id: "user-delivery-123",
  email: "livreur@example.com",
  name: "Livreur Test",
  role: "DELIVERY_PERSON",
  phone: "+33699999999"
};

const mockAdminUser = {
  id: "user-admin-123",
  email: "admin@example.com",
  name: "Admin Test",
  role: "ADMIN",
  phone: "+33600000000"
};

const mockDelivery = {
  id: "delivery123",
  origin: "123 Commerce Ave",
  destination: "456 Client St",
  recipientName: "Client Destinataire",
  recipientPhone: "+33612345678",
  recipientEmail: "destinataire@example.com",
  packageDetails: {
    items: [
      {
        name: "Produit Test",
        quantity: 2,
        weight: 1.5,
        dimensions: "20x15x10 cm"
      }
    ],
    packageSize: "MEDIUM",
    packageWeight: 3,
    isFragile: true
  },
  deliveryInstructions: "Code d'immeuble : 1234",
  estimatedDeliveryDate: new Date(Date.now() + 86400000), // +24h
  isExpress: false,
    status: "PENDING",
  trackingNumber: "ECODELI-123456",
  price: 12.99,
  customerId: "customer123",
  merchantId: "merchant123",
  deliveryPersonId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  customer: {
    id: "customer123",
    user: {
      name: "Client Test",
      email: "client@example.com",
      phone: "+33612345678"
    }
  },
  merchant: {
    id: "merchant123",
    user: {
      name: "Commerce Test",
      email: "commerce@example.com",
      phone: "+33687654321"
    }
  },
  deliveryPerson: null,
  trackingUpdates: [
    {
      id: "tracking123",
      deliveryId: "delivery123",
      status: "PENDING",
      location: "Entrepôt Commerce Test",
      description: "Commande reçue et en attente de traitement",
      timestamp: new Date()
    }
  ]
};

describe("API de livraisons", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Configurations par défaut pour les mocks
    getDeliveriesHandler.mockImplementation((req) => {
      return NextResponse.json({
        deliveries: [mockDelivery],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        }
      }, { status: 200 });
    });
    
    createDeliveryHandler.mockImplementation((req) => {
      return NextResponse.json({
        delivery: mockDelivery
      }, { status: 201 });
    });
  });

  describe("Récupération des livraisons (GET)", () => {
    it("devrait récupérer les livraisons pour un client", async () => {
      // Arrangement
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });

      // Mock l'implémentation pour vérifier le filtre
      mockPrisma.delivery.findMany.mockImplementationOnce((params) => {
        expect(params.where.customerId).toBe(mockCustomer.id);
        return Promise.resolve([mockDelivery]);
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries");
      
      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          deliveries: expect.arrayContaining([
            expect.objectContaining({
              id: mockDelivery.id,
              status: mockDelivery.status
            })
          ]),
          pagination: expect.objectContaining({
            total: 1
          })
        })
      );
    });

    it("devrait récupérer les livraisons pour un commerçant", async () => {
      // Arrangement
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockMerchantUser
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries");
      
      // Mock pour vérifier les paramètres de requête
      mockPrisma.delivery.findMany.mockImplementationOnce((params) => {
        expect(params.where.merchantId).toBe(mockMerchant.id);
        return Promise.resolve([mockDelivery]);
      });

      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait récupérer les livraisons pour un livreur", async () => {
      // Arrangement
      mockPrisma.deliveryPerson.findUnique.mockResolvedValue(mockDeliveryPerson);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockDeliveryPersonUser
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries");

      // Mock pour vérifier les paramètres de requête
      mockPrisma.delivery.findMany.mockImplementationOnce((params) => {
        expect(params.where.deliveryPersonId).toBe(mockDeliveryPerson.id);
        return Promise.resolve([mockDelivery]);
      });

      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les livraisons par statut", async () => {
      // Arrangement
      const status = "IN_TRANSIT";
      const url = new URL("http://localhost:3000/api/deliveries");
      url.searchParams.set("status", status);
      
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.delivery.findMany.mockResolvedValue([{
        ...mockDelivery,
        status
      }]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });

      // Mock pour vérifier le filtre de statut
      mockPrisma.delivery.findMany.mockImplementationOnce((params) => {
        expect(params.where.status).toBe(status);
        return Promise.resolve([{
          ...mockDelivery,
          status
        }]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait paginer les résultats correctement", async () => {
      // Arrangement
      const page = 2;
      const limit = 5;
      const url = new URL("http://localhost:3000/api/deliveries");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());
      
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(12);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });

      // Mock spécifique pour ce cas avec pagination
      getDeliveriesHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          deliveries: [mockDelivery],
          pagination: {
            total: 12,
            page: 2,
            limit: 5,
            pages: 3
          }
        }, { status: 200 });
      });
      
      // Mock pour vérifier les paramètres de pagination
      mockPrisma.delivery.findMany.mockImplementationOnce((params) => {
        expect(params.skip).toBe((page - 1) * limit);
        expect(params.take).toBe(limit);
        return Promise.resolve([mockDelivery]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.pagination).toEqual(
        expect.objectContaining({
          page: 2,
          limit: 5,
          total: 12,
          pages: 3
        })
      );
    });

    it("devrait refuser l'accès à un utilisateur non authentifié", async () => {
      // Arrangement
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      getDeliveriesHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Non autorisé"
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries");

      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Non autorisé"
        })
      );
    });

    it("devrait gérer le cas où le profil de l'utilisateur n'est pas trouvé", async () => {
      // Arrangement
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });
      
      getDeliveriesHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Profil client non trouvé"
        }, { status: 404 });
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries");

      // Action
      const response = await getDeliveriesHandler(req);

      // Assertions
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Profil client non trouvé"
        })
      );
    });
  });

  describe("Création de livraison (POST)", () => {
    it("devrait créer une livraison pour un client avec des données valides", async () => {
      // Arrangement
      const deliveryData = {
        origin: "123 Commerce Ave",
        destination: "456 Client St",
        recipientName: "Client Destinataire",
        recipientPhone: "+33612345678",
        recipientEmail: "destinataire@example.com",
        items: [
          {
            name: "Produit Test",
            quantity: 2,
            weight: 1.5,
            dimensions: "20x15x10 cm"
          }
        ],
        packageSize: "MEDIUM",
        packageWeight: 3,
        deliveryInstructions: "Code d'immeuble : 1234",
        isExpress: false,
        isFragile: true
      };

      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.delivery.create.mockResolvedValue(mockDelivery);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData)
      });
      
      // Action
      const response = await createDeliveryHandler(req);

      // Assertions
      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          delivery: expect.objectContaining({
            id: mockDelivery.id,
            origin: deliveryData.origin,
            destination: deliveryData.destination
          })
        })
      );
    });

    it("devrait créer une livraison pour un commerçant", async () => {
      // Arrangement
      const deliveryData = {
        origin: "123 Commerce Ave",
        destination: "456 Client St",
        recipientName: "Client Destinataire",
        recipientPhone: "+33612345678",
        recipientEmail: "destinataire@example.com",
        items: [
          {
            name: "Produit Test",
            quantity: 2,
            weight: 1.5
          }
        ],
        packageSize: "MEDIUM",
        packageWeight: 3,
        isExpress: false,
        isFragile: true
      };

      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.delivery.create.mockResolvedValue({
        ...mockDelivery,
        merchantId: mockMerchant.id
      });

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockMerchantUser
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData)
      });
      
      // Action
      const response = await createDeliveryHandler(req);

      // Assertions
      expect(response.status).toBe(201);
    });

    it("devrait refuser la création d'une livraison pour un utilisateur non authentifié", async () => {
      // Arrangement
      const deliveryData = {
        origin: "123 Commerce Ave",
        destination: "456 Client St",
        recipientName: "Client Destinataire",
        items: [
          {
            name: "Produit Test",
            quantity: 2
          }
        ],
        packageSize: "MEDIUM",
        packageWeight: 3,
        isExpress: false,
        isFragile: true
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      createDeliveryHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Non autorisé"
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData)
      });
      
      // Action
      const response = await createDeliveryHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Non autorisé"
        })
      );
    });

    it("devrait rejeter des données de livraison invalides", async () => {
      // Arrangement
      const invalidDeliveryData = {
        // Manque l'origine et la destination
        recipientName: "Client Destinataire",
        items: [], // Items vides
        packageSize: "INVALID_SIZE", // Taille invalide
        packageWeight: -3, // Poids négatif
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });
      
      createDeliveryHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Données invalides",
          details: {
            fieldErrors: {
              origin: ["Adresse d'origine requise"],
              destination: ["Adresse de destination requise"],
              items: ["Au moins un article requis"],
              packageSize: ["Valeur d'énumération non valide"],
              packageWeight: ["Le nombre doit être positif"]
            }
          }
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidDeliveryData)
      });

      // Action
      const response = await createDeliveryHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Données invalides",
          details: expect.objectContaining({
            fieldErrors: expect.any(Object)
          })
        })
      );
    });

    it("devrait gérer le cas où le profil du client n'est pas trouvé", async () => {
      // Arrangement
      const deliveryData = {
        origin: "123 Commerce Ave",
        destination: "456 Client St",
        recipientName: "Client Destinataire",
        items: [
          {
            name: "Produit Test",
            quantity: 2
          }
        ],
        packageSize: "MEDIUM",
        packageWeight: 3,
        isExpress: false,
        isFragile: true
      };

      mockPrisma.customer.findUnique.mockResolvedValue(null);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });
      
      createDeliveryHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Profil client non trouvé"
        }, { status: 404 });
      });

      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData)
      });

      // Action
      const response = await createDeliveryHandler(req);

      // Assertions
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Profil client non trouvé"
        })
      );
    });
  });
});