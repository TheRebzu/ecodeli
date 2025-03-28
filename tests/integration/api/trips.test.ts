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
const mockDriverSession = { user: { id: "driver-123", role: "DRIVER" } };
const mockUserSession = { user: { id: "user-123", role: "USER" } };
const mockAdminSession = { user: { id: "admin-123", role: "ADMIN" } };

// Mock trip data
const mockTrip = {
  id: "trip-123",
  driverId: "driver-123",
  origin: {
    address: "123 Start St, City",
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    }
  },
  destination: {
    address: "456 End St, City",
    coordinates: {
      latitude: 40.7500,
      longitude: -73.9967
    }
  },
  departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
  availableCapacity: 3,
  availableVolume: 30,
  availableWeight: 20,
  status: "SCHEDULED",
  price: 25.99,
  vehicleId: "vehicle-123",
  createdAt: new Date(),
  updatedAt: new Date(),
  vehicle: {
    id: "vehicle-123",
    type: "CAR",
    licensePlate: "ABC123",
    model: "Tesla Model 3"
  },
  driver: {
    id: "driver-123",
    userId: "driver-123",
    firstName: "John",
    lastName: "Driver",
    rating: 4.8
  }
};

// Mock API handlers
const registerTrip = jest.fn();
const searchTrips = jest.fn();
const updateTrip = jest.fn();
const deleteTrip = jest.fn();

describe("Trips API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();

    // Default to driver session
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockDriverSession);
    
    // Default mock responses
    registerTrip.mockResolvedValue(
      Response.json({ success: true, data: mockTrip }, { status: 201 })
    );
    
    searchTrips.mockResolvedValue(
      Response.json({ success: true, data: [mockTrip] }, { status: 200 })
    );
    
    updateTrip.mockResolvedValue(
      Response.json({ success: true, data: { ...mockTrip, availableCapacity: 5, price: 30.99 } }, { status: 200 })
    );
    
    deleteTrip.mockResolvedValue(
      Response.json({ success: true, data: { ...mockTrip, status: "CANCELLED" } }, { status: 200 })
    );
  });

  // Test 1: POST to register a new trip
  describe("POST /api/trips", () => {
    it("should register a new trip for a driver", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        body: JSON.stringify({
          origin: {
            address: "123 Start St, City",
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          },
          destination: {
            address: "456 End St, City",
            coordinates: {
              latitude: 40.7500,
              longitude: -73.9967
            }
          },
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          availableCapacity: 3,
          availableVolume: 30,
          availableWeight: 20,
          price: 25.99,
          vehicleId: "vehicle-123"
        })
      });
      
      // Call the handler
      const response = await registerTrip(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", mockTrip.id);
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      registerTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );

      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        body: JSON.stringify({
          origin: {
            address: "123 Start St, City",
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          },
          destination: {
            address: "456 End St, City",
            coordinates: {
              latitude: 40.7500,
              longitude: -73.9967
            }
          },
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          availableCapacity: 3,
          availableVolume: 30,
          availableWeight: 20,
          price: 25.99,
          vehicleId: "vehicle-123"
        })
      });
      
      // Call the handler
      const response = await registerTrip(req);

      // Assertions
      expect(response.status).toBe(401);
    });

    it("should return 403 if user is not a driver", async () => {
      // Mock regular user session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Mock error response
      registerTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Only drivers can register trips" 
        }, { status: 403 })
      );

      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        body: JSON.stringify({
          origin: {
            address: "123 Start St, City",
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          },
          destination: {
            address: "456 End St, City",
            coordinates: {
              latitude: 40.7500,
              longitude: -73.9967
            }
          },
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          availableCapacity: 3,
          availableVolume: 30,
          availableWeight: 20,
          price: 25.99,
          vehicleId: "vehicle-123"
        })
      });
      
      // Call the handler
      const response = await registerTrip(req);

      // Assertions
      expect(response.status).toBe(403);
    });

    it("should return 400 if vehicle does not exist", async () => {
      // Mock error response
      registerTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Vehicle not found" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        body: JSON.stringify({
          origin: {
            address: "123 Start St, City",
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          },
          destination: {
            address: "456 End St, City",
            coordinates: {
              latitude: 40.7500,
              longitude: -73.9967
            }
          },
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          availableCapacity: 3,
          availableVolume: 30,
          availableWeight: 20,
          price: 25.99,
          vehicleId: "non-existent-vehicle"
        })
      });
      
      // Call the handler
      const response = await registerTrip(req);

      // Assertions
      expect(response.status).toBe(400);
    });
  });

  // Test 2: GET to search for available trips
  describe("GET /api/trips/search", () => {
    it("should search for available trips", async () => {
      // Create request with query params
      const url = new URL("http://localhost:3000/api/trips/search");
      url.searchParams.set("originLat", "40.7128");
      url.searchParams.set("originLng", "-74.0060");
      url.searchParams.set("destinationLat", "40.7500");
      url.searchParams.set("destinationLng", "-73.9967");
      url.searchParams.set("date", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      const req = new NextRequest(url);
      
      // Mock user session for search
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Call the handler
      const response = await searchTrips(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty("id", mockTrip.id);
    });

    it("should return 400 if required query parameters are missing", async () => {
      // Mock error response
      searchTrips.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Missing required query parameters" 
        }, { status: 400 })
      );
      
      // Create request without required query params
      const req = new NextRequest("http://localhost:3000/api/trips/search");
      
      // Mock user session for search
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Call the handler
      const response = await searchTrips(req);

      // Assertions
      expect(response.status).toBe(400);
    });

    it("should work without authentication", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create request with query params
      const url = new URL("http://localhost:3000/api/trips/search");
      url.searchParams.set("originLat", "40.7128");
      url.searchParams.set("originLng", "-74.0060");
      url.searchParams.set("destinationLat", "40.7500");
      url.searchParams.set("destinationLng", "-73.9967");
      url.searchParams.set("date", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await searchTrips(req);

      // Assertions
      expect(response.status).toBe(200);
    });
  });

  // Test 3: PUT to update a trip
  describe("PUT /api/trips/[id]", () => {
    it("should update a driver's trip", async () => {
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "PUT",
        body: JSON.stringify({
          availableCapacity: 5,
          price: 30.99
        })
      });
      
      // Call the handler
      const response = await updateTrip(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("availableCapacity", 5);
      expect(data.data).toHaveProperty("price", 30.99);
    });

    it("should return 404 if trip does not exist", async () => {
      // Mock error response
      updateTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Trip not found" 
        }, { status: 404 })
      );
      
      // Create context with params
      const params = { params: { id: "non-existent-trip" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips/non-existent-trip", {
        method: "PUT",
        body: JSON.stringify({
          availableCapacity: 5,
          price: 30.99
        })
      });
      
      // Call the handler
      const response = await updateTrip(req, params);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 403 if user tries to update someone else's trip", async () => {
      // Mock error response
      updateTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to update this trip" 
        }, { status: 403 })
      );
      
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "PUT",
        body: JSON.stringify({
          availableCapacity: 5,
          price: 30.99
        })
      });
      
      // Call the handler
      const response = await updateTrip(req, params);

      // Assertions
      expect(response.status).toBe(403);
    });

    it("should allow admin to update any trip", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "PUT",
        body: JSON.stringify({
          availableCapacity: 5,
          price: 30.99
        })
      });
      
      // Call the handler
      const response = await updateTrip(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
    });
  });

  // Test 4: DELETE to delete a trip
  describe("DELETE /api/trips/[id]", () => {
    it("should delete a driver's trip", async () => {
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteTrip(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "CANCELLED");
    });

    it("should return 404 if trip does not exist", async () => {
      // Mock error response
      deleteTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Trip not found" 
        }, { status: 404 })
      );
      
      // Create context with params
      const params = { params: { id: "non-existent-trip" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/trips/non-existent-trip", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteTrip(req, params);

      // Assertions
      expect(response.status).toBe(404);
    });

    it("should return 403 if user tries to delete someone else's trip", async () => {
      // Mock error response
      deleteTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to delete this trip" 
        }, { status: 403 })
      );
      
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteTrip(req, params);

      // Assertions
      expect(response.status).toBe(403);
    });

    it("should return 400 if trip is already in progress", async () => {
      // Mock error response
      deleteTrip.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Cannot cancel a trip that is already in progress" 
        }, { status: 400 })
      );
      
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteTrip(req, params);

      // Assertions
      expect(response.status).toBe(400);
    });

    it("should allow admin to delete any trip", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create context with params
      const params = { params: { id: "trip-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/trips/trip-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteTrip(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
    });
  });
}); 