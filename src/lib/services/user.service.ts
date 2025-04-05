"use client";

import { DataService } from "./data.service";
import { ApiClient, ApiResponse } from "./api-client";
import { CacheService } from "./cache.service";

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CUSTOMER' | 'DELIVERY_PERSON' | 'MERCHANT' | 'SERVICE_PROVIDER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  phone?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateDTO {
  email: string;
  name: string;
  role: 'ADMIN' | 'CUSTOMER' | 'DELIVERY_PERSON' | 'MERCHANT' | 'SERVICE_PROVIDER';
  phone?: string;
  avatarUrl?: string;
  password: string;
}

export interface UserUpdateDTO {
  email?: string;
  name?: string;
  role?: 'ADMIN' | 'CUSTOMER' | 'DELIVERY_PERSON' | 'MERCHANT' | 'SERVICE_PROVIDER';
  phone?: string;
  avatarUrl?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

export interface UserFilter {
  role?: string;
  status?: string;
  search?: string;
}

export class UserService extends DataService<User, UserCreateDTO, UserUpdateDTO> {
  constructor() {
    super("/users");
  }

  /**
   * Get the current logged-in user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const cacheKey = "current-user";
    
    if (CacheService.has(cacheKey)) {
      const cachedData = CacheService.get<User>(cacheKey);
      return {
        success: true,
        data: cachedData,
      };
    }
    
    const response = await ApiClient.get<User>(`${this.basePath}/me`);
    
    if (response.success && response.data) {
      CacheService.set(cacheKey, response.data, { ttl: 5 * 60 * 1000 }); // 5 minutes cache
    }
    
    return response;
  }

  /**
   * Update the current user profile
   */
  async updateProfile(data: Partial<UserUpdateDTO>): Promise<ApiResponse<User>> {
    const response = await ApiClient.patch<User>(`${this.basePath}/profile`, data);
    
    if (response.success && response.data) {
      // Update the cached user
      CacheService.delete("current-user");
    }
    
    return response;
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return ApiClient.post<void>(`${this.basePath}/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append("avatar", file);
    
    try {
      const response = await fetch(`/api${this.basePath}/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (response.ok && data) {
        // Update the cached user with new avatar URL
        const currentUser = CacheService.get<User>("current-user");
        if (currentUser) {
          CacheService.set("current-user", {
            ...currentUser,
            avatarUrl: data.avatarUrl,
          });
        }
      }
      
      return {
        success: response.ok,
        data,
        message: data.message,
        errors: data.errors,
        status: response.status,
      };
    } catch (error) {
      console.error(`Upload avatar error:`, error);
      return {
        success: false,
        message: "Erreur lors du téléchargement de l'avatar",
      };
    }
  }

  /**
   * Change user status
   */
  async changeStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'): Promise<ApiResponse<User>> {
    return ApiClient.patch<User>(`${this.basePath}/${id}/status`, { status });
  }
  
  /**
   * Search users
   */
  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    return ApiClient.get<User[]>(`${this.basePath}/search`, { query });
  }
  
  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<ApiResponse<User[]>> {
    return ApiClient.get<User[]>(`${this.basePath}/role/${role}`);
  }
} 