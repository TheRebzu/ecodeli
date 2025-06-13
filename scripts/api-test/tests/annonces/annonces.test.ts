import { z } from 'zod';
import { RequestHelper } from '../../helpers/request.helper';
import { Logger, testLogger } from '../../helpers/logger.helper';
import { defaultUsers, TestUser } from '../../config/users.config';

// Types for announcements
const AnnouncementSchema = z.object({
  id: z.string(),
  type: z.enum(['DELIVERY', 'SERVICE', 'MIXED']),
  title: z.string(),
  description: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  pickupAddress: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }),
  price: z.number(),
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  preferredDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
  merchantId: z.string().optional()
});

type Announcement = z.infer<typeof AnnouncementSchema>;

export class AnnouncementTests {
  private logger: Logger;

  constructor() {
    this.logger = testLogger.child('Announcements');
  }

  /**
   * Test creating an announcement as a client
   */
  async testCreateAnnouncement(user: TestUser = defaultUsers.client): Promise<Announcement | null> {
    this.logger.title('Test: Create Announcement');
    this.logger.info(`Testing as: ${user.name} (${user.email})`);

    try {
      const input = {
        type: 'DELIVERY',
        title: 'Test Delivery - Small Package',
        description: 'Need to deliver a small package from Paris to Lyon',
        pickupAddress: {
          street: '123 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
          latitude: 48.8566,
          longitude: 2.3522
        },
        deliveryAddress: {
          street: '456 Avenue Jean Jaurès',
          city: 'Lyon',
          postalCode: '69007',
          country: 'France',
          latitude: 45.7640,
          longitude: 4.8357
        },
        price: 25.50,
        weight: 2.5,
        dimensions: {
          length: 30,
          width: 20,
          height: 15
        },
        preferredDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 2 days from now
      };

      const announcement = await RequestHelper.trpc<typeof input, Announcement>(
        user,
        'client.announcements.create',
        input
      );

      // Validate response
      const validatedAnnouncement = AnnouncementSchema.parse(announcement);
      
      this.logger.success('Announcement created successfully', {
        id: validatedAnnouncement.id,
        title: validatedAnnouncement.title,
        status: validatedAnnouncement.status
      });

      return validatedAnnouncement;

    } catch (error) {
      this.logger.error('Failed to create announcement', error);
      return null;
    }
  }

  /**
   * Test listing announcements
   */
  async testListAnnouncements(user: TestUser = defaultUsers.client): Promise<Announcement[]> {
    this.logger.title('Test: List Announcements');
    this.logger.info(`Testing as: ${user.name} (${user.email})`);

    try {
      const input = {
        page: 1,
        limit: 10,
        status: ['PUBLISHED', 'IN_PROGRESS'] as const,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const
      };

      const response = await RequestHelper.trpc<typeof input, { items: Announcement[]; total: number }>(
        user,
        'client.announcements.list',
        input
      );

      this.logger.success(`Found ${response.items.length} announcements (Total: ${response.total})`);

      // Log summary
      if (response.items.length > 0) {
        this.logger.table(
          response.items.map(a => ({
            id: a.id.substring(0, 8),
            title: a.title.substring(0, 30),
            status: a.status,
            price: `€${a.price}`,
            date: new Date(a.preferredDate).toLocaleDateString()
          }))
        );
      }

      return response.items;

    } catch (error) {
      this.logger.error('Failed to list announcements', error);
      return [];
    }
  }

  /**
   * Test getting a single announcement
   */
  async testGetAnnouncement(announcementId: string, user: TestUser = defaultUsers.client): Promise<Announcement | null> {
    this.logger.title('Test: Get Announcement');
    this.logger.info(`Getting announcement: ${announcementId}`);

    try {
      const announcement = await RequestHelper.trpc<{ id: string }, Announcement>(
        user,
        'client.announcements.get',
        { id: announcementId }
      );

      const validatedAnnouncement = AnnouncementSchema.parse(announcement);
      
      this.logger.success('Announcement retrieved successfully', {
        id: validatedAnnouncement.id,
        title: validatedAnnouncement.title,
        status: validatedAnnouncement.status,
        price: `€${validatedAnnouncement.price}`
      });

      return validatedAnnouncement;

    } catch (error) {
      this.logger.error('Failed to get announcement', error);
      return null;
    }
  }

  /**
   * Test updating an announcement
   */
  async testUpdateAnnouncement(
    announcementId: string, 
    updates: Partial<Announcement>,
    user: TestUser = defaultUsers.client
  ): Promise<Announcement | null> {
    this.logger.title('Test: Update Announcement');
    this.logger.info(`Updating announcement: ${announcementId}`);

    try {
      const input = {
        id: announcementId,
        ...updates
      };

      const announcement = await RequestHelper.trpc<typeof input, Announcement>(
        user,
        'client.announcements.update',
        input
      );

      this.logger.success('Announcement updated successfully', {
        id: announcement.id,
        updatedFields: Object.keys(updates)
      });

      return announcement;

    } catch (error) {
      this.logger.error('Failed to update announcement', error);
      return null;
    }
  }

  /**
   * Test deleting an announcement
   */
  async testDeleteAnnouncement(announcementId: string, user: TestUser = defaultUsers.client): Promise<boolean> {
    this.logger.title('Test: Delete Announcement');
    this.logger.info(`Deleting announcement: ${announcementId}`);

    try {
      await RequestHelper.trpc(
        user,
        'client.announcements.delete',
        { id: announcementId }
      );

      this.logger.success('Announcement deleted successfully');
      return true;

    } catch (error) {
      this.logger.error('Failed to delete announcement', error);
      return false;
    }
  }

  /**
   * Test searching announcements as a deliverer
   */
  async testSearchAnnouncementsAsDeliverer(user: TestUser = defaultUsers.deliverer): Promise<Announcement[]> {
    this.logger.title('Test: Search Announcements (Deliverer)');
    this.logger.info(`Testing as: ${user.name} (${user.email})`);

    try {
      const input = {
        page: 1,
        limit: 20,
        type: 'DELIVERY' as const,
        minPrice: 10,
        maxPrice: 100,
        maxDistance: 50, // km
        location: {
          latitude: 48.8566,
          longitude: 2.3522
        }
      };

      const response = await RequestHelper.trpc<typeof input, { items: Announcement[]; total: number }>(
        user,
        'deliverer.announcements.search',
        input
      );

      this.logger.success(`Found ${response.items.length} announcements for deliverer`);

      if (response.items.length > 0) {
        this.logger.info('Available deliveries:');
        response.items.forEach(a => {
          this.logger.info(`- ${a.title} (${a.pickupAddress.city} → ${a.deliveryAddress.city}) - €${a.price}`);
        });
      }

      return response.items;

    } catch (error) {
      this.logger.error('Failed to search announcements', error);
      return [];
    }
  }

  /**
   * Test applying to an announcement as a deliverer
   */
  async testApplyToAnnouncement(
    announcementId: string,
    user: TestUser = defaultUsers.deliverer
  ): Promise<boolean> {
    this.logger.title('Test: Apply to Announcement');
    this.logger.info(`Applying to announcement: ${announcementId}`);

    try {
      const input = {
        announcementId,
        proposedPrice: 22.50,
        estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        message: 'I can deliver this package tomorrow. I have experience with fragile items.'
      };

      const application = await RequestHelper.trpc(
        user,
        'deliverer.announcements.apply',
        input
      );

      this.logger.success('Application submitted successfully', application);
      return true;

    } catch (error) {
      this.logger.error('Failed to apply to announcement', error);
      return false;
    }
  }

  /**
   * Run all announcement tests
   */
  async runAllTests(): Promise<void> {
    this.logger.title('Running All Announcement Tests');
    this.logger.separator();

    // Test as client
    const clientUser = defaultUsers.client;
    
    // Create announcement
    const announcement = await this.testCreateAnnouncement(clientUser);
    if (!announcement) {
      this.logger.error('Stopping tests: Failed to create announcement');
      return;
    }

    // List announcements
    await this.testListAnnouncements(clientUser);

    // Get specific announcement
    await this.testGetAnnouncement(announcement.id, clientUser);

    // Update announcement
    await this.testUpdateAnnouncement(
      announcement.id,
      { 
        title: 'Updated Test Delivery',
        price: 30.00 
      },
      clientUser
    );

    // Test as deliverer
    const delivererUser = defaultUsers.deliverer;
    
    // Search announcements
    await this.testSearchAnnouncementsAsDeliverer(delivererUser);

    // Apply to announcement
    await this.testApplyToAnnouncement(announcement.id, delivererUser);

    // Clean up - delete announcement
    await this.testDeleteAnnouncement(announcement.id, clientUser);

    this.logger.separator();
    this.logger.success('All announcement tests completed!');
  }
}

// Export for direct execution
export async function runAnnouncementTests(): Promise<void> {
  const tests = new AnnouncementTests();
  await tests.runAllTests();
}

// Run if executed directly
if (require.main === module) {
  runAnnouncementTests().catch(console.error);
}