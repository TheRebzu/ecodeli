/**
 * Service de cache en mémoire simple - Alternative à Redis
 * Utilise Map avec TTL pour un cache performant sans dépendances externes
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
  accessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  maxSize: number;
}

export class MemoryCacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private stats: CacheStats;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) { // 5 minutes par défaut
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      maxSize,
    };

    // Nettoyage automatique toutes les minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateSize();
      return null;
    }

    // Mettre à jour le timestamp d'accès (LRU)
    item.accessed = Date.now();
    this.stats.hits++;
    return item.value;
  }

  /**
   * Définit une valeur dans le cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    
    // Si le cache est plein, supprimer les éléments les moins récemment utilisés
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiry,
      accessed: Date.now(),
    });

    this.stats.sets++;
    this.updateSize();
  }

  /**
   * Supprime une clé du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateSize();
    }
    return deleted;
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.updateSize();
      return false;
    }
    
    return true;
  }

  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
    this.updateSize();
  }

  /**
   * Récupère ou définit une valeur (memoization pattern)
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Incrémente une valeur numérique
   */
  increment(key: string, delta: number = 1, ttl?: number): number {
    const current = this.get<number>(key) || 0;
    const newValue = current + delta;
    this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * Décrémente une valeur numérique
   */
  decrement(key: string, delta: number = 1, ttl?: number): number {
    return this.increment(key, -delta, ttl);
  }

  /**
   * Récupère toutes les clés correspondant à un pattern
   */
  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Pattern simple avec wildcards
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Nettoyage des éléments expirés
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    this.updateSize();

    // Log si beaucoup d'éléments ont été nettoyés
    if (expiredKeys.length > 10) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired items`);
    }
  }

  /**
   * Éviction LRU (Least Recently Used)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.accessed < oldestAccess) {
        oldestAccess = item.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.updateSize();
    }
  }

  /**
   * Met à jour la taille dans les stats
   */
  private updateSize(): void {
    this.stats.size = this.cache.size;
  }

  /**
   * Nettoyage lors de la destruction
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Instance globale du cache
export const memoryCache = new MemoryCacheService(5000, 10 * 60 * 1000); // 5000 éléments, 10 minutes TTL

// Utilitaires pour des cas d'usage spécifiques
export const cacheUtils = {
  /**
   * Cache pour les résultats de base de données
   */
  database: {
    get: <T>(key: string) => memoryCache.get<T>(`db:${key}`),
    set: <T>(key: string, value: T) => memoryCache.set(`db:${key}`, value, 5 * 60 * 1000), // 5 minutes
    delete: (key: string) => memoryCache.delete(`db:${key}`),
  },

  /**
   * Cache pour les sessions utilisateur
   */
  session: {
    get: <T>(userId: string) => memoryCache.get<T>(`session:${userId}`),
    set: <T>(userId: string, value: T) => memoryCache.set(`session:${userId}`, value, 30 * 60 * 1000), // 30 minutes
    delete: (userId: string) => memoryCache.delete(`session:${userId}`),
  },

  /**
   * Cache pour les calculs géographiques
   */
  geo: {
    get: <T>(key: string) => memoryCache.get<T>(`geo:${key}`),
    set: <T>(key: string, value: T) => memoryCache.set(`geo:${key}`, value, 60 * 60 * 1000), // 1 heure
    delete: (key: string) => memoryCache.delete(`geo:${key}`),
  },

  /**
   * Cache pour les statistiques dashboard
   */
  stats: {
    get: <T>(key: string) => memoryCache.get<T>(`stats:${key}`),
    set: <T>(key: string, value: T) => memoryCache.set(`stats:${key}`, value, 2 * 60 * 1000), // 2 minutes
    delete: (key: string) => memoryCache.delete(`stats:${key}`),
  },

  /**
   * Rate limiting simple
   */
  rateLimit: {
    isAllowed: (key: string, limit: number, windowMs: number): boolean => {
      const current = memoryCache.get<number>(`rate:${key}`) || 0;
      if (current >= limit) {
        return false;
      }
      memoryCache.increment(`rate:${key}`, 1, windowMs);
      return true;
    },
    reset: (key: string) => memoryCache.delete(`rate:${key}`),
  },
};

// Cleanup automatique au shutdown
process.on('SIGTERM', () => {
  console.log('Nettoyage du cache en mémoire...');
  memoryCache.destroy();
});

process.on('SIGINT', () => {
  console.log('Nettoyage du cache en mémoire...');
  memoryCache.destroy();
});