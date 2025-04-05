import { NextRequest } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient, PackageSize, AnnouncementStatus } from '@prisma/client';
import { POST } from '@/app/api/announcements/[id]/bids/[bidId]/reject/route';

type MockPrismaClient = {
  announcement: {
    findUnique: jest.Mock;
  };
  bid: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

// Mock Prisma
const prismaMock = mockDeep<PrismaClient>() as unknown as MockPrismaClient;

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

// Mock Next Auth
jest.mock('next-auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: 'user123', email: 'user@example.com', role: 'USER' }
  }))
}));

describe('Reject Bid API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAnnouncement = {
    id: 'announcement123',
    title: 'Test Announcement',
    description: 'Test Description',
    packageSize: PackageSize.SMALL,
    weight: 10,
    width: 20,
    height: 30,
    length: 40,
    isFragile: false,
    requiresRefrigeration: false,
    pickupAddress: '123 Pickup St',
    pickupCity: 'Paris',
    pickupPostalCode: '75001',
    pickupCountry: 'France',
    pickupCoordinates: { lat: 48.8566, lng: 2.3522 },
    deliveryAddress: '456 Delivery St',
    deliveryCity: 'Lyon',
    deliveryPostalCode: '69001',
    deliveryCountry: 'France',
    deliveryCoordinates: { lat: 45.7578, lng: 4.8320 },
    pickupDate: new Date('2024-03-20'),
    deliveryDeadline: new Date('2024-03-21'),
    price: 100,
    isNegotiable: true,
    packageImages: [],
    status: AnnouncementStatus.PENDING,
    customerId: 'user123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBid = {
    id: 'bid123',
    announcementId: 'announcement123',
    courierId: 'courier123',
    status: 'PENDING',
    price: 100,
    message: 'Test bid',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should reject a bid', async () => {
    // Mock database queries
    prismaMock.announcement.findUnique.mockResolvedValue(mockAnnouncement);
    prismaMock.bid.findUnique.mockResolvedValue(mockBid);
    prismaMock.bid.update.mockResolvedValue({ ...mockBid, status: 'REJECTED' });

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/reject',
      { method: 'POST' }
    );

    const response = await POST(req, { 
      params: { 
        id: 'announcement123',
        bidId: 'bid123'
      } 
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(expect.objectContaining({
      status: 'REJECTED'
    }));
  });

  it('should prevent rejecting bid if not announcement owner', async () => {
    prismaMock.announcement.findUnique.mockResolvedValue({
      ...mockAnnouncement,
      customerId: 'otheruser123',
    });
    prismaMock.bid.findUnique.mockResolvedValue(mockBid);

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/reject',
      { method: 'POST' }
    );

    const response = await POST(req, { 
      params: { 
        id: 'announcement123',
        bidId: 'bid123'
      } 
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it('should prevent rejecting non-existent bid', async () => {
    prismaMock.announcement.findUnique.mockResolvedValue(mockAnnouncement);
    prismaMock.bid.findUnique.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/nonexistent/reject',
      { method: 'POST' }
    );

    const response = await POST(req, { 
      params: { 
        id: 'announcement123',
        bidId: 'nonexistent'
      } 
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it('should prevent rejecting bid on closed announcement', async () => {
    prismaMock.announcement.findUnique.mockResolvedValue({
      ...mockAnnouncement,
      status: AnnouncementStatus.COMPLETED,
    });
    prismaMock.bid.findUnique.mockResolvedValue(mockBid);

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/reject',
      { method: 'POST' }
    );

    const response = await POST(req, { 
      params: { 
        id: 'announcement123',
        bidId: 'bid123'
      } 
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it('should handle database errors', async () => {
    prismaMock.announcement.findUnique.mockResolvedValue(mockAnnouncement);
    prismaMock.bid.findUnique.mockResolvedValue(mockBid);
    prismaMock.bid.update.mockRejectedValue(new Error('Database error'));

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/reject',
      { method: 'POST' }
    );

    const response = await POST(req, { 
      params: { 
        id: 'announcement123',
        bidId: 'bid123'
      } 
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });
}); 