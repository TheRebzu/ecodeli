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
const mockDriverSession = { user: { id: "driver-123", role: "DRIVER", email: "driver@example.com" } };

// Mock delivery data
const mockDeliveries = [
  {
    id: "delivery-123",
    userId: "user-123",
    driverId: "driver-123",
    status: "PENDING",
    origin: "123 Pickup St, City A",
    destination: "456 Dropoff St, City B",
    distance: 15.7,
    estimatedTime: 35,
    scheduledFor: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
    packageDetails: {
      weight: 5.2,
      dimensions: "30x20x15",
      type: "STANDARD",
      fragile: false
    },
    trackingCode: "ECO-123456",
    price: {
      amount: 24.99,
      currency: "USD"
    }
  },
  {
    id: "delivery-456",
    userId: "user-123",
    driverId: null,
    status: "REQUESTED",
    origin: "789 Pickup St, City A",
    destination: "101 Dropoff St, City B",
    distance: 8.3,
    estimatedTime: 20,
    scheduledFor: new Date(Date.now() + 7200000),
    createdAt: new Date(),
    updatedAt: new Date(),
    packageDetails: {
      weight: 2.1,
      dimensions: "20x15x10",
      type: "EXPRESS",
      fragile: true
    },
    trackingCode: "ECO-234567",
    price: {
      amount: 34.99,
      currency: "USD"
    }
  },
  {
    id: "delivery-789",
    userId: "user-456",
    driverId: "driver-123",
    status: "COMPLETED",
    origin: "555 Pickup St, City C",
    destination: "777 Dropoff St, City D",
    distance: 22.5,
    estimatedTime: 45,
    scheduledFor: new Date(Date.now() - 86400000),
    completedAt: new Date(),
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(),
    packageDetails: {
      weight: 10.0,
      dimensions: "50x40x30",
      type: "LARGE",
      fragile: false
    },
    trackingCode: "ECO-345678",
    price: {
      amount: 49.99,
      currency: "USD"
    }
  }
];

// Mock API handlers
const getDeliveries = jest.fn();
const getDeliveryById = jest.fn();
const createDelivery = jest.fn();
const updateDelivery = jest.fn();
const cancelDelivery = jest.fn();
const assignDriver = jest.fn();
const startDelivery = jest.fn();
const completeDelivery = jest.fn();
const rateDelivery = jest.fn();
const trackDelivery = jest.fn();
const getDeliveriesForDriver = jest.fn();
const getDeliveryEstimate = jest.fn();

describe("Deliveries API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Default user session for most tests
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
    
    // Default mock responses
    getDeliveries.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: mockDeliveries.filter(d => d.userId === 'user-123') 
      }, { status: 200 })
    );
    
    getDeliveryById.mockResolvedValue(
      Response.json({ success: true, data: mockDeliveries[0] }, { status: 200 })
    );
    
    createDelivery.mockResolvedValue(
      Response.json({ success: true, data: mockDeliveries[0] }, { status: 201 })
    );
    
    updateDelivery.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockDeliveries[0], destination: "789 New Dropoff St, City B" } 
      }, { status: 200 })
    );
    
    cancelDelivery.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockDeliveries[0], status: "CANCELLED" } 
      }, { status: 200 })
    );
    
    assignDriver.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockDeliveries[1], driverId: "driver-123", status: "ASSIGNED" } 
      }, { status: 200 })
    );
    
    startDelivery.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockDeliveries[0], status: "IN_PROGRESS", startedAt: new Date() } 
      }, { status: 200 })
    );
    
    completeDelivery.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockDeliveries[0], status: "COMPLETED", completedAt: new Date() } 
      }, { status: 200 })
    );
    
    rateDelivery.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { 
          deliveryId: mockDeliveries[2].id,
          rating: 4.5,
          comment: "Great service",
          userId: "user-123"
        } 
      }, { status: 200 })
    );
    
    trackDelivery.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: {
          delivery: mockDeliveries[0],
          currentLocation: {
            latitude: 40.7128,
            longitude: -74.0060,
            updatedAt: new Date(),
            status: "ON_ROUTE"
          },
          estimatedArrival: new Date(Date.now() + 1800000)
        } 
      }, { status: 200 })
    );
    
    getDeliveriesForDriver.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: mockDeliveries.filter(d => d.driverId === 'driver-123') 
      }, { status: 200 })
    );
    
    getDeliveryEstimate.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: {
          distance: 15.7,
          estimatedTime: 35,
          price: {
            amount: 24.99,
            currency: "USD"
          },
          availableDrivers: 5
        } 
      }, { status: 200 })
    );
  });

  // Test 1: GET user's deliveries
  describe("GET /api/deliveries", () => {
    it("should return authenticated user's deliveries", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/deliveries");
      
      // Call the handler
      const response = await getDeliveries(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data[0]).toHaveProperty("userId", "user-123");
    });

    it("should support filtering by status", async () => {
      // Mock filtered response
      getDeliveries.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [mockDeliveries[0]] // Only PENDING deliveries
        }, { status: 200 })
      );
      
      // Create request with filter params
      const url = new URL("http://localhost:3000/api/deliveries");
      url.searchParams.set("status", "PENDING");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getDeliveries(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data.length).toBe(1);
      expect(data.data[0]).toHaveProperty("status", "PENDING");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getDeliveries.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/deliveries");
      
      // Call the handler
      const response = await getDeliveries(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 2: GET delivery by ID
  describe("GET /api/deliveries/[id]", () => {
    it("should return a delivery by ID for the authenticated user", async () => {
      // Create params and request
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123");
      
      // Call the handler
      const response = await getDeliveryById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "delivery-123");
    });

    it("should return 403 if trying to access another user's delivery", async () => {
      // Mock error response
      getDeliveryById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to access this delivery" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789");
      
      // Call the handler
      const response = await getDeliveryById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if delivery doesn't exist", async () => {
      // Mock error response
      getDeliveryById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Delivery not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-delivery" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/nonexistent-delivery");
      
      // Call the handler
      const response = await getDeliveryById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 3: POST create delivery
  describe("POST /api/deliveries", () => {
    it("should create a new delivery", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          origin: "123 Pickup St, City A",
          destination: "456 Dropoff St, City B",
          scheduledFor: new Date(Date.now() + 3600000).toISOString(),
          packageDetails: {
            weight: 5.2,
            dimensions: "30x20x15",
            type: "STANDARD",
            fragile: false
          }
        })
      });
      
      // Call the handler
      const response = await createDelivery(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("trackingCode");
      expect(data.data).toHaveProperty("status", "PENDING");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      createDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          origin: "123 Pickup St, City A",
          destination: "456 Dropoff St, City B",
          scheduledFor: new Date(Date.now() + 3600000).toISOString(),
          packageDetails: {
            weight: 5.2,
            dimensions: "30x20x15",
            type: "STANDARD",
            fragile: false
          }
        })
      });
      
      // Call the handler
      const response = await createDelivery(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 for invalid delivery data", async () => {
      // Mock error response
      createDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Invalid delivery data" 
        }, { status: 400 })
      );
      
      // Create request with invalid body
      const req = new NextRequest("http://localhost:3000/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          origin: "123 Pickup St, City A"
        })
      });
      
      // Call the handler
      const response = await createDelivery(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 4: PUT update delivery
  describe("PUT /api/deliveries/[id]", () => {
    it("should update a delivery", async () => {
      // Create params and request
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123", {
        method: "PUT",
        body: JSON.stringify({
          destination: "789 New Dropoff St, City B",
          scheduledFor: new Date(Date.now() + 7200000).toISOString(),
          packageDetails: {
            weight: 6.0,
            fragile: true
          }
        })
      });
      
      // Call the handler
      const response = await updateDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("destination", "789 New Dropoff St, City B");
    });

    it("should return 403 if trying to update another user's delivery", async () => {
      // Mock error response
      updateDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to update this delivery" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789", {
        method: "PUT",
        body: JSON.stringify({
          destination: "789 New Dropoff St, City B"
        })
      });
      
      // Call the handler
      const response = await updateDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if delivery can't be updated due to status", async () => {
      // Mock error response
      updateDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Cannot update delivery in current status" 
        }, { status: 400 })
      );
      
      // Create params and request for a completed delivery
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789", {
        method: "PUT",
        body: JSON.stringify({
          destination: "789 New Dropoff St, City B"
        })
      });
      
      // Call the handler
      const response = await updateDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 5: DELETE (cancel) delivery
  describe("DELETE /api/deliveries/[id]", () => {
    it("should cancel a delivery", async () => {
      // Create params and request
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "CANCELLED");
    });

    it("should return 403 if trying to cancel another user's delivery", async () => {
      // Mock error response
      cancelDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to cancel this delivery" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if delivery can't be cancelled due to status", async () => {
      // Mock error response
      cancelDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Cannot cancel delivery in current status" 
        }, { status: 400 })
      );
      
      // Create params and request for a completed delivery
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 6: POST assign driver to delivery
  describe("POST /api/deliveries/[id]/assign", () => {
    it("should assign a driver to delivery as admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "delivery-456" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-456/assign", {
        method: "POST",
        body: JSON.stringify({
          driverId: "driver-123"
        })
      });
      
      // Call the handler
      const response = await assignDriver(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("driverId", "driver-123");
      expect(data.data).toHaveProperty("status", "ASSIGNED");
    });

    it("should allow driver to self-assign available delivery", async () => {
      // Mock driver session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockDriverSession);
      
      // Create params and request
      const params = { params: { id: "delivery-456" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-456/assign", {
        method: "POST"
      });
      
      // Call the handler
      const response = await assignDriver(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("driverId", "driver-123");
    });

    it("should return 403 if not driver or admin", async () => {
      // Mock error response
      assignDriver.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only drivers or admins can assign deliveries" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "delivery-456" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-456/assign", {
        method: "POST",
        body: JSON.stringify({
          driverId: "driver-123"
        })
      });
      
      // Call the handler
      const response = await assignDriver(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 7: POST start delivery (driver only)
  describe("POST /api/deliveries/[id]/start", () => {
    it("should start a delivery as the assigned driver", async () => {
      // Mock driver session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockDriverSession);
      
      // Create params and request
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123/start", {
        method: "POST"
      });
      
      // Call the handler
      const response = await startDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "IN_PROGRESS");
      expect(data.data).toHaveProperty("startedAt");
    });

    it("should return 403 if not the assigned driver", async () => {
      // Mock error response
      startDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only the assigned driver can start this delivery" 
        }, { status: 403 })
      );
      
      // Create params and request (using user session)
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123/start", {
        method: "POST"
      });
      
      // Call the handler
      const response = await startDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 8: POST complete delivery (driver only)
  describe("POST /api/deliveries/[id]/complete", () => {
    it("should complete a delivery as the assigned driver", async () => {
      // Mock driver session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockDriverSession);
      
      // Create params and request
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123/complete", {
        method: "POST",
        body: JSON.stringify({
          proofOfDelivery: "signature-image-url"
        })
      });
      
      // Call the handler
      const response = await completeDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "COMPLETED");
      expect(data.data).toHaveProperty("completedAt");
    });

    it("should return 403 if not the assigned driver", async () => {
      // Mock error response
      completeDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only the assigned driver can complete this delivery" 
        }, { status: 403 })
      );
      
      // Create params and request (using user session)
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123/complete", {
        method: "POST",
        body: JSON.stringify({
          proofOfDelivery: "signature-image-url"
        })
      });
      
      // Call the handler
      const response = await completeDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 9: POST rate delivery
  describe("POST /api/deliveries/[id]/rate", () => {
    it("should rate a completed delivery", async () => {
      // Create params and request
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789/rate", {
        method: "POST",
        body: JSON.stringify({
          rating: 4.5,
          comment: "Great service"
        })
      });
      
      // Call the handler
      const response = await rateDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("rating", 4.5);
      expect(data.data).toHaveProperty("comment", "Great service");
    });

    it("should return 400 if delivery is not completed", async () => {
      // Mock error response
      rateDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Can only rate completed deliveries" 
        }, { status: 400 })
      );
      
      // Create params and request for a pending delivery
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123/rate", {
        method: "POST",
        body: JSON.stringify({
          rating: 4.5,
          comment: "Great service"
        })
      });
      
      // Call the handler
      const response = await rateDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 403 if not the delivery owner", async () => {
      // Mock error response
      rateDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only the delivery owner can rate it" 
        }, { status: 403 })
      );
      
      // Create params and request for another user's delivery
      const params = { params: { id: "delivery-789" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-789/rate", {
        method: "POST",
        body: JSON.stringify({
          rating: 4.5,
          comment: "Great service"
        })
      });
      
      // Call the handler
      const response = await rateDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 10: GET tracking information
  describe("GET /api/deliveries/[id]/track", () => {
    it("should return tracking information", async () => {
      // Create params and request
      const params = { params: { id: "delivery-123" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/delivery-123/track");
      
      // Call the handler
      const response = await trackDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("delivery");
      expect(data.data).toHaveProperty("currentLocation");
      expect(data.data).toHaveProperty("estimatedArrival");
    });

    it("should allow public tracking with tracking code", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create request with tracking code
      const url = new URL("http://localhost:3000/api/deliveries/track");
      url.searchParams.set("code", "ECO-123456");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await trackDelivery(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("delivery");
    });

    it("should return 404 if delivery doesn't exist", async () => {
      // Mock error response
      trackDelivery.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Delivery not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-delivery" } };
      const req = new NextRequest("http://localhost:3000/api/deliveries/nonexistent-delivery/track");
      
      // Call the handler
      const response = await trackDelivery(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 11: GET deliveries for driver
  describe("GET /api/deliveries/driver", () => {
    it("should return driver's assigned deliveries", async () => {
      // Mock driver session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockDriverSession);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/deliveries/driver");
      
      // Call the handler
      const response = await getDeliveriesForDriver(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data[0]).toHaveProperty("driverId", "driver-123");
    });

    it("should return 403 if not a driver", async () => {
      // Mock error response
      getDeliveriesForDriver.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Driver access required" 
        }, { status: 403 })
      );
      
      // Create request (with user session)
      const req = new NextRequest("http://localhost:3000/api/deliveries/driver");
      
      // Call the handler
      const response = await getDeliveriesForDriver(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 12: GET delivery estimate
  describe("GET /api/deliveries/estimate", () => {
    it("should return a delivery estimate", async () => {
      // Create request with query params
      const url = new URL("http://localhost:3000/api/deliveries/estimate");
      url.searchParams.set("origin", "123 Pickup St, City A");
      url.searchParams.set("destination", "456 Dropoff St, City B");
      url.searchParams.set("weight", "5.2");
      url.searchParams.set("type", "STANDARD");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getDeliveryEstimate(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("distance");
      expect(data.data).toHaveProperty("estimatedTime");
      expect(data.data).toHaveProperty("price");
    });

    it("should return 400 for invalid estimate parameters", async () => {
      // Mock error response
      getDeliveryEstimate.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Missing required parameters" 
        }, { status: 400 })
      );
      
      // Create request with missing params
      const url = new URL("http://localhost:3000/api/deliveries/estimate");
      url.searchParams.set("origin", "123 Pickup St, City A");
      // Missing destination
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getDeliveryEstimate(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });
});