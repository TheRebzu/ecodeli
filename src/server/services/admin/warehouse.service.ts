import { db } from '@/server/db';
import type {
  WarehouseFilters,
  WarehouseListResponse,
  WarehouseDetailResponse,
  BoxFilters,
  BoxListResponse,
  BoxDetailResponse,
  ReservationFilters,
  ReservationListResponse,
  ReservationDetailResponse,
} from '@/types/warehouse';

export class WarehouseService {
  // Warehouse methods
  async getWarehouses(filters: WarehouseFilters): Promise<WarehouseListResponse> {
    const {
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = filters;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    const [warehouses, totalCount] = await Promise.all([
      db.warehouse.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { boxes: true },
          },
        },
      }),
      db.warehouse.count({ where }),
    ]);

    const warehouseData = await Promise.all(
      warehouses.map(async warehouse => {
        const boxes = await db.box.findMany({
          where: { warehouseId: warehouse.id },
          include: {
            reservations: {
              where: {
                OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
              },
            },
          },
        });

        const occupied = boxes.filter(box =>
          box.reservations.some(res => res.status === 'ACTIVE' || res.status === 'PENDING')
        ).length;

        const occupiedPercentage =
          warehouse.capacity > 0 ? Math.round((occupied / warehouse.capacity) * 100) : 0;

        return {
          ...warehouse,
          boxCount: warehouse._count.boxes,
          occupied,
          occupiedPercentage,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    return {
      warehouses: warehouseData,
      totalCount,
      currentPage: page,
      totalPages,
    };
  }

  async getWarehouseById(id: string): Promise<WarehouseDetailResponse> {
    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { boxes: true },
        },
      },
    });

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const boxes = await db.box.findMany({
      where: { warehouseId: warehouse.id },
      include: {
        reservations: {
          where: {
            OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const occupied = boxes.filter(box =>
      box.reservations.some(res => res.status === 'ACTIVE' || res.status === 'PENDING')
    ).length;

    const occupiedPercentage =
      warehouse.capacity > 0 ? Math.round((occupied / warehouse.capacity) * 100) : 0;

    const boxesWithDetails = boxes.map(box => {
      const isOccupied = box.reservations.some(
        res => res.status === 'ACTIVE' || res.status === 'PENDING'
      );

      return {
        id: box.id,
        warehouseId: box.warehouseId,
        warehouseName: warehouse.name,
        name: box.name,
        size: box.size,
        isOccupied,
        clientId: box.client?.id || null,
        clientName: box.client?.name || null,
        pricePerDay: box.pricePerDay,
        description: box.description,
        createdAt: box.createdAt,
        updatedAt: box.updatedAt,
      };
    });

    return {
      warehouse: {
        ...warehouse,
        boxCount: warehouse._count.boxes,
        occupied,
        occupiedPercentage,
      },
      boxes: boxesWithDetails,
    };
  }

  async createWarehouse(data: {
    name: string;
    location: string;
    address: string;
    capacity: number;
    description?: string | null;
    isActive?: boolean;
  }) {
    return await db.warehouse.create({
      data,
    });
  }

  async updateWarehouse(
    id: string,
    data: {
      name?: string;
      location?: string;
      address?: string;
      capacity?: number;
      description?: string | null;
      isActive?: boolean;
    }
  ) {
    return await db.warehouse.update({
      where: { id },
      data,
    });
  }

  async deleteWarehouse(id: string) {
    // Check if warehouse has active boxes
    const boxes = await db.box.findMany({
      where: { warehouseId: id },
      include: {
        reservations: {
          where: {
            OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
          },
        },
      },
    });

    const hasActiveBoxes = boxes.some(box =>
      box.reservations.some(res => res.status === 'ACTIVE' || res.status === 'PENDING')
    );

    if (hasActiveBoxes) {
      throw new Error('Cannot delete warehouse with active reservations');
    }

    // Delete all boxes and then the warehouse
    await db.box.deleteMany({
      where: { warehouseId: id },
    });

    return await db.warehouse.delete({
      where: { id },
    });
  }

  // Box methods
  async getBoxes(filters: BoxFilters): Promise<BoxListResponse> {
    const {
      warehouseId,
      isOccupied,
      clientId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = filters;

    const where: Record<string, unknown> = {
      ...(warehouseId && { warehouseId }),
      ...(clientId && { clientId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Handling isOccupied filter requires a more complex query
    if (typeof isOccupied === 'boolean') {
      where.reservations = {
        some: {
          OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
        },
      };

      // If looking for unoccupied boxes, we need to invert the condition
      if (!isOccupied) {
        where.NOT = { ...where.NOT, reservations: where.reservations };
        delete where.reservations;
      }
    }

    const [boxes, totalCount] = await Promise.all([
      db.box.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          warehouse: {
            select: {
              name: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          reservations: {
            where: {
              OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
            },
          },
        },
      }),
      db.box.count({ where }),
    ]);

    const boxesWithDetails = boxes.map(box => {
      const isOccupied = box.reservations.some(
        res => res.status === 'ACTIVE' || res.status === 'PENDING'
      );

      return {
        id: box.id,
        warehouseId: box.warehouseId,
        warehouseName: box.warehouse.name,
        name: box.name,
        size: box.size,
        isOccupied,
        clientId: box.client?.id || null,
        clientName: box.client?.name || null,
        pricePerDay: box.pricePerDay,
        description: box.description,
        createdAt: box.createdAt,
        updatedAt: box.updatedAt,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      boxes: boxesWithDetails,
      totalCount,
      currentPage: page,
      totalPages,
    };
  }

  async getBoxById(id: string): Promise<BoxDetailResponse> {
    const box = await db.box.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        reservations: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!box) {
      throw new Error('Box not found');
    }

    const isOccupied = box.reservations.some(
      res => res.status === 'ACTIVE' || res.status === 'PENDING'
    );

    const reservations = box.reservations.map(reservation => ({
      id: reservation.id,
      boxId: reservation.boxId,
      boxName: box.name,
      warehouseId: box.warehouseId,
      warehouseName: box.warehouse.name,
      clientId: reservation.client.id,
      clientName: reservation.client.name,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      status: reservation.status,
      totalPrice: reservation.totalPrice,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    }));

    return {
      box: {
        id: box.id,
        warehouseId: box.warehouseId,
        warehouseName: box.warehouse.name,
        name: box.name,
        size: box.size,
        isOccupied,
        clientId: box.client?.id || null,
        clientName: box.client?.name || null,
        pricePerDay: box.pricePerDay,
        description: box.description,
        createdAt: box.createdAt,
        updatedAt: box.updatedAt,
      },
      reservations,
    };
  }

  async createBox(data: {
    warehouseId: string;
    name: string;
    size: number;
    pricePerDay: number;
    description?: string | null;
  }) {
    // Check if warehouse exists
    const warehouse = await db.warehouse.findUnique({
      where: { id: data.warehouseId },
    });

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return await db.box.create({
      data,
    });
  }

  async updateBox(
    id: string,
    data: {
      name?: string;
      size?: number;
      pricePerDay?: number;
      description?: string | null;
    }
  ) {
    return await db.box.update({
      where: { id },
      data,
    });
  }

  async deleteBox(id: string) {
    // Check if box has active reservations
    const box = await db.box.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
          },
        },
      },
    });

    if (!box) {
      throw new Error('Box not found');
    }

    if (box.reservations.length > 0) {
      throw new Error('Cannot delete box with active reservations');
    }

    return await db.box.delete({
      where: { id },
    });
  }

  // Reservation methods
  async getReservations(filters: ReservationFilters): Promise<ReservationListResponse> {
    const {
      boxId,
      clientId,
      status,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = filters;

    const where: Record<string, unknown> = {
      ...(boxId && { boxId }),
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(startDateFrom && { startDate: { gte: startDateFrom } }),
      ...(startDateTo && { startDate: { lte: startDateTo } }),
      ...(endDateFrom && { endDate: { gte: endDateFrom } }),
      ...(endDateTo && { endDate: { lte: endDateTo } }),
    };

    const [reservations, totalCount] = await Promise.all([
      db.reservation.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          box: {
            select: {
              name: true,
              warehouseId: true,
              warehouse: {
                select: {
                  name: true,
                },
              },
            },
          },
          client: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.reservation.count({ where }),
    ]);

    const reservationsWithDetails = reservations.map(reservation => ({
      id: reservation.id,
      boxId: reservation.boxId,
      boxName: reservation.box.name,
      warehouseId: reservation.box.warehouseId,
      warehouseName: reservation.box.warehouse.name,
      clientId: reservation.clientId,
      clientName: reservation.client.name,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      status: reservation.status,
      totalPrice: reservation.totalPrice,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      reservations: reservationsWithDetails,
      totalCount,
      currentPage: page,
      totalPages,
    };
  }

  async getReservationById(id: string): Promise<ReservationDetailResponse> {
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        box: {
          select: {
            name: true,
            warehouseId: true,
            warehouse: {
              select: {
                name: true,
              },
            },
          },
        },
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    return {
      reservation: {
        id: reservation.id,
        boxId: reservation.boxId,
        boxName: reservation.box.name,
        warehouseId: reservation.box.warehouseId,
        warehouseName: reservation.box.warehouse.name,
        clientId: reservation.clientId,
        clientName: reservation.client.name,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: reservation.status,
        totalPrice: reservation.totalPrice,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      },
    };
  }

  async createReservation(data: {
    boxId: string;
    clientId: string;
    startDate: Date;
    endDate: Date;
  }) {
    // Check if box exists
    const box = await db.box.findUnique({
      where: { id: data.boxId },
      include: {
        reservations: {
          where: {
            OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
            AND: [
              {
                OR: [
                  {
                    AND: [
                      { startDate: { lte: data.startDate } },
                      { endDate: { gte: data.startDate } },
                    ],
                  },
                  {
                    AND: [{ startDate: { lte: data.endDate } }, { endDate: { gte: data.endDate } }],
                  },
                  {
                    AND: [
                      { startDate: { gte: data.startDate } },
                      { endDate: { lte: data.endDate } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    if (!box) {
      throw new Error('Box not found');
    }

    // Check if box has overlapping reservations
    if (box.reservations.length > 0) {
      throw new Error('Box already reserved for this period');
    }

    // Check if client exists
    const client = await db.user.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Calculate days and total price
    const days = Math.max(
      1,
      Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalPrice = box.pricePerDay * days;

    return await db.reservation.create({
      data: {
        ...data,
        status: 'PENDING',
        totalPrice,
      },
    });
  }

  async updateReservation(
    id: string,
    data: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        box: true,
      },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const updateData: Record<string, unknown> = { ...data };

    // If dates are changing, recalculate price
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || reservation.startDate;
      const endDate = data.endDate || reservation.endDate;

      // Check for overlapping reservations
      const overlappingReservations = await db.reservation.findMany({
        where: {
          boxId: reservation.boxId,
          id: { not: id },
          OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
          AND: [
            {
              OR: [
                {
                  AND: [{ startDate: { lte: startDate } }, { endDate: { gte: startDate } }],
                },
                {
                  AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate } }],
                },
                {
                  AND: [{ startDate: { gte: startDate } }, { endDate: { lte: endDate } }],
                },
              ],
            },
          ],
        },
      });

      if (overlappingReservations.length > 0) {
        throw new Error('Box already reserved for this period');
      }

      const days = Math.max(
        1,
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      updateData.totalPrice = reservation.box.pricePerDay * days;
    }

    return await db.reservation.update({
      where: { id },
      data: updateData,
    });
  }

  async cancelReservation(id: string) {
    const reservation = await db.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'PENDING' && reservation.status !== 'ACTIVE') {
      throw new Error('Cannot cancel a reservation that is not pending or active');
    }

    return await db.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
