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
const mockUserSession = { user: { id: "user-123", role: "USER" } };

// Mock insurance plan data
const mockInsurancePlans = [
  {
    id: "plan-123",
    name: "Basic Protection",
    description: "Basic coverage for everyday items",
    monthlyPrice: 9.99,
    coverageLimit: 500.00,
    features: ["Theft Protection", "Damage Coverage"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "plan-456",
    name: "Premium Protection",
    description: "Enhanced coverage for high-value items",
    monthlyPrice: 19.99,
    coverageLimit: 2000.00,
    features: ["Theft Protection", "Damage Coverage", "Accidental Loss", "Extended Warranty"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock user subscription
const mockSubscription = {
  id: "subscription-123",
  userId: "user-123",
  planId: "plan-123",
  status: "ACTIVE",
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  autoRenew: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  plan: mockInsurancePlans[0],
  user: {
    id: "user-123",
    email: "user@example.com",
    name: "Test User"
  }
};

// Mock claim data
const mockClaim = {
  id: "claim-123",
  userId: "user-123",
  subscriptionId: "subscription-123",
  itemName: "Smartphone",
  itemValue: 800.00,
  description: "Screen cracked after dropping the phone",
  incidentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  status: "PENDING",
  evidence: ["photo1.jpg", "receipt.pdf"],
  createdAt: new Date(),
  updatedAt: new Date(),
  subscription: mockSubscription,
  user: {
    id: "user-123",
    email: "user@example.com",
    name: "Test User"
  }
};

// Mock API handlers
const getPlans = jest.fn();
const subscribeToPlan = jest.fn();
const getSubscription = jest.fn();
const cancelSubscription = jest.fn();
const createClaim = jest.fn();
const getClaims = jest.fn();
const getClaimById = jest.fn();
const updateClaim = jest.fn();

describe("Insurance API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Default to user session
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
    
    // Default mock responses for API handlers
    getPlans.mockResolvedValue(
      Response.json({ success: true, data: mockInsurancePlans }, { status: 200 })
    );
    
    subscribeToPlan.mockResolvedValue(
      Response.json({ success: true, data: mockSubscription }, { status: 201 })
    );
    
    getSubscription.mockResolvedValue(
      Response.json({ success: true, data: mockSubscription }, { status: 200 })
    );
    
    cancelSubscription.mockResolvedValue(
      Response.json({ success: true, data: { ...mockSubscription, status: "CANCELLED" } }, { status: 200 })
    );
    
    createClaim.mockResolvedValue(
      Response.json({ success: true, data: mockClaim }, { status: 201 })
    );
    
    getClaims.mockResolvedValue(
      Response.json({ success: true, data: [mockClaim] }, { status: 200 })
    );
    
    getClaimById.mockResolvedValue(
      Response.json({ success: true, data: mockClaim }, { status: 200 })
    );
    
    updateClaim.mockResolvedValue(
      Response.json({ success: true, data: { ...mockClaim, status: "APPROVED" } }, { status: 200 })
    );
  });

  // Test 1: GET insurance plans
  describe("GET /api/insurance/plans", () => {
    it("should list all available insurance plans", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/plans");
      
      // Call the handler
      const response = await getPlans(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data[0]).toHaveProperty("id", mockInsurancePlans[0].id);
    });

    it("should work without authentication", async () => {
      // Mock no session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/plans");
      
      // Call the handler
      const response = await getPlans(req);

      // Assertions
      expect(response.status).toBe(200);
    });
  });

  // Test 2: POST to subscribe to a plan
  describe("POST /api/insurance/subscribe", () => {
    it("should create a new insurance subscription", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/subscribe", {
        method: "POST",
        body: JSON.stringify({
          planId: "plan-123",
          autoRenew: true
        })
      });
      
      // Call the handler
      const response = await subscribeToPlan(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", mockSubscription.id);
      expect(data.data).toHaveProperty("status", "ACTIVE");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      subscribeToPlan.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );

      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/subscribe", {
        method: "POST",
        body: JSON.stringify({
          planId: "plan-123",
          autoRenew: true
        })
      });
      
      // Call the handler
      const response = await subscribeToPlan(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 400 if plan does not exist", async () => {
      // Mock error response
      subscribeToPlan.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Insurance plan not found" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/subscribe", {
        method: "POST",
        body: JSON.stringify({
          planId: "non-existent-plan",
          autoRenew: true
        })
      });
      
      // Call the handler
      const response = await subscribeToPlan(req);

      // Assertions
      expect(response.status).toBe(400);
    });
  });

  // Test 3: GET subscription details
  describe("GET /api/insurance/subscription", () => {
    it("should return the user's insurance subscription", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/subscription");
      
      // Call the handler
      const response = await getSubscription(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", mockSubscription.id);
      expect(data.data).toHaveProperty("plan");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/subscription");
      
      // Call the handler
      const response = await getSubscription(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 404 if user has no subscription", async () => {
      // Mock error response
      getSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "No active subscription found" 
        }, { status: 404 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/subscription");
      
      // Call the handler
      const response = await getSubscription(req);

      // Assertions
      expect(response.status).toBe(404);
    });
  });

  // Test 4: DELETE to cancel subscription
  describe("DELETE /api/insurance/subscription", () => {
    it("should cancel the user's subscription", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/subscription", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelSubscription(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "CANCELLED");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      cancelSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/subscription", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelSubscription(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 404 if user has no subscription", async () => {
      // Mock error response
      cancelSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "No active subscription found" 
        }, { status: 404 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/insurance/subscription", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelSubscription(req);

      // Assertions
      expect(response.status).toBe(404);
    });
  });

  // Test 5: POST to create a claim
  describe("POST /api/insurance/claims", () => {
    it("should create a new insurance claim", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/claims", {
        method: "POST",
        body: JSON.stringify({
          itemName: "Smartphone",
          itemValue: 800.00,
          description: "Screen cracked after dropping the phone",
          incidentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          evidence: ["photo1.jpg", "receipt.pdf"]
        })
      });
      
      // Call the handler
      const response = await createClaim(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", mockClaim.id);
      expect(data.data).toHaveProperty("status", "PENDING");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      createClaim.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/claims", {
        method: "POST",
        body: JSON.stringify({
          itemName: "Smartphone",
          itemValue: 800.00,
          description: "Screen cracked after dropping the phone",
          incidentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          evidence: ["photo1.jpg", "receipt.pdf"]
        })
      });
      
      // Call the handler
      const response = await createClaim(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 404 if user has no active subscription", async () => {
      // Mock error response
      createClaim.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "No active insurance subscription found" 
        }, { status: 404 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/claims", {
        method: "POST",
        body: JSON.stringify({
          itemName: "Smartphone",
          itemValue: 800.00,
          description: "Screen cracked after dropping the phone",
          incidentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          evidence: ["photo1.jpg", "receipt.pdf"]
        })
      });
      
      // Call the handler
      const response = await createClaim(req);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 400 if claim value exceeds coverage limit", async () => {
      // Mock error response
      createClaim.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Claim value exceeds coverage limit" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/insurance/claims", {
        method: "POST",
        body: JSON.stringify({
          itemName: "Expensive Laptop",
          itemValue: 3000.00, // Exceeds the 2000.00 coverage limit
          description: "Laptop stolen from car",
          incidentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          evidence: ["police_report.pdf", "receipt.pdf"]
        })
      });
      
      // Call the handler
      const response = await createClaim(req);

      // Assertions
      expect(response.status).toBe(400);
    });
  });
}); 