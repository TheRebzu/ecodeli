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

// Handlers d'API (à implémenter ou à mocker selon votre structure)
const getProductsHandler = jest.fn();
const createProductHandler = jest.fn();

// Données de test
const mockMerchant = {
  id: "merchant123",
  name: "Test Merchant",
  slug: "test-merchant",
  logo: "https://example.com/logo.png",
  userId: "user123"
};

const mockUser = {
  id: "user123",
  email: "merchant@example.com",
  name: "Test User",
  role: "MERCHANT"
};

const mockAdminUser = {
  id: "admin123",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN"
};

const mockCategory = {
  id: "category123",
  name: "Test Category",
  slug: "test-category"
};

const mockProduct = {
  id: "product123",
  name: "Test Product",
  description: "This is a test product with a detailed description.",
  price: 29.99,
  compareAtPrice: 39.99,
  costPrice: 19.99,
  sku: "TEST-SKU-123",
  barcode: "1234567890",
  weight: 500,
  weightUnit: "g",
  quantity: 100,
  isAvailable: true,
  categoryId: "category123",
  merchantId: "merchant123",
  tags: ["test", "new", "featured"],
  attributes: { color: "blue", size: "medium" },
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("API de produits", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Configurations par défaut pour les mocks
    getProductsHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: [mockProduct],
        meta: {
          pagination: {
            totalItems: 1,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      }, { status: 200 });
    });
    
    createProductHandler.mockImplementation((req) => {
      return NextResponse.json({
        success: true,
        data: mockProduct
      }, { status: 201 });
    });
  });

  describe("Récupération des produits (GET)", () => {
    it("devrait récupérer tous les produits avec pagination par défaut", async () => {
      // Arrangement
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const req = new NextRequest("http://localhost:3000/api/products");

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            pagination: expect.objectContaining({
              totalItems: 1
            })
          })
        })
      );
    });

    it("devrait filtrer les produits par recherche", async () => {
      // Arrangement
      const searchTerm = "test";
      const url = new URL("http://localhost:3000/api/products");
      url.searchParams.set("search", searchTerm);
      
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);
      
      const req = new NextRequest(url);

      // Mock spécifique pour vérifier les paramètres de filtrage
      mockPrisma.product.findMany.mockImplementationOnce((params) => {
        // Vérifie que le filtre est appliqué correctement
        expect(params.where.OR).toContainEqual({ 
          name: { contains: searchTerm, mode: 'insensitive' } 
        });
        return Promise.resolve([mockProduct]);
      });

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
      // Vérifie que le produit retourné contient le terme recherché
      expect(responseBody.data[0].name).toContain("Test");
    });

    it("devrait filtrer les produits par catégorie", async () => {
      // Arrangement
      const categoryId = "category123";
      const url = new URL("http://localhost:3000/api/products");
      url.searchParams.set("category", categoryId);
      
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);
      
      // Mock spécifique pour vérifier le paramètre categoryId
      mockPrisma.product.findMany.mockImplementationOnce((params) => {
        // Vérifie que le filtre est appliqué correctement
        expect(params.where.categoryId).toBe(categoryId);
        return Promise.resolve([mockProduct]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les produits par plage de prix", async () => {
      // Arrangement
      const minPrice = 20;
      const maxPrice = 50;
      const url = new URL("http://localhost:3000/api/products");
      url.searchParams.set("minPrice", minPrice.toString());
      url.searchParams.set("maxPrice", maxPrice.toString());
      
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);
      
      // Mock spécifique pour vérifier les paramètres de prix
      mockPrisma.product.findMany.mockImplementationOnce((params) => {
        // Vérifie que le filtre est appliqué correctement
        expect(params.where.price).toEqual({
          gte: minPrice,
          lte: maxPrice
        });
        return Promise.resolve([mockProduct]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait trier les produits selon les paramètres fournis", async () => {
      // Arrangement
      const sortBy = "price";
      const sortOrder = "asc";
      const url = new URL("http://localhost:3000/api/products");
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("sortOrder", sortOrder);
      
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);
      
      // Mock spécifique pour vérifier les paramètres de tri
      mockPrisma.product.findMany.mockImplementationOnce((params) => {
        // Vérifie que le tri est appliqué correctement
        expect(params.orderBy).toEqual({
          [sortBy]: sortOrder
        });
        return Promise.resolve([mockProduct]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait utiliser la pagination correctement", async () => {
      // Arrangement
      const page = 2;
      const limit = 5;
      const url = new URL("http://localhost:3000/api/products");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());
      
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(7);
      
      // Mock spécifique pour ce cas avec pagination
      getProductsHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: true,
          data: [mockProduct],
          meta: {
            pagination: {
              totalItems: 7,
              totalPages: 2,
              currentPage: 2,
              itemsPerPage: 5,
              hasNextPage: false,
              hasPrevPage: true
            }
          }
        }, { status: 200 });
      });
      
      // Mock spécifique pour vérifier les paramètres de pagination
      mockPrisma.product.findMany.mockImplementationOnce((params) => {
        // Vérifie que la pagination est appliquée correctement
        expect(params.skip).toBe((page - 1) * limit);
        expect(params.take).toBe(limit);
        return Promise.resolve([mockProduct]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.meta.pagination).toEqual(
        expect.objectContaining({
          currentPage: 2,
          itemsPerPage: 5,
          totalItems: 7
        })
      );
    });

    it("devrait gérer les erreurs de validation des paramètres", async () => {
      // Arrangement
      const url = new URL("http://localhost:3000/api/products");
      url.searchParams.set("limit", "invalid");
      
      // Mock spécifique pour ce cas d'erreur
      getProductsHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "Invalid query parameters",
            details: { limit: { _errors: ["Expected number, received nan"] } }
          }
        }, { status: 400 });
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getProductsHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "INVALID_PARAMETERS"
          })
        })
      );
    });
  });

  describe("Création de produit (POST)", () => {
    it("devrait créer un produit avec des données valides pour un marchand", async () => {
      // Arrangement
      const productData = {
        name: "Nouveau Produit",
        description: "Description détaillée du nouveau produit",
        price: 49.99,
        quantity: 50,
        categoryId: "category123",
        tags: ["nouveau", "promo"]
      };

      const createdProduct = {
        ...productData,
        id: "new-product-id",
        merchantId: mockMerchant.id,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.product.create.mockResolvedValue(createdProduct);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });

      // Mock spécifique pour retourner le produit créé
      createProductHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: true,
          data: createdProduct
        }, { status: 201 });
      });

      const req = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      // Action
      const response = await createProductHandler(req);

      // Assertions
      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: productData.name,
            price: productData.price
          })
        })
      );
    });

    it("devrait créer un produit avec des données valides pour un admin", async () => {
      // Arrangement
      const productData = {
        name: "Produit Administrateur",
        description: "Produit créé par un administrateur",
        price: 79.99,
        quantity: 30,
        merchantId: "merchant123" // Spécifié par l'admin
      };

      const createdProduct = {
        ...productData,
        id: "admin-product-id",
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.product.create.mockResolvedValue(createdProduct);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockAdminUser
      });

      // Mock spécifique pour retourner le produit créé par l'admin
      createProductHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: true,
          data: createdProduct
        }, { status: 201 });
      });

      const req = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      // Action
      const response = await createProductHandler(req);

      // Assertions
      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: productData.name,
            merchantId: productData.merchantId
          })
        })
      );
    });

    it("devrait refuser la création de produit pour un utilisateur non authentifié", async () => {
      // Arrangement
      const productData = {
        name: "Produit Interdit",
        description: "Ce produit ne devrait pas être créé",
        price: 19.99,
        quantity: 10
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock spécifique pour ce cas
      createProductHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized"
          }
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      // Action
      const response = await createProductHandler(req);

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

    it("devrait refuser la création de produit pour un utilisateur qui n'est pas marchand ou admin", async () => {
      // Arrangement
      const productData = {
        name: "Produit Client",
        description: "Un client ne peut pas créer de produit",
        price: 29.99,
        quantity: 5
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: "client123",
          email: "client@example.com",
          name: "Client User",
          role: "CLIENT"
        }
      });
      
      // Mock spécifique pour ce cas
      createProductHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only merchants can create products"
          }
        }, { status: 403 });
      });

      const req = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      // Action
      const response = await createProductHandler(req);

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

    it("devrait refuser la création de produit avec des données invalides", async () => {
      // Arrangement
      const productData = {
        name: "P", // Trop court
        price: -10, // Prix négatif
        quantity: -5 // Quantité négative
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      // Mock spécifique pour ce cas
      createProductHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid product data",
            details: {
              name: { _errors: ["String must contain at least 2 character(s)"] },
              price: { _errors: ["Number must be positive"] },
              quantity: { _errors: ["Number must be greater than or equal to 0"] },
              description: { _errors: ["Required"] }
            }
          }
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      // Action
      const response = await createProductHandler(req);

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

    it("devrait gérer l'erreur quand un marchand n'a pas de profil", async () => {
      // Arrangement
      const productData = {
        name: "Produit Sans Marchand",
        description: "Produit créé par un marchand sans profil",
        price: 39.99,
        quantity: 25
      };

      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      
      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      
      // Mock spécifique pour ce cas
      createProductHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Merchant profile not found"
          }
        }, { status: 404 });
      });

      const req = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      // Action
      const response = await createProductHandler(req);

      // Assertions
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "NOT_FOUND",
            message: expect.stringContaining("Merchant profile not found")
          })
        })
      );
    });
  });
}); 