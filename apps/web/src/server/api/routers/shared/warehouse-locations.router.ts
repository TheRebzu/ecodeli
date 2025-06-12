import { z } from 'zod';
import { router as router, protectedProcedure } from '@/server/api/trpc';
import { prisma } from '@/server/db';

// Gestion des 6 entrepôts EcoDeli
export const warehouseLocationsRouter = router({
  getLocations: protectedProcedure.query(async () => {
    try {
      const warehouses = await prisma.warehouse.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          isMainHub: true,
          siteCode: true,
          contactPhone: true,
          contactEmail: true,
          totalCapacity: true,
          usedCapacity: true,
          availableBoxes: true,
          has24hAccess: true,
          openingHours: true,
          accessHours: true,
          securityLevel: true,
          averageOccupancy: true,
        },
        orderBy: [{ isMainHub: 'desc' }, { city: 'asc' }],
      });

      return warehouses;
    } catch (error) {
      console.error('Error fetching warehouse locations:', error);
      throw new Error('Failed to fetch warehouse locations');
    }
  }),

  getNearbyWarehouses: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().default(50), // km
      })
    )
    .query(async ({ input }) => {
      try {
        // Utilise la formule de Haversine pour calculer la distance
        const warehouses = await prisma.$queryRaw`
          SELECT id, name, city, address, latitude, longitude, 
                 "isMainHub", "availableBoxes", "has24hAccess",
                 ( 6371 * acos( cos( radians(${input.latitude}) ) * cos( radians( latitude ) ) 
                 * cos( radians( longitude ) - radians(${input.longitude}) ) + sin( radians(${input.latitude}) ) 
                 * sin( radians( latitude ) ) ) ) AS distance
          FROM warehouses 
          WHERE "isActive" = true
          HAVING distance < ${input.radius}
          ORDER BY distance
        `;

        return warehouses;
      } catch (error) {
        console.error('Error fetching nearby warehouses:', error);
        throw new Error('Failed to fetch nearby warehouses');
      }
    }),

  getWarehouseById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const warehouse = await prisma.warehouse.findUnique({
          where: {
            id: input.id,
          },
          include: {
            boxes: {
              select: {
                id: true,
                size: true,
                currentStatus: true,
                pricePerDay: true,
              },
            },
            activities: {
              orderBy: {
                timestamp: 'desc',
              },
              take: 10,
            },
          },
        });

        if (!warehouse) {
          throw new Error('Warehouse not found');
        }

        return warehouse;
      } catch (error) {
        console.error('Error fetching warehouse details:', error);
        throw new Error('Failed to fetch warehouse details');
      }
    }),
});
