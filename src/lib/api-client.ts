"use client";

import { isBrowser } from "./utils";

/**
 * Simple API client for server-side data fetching
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  statusCode?: number;
}

export class ApiClient {
  private static baseUrl = '/api';
  private static defaultHeaders = {
    'Content-Type': 'application/json',
  };

  static async get<T = any>(url: string, queryParams: Record<string, any> = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, queryParams);
  }

  static async post<T = any>(url: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data);
  }

  static async put<T = any>(url: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data);
  }

  static async patch<T = any>(url: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data);
  }

  static async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }

  private static async request<T>(
    method: string,
    url: string,
    data?: any,
    queryParams: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Construct URL with query parameters
      const fullUrl = this.baseUrl + url + this.buildQueryString(queryParams);
      
      // Log request for debugging
      console.log(`API Request: ${method} ${fullUrl}`);
      
      // Prepare request options
      const options: RequestInit = {
        method,
        headers: {
          ...this.defaultHeaders,
        },
        credentials: 'include', // Include cookies
      };

      // Add body if present
      if (data) {
        options.body = JSON.stringify(data);
      }

      // Add auth token if in the browser and it exists
      if (isBrowser()) {
        const token = localStorage.getItem('authToken');
        if (token) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }

      // Make the request
      const response = await fetch(fullUrl, options);
      
      // Parse JSON response
      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        responseData = {};
        console.warn('Failed to parse response as JSON');
      }

      // Log response for debugging
      console.log(`API Response (${response.status}):`, responseData);
      
      // Format response in a consistent way
      if (response.ok) {
        return {
          success: true,
          data: responseData.data || responseData,
          statusCode: response.status,
        };
      } else {
        return {
          success: false,
          message: responseData.message || response.statusText,
          errors: responseData.errors || [],
          statusCode: response.status,
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static buildQueryString(params: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    return `?${searchParams.toString()}`;
  }
} 