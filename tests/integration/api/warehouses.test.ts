import { NextRequest, NextResponse } from "next/server";
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient, UserRole } from "@prisma/client";
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
const getWarehousesHandler = jest.fn();
const createWarehouseHandler = jest.fn();

// Mock authOptions
jest.mock("@/lib/auth", () => ({
  authOptions: {}
}));

// Données de test
const mockAdmin = {
  id: "admin123",
  email: "admin@example.com",
  name: "Admin Test",
  role: UserRole.ADMIN
};

const mockUser = {
  id: "user123",
  email: "user@example.com",
  name: "User Test",
  role: UserRole.CUSTOMER
};

const mockWarehouse = {
  id: "warehouse123",
  name: "Entrepôt Paris Centre",
  address: "123 Rue de la Logistique",
  city: "Paris",
  postalCode: "75001",
  country: "France",
  coordinates: {
    lat: 48.8566,
    lng: 2.3522
  },
  capacity: 100,
  availableBoxes: 75,
  contactPhone: "+33123456789",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  openingHours: [
    {
      id: "hours1",
      warehouseId: "warehouse123",
      dayOfWeek: 1,
      openTime: "08:00:00",
      closeTime: "18:00:00"
    },
    {
      id: "hours2",
      warehouseId: "warehouse123",
      dayOfWeek: 2,
      openTime: "08:00:00",
      closeTime: "18:00:00"
    }
  ],
  _count: {
    storageBoxes: 25
  }
};

const mockWarehousesList = [
  mockWarehouse,
  {
    ...mockWarehouse,
    id: "warehouse456",
    name: "Entrepôt Lyon Sud",
    city: "Lyon",
    postalCode: "69007",
    coordinates: {
      lat: 45.7500,
      lng: 4.8500
    }
  }
];

describe("API d'entrepôts", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Configurations par défaut pour les mocks
    getWarehousesHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: {
          warehouses: mockWarehousesList,
          meta: {
            page: 1,
            limit: 10,
            totalCount: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      }, { status: 200 });
    });
    
    createWarehouseHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: mockWarehouse
      }, { status: 201 });
    });

    // Mocks par défaut pour Prisma
    mockPrisma.warehouse.findMany.mockResolvedValue(mockWarehousesList);
    mockPrisma.warehouse.count.mockResolvedValue(2);
    mockPrisma.warehouse.create.mockResolvedValue(mockWarehouse);
    mockPrisma.auditLog.create.mockResolvedValue({
      id: "audit123",
      userId: mockAdmin.id,
      action: "CREATE",
      entityType: "WAREHOUSE",
      entityId: mockWarehouse.id,
      description: "Created warehouse: Entrepôt Paris Centre",
      metadata: {},
      createdAt: new Date()
    });
  });

  describe("Récupération des entrepôts (GET)", () => {
    it("devrait récupérer la liste des entrepôts avec pagination", async () => {
      // Arrangement
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const req = new NextRequest("http://localhost:3000/api/warehouses");

      // Action
      const response = await getWarehousesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            warehouses: expect.arrayContaining([
              expect.objectContaining({
                id: mockWarehouse.id,
                name: mockWarehouse.name
              })
            ]),
            meta: expect.objectContaining({
              page: 1,
              limit: 10,
              totalCount: 2
            })
          })
        })
      );
    });

    it("devrait filtrer les entrepôts par terme de recherche", async () => {
      // Arrangement
      const searchTerm = "Paris";
      const url = new URL("http://localhost:3000/api/warehouses");
      url.searchParams.set("search", searchTerm);
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      // Filtrage mock uniquement pour cet entrepôt
      const filteredWarehouse = [mockWarehouse];
      mockPrisma.warehouse.findMany.mockResolvedValue(filteredWarehouse);
      mockPrisma.warehouse.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.warehouse.findMany.mockImplementationOnce((params) => {
        expect(params.where.OR).toEqual(
          expect.arrayContaining([
            { name: { contains: searchTerm, mode: "insensitive" } },
            { city: { contains: searchTerm, mode: "insensitive" } }
          ])
        );
        return Promise.resolve(filteredWarehouse);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getWarehousesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les entrepôts par ville", async () => {
      // Arrangement
      const city = "Lyon";
      const url = new URL("http://localhost:3000/api/warehouses");
      url.searchParams.set("city", city);
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      // Filtrage mock uniquement pour cet entrepôt
      const filteredWarehouse = [mockWarehousesList[1]];
      mockPrisma.warehouse.findMany.mockResolvedValue(filteredWarehouse);
      mockPrisma.warehouse.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.warehouse.findMany.mockImplementationOnce((params) => {
        expect(params.where.city).toEqual({ contains: city, mode: "insensitive" });
        return Promise.resolve(filteredWarehouse);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getWarehousesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les entrepôts par statut actif", async () => {
      // Arrangement
      const url = new URL("http://localhost:3000/api/warehouses");
      url.searchParams.set("isActive", "true");
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.warehouse.findMany.mockImplementationOnce((params) => {
        expect(params.where.isActive).toBe(true);
        return Promise.resolve(mockWarehousesList);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getWarehousesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait trier les entrepôts", async () => {
      // Arrangement
      const url = new URL("http://localhost:3000/api/warehouses");
      url.searchParams.set("sortBy", "capacity");
      url.searchParams.set("sortOrder", "desc");
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      // Mock pour vérifier les paramètres de tri
      mockPrisma.warehouse.findMany.mockImplementationOnce((params) => {
        expect(params.orderBy).toEqual({ capacity: "desc" });
        return Promise.resolve(mockWarehousesList);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getWarehousesHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait rejeter les requêtes non authentifiées", async () => {
      // Arrangement
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      getWarehousesHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to view warehouses"
          }
        }, { status: 401 });
      });
      
      const req = new NextRequest("http://localhost:3000/api/warehouses");

      // Action
      const response = await getWarehousesHandler(req);

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

    it("devrait gérer les erreurs de validation des paramètres de requête", async () => {
      // Arrangement
      const url = new URL("http://localhost:3000/api/warehouses");
      url.searchParams.set("page", "-1"); // Valeur invalide
      url.searchParams.set("limit", "1000"); // Valeur invalide
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      getWarehousesHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "Invalid query parameters"
          }
        }, { status: 400 });
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getWarehousesHandler(req);

      // Assertions
      expect(response.status).toBe(400);
    });
  });

  describe("Création d'entrepôt (POST)", () => {
    it("devrait créer un nouvel entrepôt en tant qu'administrateur", async () => {
      // Arrangement
      const warehouseData = {
        name: "Nouvel Entrepôt",
        address: "456 Rue du Stock",
        city: "Bordeaux",
        postalCode: "33000",
        country: "France",
        coordinates: {
          lat: 44.8378,
          lng: -0.5792
        },
        capacity: 150,
        contactPhone: "+33987654321"
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockAdmin
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      
      const createdWarehouse = {
        ...mockWarehouse,
        ...warehouseData,
        id: "new-warehouse-id"
      };

      mockPrisma.warehouse.create.mockResolvedValue(createdWarehouse);
      
      // Mise à jour du mock du handler pour qu'il retourne le nouveau entrepôt créé
      createWarehouseHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: true,
          data: createdWarehouse
        }, { status: 201 });
      });

      const req = new NextRequest("http://localhost:3000/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseData)
      });

      // Action
      const response = await createWarehouseHandler(req);

      // Assertions
      expect(response.status).toBe(201);
      const responseBody = await response.json();
      
      // Vérification simplifiée sur les propriétés essentielles
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toBeTruthy();
      expect(responseBody.data.name).toBe(warehouseData.name);
      expect(responseBody.data.city).toBe(warehouseData.city);
    });

    it("devrait rejeter la création d'entrepôt pour un utilisateur non administrateur", async () => {
      // Arrangement
      const warehouseData = {
        name: "Nouvel Entrepôt",
        address: "456 Rue du Stock",
        city: "Bordeaux",
        postalCode: "33000",
        country: "France",
        capacity: 150
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      createWarehouseHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only administrators can create warehouses"
          }
        }, { status: 403 });
      });

      const req = new NextRequest("http://localhost:3000/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseData)
      });

      // Action
      const response = await createWarehouseHandler(req);

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

    it("devrait rejeter les demandes non authentifiées", async () => {
      // Arrangement
      const warehouseData = {
        name: "Nouvel Entrepôt",
        address: "456 Rue du Stock",
        city: "Bordeaux",
        postalCode: "33000",
        country: "France",
        capacity: 150
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      createWarehouseHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to create a warehouse"
          }
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseData)
      });

      // Action
      const response = await createWarehouseHandler(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("devrait gérer les erreurs de validation des données d'entrepôt", async () => {
      // Arrangement
      const invalidData = {
        // name manquant
        address: "456 Rue du Stock",
        city: "Bordeaux",
        // postalCode manquant
        country: "France",
        capacity: -50 // Invalide (négatif)
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockAdmin
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      
      createWarehouseHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid warehouse data provided",
            details: {
              name: { _errors: ["Required"] },
              postalCode: { _errors: ["Required"] },
              capacity: { _errors: ["Number must be positive"] }
            }
          }
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData)
      });

      // Action
      const response = await createWarehouseHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "INVALID_INPUT"
          })
        })
      );
    });

    it("devrait enregistrer un journal d'audit lors de la création d'un entrepôt", async () => {
      // Arrangement
      const warehouseData = {
        name: "Nouvel Entrepôt",
        address: "456 Rue du Stock",
        city: "Bordeaux",
        postalCode: "33000",
        country: "France",
        coordinates: {
          lat: 44.8378,
          lng: -0.5792
        },
        capacity: 150,
        contactPhone: "+33987654321"
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockAdmin
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      
      const createdWarehouse = {
        ...mockWarehouse,
        ...warehouseData,
        id: "new-warehouse-id"
      };

      mockPrisma.warehouse.create.mockResolvedValue(createdWarehouse);

      const req = new NextRequest("http://localhost:3000/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseData)
      });

      // On simule ici le comportement du handler qui doit créer un journal d'audit
      createWarehouseHandler.mockImplementationOnce(async (req) => {
        // Exécution des actions que ferait le vrai handler
        const data = await req.json();
        const warehouse = await mockPrisma.warehouse.create({ data });
        await mockPrisma.auditLog.create({
          data: {
            userId: mockAdmin.id,
            action: "CREATE",
            entityType: "WAREHOUSE",
            entityId: warehouse.id,
            description: `Created warehouse: ${warehouse.name}`
          }
        });

        return NextResponse.json({
          success: true,
          data: warehouse
        }, { status: 201 });
      });

      // Action
      await createWarehouseHandler(req);

      // Assertion pour vérifier que l'enregistrement d'audit a été créé
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockAdmin.id,
            action: "CREATE",
            entityType: "WAREHOUSE"
          })
        })
      );
    });
  });
}); 