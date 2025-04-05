import { NextRequest } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { GET, POST } from '@/app/api/announcements/[id]/bids/route';
import { BidStatus } from '@/shared/types/bid.types';

// Mock Prisma
const prisma = mockDeep<PrismaClient>();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prisma,
}));

// Mock Next Auth
jest.mock('next-auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: 'courier123', email: 'courier@example.com', role: 'COURIER' }
  }))
}));

describe('Announcement Bids API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/announcements/[id]/bids', () => {
    const mockBids = [
      {
        id: 'bid1',
        price: 100,
        message: 'Test bid 1',
        status: BidStatus.PENDING,
        courierId: 'courier123',
        announcementId: 'announcement123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'bid2',
        price: 150,
        message: 'Test bid 2',
        status: BidStatus.PENDING,
        courierId: 'courier456',
        announcementId: 'announcement123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return bids for an announcement', async () => {
      prisma.bid.findMany.mockResolvedValue(mockBids);

      const req = new NextRequest('http://localhost:3000/api/announcements/announcement123/bids');
      const response = await GET(req, { params: { id: 'announcement123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(prisma.bid.findMany).toHaveBeenCalledWith({
        where: { announcementId: 'announcement123' },
        include: { courier: true },
      });
    });

    it('should handle non-existent announcement', async () => {
      prisma.bid.findMany.mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/announcements/nonexistent/bids');
      const response = await GET(req, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('POST /api/announcements/[id]/bids', () => {
    const mockBidData = {
      price: 100,
      message: 'I can deliver this package',
    };

    it('should create a new bid', async () => {
      const expectedBid = {
        id: 'new-bid',
        ...mockBidData,
        status: BidStatus.PENDING,
        courierId: 'courier123',
        announcementId: 'announcement123',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      prisma.bid.create.mockResolvedValue(expectedBid);
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'announcement123',
        status: 'PUBLISHED',
      });

      const req = new NextRequest('http://localhost:3000/api/announcements/announcement123/bids', {
        method: 'POST',
        body: JSON.stringify(mockBidData),
      });

      const response = await POST(req, { params: { id: 'announcement123' } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expectedBid);
      expect(prisma.bid.create).toHaveBeenCalledWith({
        data: {
          ...mockBidData,
          status: BidStatus.PENDING,
          courierId: 'courier123',
          announcementId: 'announcement123',
        },
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        price: -100, // Prix négatif
      };

      const req = new NextRequest('http://localhost:3000/api/announcements/announcement123/bids', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(req, { params: { id: 'announcement123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should prevent bidding on non-existent announcement', async () => {
      prisma.announcement.findUnique.mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/announcements/nonexistent/bids', {
        method: 'POST',
        body: JSON.stringify(mockBidData),
      });

      const response = await POST(req, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should prevent bidding on closed announcement', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'announcement123',
        status: 'CLOSED',
      });

      const req = new NextRequest('http://localhost:3000/api/announcements/announcement123/bids', {
        method: 'POST',
        body: JSON.stringify(mockBidData),
      });

      const response = await POST(req, { params: { id: 'announcement123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should handle database errors', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'announcement123',
        status: 'PUBLISHED',
      });
      prisma.bid.create.mockRejectedValue(new Error('Database error'));

      const req = new NextRequest('http://localhost:3000/api/announcements/announcement123/bids', {
        method: 'POST',
        body: JSON.stringify(mockBidData),
      });

      const response = await POST(req, { params: { id: 'announcement123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });
  });
}); 