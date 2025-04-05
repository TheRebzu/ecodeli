import { NextRequest } from 'next/server';
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import * as auth from "next-auth";
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/announcements/route';
import { GET as GetAnnouncementById } from '@/app/api/announcements/[id]/route';
import { PackageType, InsuranceOption } from '@/shared/types/announcement.types';

// Mock Prisma client
const prismaObj = { default: undefined };
const mockPrisma = mockDeep<PrismaClient>();
prismaObj.default = mockPrisma;

jest.mock("@/lib/prisma", () => prismaObj);

// Mock Next Auth
jest.mock("next-auth");
const mockUserSession = { user: { id: "user-123", role: "USER", email: "user@example.com" } };
const mockAdminSession = { user: { id: "admin-123", role: "ADMIN", email: "admin@example.com" } };

// Mock announcement data
const mockAnnouncements = [
  {
    id: "announcement-123",
    title: "Maintenance Planned",
    content: "The system will be down for maintenance on Saturday night from 10 PM to 2 AM.",
    type: "MAINTENANCE",
    severity: "MEDIUM",
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
    authorId: "admin-123",
    targetAudience: ["ALL"],
    isActive: true
  },
  {
    id: "announcement-456",
    title: "New Feature Launch",
    content: "We're excited to announce our new route optimization feature!",
    type: "FEATURE",
    severity: "LOW",
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
    authorId: "admin-123",
    targetAudience: ["USER", "DRIVER"],
    isActive: true
  },
  {
    id: "announcement-789",
    title: "Service Disruption",
    content: "We're experiencing issues with payment processing. Our team is working on it.",
    type: "OUTAGE",
    severity: "HIGH",
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
    authorId: "admin-123",
    targetAudience: ["ALL"],
    isActive: true
  },
  {
    id: "announcement-101",
    title: "Expired Announcement",
    content: "This announcement has expired and should not be shown.",
    type: "GENERAL",
    severity: "LOW",
    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    expiresAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    authorId: "admin-123",
    targetAudience: ["ALL"],
    isActive: false
  }
];

// Mock API handlers
const getAnnouncements = jest.fn();
const getAnnouncementById = jest.fn();
const createAnnouncement = jest.fn();
const updateAnnouncement = jest.fn();
const deleteAnnouncement = jest.fn();

describe("Announcements API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Default user session for most tests
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
    
    // Default mock responses
    getAnnouncements.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: mockAnnouncements.filter(a => a.isActive && a.expiresAt > new Date())
      }, { status: 200 })
    );
    
    getAnnouncementById.mockResolvedValue(
      Response.json({ success: true, data: mockAnnouncements[0] }, { status: 200 })
    );
    
    createAnnouncement.mockResolvedValue(
      Response.json({ success: true, data: mockAnnouncements[0] }, { status: 201 })
    );
    
    updateAnnouncement.mockResolvedValue(
      Response.json({ 
        success: true, 
        data: { ...mockAnnouncements[0], title: "Updated Title", content: "Updated content" } 
      }, { status: 200 })
    );
    
    deleteAnnouncement.mockResolvedValue(
      Response.json({ success: true, message: "Announcement deleted successfully" }, { status: 200 })
    );
  });

  // Test 1: GET announcements
  describe("GET /api/announcements", () => {
    it("should return active announcements", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/announcements");
      
      // Call the handler
      const response = await getAnnouncements(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3); // Only active and non-expired announcements
    });

    it("should support filtering by type", async () => {
      // Mock filtered response
      getAnnouncements.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [mockAnnouncements[0]] // Only MAINTENANCE announcements
        }, { status: 200 })
      );
      
      // Create request with filter params
      const url = new URL("http://localhost:3000/api/announcements");
      url.searchParams.set("type", "MAINTENANCE");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getAnnouncements(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data.length).toBe(1);
      expect(data.data[0]).toHaveProperty("type", "MAINTENANCE");
    });

    it("should support filtering by severity", async () => {
      // Mock filtered response
      getAnnouncements.mockResolvedValueOnce(
        Response.json({ 
          success: true, 
          data: [mockAnnouncements[2]] // Only HIGH severity announcements
        }, { status: 200 })
      );
      
      // Create request with filter params
      const url = new URL("http://localhost:3000/api/announcements");
      url.searchParams.set("severity", "HIGH");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getAnnouncements(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data.length).toBe(1);
      expect(data.data[0]).toHaveProperty("severity", "HIGH");
    });

    it("should be accessible without authentication", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/announcements");
      
      // Call the handler
      const response = await getAnnouncements(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
    });
  });

  // Test 2: GET announcement by ID
  describe("GET /api/announcements/[id]", () => {
    it("should return an announcement by ID", async () => {
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123");
      
      // Call the handler
      const response = await getAnnouncementById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", "announcement-123");
    });

    it("should return 404 if announcement doesn't exist", async () => {
      // Mock error response
      getAnnouncementById.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Announcement not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-announcement" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/nonexistent-announcement");
      
      // Call the handler
      const response = await getAnnouncementById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should be accessible without authentication", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123");
      
      // Call the handler
      const response = await getAnnouncementById(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
    });
  });

  // Test 3: POST create announcement (admin only)
  describe("POST /api/announcements", () => {
    it("should create a new announcement as admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Maintenance Planned",
          content: "The system will be down for maintenance on Saturday night from 10 PM to 2 AM.",
          type: "MAINTENANCE",
          severity: "MEDIUM",
          publishedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          targetAudience: ["ALL"]
        })
      });
      
      // Call the handler
      const response = await createAnnouncement(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("title", "Maintenance Planned");
      expect(data.data).toHaveProperty("type", "MAINTENANCE");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      createAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Maintenance Planned",
          content: "The system will be down for maintenance.",
          type: "MAINTENANCE",
          severity: "MEDIUM"
        })
      });
      
      // Call the handler
      const response = await createAnnouncement(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 403 if user is not an admin", async () => {
      // Mock error response
      createAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Admin access required" 
        }, { status: 403 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Maintenance Planned",
          content: "The system will be down for maintenance.",
          type: "MAINTENANCE",
          severity: "MEDIUM"
        })
      });
      
      // Call the handler
      const response = await createAnnouncement(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 for invalid announcement data", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock error response
      createAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Invalid announcement data" 
        }, { status: 400 })
      );
      
      // Create request with invalid body
      const req = new NextRequest("http://localhost:3000/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          content: "The system will be down for maintenance."
        })
      });
      
      // Call the handler
      const response = await createAnnouncement(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 4: PUT update announcement (admin only)
  describe("PUT /api/announcements/[id]", () => {
    it("should update an announcement as admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title",
          content: "Updated content",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
      });
      
      // Call the handler
      const response = await updateAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("title", "Updated Title");
      expect(data.data).toHaveProperty("content", "Updated content");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      updateAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title"
        })
      });
      
      // Call the handler
      const response = await updateAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 403 if user is not an admin", async () => {
      // Mock error response
      updateAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Admin access required" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title"
        })
      });
      
      // Call the handler
      const response = await updateAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if announcement doesn't exist", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock error response
      updateAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Announcement not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-announcement" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/nonexistent-announcement", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title"
        })
      });
      
      // Call the handler
      const response = await updateAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 5: DELETE announcement (admin only)
  describe("DELETE /api/announcements/[id]", () => {
    it("should delete an announcement as admin", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      deleteAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 403 if user is not an admin", async () => {
      // Mock error response
      deleteAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Admin access required" 
        }, { status: 403 })
      );
      
      // Create params and request
      const params = { params: { id: "announcement-123" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/announcement-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(403);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if announcement doesn't exist", async () => {
      // Mock admin session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
      
      // Mock error response
      deleteAnnouncement.mockResolvedValueOnce(
        Response.json({ 
          success: false, 
          error: "Announcement not found" 
        }, { status: 404 })
      );
      
      // Create params and request
      const params = { params: { id: "nonexistent-announcement" } };
      const req = new NextRequest("http://localhost:3000/api/announcements/nonexistent-announcement", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await deleteAnnouncement(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(404);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });
});

describe('Announcements API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock du serveur session avec un utilisateur authentifié
    (auth.getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com', role: 'CLIENT' },
    });
  });

  describe('GET /api/announcements', () => {
    it('should return announcements list with pagination', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/announcements',
        query: {
          page: '1',
          pageSize: '10',
        },
      });

      const mockAnnouncements = [
        {
          id: 'announcement1',
          title: 'Test Announcement 1',
          status: 'PUBLISHED',
          // ... autres propriétés
        },
        {
          id: 'announcement2',
          title: 'Test Announcement 2',
          status: 'PUBLISHED',
          // ... autres propriétés
        },
      ];

      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.announcement.findMany.mockResolvedValue(mockAnnouncements);
      mockPrisma.announcement.count.mockResolvedValue(2);

      await GET(req);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 10,
        pages: 1,
      });
    });

    it('should filter announcements based on query parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/announcements',
        query: {
          search: 'Paris',
          status: 'PUBLISHED',
          packageType: 'LARGE',
          minPrice: '50',
          maxPrice: '200',
        },
      });

      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.announcement.findMany.mockResolvedValue([]);
      mockPrisma.announcement.count.mockResolvedValue(0);

      await GET(req);

      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            packageType: 'LARGE',
            price: {
              gte: 50,
              lte: 200,
            },
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/announcements',
      });

      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.announcement.findMany.mockRejectedValue(new Error('Database error'));

      await GET(req);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });
  });

  describe('GET /api/announcements/[id]', () => {
    it('should return a specific announcement by ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const mockAnnouncement = {
        id: 'announcement1',
        title: 'Test Announcement',
        status: 'PUBLISHED',
        // ... autres propriétés
      };

      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);

      const params = { id: 'announcement1' };
      await GetAnnouncementById(req, { params });

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnnouncement);
    });

    it('should return 404 if announcement not found', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.announcement.findUnique.mockResolvedValue(null);

      const params = { id: 'nonexistent' };
      await GetAnnouncementById(req, { params });

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });
  });

  describe('POST /api/announcements', () => {
    it('should create a new announcement', async () => {
      const announcementData = {
        title: 'New Announcement',
        description: 'Test description',
        packageType: PackageType.MEDIUM,
        weight: 10,
        isFragile: false,
        requiresRefrigeration: false,
        pickupAddress: '123 Test St',
        pickupCity: 'Paris',
        pickupPostalCode: '75001',
        pickupCountry: 'France',
        pickupCoordinates: { lat: 48.8566, lng: 2.3522 },
        deliveryAddress: '456 Test Ave',
        deliveryCity: 'Lyon',
        deliveryPostalCode: '69001',
        deliveryCountry: 'France',
        deliveryCoordinates: { lat: 45.7578, lng: 4.8320 },
        pickupDate: new Date('2023-12-25'),
        deliveryDeadline: new Date('2023-12-30'),
        price: 100,
        isNegotiable: true,
        insuranceOption: InsuranceOption.NONE,
        packageImages: ['https://example.com/image.jpg'],
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: announcementData,
      });

      const createdAnnouncement = {
        id: 'new-announcement-id',
        ...announcementData,
        customerId: 'user123',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.announcement.create.mockResolvedValue(createdAnnouncement);

      await POST(req);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(createdAnnouncement);
    });

    it('should validate announcement data before creation', async () => {
      const invalidData = {
        title: 'A', // Trop court
        price: -100, // Prix négatif
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData,
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should require authentication', async () => {
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: {},
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });
  });
}); 