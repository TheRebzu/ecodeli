import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { AnnouncementService } from '@/services/announcement.service';
import { PackageType, InsuranceOption, AnnouncementStatus } from '@/shared/types/announcement.types';

// Mock Prisma
const prisma = mockDeep<PrismaClient>();
const announcementService = new AnnouncementService(prisma);

// Reset all mocks before each test
beforeEach(() => {
  mockReset(prisma);
});

describe('AnnouncementService', () => {
  describe('createAnnouncement', () => {
    const mockAnnouncementData = {
      title: 'Test Announcement',
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
      const userId = 'user123';
      const expectedAnnouncement = {
        id: 'announcement123',
        ...mockAnnouncementData,
        customerId: userId,
        status: AnnouncementStatus.PENDING,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      prisma.announcement.create.mockResolvedValue(expectedAnnouncement);

      const result = await announcementService.createAnnouncement(mockAnnouncementData, userId);

      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: {
          ...mockAnnouncementData,
          customerId: userId,
          status: AnnouncementStatus.PENDING,
        },
      });
      expect(result).toEqual(expectedAnnouncement);
    });

    it('should throw an error if creation fails', async () => {
      const userId = 'user123';
      prisma.announcement.create.mockRejectedValue(new Error('Database error'));

      await expect(
        announcementService.createAnnouncement(mockAnnouncementData, userId)
      ).rejects.toThrow('Failed to create announcement');
    });
  });

  describe('getAnnouncementById', () => {
    it('should return announcement if found', async () => {
      const mockAnnouncement = {
        id: 'announcement123',
        title: 'Test Announcement',
        status: AnnouncementStatus.PUBLISHED,
      };

      prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);

      const result = await announcementService.getAnnouncementById('announcement123');

      expect(prisma.announcement.findUnique).toHaveBeenCalledWith({
        where: { id: 'announcement123' },
      });
      expect(result).toEqual(mockAnnouncement);
    });

    it('should return null if announcement not found', async () => {
      prisma.announcement.findUnique.mockResolvedValue(null);

      const result = await announcementService.getAnnouncementById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateAnnouncement', () => {
    const updateData = {
      title: 'Updated Title',
      price: 150,
    };

    it('should update an announcement', async () => {
      const mockUpdatedAnnouncement = {
        id: 'announcement123',
        ...updateData,
        status: AnnouncementStatus.PUBLISHED,
      };

      prisma.announcement.update.mockResolvedValue(mockUpdatedAnnouncement);

      const result = await announcementService.updateAnnouncement('announcement123', updateData);

      expect(prisma.announcement.update).toHaveBeenCalledWith({
        where: { id: 'announcement123' },
        data: updateData,
      });
      expect(result).toEqual(mockUpdatedAnnouncement);
    });

    it('should throw an error if update fails', async () => {
      prisma.announcement.update.mockRejectedValue(new Error('Database error'));

      await expect(
        announcementService.updateAnnouncement('announcement123', updateData)
      ).rejects.toThrow('Failed to update announcement');
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete an announcement', async () => {
      const mockDeletedAnnouncement = {
        id: 'announcement123',
        title: 'Test Announcement',
      };

      prisma.announcement.delete.mockResolvedValue(mockDeletedAnnouncement);

      const result = await announcementService.deleteAnnouncement('announcement123');

      expect(prisma.announcement.delete).toHaveBeenCalledWith({
        where: { id: 'announcement123' },
      });
      expect(result).toEqual(mockDeletedAnnouncement);
    });

    it('should throw an error if deletion fails', async () => {
      prisma.announcement.delete.mockRejectedValue(new Error('Database error'));

      await expect(
        announcementService.deleteAnnouncement('announcement123')
      ).rejects.toThrow('Failed to delete announcement');
    });
  });

  describe('getAllAnnouncements', () => {
    const mockFilter = {
      search: 'test',
      status: AnnouncementStatus.PUBLISHED,
      page: 1,
      pageSize: 10,
    };

    it('should return announcements with pagination', async () => {
      const mockAnnouncements = [
        { id: 'announcement1', title: 'Test 1' },
        { id: 'announcement2', title: 'Test 2' },
      ];

      prisma.announcement.findMany.mockResolvedValue(mockAnnouncements);
      prisma.announcement.count.mockResolvedValue(2);

      const result = await announcementService.getAllAnnouncements(mockFilter);

      expect(prisma.announcement.findMany).toHaveBeenCalled();
      expect(prisma.announcement.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockAnnouncements,
        pagination: {
          total: 2,
          page: 1,
          pageSize: 10,
          pages: 1,
        },
      });
    });

    it('should handle empty results', async () => {
      prisma.announcement.findMany.mockResolvedValue([]);
      prisma.announcement.count.mockResolvedValue(0);

      const result = await announcementService.getAllAnnouncements(mockFilter);

      expect(result).toEqual({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
          pages: 0,
        },
      });
    });
  });
}); 