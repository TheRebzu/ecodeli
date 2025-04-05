"use client";

import { ApiClient, ApiResponse } from "./api-client";

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface FilterParams {
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export class DataService<T, CreateDTO = any, UpdateDTO = any> {
  constructor(protected readonly basePath: string) {}

  /**
   * Get a paginated list of records with filters
   */
  async getAll(
    filters: FilterParams = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    const params = {
      ...filters,
      ...pagination,
    };
    
    return ApiClient.get<PaginatedResponse<T>>(this.basePath, params);
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string): Promise<ApiResponse<T>> {
    return ApiClient.get<T>(`${this.basePath}/${id}`);
  }

  /**
   * Create a new record
   */
  async create(data: CreateDTO): Promise<ApiResponse<T>> {
    return ApiClient.post<T>(this.basePath, data);
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: UpdateDTO): Promise<ApiResponse<T>> {
    return ApiClient.patch<T>(`${this.basePath}/${id}`, data);
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return ApiClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * Custom method to run a specific operation
   */
  async executeAction<Request = any, Response = any>(
    action: string,
    data?: Request
  ): Promise<ApiResponse<Response>> {
    return ApiClient.post<Response>(`${this.basePath}/${action}`, data);
  }

  /**
   * Bulk create multiple records
   */
  async bulkCreate(data: CreateDTO[]): Promise<ApiResponse<T[]>> {
    return ApiClient.post<T[]>(`${this.basePath}/bulk`, data);
  }

  /**
   * Bulk update multiple records
   */
  async bulkUpdate(data: (UpdateDTO & { id: string })[]): Promise<ApiResponse<T[]>> {
    return ApiClient.patch<T[]>(`${this.basePath}/bulk`, data);
  }

  /**
   * Bulk delete multiple records
   */
  async bulkDelete(ids: string[]): Promise<ApiResponse<void>> {
    return ApiClient.post<void>(`${this.basePath}/bulk-delete`, { ids });
  }
} 