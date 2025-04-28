export type WarehouseFilters = {
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type WarehouseResponse = {
  id: string;
  name: string;
  location: string;
  address: string;
  capacity: number;
  occupied: number;
  occupiedPercentage: number;
  description?: string | null;
  isActive: boolean;
  boxCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type WarehouseListResponse = {
  warehouses: WarehouseResponse[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export type WarehouseDetailResponse = {
  warehouse: WarehouseResponse;
  boxes: BoxResponse[];
};

export type BoxFilters = {
  warehouseId?: string;
  isOccupied?: boolean;
  clientId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type BoxResponse = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  name: string;
  size: number;
  isOccupied: boolean;
  clientId: string | null;
  clientName: string | null;
  pricePerDay: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BoxListResponse = {
  boxes: BoxResponse[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export type BoxDetailResponse = {
  box: BoxResponse;
  reservations: ReservationResponse[];
};

export type ReservationFilters = {
  boxId?: string;
  clientId?: string;
  status?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type ReservationResponse = {
  id: string;
  boxId: string;
  boxName: string;
  warehouseId: string;
  warehouseName: string;
  clientId: string;
  clientName: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReservationListResponse = {
  reservations: ReservationResponse[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export type ReservationDetailResponse = {
  reservation: ReservationResponse;
};
