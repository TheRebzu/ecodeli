import { useState } from 'react';
import { api } from '@/trpc/react';
import type {
  WarehouseFilters,
  BoxFilters,
  ReservationFilters,
} from '@/types/warehouses/warehouse';

export const useWarehouse = () => {
  const [warehouseFilters, setWarehouseFilters] = useState<WarehouseFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [boxFilters, setBoxFilters] = useState<BoxFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [reservationFilters, setReservationFilters] = useState<ReservationFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Warehouse queries and mutations
  const warehousesQuery = api.adminWarehouse.getWarehouses.useQuery(warehouseFilters, {
    keepPreviousData: true,
  });

  const warehouseDetailsQuery = (id: string) =>
    api.adminWarehouse.getWarehouseById.useQuery({ id });

  const createWarehouseMutation = api.adminWarehouse.createWarehouse.useMutation();
  const updateWarehouseMutation = api.adminWarehouse.updateWarehouse.useMutation();
  const deleteWarehouseMutation = api.adminWarehouse.deleteWarehouse.useMutation();

  // Box queries and mutations
  const boxesQuery = api.adminWarehouse.getBoxes.useQuery(boxFilters, {
    keepPreviousData: true,
  });

  const boxDetailsQuery = (id: string) => api.adminWarehouse.getBoxById.useQuery({ id });

  const createBoxMutation = api.adminWarehouse.createBox.useMutation();
  const updateBoxMutation = api.adminWarehouse.updateBox.useMutation();
  const deleteBoxMutation = api.adminWarehouse.deleteBox.useMutation();

  // Reservation queries and mutations
  const reservationsQuery = api.adminWarehouse.getReservations.useQuery(reservationFilters, {
    keepPreviousData: true,
  });

  const reservationDetailsQuery = (id: string) =>
    api.adminWarehouse.getReservationById.useQuery({ id });

  const createReservationMutation = api.adminWarehouse.createReservation.useMutation();
  const updateReservationMutation = api.adminWarehouse.updateReservation.useMutation();
  const cancelReservationMutation = api.adminWarehouse.cancelReservation.useMutation();

  // Filter update handlers
  const updateWarehouseFilters = (newFilters: Partial<WarehouseFilters>) => {
    setWarehouseFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 if filters other than page change
      page: 'page' in newFilters ? newFilters.page! : 1,
    }));
  };

  const updateBoxFilters = (newFilters: Partial<BoxFilters>) => {
    setBoxFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 if filters other than page change
      page: 'page' in newFilters ? newFilters.page! : 1,
    }));
  };

  const updateReservationFilters = (newFilters: Partial<ReservationFilters>) => {
    setReservationFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 if filters other than page change
      page: 'page' in newFilters ? newFilters.page! : 1,
    }));
  };

  return {
    // Warehouse
    warehouses: warehousesQuery.data?.warehouses || [],
    warehousesCount: warehousesQuery.data?.totalCount || 0,
    warehousesCurrentPage: warehousesQuery.data?.currentPage || 1,
    warehousesTotalPages: warehousesQuery.data?.totalPages || 1,
    warehousesLoading: warehousesQuery.isLoading,
    warehousesError: warehousesQuery.error,
    warehouseFilters,
    updateWarehouseFilters,
    getWarehouseById: warehouseDetailsQuery,
    createWarehouse: createWarehouseMutation.mutateAsync,
    updateWarehouse: updateWarehouseMutation.mutateAsync,
    deleteWarehouse: deleteWarehouseMutation.mutateAsync,

    // Box
    boxes: boxesQuery.data?.boxes || [],
    boxesCount: boxesQuery.data?.totalCount || 0,
    boxesCurrentPage: boxesQuery.data?.currentPage || 1,
    boxesTotalPages: boxesQuery.data?.totalPages || 1,
    boxesLoading: boxesQuery.isLoading,
    boxesError: boxesQuery.error,
    boxFilters,
    updateBoxFilters,
    getBoxById: boxDetailsQuery,
    createBox: createBoxMutation.mutateAsync,
    updateBox: updateBoxMutation.mutateAsync,
    deleteBox: deleteBoxMutation.mutateAsync,

    // Reservation
    reservations: reservationsQuery.data?.reservations || [],
    reservationsCount: reservationsQuery.data?.totalCount || 0,
    reservationsCurrentPage: reservationsQuery.data?.currentPage || 1,
    reservationsTotalPages: reservationsQuery.data?.totalPages || 1,
    reservationsLoading: reservationsQuery.isLoading,
    reservationsError: reservationsQuery.error,
    reservationFilters,
    updateReservationFilters,
    getReservationById: reservationDetailsQuery,
    createReservation: createReservationMutation.mutateAsync,
    updateReservation: updateReservationMutation.mutateAsync,
    cancelReservation: cancelReservationMutation.mutateAsync,
  };
};
