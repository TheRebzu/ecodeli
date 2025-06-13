import { z } from "zod";

// Warehouse schemas
export const warehouseFiltersSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const createWarehouseSchema = z.object({
  name: z.string().min(3).max(100),
  location: z.string().min(3).max(100),
  address: z.string().min(3).max(255),
  capacity: z.number().int().positive(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const warehouseIdSchema = z.object({
  id: z.string().uuid(),
});

// Box schemas
export const boxFiltersSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  isOccupied: z.boolean().optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const createBoxSchema = z.object({
  warehouseId: z.string().uuid(),
  name: z.string().min(2).max(50),
  size: z.number().positive(),
  pricePerDay: z.number().positive(),
  description: z.string().max(255).optional().nullable(),
});

export const updateBoxSchema = createBoxSchema.partial();

export const boxIdSchema = z.object({
  id: z.string().uuid(),
});

// Reservation schemas
export const reservationFiltersSchema = z.object({
  boxId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDateFrom: z.date().optional(),
  startDateTo: z.date().optional(),
  endDateFrom: z.date().optional(),
  endDateTo: z.date().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const createReservationSchema = z
  .object({
    boxId: z.string().uuid(),
    clientId: z.string().uuid(),
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const updateReservationSchema = z
  .object({
    status: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export const reservationIdSchema = z.object({
  id: z.string().uuid(),
});
