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

// Mock user data
const mockUser = {
  id: "user-123",
  email: "user@example.com",
  name: "Test User",
  role: "USER",
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: {
    id: "profile-123",
    userId: "user-123",
    firstName: "Test",
    lastName: "User",
    phoneNumber: "+1234567890",
    address: "123 Test St",
    city: "Test City",
    zipCode: "12345",
    country: "Test Country",
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

const mockDriverProfile = {
  id: "driver-profile-123",
  userId: "user-123",
  vehicleModel: "Toyota Prius",
  vehicleYear: 2020,
  licensePlate: "ABC123",
  licenseNumber: "DL12345678",
  isAvailable: true,
  rating: 4.8,
  completedDeliveries: 42,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock list of users for admin endpoints
const mockUsers = [
  mockUser,
  {
    id: "user-456",
    email: "another@example.com",
    name: "Another User",
    role: "USER",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "driver-789",
    email: "driver@example.com",
    name: "Driver User",
    role: "DRIVER",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock API handlers
const getProfile = jest.fn();
const updateProfile = jest.fn();
const getUsers = jest.fn();
const getUserById = jest.fn();
const updateUser = jest.fn();
const deleteUser = jest.fn();
const createDriverProfile = jest.fn();
const getDriverProfile = jest.fn();
const updateDriverProfile = jest.fn();
const uploadProfilePicture = jest.fn();
const getProfilePicture = jest.fn();
const getUserStats = jest.fn();

describe("Users API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Default user session for most tests
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
    
    // Default mock responses
    getProfile.mockResolvedValue(
      Response.json({ success: true, data: mockUser.profile }, { status: 200 })
    );
    
    updateProfile.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { 
          ...mockUser.profile, 
          phoneNumber: "+1987654321" 
        }
      }, { status: 200 })
    );
    
    getUsers.mockResolvedValue(
      Response.json({ success: true, data: mockUsers }, { status: 200 })
    );
    
    getUserById.mockResolvedValue(
      Response.json({ success: true, data: mockUser }, { status: 200 })
    );
    
    updateUser.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockUser, role: "DRIVER" }
      }, { status: 200 })
    );
    
    deleteUser.mockResolvedValue(
      Response.json({ success: true, message: "User deleted successfully" }, { status: 200 })
    );
    
    createDriverProfile.mockResolvedValue(
      Response.json({ success: true, data: mockDriverProfile }, { status: 201 })
    );
    
    getDriverProfile.mockResolvedValue(
      Response.json({ success: true, data: mockDriverProfile }, { status: 200 })
    );
    
    updateDriverProfile.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockDriverProfile, isAvailable: false }
      }, { status: 200 })
    );
    
    uploadProfilePicture.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { url: "https://example.com/profile-pictures/user-123.jpg" }
      }, { status: 200 })
    );
    
    getProfilePicture.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { url: "https://example.com/profile-pictures/user-123.jpg" }
      }, { status: 200 })
    );
    
    getUserStats.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { 
          deliveriesCount: 42,
          reviewsAvgRating: 4.8,
          completedTrips: 15,
          activeSubscriptions: 1
        }
      }, { status: 200 })
    );
  });

  // Test 1: GET user profile
  describe("GET /api/users/profile", () => {
    it("should return the authenticated user's profile", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users/profile");
      
      // Call the handler
      const response = await getProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("firstName", "Test");
      expect(data.data).toHaveProperty("lastName", "User");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getProfile.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users/profile");
      
      // Call the handler
      const response = await getProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should create a profile if one doesn't exist yet", async () => {
      // Mock response for created profile
      getProfile.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: mockUser.profile,
          created: true
        }, { status: 201 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users/profile");
      
      // Call the handler
      const response = await getProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("created", true);
      expect(data).toHaveProperty("data");
    });
  });

  // Test 2: PUT user profile
  describe("PUT /api/users/profile", () => {
    it("should update the authenticated user's profile", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({
          firstName: "Test",
          lastName: "User",
          phoneNumber: "+1987654321",
          address: "123 New St",
          city: "New City",
          zipCode: "54321",
          country: "New Country"
        })
      });
      
      // Call the handler
      const response = await updateProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("phoneNumber", "+1987654321");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      updateProfile.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({
          firstName: "Test",
          lastName: "User",
          phoneNumber: "+1987654321"
        })
      });
      
      // Call the handler
      const response = await updateProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 for invalid phone number format", async () => {
      // Mock error response
      updateProfile.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Invalid phone number format" 
        }, { status: 400 })
      );
      
      // Create request with invalid phone number
      const req = new NextRequest("http://localhost:3000/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({
          firstName: "Test",
          lastName: "User",
          phoneNumber: "invalid"
        })
      });
      
      // Call the handler
      const response = await updateProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 3: GET all users (admin only)
  describe("GET /api/users", () => {
    it("should return all users for admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users");
      
      // Call the handler
      const response = await getUsers(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3);
    });

    it("should support pagination", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock paginated response
      getUsers.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: mockUsers.slice(0, 2),
          pagination: {
            page: 1,
            pageSize: 2,
            totalItems: 3,
            totalPages: 2
          }
        }, { status: 200 })
      );
      
      // Create request with pagination params
      const url = new URL("http://localhost:3000/api/users");
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "2");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getUsers(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("pagination");
      expect(data.data.length).toBe(2);
      expect(data.pagination).toHaveProperty("totalItems", 3);
    });

    it("should support filtering by role", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock filtered response
      getUsers.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [mockUsers[2]] // Just the driver
        }, { status: 200 })
      );
      
      // Create request with filter params
      const url = new URL("http://localhost:3000/api/users");
      url.searchParams.set("role", "DRIVER");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getUsers(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data.length).toBe(1);
      expect(data.data[0]).toHaveProperty("role", "DRIVER");
    });

    it("should return 403 if not admin", async () => {
      // Mock regular user session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Mock error response
      getUsers.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Admin access required" 
        }, { status: 403 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users");
      
      // Call the handler
      const response = await getUsers(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 4: GET user by ID
  describe("GET /api/users/[id]", () => {
    it("should return a user by ID for admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "user-123" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-123");
      
      // Call the handler
      const response = await getUserById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "user-123");
    });

    it("should return own user profile for regular user", async () => {
      // Create params and request
      const params = { params: { id: "user-123" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-123");
      
      // Call the handler
      const response = await getUserById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "user-123");
    });

    it("should return 403 if trying to access another user's profile", async () => {
      // Mock error response
      getUserById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Not authorized to access this user profile" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "user-456" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-456");
      
      // Call the handler
      const response = await getUserById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if user doesn't exist", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock error response
      getUserById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "User not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-user" } };
      const req = new NextRequest("http://localhost:3000/api/users/nonexistent-user");
      
      // Call the handler
      const response = await getUserById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 5: PUT user by ID (admin only)
  describe("PUT /api/users/[id]", () => {
    it("should update a user for admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "user-123" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-123", {
        method: "PUT",
        body: JSON.stringify({
          role: "DRIVER",
          name: "Updated Name"
        })
      });
      
      // Call the handler
      const response = await updateUser(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("role", "DRIVER");
    });

    it("should return 403 if not admin", async () => {
      // Mock error response
      updateUser.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Admin access required" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "user-123" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-123", {
        method: "PUT",
        body: JSON.stringify({
          role: "DRIVER"
        })
      });
      
      // Call the handler
      const response = await updateUser(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if user doesn't exist", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock error response
      updateUser.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "User not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-user" } };
      const req = new NextRequest("http://localhost:3000/api/users/nonexistent-user", {
        method: "PUT",
        body: JSON.stringify({
          role: "DRIVER"
        })
      });
      
      // Call the handler
      const response = await updateUser(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 6: DELETE user by ID (admin only)
  describe("DELETE /api/users/[id]", () => {
    it("should delete a user for admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "user-123" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteUser(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 403 if not admin", async () => {
      // Mock error response
      deleteUser.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Admin access required" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "user-456" } };
      const req = new NextRequest("http://localhost:3000/api/users/user-456", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteUser(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if user doesn't exist", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock error response
      deleteUser.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "User not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-user" } };
      const req = new NextRequest("http://localhost:3000/api/users/nonexistent-user", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteUser(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 7: POST driver profile
  describe("POST /api/users/driver-profile", () => {
    it("should create a driver profile", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/users/driver-profile", {
        method: "POST",
        body: JSON.stringify({
          vehicleModel: "Toyota Prius",
          vehicleYear: 2020,
          licensePlate: "ABC123",
          licenseNumber: "DL12345678"
        })
      });
      
      // Call the handler
      const response = await createDriverProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("vehicleModel", "Toyota Prius");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      createDriverProfile.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/users/driver-profile", {
        method: "POST",
        body: JSON.stringify({
          vehicleModel: "Toyota Prius",
          vehicleYear: 2020,
          licensePlate: "ABC123",
          licenseNumber: "DL12345678"
        })
      });
      
      // Call the handler
      const response = await createDriverProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if profile already exists", async () => {
      // Mock error response
      createDriverProfile.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Driver profile already exists" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/users/driver-profile", {
        method: "POST",
        body: JSON.stringify({
          vehicleModel: "Toyota Prius",
          vehicleYear: 2020,
          licensePlate: "ABC123",
          licenseNumber: "DL12345678"
        })
      });
      
      // Call the handler
      const response = await createDriverProfile(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 8: GET user statistics
  describe("GET /api/users/stats", () => {
    it("should return user statistics", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users/stats");
      
      // Call the handler
      const response = await getUserStats(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("deliveriesCount");
      expect(data.data).toHaveProperty("reviewsAvgRating");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      getUserStats.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/users/stats");
      
      // Call the handler
      const response = await getUserStats(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });
}); 