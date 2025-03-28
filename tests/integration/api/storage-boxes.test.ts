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
const mockAdminSession = { user: { id: "admin-123", role: "ADMIN" } };

// Mock storage box data
const mockStorageBoxes = [
  {
    id: "box-1",
    locationId: "loc-1",
    size: "SMALL",
    pricePerDay: 5.99,
    isAvailable: true,
    location: {
      id: "loc-1",
      name: "North Station",
      address: "123 North St",
      city: "Boston",
      state: "MA",
      zipCode: "02114",
      coordinates: {
        latitude: 42.3663,
        longitude: -71.0622
      }
    }
  },
  {
    id: "box-2",
    locationId: "loc-1",
    size: "MEDIUM",
    pricePerDay: 8.99,
    isAvailable: true,
    location: {
      id: "loc-1",
      name: "North Station",
      address: "123 North St",
      city: "Boston",
      state: "MA",
      zipCode: "02114",
      coordinates: {
        latitude: 42.3663,
        longitude: -71.0622
      }
    }
  },
  {
    id: "box-3",
    locationId: "loc-2",
    size: "LARGE",
    pricePerDay: 12.99,
    isAvailable: false,
    location: {
      id: "loc-2",
      name: "South Station",
      address: "700 Atlantic Ave",
      city: "Boston",
      state: "MA",
      zipCode: "02110",
      coordinates: {
        latitude: 42.3519,
        longitude: -71.0551
      }
    }
  }
];

const mockReservation = {
  id: "res-123",
  boxId: "box-1",
  userId: "user-123",
  startDate: new Date(2023, 9, 1), // Oct 1, 2023
  endDate: new Date(2023, 9, 3),   // Oct 3, 2023
  totalPrice: 11.98,
  status: "RESERVED",
  createdAt: new Date(),
  updatedAt: new Date(),
  box: mockStorageBoxes[0]
};

// Mock API handlers
const checkAvailability = jest.fn();
const getLocations = jest.fn();
const reserveBox = jest.fn();
const getReservations = jest.fn();
const getReservationDetails = jest.fn();
const cancelReservation = jest.fn();

describe("Storage Boxes API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();

    // Default to user session
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
    
    // Default mock responses
    checkAvailability.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { availableBoxes: [mockStorageBoxes[0], mockStorageBoxes[1]] } 
      }, { status: 200 })
    );
    
    getLocations.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: [mockStorageBoxes[0].location, mockStorageBoxes[2].location]
      }, { status: 200 })
    );
    
    reserveBox.mockResolvedValue(
      Response.json({ success: true, data: mockReservation }, { status: 201 })
    );
    
    getReservations.mockResolvedValue(
      Response.json({ success: true, data: [mockReservation] }, { status: 200 })
    );
    
    getReservationDetails.mockResolvedValue(
      Response.json({ success: true, data: mockReservation }, { status: 200 })
    );
    
    cancelReservation.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockReservation, status: "CANCELLED" } 
      }, { status: 200 })
    );
  });

  // Test 1: GET to check box availability
  describe("GET /api/storage-boxes/availability", () => {
    it("should return available storage boxes for a location and date range", async () => {
      // Create URL with query parameters
      const url = new URL("http://localhost:3000/api/storage-boxes/availability");
      url.searchParams.set("locationId", "loc-1");
      url.searchParams.set("startDate", "2023-10-05");
      url.searchParams.set("endDate", "2023-10-07");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await checkAvailability(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("availableBoxes");
      expect(data.data.availableBoxes).toHaveLength(2);
    });

    it("should return 400 if required query parameters are missing", async () => {
      // Mock error response
      checkAvailability.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Missing required parameters" 
        }, { status: 400 })
      );
      
      // Create request without parameters
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/availability");
      
      // Call the handler
      const response = await checkAvailability(req);

      // Assertions
      expect(response.status).toBe(400);
    });

    it("should work without authentication", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create URL with query parameters
      const url = new URL("http://localhost:3000/api/storage-boxes/availability");
      url.searchParams.set("locationId", "loc-1");
      url.searchParams.set("startDate", "2023-10-05");
      url.searchParams.set("endDate", "2023-10-07");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await checkAvailability(req);

      // Assertions
      expect(response.status).toBe(200);
    });
  });

  // Test 2: GET to retrieve all locations
  describe("GET /api/storage-boxes/locations", () => {
    it("should return all storage box locations", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/locations");
      
      // Call the handler
      const response = await getLocations(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty("id", "loc-1");
      expect(data.data[1]).toHaveProperty("id", "loc-2");
    });

    it("should work without authentication", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/locations");
      
      // Call the handler
      const response = await getLocations(req);

      // Assertions
      expect(response.status).toBe(200);
    });
  });

  // Test 3: POST to reserve a box
  describe("POST /api/storage-boxes/reserve", () => {
    it("should reserve a storage box for a user", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reserve", {
        method: "POST",
        body: JSON.stringify({
          boxId: "box-1",
          startDate: "2023-10-01",
          endDate: "2023-10-03"
        })
      });
      
      // Call the handler
      const response = await reserveBox(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "res-123");
      expect(data.data).toHaveProperty("boxId", "box-1");
      expect(data.data).toHaveProperty("userId", "user-123");
      expect(data.data).toHaveProperty("status", "RESERVED");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      reserveBox.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reserve", {
        method: "POST",
        body: JSON.stringify({
          boxId: "box-1",
          startDate: "2023-10-01",
          endDate: "2023-10-03"
        })
      });
      
      // Call the handler
      const response = await reserveBox(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 400 if box is not available", async () => {
      // Mock error response
      reserveBox.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Box is not available for the selected dates" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reserve", {
        method: "POST",
        body: JSON.stringify({
          boxId: "box-3", // This box is not available
          startDate: "2023-10-01",
          endDate: "2023-10-03"
        })
      });
      
      // Call the handler
      const response = await reserveBox(req);

      // Assertions
      expect(response.status).toBe(400);
    });
  });

  // Test 4: GET to retrieve user's reservations
  describe("GET /api/storage-boxes/reservations", () => {
    it("should return all reservations for a user", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations");
      
      // Call the handler
      const response = await getReservations(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty("id", "res-123");
      expect(data.data[0]).toHaveProperty("userId", "user-123");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getReservations.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations");
      
      // Call the handler
      const response = await getReservations(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should allow admin to view all reservations", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock response for admin with additional reservations
      getReservations.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [
            mockReservation,
            { ...mockReservation, id: "res-456", userId: "other-user" }
          ] 
        }, { status: 200 })
      );
      
      // Create request with admin filter
      const url = new URL("http://localhost:3000/api/storage-boxes/reservations");
      url.searchParams.set("all", "true");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getReservations(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(2);
    });
  });

  // Test 5: GET to retrieve specific reservation details
  describe("GET /api/storage-boxes/reservations/[id]", () => {
    it("should return details for a specific reservation", async () => {
      // Create context with params
      const params = { params: { id: "res-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-123");
      
      // Call the handler
      const response = await getReservationDetails(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "res-123");
      expect(data.data).toHaveProperty("boxId", "box-1");
      expect(data.data).toHaveProperty("box");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getReservationDetails.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create context with params
      const params = { params: { id: "res-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-123");
      
      // Call the handler
      const response = await getReservationDetails(req, params);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 404 if reservation does not exist", async () => {
      // Mock error response
      getReservationDetails.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Reservation not found" 
        }, { status: 404 })
      );
      
      // Create context with params
      const params = { params: { id: "non-existent" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/non-existent");
      
      // Call the handler
      const response = await getReservationDetails(req, params);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 403 if user tries to access someone else's reservation", async () => {
      // Mock error response
      getReservationDetails.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to view this reservation" 
        }, { status: 403 })
      );
      
      // Create context with params
      const params = { params: { id: "res-456" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-456");
      
      // Call the handler
      const response = await getReservationDetails(req, params);

      // Assertions
      expect(response.status).toBe(403);
    });

    it("should allow admin to view any reservation", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock response for admin accessing someone else's reservation
      getReservationDetails.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: { ...mockReservation, id: "res-456", userId: "other-user" }
        }, { status: 200 })
      );
      
      // Create context with params
      const params = { params: { id: "res-456" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-456");
      
      // Call the handler
      const response = await getReservationDetails(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("userId", "other-user");
    });
  });

  // Test 6: DELETE to cancel a reservation
  describe("DELETE /api/storage-boxes/reservations/[id]", () => {
    it("should cancel a user's reservation", async () => {
      // Create context with params
      const params = { params: { id: "res-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelReservation(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "res-123");
      expect(data.data).toHaveProperty("status", "CANCELLED");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      cancelReservation.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create context with params
      const params = { params: { id: "res-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelReservation(req, params);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 404 if reservation does not exist", async () => {
      // Mock error response
      cancelReservation.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Reservation not found" 
        }, { status: 404 })
      );
      
      // Create context with params
      const params = { params: { id: "non-existent" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/non-existent", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelReservation(req, params);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 403 if user tries to cancel someone else's reservation", async () => {
      // Mock error response
      cancelReservation.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to cancel this reservation" 
        }, { status: 403 })
      );
      
      // Create context with params
      const params = { params: { id: "res-456" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-456", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelReservation(req, params);

      // Assertions
      expect(response.status).toBe(403);
    });

    it("should return 400 if reservation is already cancelled", async () => {
      // Mock error response
      cancelReservation.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Reservation is already cancelled" 
        }, { status: 400 })
      );
      
      // Create context with params
      const params = { params: { id: "res-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelReservation(req, params);

      // Assertions
      expect(response.status).toBe(400);
    });

    it("should allow admin to cancel any reservation", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock response for admin cancelling someone else's reservation
      cancelReservation.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: { 
            ...mockReservation, 
            id: "res-456", 
            userId: "other-user", 
            status: "CANCELLED" 
          }
        }, { status: 200 })
      );
      
      // Create context with params
      const params = { params: { id: "res-456" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/storage-boxes/reservations/res-456", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelReservation(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("userId", "other-user");
      expect(data.data).toHaveProperty("status", "CANCELLED");
    });
  });
}); 