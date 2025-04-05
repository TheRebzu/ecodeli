"use client";

import { toast } from "sonner";

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
};

export class ApiClient {
  private static baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  /**
   * Make a GET request to the API
   */
  static async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      console.error(`GET ${endpoint} error:`, error);
      return {
        success: false,
        message: 'Une erreur réseau s\'est produite',
      };
    }
  }
  
  /**
   * Make a POST request to the API
   */
  static async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
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
      console.error(`POST ${endpoint} error:`, error);
      return {
        success: false,
        message: 'Une erreur réseau s\'est produite',
      };
    }
  }
  
  /**
   * Make a PUT request to the API
   */
  static async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
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
      console.error(`PUT ${endpoint} error:`, error);
      return {
        success: false,
        message: 'Une erreur réseau s\'est produite',
      };
    }
  }
  
  /**
   * Make a PATCH request to the API
   */
  static async patch<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
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
      console.error(`PATCH ${endpoint} error:`, error);
      return {
        success: false,
        message: 'Une erreur réseau s\'est produite',
      };
    }
  }
  
  /**
   * Make a DELETE request to the API
   */
  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      console.error(`DELETE ${endpoint} error:`, error);
      return {
        success: false,
        message: 'Une erreur réseau s\'est produite',
      };
    }
  }
  
  /**
   * Handle API errors and show toast notifications
   */
  static handleError(error: ApiResponse): void {
    if (error.errors) {
      // Handle validation errors
      Object.values(error.errors).forEach(errorList => {
        errorList.forEach(errorMessage => {
          toast.error(errorMessage);
        });
      });
    } else if (error.message) {
      // Handle general error message
      toast.error(error.message);
    } else {
      // Fallback error message
      toast.error('Une erreur s\'est produite. Veuillez réessayer.');
    }
  }
} 