import { NextRequest } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { POST } from '@/app/api/announcements/[id]/bids/[bidId]/accept/route';
import { AnnouncementStatus } from '@/shared/types/announcement.types';
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
    user: { id: 'user123', email: 'user@example.com', role: 'USER' }
  }))
}));

describe('Accept Bid API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAnnouncement = {
    id: 'announcement123',
    customerId: 'user123',
    status: AnnouncementStatus.PUBLISHED,
  };

  const mockBid = {
    id: 'bid123',
    announcementId: 'announcement123',
    courierId: 'courier123',
    status: BidStatus.PENDING,
    price: 100,
  };

  it('should accept a bid', async () => {
    // Mock database queries
    prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
    prisma.bid.findUnique.mockResolvedValue(mockBid);
    prisma.bid.update.mockResolvedValue({ ...mockBid, status: BidStatus.ACCEPTED });
    prisma.announcement.update.mockResolvedValue({ 
      ...mockAnnouncement, 
      status: AnnouncementStatus.ASSIGNED 
    });

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/accept',
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
      status: BidStatus.ACCEPTED
    }));

    // Verify that other bids were rejected
    expect(prisma.bid.updateMany).toHaveBeenCalledWith({
      where: {
        announcementId: 'announcement123',
        id: { not: 'bid123' },
        status: BidStatus.PENDING,
      },
      data: { status: BidStatus.REJECTED },
    });
  });

  it('should prevent accepting bid if not announcement owner', async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      ...mockAnnouncement,
      customerId: 'otheruser123',
    });
    prisma.bid.findUnique.mockResolvedValue(mockBid);

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/accept',
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

  it('should prevent accepting non-existent bid', async () => {
    prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
    prisma.bid.findUnique.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/nonexistent/accept',
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

  it('should prevent accepting bid on closed announcement', async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      ...mockAnnouncement,
      status: AnnouncementStatus.CLOSED,
    });
    prisma.bid.findUnique.mockResolvedValue(mockBid);

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/accept',
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
    prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
    prisma.bid.findUnique.mockResolvedValue(mockBid);
    prisma.bid.update.mockRejectedValue(new Error('Database error'));

    const req = new NextRequest(
      'http://localhost:3000/api/announcements/announcement123/bids/bid123/accept',
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