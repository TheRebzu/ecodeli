import { NextRequest } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/announcements/route';
import { PackageType, InsuranceOption, AnnouncementStatus } from '@/shared/types/announcement.types';

// Mock Prisma
const prisma = mockDeep<PrismaClient>();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prisma,
}));

// Mock Next Auth
jest.mock('next-auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: 'user123', email: 'test@example.com', role: 'USER' }
  }))
}));

describe('Announcements API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/announcements', () => {
    it('should return announcements list with pagination', async () => {
      const mockAnnouncements = [
        {
          id: 'announcement1',
          title: 'Test Announcement 1',
          description: 'Description 1',
          packageType: PackageType.MEDIUM,
          status: AnnouncementStatus.PUBLISHED,
          customerId: 'user123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'announcement2',
          title: 'Test Announcement 2',
          description: 'Description 2',
          packageType: PackageType.LARGE,
          status: AnnouncementStatus.PUBLISHED,
          customerId: 'user123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.announcement.findMany.mockResolvedValue(mockAnnouncements);
      prisma.announcement.count.mockResolvedValue(2);

      const req = new NextRequest('http://localhost:3000/api/announcements?page=1&pageSize=10');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 10,
        pages: 1,
      });
    });

    it('should handle filtering by status and type', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/announcements?status=PUBLISHED&packageType=MEDIUM'
      );
      await GET(req);

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            packageType: 'MEDIUM',
          }),
        })
      );
    });

    it('should handle search parameter', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/announcements?search=test'
      );
      await GET(req);

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: expect.objectContaining({ contains: 'test' }) },
              { description: expect.objectContaining({ contains: 'test' }) },
            ]),
          }),
        })
      );
    });
  });

  describe('POST /api/announcements', () => {
    const mockAnnouncementData = {
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
      pickupDate: new Date('2024-12-25'),
      deliveryDeadline: new Date('2024-12-30'),
      price: 100,
      isNegotiable: true,
      insuranceOption: InsuranceOption.NONE,
      packageImages: ['https://example.com/image.jpg'],
    };

    it('should create a new announcement', async () => {
      const expectedAnnouncement = {
        id: 'new-announcement',
        ...mockAnnouncementData,
        customerId: 'user123',
        status: AnnouncementStatus.PENDING,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      prisma.announcement.create.mockResolvedValue(expectedAnnouncement);

      const req = new NextRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        body: JSON.stringify(mockAnnouncementData),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expectedAnnouncement);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: 'A', // Too short
        price: -100, // Negative price
      };

      const req = new NextRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should handle database errors', async () => {
      prisma.announcement.create.mockRejectedValue(new Error('Database error'));

      const req = new NextRequest('http://localhost:3000/api/announcements', {
        method: 'POST',
        body: JSON.stringify(mockAnnouncementData),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });
  });
}); 