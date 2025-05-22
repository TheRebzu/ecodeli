import { router, adminProcedure } from '../../trpc';
import { WarehouseService } from '@/server/services/admin/warehouse.service';
import {
  warehouseFiltersSchema,
  warehouseIdSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  boxFiltersSchema,
  boxIdSchema,
  createBoxSchema,
  updateBoxSchema,
  reservationFiltersSchema,
  reservationIdSchema,
  createReservationSchema,
  updateReservationSchema,
} from '@/schemas/admin/warehouse.schema';

const warehouseService = new WarehouseService();

export const warehouseRouter = router({
  // Warehouse endpoints
  getWarehouses: adminProcedure.input(warehouseFiltersSchema).query(async ({ input }) => {
    return await warehouseService.getWarehouses(input);
  }),

  getWarehouseById: adminProcedure.input(warehouseIdSchema).query(async ({ input }) => {
    return await warehouseService.getWarehouseById(input.id);
  }),

  createWarehouse: adminProcedure.input(createWarehouseSchema).mutation(async ({ input }) => {
    return await warehouseService.createWarehouse(input);
  }),

  updateWarehouse: adminProcedure
    .input(warehouseIdSchema.extend(updateWarehouseSchema.shape))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await warehouseService.updateWarehouse(id, data);
    }),

  deleteWarehouse: adminProcedure.input(warehouseIdSchema).mutation(async ({ input }) => {
    return await warehouseService.deleteWarehouse(input.id);
  }),

  // Box endpoints
  getBoxes: adminProcedure.input(boxFiltersSchema).query(async ({ input }) => {
    return await warehouseService.getBoxes(input);
  }),

  getBoxById: adminProcedure.input(boxIdSchema).query(async ({ input }) => {
    return await warehouseService.getBoxById(input.id);
  }),

  createBox: adminProcedure.input(createBoxSchema).mutation(async ({ input }) => {
    return await warehouseService.createBox(input);
  }),

  updateBox: adminProcedure
    .input(boxIdSchema.extend(updateBoxSchema.shape))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await warehouseService.updateBox(id, data);
    }),

  deleteBox: adminProcedure.input(boxIdSchema).mutation(async ({ input }) => {
    return await warehouseService.deleteBox(input.id);
  }),

  // Reservation endpoints
  getReservations: adminProcedure.input(reservationFiltersSchema).query(async ({ input }) => {
    return await warehouseService.getReservations(input);
  }),

  getReservationById: adminProcedure.input(reservationIdSchema).query(async ({ input }) => {
    return await warehouseService.getReservationById(input.id);
  }),

  createReservation: adminProcedure.input(createReservationSchema).mutation(async ({ input }) => {
    return await warehouseService.createReservation(input);
  }),

  updateReservation: adminProcedure
    .input(reservationIdSchema.extend(updateReservationSchema.shape))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await warehouseService.updateReservation(id, data);
    }),

  cancelReservation: adminProcedure.input(reservationIdSchema).mutation(async ({ input }) => {
    return await warehouseService.cancelReservation(input.id);
  }),
});
