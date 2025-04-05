"use client";

import { DataService } from "./data.service";
import { ApiClient, ApiResponse } from "./api-client";
import { CacheService } from "./cache.service";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
  merchantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateDTO {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
  merchantId: string;
}

export interface ProductUpdateDTO {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
}

export interface ProductFilter {
  merchantId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  search?: string;
}

export class ProductService extends DataService<Product, ProductCreateDTO, ProductUpdateDTO> {
  constructor() {
    super("/products");
  }

  /**
   * Search products by name or description
   */
  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    return ApiClient.get<Product[]>(`${this.basePath}/search`, { query });
  }

  /**
   * Get products by merchant ID
   */
  async getProductsByMerchant(merchantId: string): Promise<ApiResponse<Product[]>> {
    return ApiClient.get<Product[]>(`${this.basePath}/merchant/${merchantId}`);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<ApiResponse<Product[]>> {
    return ApiClient.get<Product[]>(`${this.basePath}/category/${category}`);
  }

  /**
   * Change product availability status
   */
  async setProductAvailability(id: string, isAvailable: boolean): Promise<ApiResponse<Product>> {
    return ApiClient.patch<Product>(`${this.basePath}/${id}/availability`, { isAvailable });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
    // Use cache for featured products with longer TTL
    const cacheKey = "featured-products";
    
    if (CacheService.has(cacheKey)) {
      const cachedData = CacheService.get<Product[]>(cacheKey);
      return {
        success: true,
        data: cachedData,
      };
    }
    
    const response = await ApiClient.get<Product[]>(`${this.basePath}/featured`);
    
    if (response.success && response.data) {
      // Cache the featured products for 30 minutes
      CacheService.set(cacheKey, response.data, { ttl: 30 * 60 * 1000 });
    }
    
    return response;
  }

  /**
   * Upload product image
   */
  async uploadProductImage(id: string, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append("image", file);
    
    try {
      const response = await fetch(`/api${this.basePath}/${id}/image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      
      return {
        success: response.ok,
        data: data,
        message: data.message,
        errors: data.errors,
        status: response.status,
      };
    } catch (error) {
      console.error(`Upload product image error:`, error);
      return {
        success: false,
        message: "Erreur lors du téléchargement de l'image",
      };
    }
  }

  /**
   * Get product recommendations based on product ID
   */
  async getProductRecommendations(productId: string, limit: number = 5): Promise<ApiResponse<Product[]>> {
    return ApiClient.get<Product[]>(`${this.basePath}/${productId}/recommendations`, { limit });
  }

  /**
   * Advanced product search with filters
   */
  async advancedSearch(filters: ProductFilter): Promise<ApiResponse<Product[]>> {
    return ApiClient.get<Product[]>(`${this.basePath}/advanced-search`, filters);
  }
} 