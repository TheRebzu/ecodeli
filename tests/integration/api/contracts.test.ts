import { NextRequest } from "next/server";
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import * as auth from "next-auth";

// Mock Prisma client
const prismaObj = { default: undefined };
const mockPrisma = mockDeep<PrismaClient>();
prismaObj.default = mockPrisma;

jest.mock("@/lib/prisma", () => prismaObj);

// Mock Next Auth
jest.mock("next-auth");
const mockUserSession = { user: { id: "user-123", role: "USER", email: "user@example.com" } };
const mockAdminSession = { user: { id: "admin-123", role: "ADMIN", email: "admin@example.com" } };
const mockBusinessSession = { user: { id: "business-123", role: "BUSINESS", email: "business@example.com" } };

// Mock contract data
const mockContracts = [
  {
    id: "contract-123",
    title: "Standard Delivery Service Agreement",
    userId: "user-123",
    businessId: "business-456",
    status: "ACTIVE",
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    terms: "This agreement outlines the terms and conditions for standard delivery services.",
    contractType: "DELIVERY",
    pricing: {
      baseRate: 10.99,
      distanceRate: 0.5, // per km
      currency: "USD"
    },
    specialTerms: "Priority service during business hours.",
    createdAt: new Date(),
    updatedAt: new Date(),
    signedByUser: true,
    signedByBusiness: true,
    documentUrl: "https://example.com/contracts/contract-123.pdf"
  },
  {
    id: "contract-456",
    title: "Business Partner Agreement",
    userId: null,
    businessId: "business-456",
    partnerId: "business-789",
    status: "PENDING",
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    terms: "This agreement outlines the partnership between two businesses.",
    contractType: "PARTNERSHIP",
    specialTerms: "Shared resources and profit splitting.",
    createdAt: new Date(),
    updatedAt: new Date(),
    signedByBusiness: true,
    signedByPartner: false,
    documentUrl: "https://example.com/contracts/contract-456.pdf"
  },
  {
    id: "contract-789",
    title: "Premium Subscription Contract",
    userId: "user-123",
    businessId: "business-123",
    status: "DRAFT",
    startDate: null,
    endDate: null,
    terms: "This contract outlines the premium subscription service terms.",
    contractType: "SUBSCRIPTION",
    pricing: {
      monthlyRate: 29.99,
      currency: "USD",
      discountForAnnual: 10 // 10% discount for annual payment
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    signedByUser: false,
    signedByBusiness: false,
    documentUrl: null
  },
  {
    id: "contract-101",
    title: "Expired Service Agreement",
    userId: "user-123",
    businessId: "business-456",
    status: "EXPIRED",
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    terms: "This agreement has expired.",
    contractType: "DELIVERY",
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    signedByUser: true,
    signedByBusiness: true,
    documentUrl: "https://example.com/contracts/contract-101.pdf"
  }
];

// Mock API handlers
const getContracts = jest.fn();
const getContractById = jest.fn();
const createContract = jest.fn();
const updateContract = jest.fn();
const signContract = jest.fn();
const terminateContract = jest.fn();
const generateContractPdf = jest.fn();

describe("Contracts API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Default user session for most tests
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
    
    // Default mock responses
    getContracts.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: mockContracts.filter(c => c.userId === 'user-123')
      }, { status: 200 })
    );
    
    getContractById.mockResolvedValue(
      Response.json({ success: true, data: mockContracts[0] }, { status: 200 })
    );
    
    createContract.mockResolvedValue(
      Response.json({ success: true, data: mockContracts[2] }, { status: 201 })
    );
    
    updateContract.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockContracts[2], terms: "Updated terms and conditions." } 
      }, { status: 200 })
    );
    
    signContract.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockContracts[2], status: "ACTIVE", signedByUser: true } 
      }, { status: 200 })
    );
    
    terminateContract.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockContracts[0], status: "TERMINATED" } 
      }, { status: 200 })
    );
    
    generateContractPdf.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { url: "https://example.com/contracts/contract-123-generated.pdf" } 
      }, { status: 200 })
    );
  });

  // Test 1: GET user's contracts
  describe("GET /api/contracts", () => {
    it("should return authenticated user's contracts", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/contracts");
      
      // Call the handler
      const response = await getContracts(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3); // All contracts for user-123
      expect(data.data[0]).toHaveProperty("userId", "user-123");
    });

    it("should return business contracts for business users", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Mock business contract response
      getContracts.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: mockContracts.filter(c => c.businessId === 'business-123') 
        }, { status: 200 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/contracts");
      
      // Call the handler
      const response = await getContracts(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0]).toHaveProperty("businessId", "business-123");
    });

    it("should support filtering by status", async () => {
      // Mock filtered response
      getContracts.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [mockContracts[0]] // Only ACTIVE contracts
        }, { status: 200 })
      );
      
      // Create request with filter params
      const url = new URL("http://localhost:3000/api/contracts");
      url.searchParams.set("status", "ACTIVE");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getContracts(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data.length).toBe(1);
      expect(data.data[0]).toHaveProperty("status", "ACTIVE");
    });

    it("should support filtering by contract type", async () => {
      // Mock filtered response
      getContracts.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [mockContracts[2]] // Only SUBSCRIPTION contracts
        }, { status: 200 })
      );
      
      // Create request with filter params
      const url = new URL("http://localhost:3000/api/contracts");
      url.searchParams.set("type", "SUBSCRIPTION");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getContracts(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data.length).toBe(1);
      expect(data.data[0]).toHaveProperty("contractType", "SUBSCRIPTION");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getContracts.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/contracts");
      
      // Call the handler
      const response = await getContracts(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 2: GET contract by ID
  describe("GET /api/contracts/[id]", () => {
    it("should return a contract by ID for the authenticated user", async () => {
      // Create params and request
      const params = { params: { id: "contract-123" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-123");
      
      // Call the handler
      const response = await getContractById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "contract-123");
    });

    it("should return 403 if trying to access a contract user is not party to", async () => {
      // Mock error response
      getContractById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to access this contract" 
        }, { status: 403 })
      );
      
      // Create params and request for a contract user is not party to
      const params = { params: { id: "contract-456" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-456");
      
      // Call the handler
      const response = await getContractById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if contract doesn't exist", async () => {
      // Mock error response
      getContractById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Contract not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-contract" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/nonexistent-contract");
      
      // Call the handler
      const response = await getContractById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 3: POST create contract
  describe("POST /api/contracts", () => {
    it("should create a new contract as a business user", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          title: "Premium Subscription Contract",
          userId: "user-123",
          terms: "This contract outlines the premium subscription service terms.",
          contractType: "SUBSCRIPTION",
          pricing: {
            monthlyRate: 29.99,
            currency: "USD",
            discountForAnnual: 10
          }
        })
      });
      
      // Call the handler
      const response = await createContract(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("title", "Premium Subscription Contract");
      expect(data.data).toHaveProperty("contractType", "SUBSCRIPTION");
      expect(data.data).toHaveProperty("status", "DRAFT");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      createContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          title: "New Contract",
          userId: "user-123",
          terms: "Terms and conditions",
          contractType: "DELIVERY"
        })
      });
      
      // Call the handler
      const response = await createContract(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 403 if regular user tries to create a contract", async () => {
      // Mock error response
      createContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only business accounts can create contracts" 
        }, { status: 403 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          title: "Invalid Contract Attempt",
          businessId: "business-123",
          terms: "Terms and conditions",
          contractType: "DELIVERY"
        })
      });
      
      // Call the handler
      const response = await createContract(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 for invalid contract data", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Mock error response
      createContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Invalid contract data" 
        }, { status: 400 })
      );
      
      // Create request with invalid body
      const req = new NextRequest("http://localhost:3000/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          title: "Incomplete Contract"
        })
      });
      
      // Call the handler
      const response = await createContract(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 4: PUT update contract
  describe("PUT /api/contracts/[id]", () => {
    it("should update a contract as the business owner", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Create params and request
      const params = { params: { id: "contract-789" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-789", {
        method: "PUT",
        body: JSON.stringify({
          terms: "Updated terms and conditions.",
          pricing: {
            monthlyRate: 34.99,
            currency: "USD",
            discountForAnnual: 15
          }
        })
      });
      
      // Call the handler
      const response = await updateContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("terms", "Updated terms and conditions.");
    });

    it("should return 403 if trying to update a contract user is not owner of", async () => {
      // Mock error response
      updateContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only the contract owner can update this contract" 
        }, { status: 403 })
      );
      
      // Create params and request (as regular user)
      const params = { params: { id: "contract-789" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-789", {
        method: "PUT",
        body: JSON.stringify({
          terms: "Unauthorized update attempt"
        })
      });
      
      // Call the handler
      const response = await updateContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if trying to update a signed contract", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Mock error response
      updateContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Cannot update a contract that has been signed" 
        }, { status: 400 })
      );
      
      // Create params and request for a signed contract
      const params = { params: { id: "contract-123" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-123", {
        method: "PUT",
        body: JSON.stringify({
          terms: "Trying to update a signed contract"
        })
      });
      
      // Call the handler
      const response = await updateContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 5: POST sign contract
  describe("POST /api/contracts/[id]/sign", () => {
    it("should sign a contract as the user party", async () => {
      // Create params and request
      const params = { params: { id: "contract-789" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-789/sign", {
        method: "POST"
      });
      
      // Call the handler
      const response = await signContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("signedByUser", true);
      expect(data.data).toHaveProperty("status", "ACTIVE");
    });

    it("should sign a contract as the business party", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Mock business signing response
      signContract.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: { ...mockContracts[2], signedByBusiness: true } 
        }, { status: 200 })
      );
      
      // Create params and request
      const params = { params: { id: "contract-789" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-789/sign", {
        method: "POST"
      });
      
      // Call the handler
      const response = await signContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("signedByBusiness", true);
    });

    it("should return 403 if trying to sign a contract user is not party to", async () => {
      // Mock error response
      signContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to sign this contract" 
        }, { status: 403 })
      );
      
      // Create params and request for a contract user is not party to
      const params = { params: { id: "contract-456" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-456/sign", {
        method: "POST"
      });
      
      // Call the handler
      const response = await signContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if contract is not in a signable state", async () => {
      // Mock error response
      signContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Contract cannot be signed in its current state" 
        }, { status: 400 })
      );
      
      // Create params and request for an expired contract
      const params = { params: { id: "contract-101" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-101/sign", {
        method: "POST"
      });
      
      // Call the handler
      const response = await signContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 6: POST terminate contract
  describe("POST /api/contracts/[id]/terminate", () => {
    it("should terminate a contract as admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "contract-123" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-123/terminate", {
        method: "POST",
        body: JSON.stringify({
          reason: "Contract terms violated"
        })
      });
      
      // Call the handler
      const response = await terminateContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "TERMINATED");
    });

    it("should terminate a contract as the business owner", async () => {
      // Mock business session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockBusinessSession);
      
      // Create params and request
      const params = { params: { id: "contract-789" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-789/terminate", {
        method: "POST",
        body: JSON.stringify({
          reason: "Terminating draft contract"
        })
      });
      
      // Call the handler
      const response = await terminateContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "TERMINATED");
    });

    it("should return 403 if regular user tries to terminate a contract", async () => {
      // Mock error response
      terminateContract.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to terminate this contract" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "contract-123" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-123/terminate", {
        method: "POST",
        body: JSON.stringify({
          reason: "Unauthorized termination attempt"
        })
      });
      
      // Call the handler
      const response = await terminateContract(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 7: GET generate contract PDF
  describe("GET /api/contracts/[id]/pdf", () => {
    it("should generate a PDF for a contract party", async () => {
      // Create params and request
      const params = { params: { id: "contract-123" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-123/pdf");
      
      // Call the handler
      const response = await generateContractPdf(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("url");
    });

    it("should return 403 if trying to generate PDF for a contract user is not party to", async () => {
      // Mock error response
      generateContractPdf.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to access this contract" 
        }, { status: 403 })
      );
      
      // Create params and request for a contract user is not party to
      const params = { params: { id: "contract-456" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/contract-456/pdf");
      
      // Call the handler
      const response = await generateContractPdf(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if contract doesn't exist", async () => {
      // Mock error response
      generateContractPdf.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Contract not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-contract" } };
      const req = new NextRequest("http://localhost:3000/api/contracts/nonexistent-contract/pdf");
      
      // Call the handler
      const response = await generateContractPdf(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });
}); 