import { ApiClient } from './api-client';

/**
 * Client-side data fetching utilities
 * Provides functions to fetch user data for client components
 */
export const clientData = {
  /**
   * Fetch current user data
   */
  async fetchUserData() {
    try {
      const response = await ApiClient.get('/api/users/me');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return null;
    }
  },

  /**
   * Fetch orders for the current user
   */
  async fetchOrders() {
    try {
      const response = await ApiClient.get('/api/orders/my-orders');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      return [];
    }
  },

  /**
   * Fetch todos for the current user
   */
  async fetchTodos() {
    try {
      const response = await ApiClient.get('/api/todos');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      return [];
    }
  },

  /**
   * Fetch profile data for the current user
   */
  async fetchProfile() {
    try {
      const response = await ApiClient.get('/api/profile');
      if (response.success && response.data) {
        console.log('Profile data fetched:', response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  },

  /**
   * Fetch settings for the current user
   */
  async fetchSettings() {
    try {
      const response = await ApiClient.get('/api/settings');
      if (response.success && response.data) {
        console.log('Settings fetched:', response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return null;
    }
  }
}; 