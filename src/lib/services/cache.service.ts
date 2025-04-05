"use client";

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

type CacheOptions = {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
};

export class CacheService {
  private static cache: Map<string, CacheItem<any>> = new Map();
  private static defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get an item from the cache
   */
  static get<T>(key: string): T | null {
    const cachedItem = this.cache.get(key);
    
    if (!cachedItem) {
      return null;
    }
    
    const now = Date.now();
    
    // If the item is expired, remove it from cache
    if (cachedItem.expiresAt < now) {
      this.cache.delete(key);
      return null;
    }
    
    return cachedItem.data;
  }

  /**
   * Set an item in the cache
   */
  static set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  /**
   * Remove an item from the cache
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Remove all items from the cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Check if an item is present and not expired in the cache
   */
  static has(key: string): boolean {
    const cachedItem = this.cache.get(key);
    
    if (!cachedItem) {
      return false;
    }
    
    return cachedItem.expiresAt > Date.now();
  }

  /**
   * Get an item from the cache or use the provided callback to fetch and cache it
   */
  static async getOrSet<T>(
    key: string,
    fetchCallback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cachedData = this.get<T>(key);
    const now = Date.now();
    const cachedItem = this.cache.get(key);
    
    // If we have valid cached data, return it
    if (cachedData !== null && (!cachedItem || cachedItem.expiresAt > now)) {
      return cachedData;
    }
    
    // If we have stale data and staleWhileRevalidate is enabled
    if (cachedData !== null && options.staleWhileRevalidate) {
      // Fetch fresh data in the background
      fetchCallback().then((data) => {
        this.set(key, data, options);
      }).catch(console.error);
      
      // Return stale data
      return cachedData;
    }
    
    // Otherwise, fetch fresh data
    const freshData = await fetchCallback();
    this.set(key, freshData, options);
    return freshData;
  }

  /**
   * Invalidate cache keys that match a pattern
   */
  static invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
} 