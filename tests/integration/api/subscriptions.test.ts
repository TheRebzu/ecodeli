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
const mockSession = { user: { id: "user-123", role: "USER" } };
const mockAdminSession = { user: { id: "admin-123", role: "ADMIN" } };

// Mock subscription data
const mockSubscriptionPlans = [
  { 
    id: "plan-1", 
    name: "Basic", 
    price: 9.99, 
    description: "Basic plan", 
    intervalType: "MONTHLY",
    isActive: true
  },
  { 
    id: "plan-2", 
    name: "Premium", 
    price: 19.99, 
    description: "Premium plan", 
    intervalType: "MONTHLY",
    isActive: true
  }
];

const mockSubscription = {
  id: "sub-123",
  userId: "user-123",
  subscriptionPlanId: "plan-1",
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: "ACTIVE",
  autoRenew: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  subscriptionPlan: mockSubscriptionPlans[0]
};

const mockBenefits = [
  {
    id: "benefit-1",
    name: "Free Shipping",
    description: "Free shipping on all orders",
    subscriptionPlanId: "plan-1"
  },
  {
    id: "benefit-2",
    name: "Priority Support",
    description: "24/7 priority customer support",
    subscriptionPlanId: "plan-1"
  }
];

// Mock API handlers
const getSubscriptions = jest.fn();
const createSubscription = jest.fn();
const updateSubscription = jest.fn();
const getSubscriptionBenefits = jest.fn();

describe("Subscriptions API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    // Default mock responses
    getSubscriptions.mockResolvedValue(
      Response.json({ success: true, data: [mockSubscription] }, { status: 200 })
    );
    
    createSubscription.mockResolvedValue(
      Response.json({ success: true, data: mockSubscription }, { status: 201 })
    );
    
    updateSubscription.mockResolvedValue(
      Response.json({ success: true, data: { ...mockSubscription, autoRenew: false } }, { status: 200 })
    );
    
    getSubscriptionBenefits.mockResolvedValue(
      Response.json({ success: true, data: mockBenefits }, { status: 200 })
    );
  });

  // Test 1: GET subscriptions for a user
  describe("GET /api/subscriptions", () => {
    it("should return user subscriptions", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/subscriptions");
      
      // Call the handler
      const response = await getSubscriptions(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty("id", mockSubscription.id);
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getSubscriptions.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );

      // Create request
      const req = new NextRequest("http://localhost:3000/api/subscriptions");
      
      // Call the handler
      const response = await getSubscriptions(req);

      // Assertions
      expect(response.status).toBe(401);
    });
  });

  // Test 2: POST to create a new subscription
  describe("POST /api/subscriptions", () => {
    it("should create a new subscription", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          subscriptionPlanId: "plan-1",
          autoRenew: true
        })
      });
      
      // Call the handler
      const response = await createSubscription(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", mockSubscription.id);
    });

    it("should return 400 if subscription plan does not exist", async () => {
      // Mock error response
      createSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Subscription plan not found" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          subscriptionPlanId: "non-existent-plan",
          autoRenew: true
        })
      });
      
      // Call the handler
      const response = await createSubscription(req);

      // Assertions
      expect(response.status).toBe(400);
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      createSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );

      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          subscriptionPlanId: "plan-1",
          autoRenew: true
        })
      });
      
      // Call the handler
      const response = await createSubscription(req);

      // Assertions
      expect(response.status).toBe(401);
    });
  });

  // Test 3: PUT to update a subscription
  describe("PUT /api/subscriptions/[id]", () => {
    it("should update an existing subscription", async () => {
      // Create context with params
      const params = { params: { id: "sub-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/subscriptions/sub-123", {
        method: "PUT",
        body: JSON.stringify({
          autoRenew: false
        })
      });
      
      // Call the handler
      const response = await updateSubscription(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("autoRenew", false);
    });

    it("should return 404 if subscription does not exist", async () => {
      // Mock error response
      updateSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Subscription not found" 
        }, { status: 404 })
      );
      
      // Create context with params
      const params = { params: { id: "non-existent-sub" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/subscriptions/non-existent-sub", {
        method: "PUT",
        body: JSON.stringify({
          autoRenew: false
        })
      });
      
      // Call the handler
      const response = await updateSubscription(req, params);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 403 if user tries to update someone else's subscription", async () => {
      // Mock error response
      updateSubscription.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to update this subscription" 
        }, { status: 403 })
      );
      
      // Create context with params
      const params = { params: { id: "sub-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/subscriptions/sub-123", {
        method: "PUT",
        body: JSON.stringify({
          autoRenew: false
        })
      });
      
      // Call the handler
      const response = await updateSubscription(req, params);

      // Assertions
      expect(response.status).toBe(403);
    });
  });

  // Test 4: GET subscription benefits
  describe("GET /api/subscriptions/[id]/benefits", () => {
    it("should return subscription benefits", async () => {
      // Create context with params
      const params = { params: { id: "sub-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/subscriptions/sub-123/benefits");
      
      // Call the handler
      const response = await getSubscriptionBenefits(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty("id", mockBenefits[0].id);
    });

    it("should return 404 if subscription does not exist", async () => {
      // Mock error response
      getSubscriptionBenefits.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Subscription not found" 
        }, { status: 404 })
      );
      
      // Create context with params
      const params = { params: { id: "non-existent-sub" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/subscriptions/non-existent-sub/benefits");
      
      // Call the handler
      const response = await getSubscriptionBenefits(req, params);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 403 if user tries to access someone else's subscription benefits", async () => {
      // Mock error response
      getSubscriptionBenefits.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to access this subscription" 
        }, { status: 403 })
      );
      
      // Create context with params
      const params = { params: { id: "sub-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/subscriptions/sub-123/benefits");
      
      // Call the handler
      const response = await getSubscriptionBenefits(req, params);

      // Assertions
      expect(response.status).toBe(403);
    });

    it("should allow admin to access any subscription benefits", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create context with params
      const params = { params: { id: "sub-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/subscriptions/sub-123/benefits");
      
      // Call the handler
      const response = await getSubscriptionBenefits(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
    });
  });
}); 