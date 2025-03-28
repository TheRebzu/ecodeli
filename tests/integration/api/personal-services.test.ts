import { NextRequest } from "next/server";
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import * as auth from "next-auth";

// Mock Prisma client
const mockPrisma = mockDeep<PrismaClient>();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock Next Auth
jest.mock("next-auth");
const mockUserSession = { user: { id: "user-123", role: "USER" } };
const mockProviderSession = { user: { id: "provider-123", role: "PROVIDER" } };

// Mock service data
const mockServiceCategory = {
  id: "category-123",
  name: "Home Maintenance",
  description: "Services for home maintenance and repairs",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockService = {
  id: "service-123",
  name: "Plumbing Repair",
  description: "Fix leaky faucets, clogged drains, and other plumbing issues",
  price: 50.00,
  duration: 60, // minutes
  categoryId: "category-123",
  providerId: "provider-123",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  provider: {
    id: "provider-123",
    userId: "provider-123",
    businessName: "Quick Fix Plumbing",
    description: "Professional plumbing services with quick response times",
    rating: 4.8,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  category: mockServiceCategory
};

const mockAppointment = {
  id: "appointment-123",
  userId: "user-123",
  serviceId: "service-123",
  date: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
  status: "SCHEDULED",
  notes: "Leaky faucet in kitchen, second floor",
  address: "123 Main St, Anytown",
  price: 50.00,
  createdAt: new Date(),
  updatedAt: new Date(),
  service: mockService,
  user: {
    id: "user-123",
    email: "user@example.com",
    name: "Test User"
  }
};

// Import handlers after mocks are set up
import { GET as getCategories } from "@/app/api/personal-services/categories/route";
import { GET as getServices } from "@/app/api/personal-services/route";
import { POST as createAppointment } from "@/app/api/personal-services/appointments/route";
import { GET as getAppointments } from "@/app/api/personal-services/appointments/route";
import { PUT as updateAppointment } from "@/app/api/personal-services/appointments/[id]/route";
import { DELETE as cancelAppointment } from "@/app/api/personal-services/appointments/[id]/route";
import { GET as providerDashboard } from "@/app/api/personal-services/provider/dashboard/route";

describe("Personal Services API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    // Default to user session
    (auth.getServerSession as jest.Mock).mockResolvedValue(mockUserSession);
  });

  // Test 1: GET categories
  describe("GET /api/personal-services/categories", () => {
    it("should list all service categories", async () => {
      // Mock Prisma response
      mockPrisma.serviceCategory.findMany.mockResolvedValue([mockServiceCategory]);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/categories");
      
      // Call the handler
      const response = await getCategories(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty("id", mockServiceCategory.id);
      expect(mockPrisma.serviceCategory.findMany).toHaveBeenCalled();
    });

    it("should work without authentication", async () => {
      // Mock no session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock Prisma response
      mockPrisma.serviceCategory.findMany.mockResolvedValue([mockServiceCategory]);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/categories");
      
      // Call the handler
      const response = await getCategories(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(mockPrisma.serviceCategory.findMany).toHaveBeenCalled();
    });
  });

  // Test 2: GET services
  describe("GET /api/personal-services", () => {
    it("should list all services", async () => {
      // Mock Prisma response
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services");
      
      // Call the handler
      const response = await getServices(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty("id", mockService.id);
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        include: { provider: true, category: true }
      });
    });

    it("should filter services by category", async () => {
      // Mock Prisma response
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      
      // Create request with query params
      const url = new URL("http://localhost:3000/api/personal-services");
      url.searchParams.set("categoryId", "category-123");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getServices(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: "category-123"
        }),
        include: { provider: true, category: true }
      });
    });

    it("should filter services by provider", async () => {
      // Mock Prisma response
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      
      // Create request with query params
      const url = new URL("http://localhost:3000/api/personal-services");
      url.searchParams.set("providerId", "provider-123");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await getServices(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          providerId: "provider-123"
        }),
        include: { provider: true, category: true }
      });
    });
  });

  // Test 3: POST appointment
  describe("POST /api/personal-services/appointments", () => {
    it("should create a new appointment", async () => {
      // Mock Prisma responses
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.appointment.create.mockResolvedValue(mockAppointment);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments", {
        method: "POST",
        body: JSON.stringify({
          serviceId: "service-123",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: "Leaky faucet in kitchen, second floor",
          address: "123 Main St, Anytown"
        })
      });
      
      // Call the handler
      const response = await createAppointment(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id", mockAppointment.id);
      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserSession.user.id,
          serviceId: "service-123",
          status: "SCHEDULED"
        }),
        include: { service: { include: { provider: true, category: true } }, user: true }
      });
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);

      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments", {
        method: "POST",
        body: JSON.stringify({
          serviceId: "service-123",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: "Leaky faucet in kitchen, second floor",
          address: "123 Main St, Anytown"
        })
      });
      
      // Call the handler
      const response = await createAppointment(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });

    it("should return 400 if service does not exist", async () => {
      // Mock Prisma response for non-existent service
      mockPrisma.service.findUnique.mockResolvedValue(null);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments", {
        method: "POST",
        body: JSON.stringify({
          serviceId: "non-existent-service",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: "Leaky faucet in kitchen, second floor",
          address: "123 Main St, Anytown"
        })
      });
      
      // Call the handler
      const response = await createAppointment(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  // Test 4: GET appointments
  describe("GET /api/personal-services/appointments", () => {
    it("should list user's appointments", async () => {
      // Mock Prisma response
      mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments");
      
      // Call the handler
      const response = await getAppointments(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty("id", mockAppointment.id);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserSession.user.id },
        include: { service: { include: { provider: true, category: true } }, user: true }
      });
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments");
      
      // Call the handler
      const response = await getAppointments(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it("should allow providers to see their appointments", async () => {
      // Mock provider session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockProviderSession);

      // Mock Prisma response
      mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments");
      
      // Call the handler
      const response = await getAppointments(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: { service: { providerId: mockProviderSession.user.id } },
        include: { service: { include: { provider: true, category: true } }, user: true }
      });
    });
  });

  // Test 5: PUT appointment
  describe("PUT /api/personal-services/appointments/[id]", () => {
    it("should update a user's appointment", async () => {
      // Mock Prisma responses
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        userId: mockUserSession.user.id
      });
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        notes: "Updated notes",
        address: "456 New St, Anytown"
      });
      
      // Create context with params
      const params = { params: { id: "appointment-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/appointment-123", {
        method: "PUT",
        body: JSON.stringify({
          notes: "Updated notes",
          address: "456 New St, Anytown"
        })
      });
      
      // Call the handler
      const response = await updateAppointment(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("notes", "Updated notes");
      expect(data.data).toHaveProperty("address", "456 New St, Anytown");
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-123" },
        data: expect.objectContaining({
          notes: "Updated notes",
          address: "456 New St, Anytown"
        }),
        include: { service: { include: { provider: true, category: true } }, user: true }
      });
    });

    it("should return 404 if appointment does not exist", async () => {
      // Mock Prisma response for non-existent appointment
      mockPrisma.appointment.findUnique.mockResolvedValue(null);
      
      // Create context with params
      const params = { params: { id: "non-existent-appointment" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/non-existent-appointment", {
        method: "PUT",
        body: JSON.stringify({
          notes: "Updated notes"
        })
      });
      
      // Call the handler
      const response = await updateAppointment(req, params);

      // Assertions
      expect(response.status).toBe(404);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it("should return 403 if user tries to update someone else's appointment", async () => {
      // Mock Prisma response with different userId
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        userId: "different-user-id"
      });
      
      // Create context with params
      const params = { params: { id: "appointment-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/appointment-123", {
        method: "PUT",
        body: JSON.stringify({
          notes: "Updated notes"
        })
      });
      
      // Call the handler
      const response = await updateAppointment(req, params);

      // Assertions
      expect(response.status).toBe(403);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it("should allow providers to update appointment status", async () => {
      // Mock provider session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockProviderSession);
      
      // Mock Prisma responses with matching provider
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        service: {
          ...mockService,
          providerId: mockProviderSession.user.id
        }
      });
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: "COMPLETED"
      });
      
      // Create context with params
      const params = { params: { id: "appointment-123" } };
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/appointment-123", {
        method: "PUT",
        body: JSON.stringify({
          status: "COMPLETED"
        })
      });
      
      // Call the handler
      const response = await updateAppointment(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "COMPLETED");
      expect(mockPrisma.appointment.update).toHaveBeenCalled();
    });
  });

  // Test 6: DELETE appointment
  describe("DELETE /api/personal-services/appointments/[id]", () => {
    it("should cancel a user's appointment", async () => {
      // Mock Prisma responses
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        userId: mockUserSession.user.id,
        status: "SCHEDULED"
      });
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: "CANCELLED"
      });
      
      // Create context with params
      const params = { params: { id: "appointment-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/appointment-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelAppointment(req, params);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("status", "CANCELLED");
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-123" },
        data: { status: "CANCELLED" },
        include: { service: { include: { provider: true, category: true } }, user: true }
      });
    });

    it("should return 404 if appointment does not exist", async () => {
      // Mock Prisma response for non-existent appointment
      mockPrisma.appointment.findUnique.mockResolvedValue(null);
      
      // Create context with params
      const params = { params: { id: "non-existent-appointment" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/non-existent-appointment", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelAppointment(req, params);

      // Assertions
      expect(response.status).toBe(404);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it("should return 403 if user tries to cancel someone else's appointment", async () => {
      // Mock Prisma response with different userId
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        userId: "different-user-id"
      });
      
      // Create context with params
      const params = { params: { id: "appointment-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/appointment-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelAppointment(req, params);

      // Assertions
      expect(response.status).toBe(403);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it("should return 400 if appointment is already completed", async () => {
      // Mock Prisma response for completed appointment
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        userId: mockUserSession.user.id,
        status: "COMPLETED"
      });
      
      // Create context with params
      const params = { params: { id: "appointment-123" } };
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/appointments/appointment-123", {
        method: "DELETE"
      });
      
      // Call the handler
      const response = await cancelAppointment(req, params);

      // Assertions
      expect(response.status).toBe(400);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  // Test 7: GET provider dashboard
  describe("GET /api/personal-services/provider/dashboard", () => {
    it("should return provider dashboard statistics", async () => {
      // Mock provider session
      (auth.getServerSession as jest.Mock).mockResolvedValue(mockProviderSession);
      
      // Mock Prisma responses
      mockPrisma.service.count.mockResolvedValue(5);
      mockPrisma.appointment.count.mockResolvedValueOnce(10); // Total
      mockPrisma.appointment.count.mockResolvedValueOnce(3); // Upcoming
      mockPrisma.appointment.count.mockResolvedValueOnce(5); // Completed
      mockPrisma.appointment.count.mockResolvedValueOnce(2); // Cancelled
      mockPrisma.appointment.groupBy.mockResolvedValue([
        { date: new Date(), _count: { id: 2 } }
      ]);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/provider/dashboard");
      
      // Call the handler
      const response = await providerDashboard(req);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("totalServices", 5);
      expect(data.data).toHaveProperty("totalAppointments", 10);
      expect(data.data).toHaveProperty("upcomingAppointments", 3);
      expect(data.data).toHaveProperty("completedAppointments", 5);
      expect(data.data).toHaveProperty("cancelledAppointments", 2);
      expect(data.data).toHaveProperty("appointmentsByDay");
      expect(mockPrisma.service.count).toHaveBeenCalledWith({
        where: { providerId: mockProviderSession.user.id }
      });
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);

      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/provider/dashboard");
      
      // Call the handler
      const response = await providerDashboard(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(mockPrisma.service.count).not.toHaveBeenCalled();
    });

    it("should return 403 if user is not a provider", async () => {
      // Create request
      const req = new NextRequest("http://localhost:3000/api/personal-services/provider/dashboard");
      
      // Call the handler
      const response = await providerDashboard(req);

      // Assertions
      expect(response.status).toBe(403);
      expect(mockPrisma.service.count).not.toHaveBeenCalled();
    });
  });
}); 