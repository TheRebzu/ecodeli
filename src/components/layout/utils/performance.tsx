/**
 * Utilitaires d'optimisation performance pour le système de layout
 */

import React, { lazy, ComponentType } from "react";

// Lazy loading des composants lourds
export const LazyComponents = {
  // Sidebar spécialisées
  DelivererSidebar: lazy(() =>
    import("../sidebars/deliverer-sidebar").then((m) => ({
      default: m.DelivererSidebar,
    })),
  ),
  MerchantSidebar: lazy(() =>
    import("../sidebars/merchant-sidebar").then((m) => ({
      default: m.MerchantSidebar,
    })),
  ),
  ProviderSidebar: lazy(() =>
    import("../sidebars/provider-sidebar").then((m) => ({
      default: m.ProviderSidebar,
    })),
  ),
  AdminSidebar: lazy(() =>
    import("../sidebars/admin-sidebar").then((m) => ({
      default: m.AdminSidebar,
    })),
  ),

  // Headers spécialisés
  ClientHeader: lazy(() =>
    import("../headers/client-header").then((m) => ({
      default: m.ClientHeader,
    })),
  ),
  DelivererHeader: lazy(() =>
    import("../headers/deliverer-header").then((m) => ({
      default: m.DelivererHeader,
    })),
  ),
  MerchantHeader: lazy(() =>
    import("../headers/merchant-header").then((m) => ({
      default: m.MerchantHeader,
    })),
  ),
  ProviderHeader: lazy(() =>
    import("../headers/provider-header").then((m) => ({
      default: m.ProviderHeader,
    })),
  ),
  AdminHeader: lazy(() =>
    import("../headers/admin-header").then((m) => ({ default: m.AdminHeader })),
  ),

  // Composants complexes
  AdvancedSearch: lazy(() =>
    import("../components/advanced-search").then((m) => ({
      default: m.AdvancedSearch,
    })),
  ),
  NotificationCenter: lazy(() =>
    import("../components/notification-center").then((m) => ({
      default: m.NotificationCenter,
    })),
  ),
  UserProfile: lazy(() =>
    import("../components/user-profile").then((m) => ({
      default: m.UserProfile,
    })),
  ),
};

// HOC pour le lazy loading avec fallback
export function withLazyLoading<T extends {}>(
  LazyComponent: ComponentType<T>,
  fallback: React.ReactNode = (
    <div className="animate-pulse bg-muted h-8 rounded" />
  ),
) {
  return function LazyWrapper(props: T) {
    return (
      <React.Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

// Debounce pour les actions fréquentes
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle pour les événements de scroll/resize
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoization pour les calculs coûteux
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Intersection Observer pour le lazy loading des images
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {},
) {
  if (typeof window === "undefined") return null;

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: "50px",
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Préchargement des routes critiques
export function preloadRoute(href: string) {
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  document.head.appendChild(link);
}

// Préchargement des ressources importantes
export function preloadCriticalResources() {
  if (typeof window === "undefined") return;

  const criticalRoutes = [
    "/client",
    "/deliverer",
    "/merchant",
    "/provider",
    "/admin",
  ];

  // Précharger les routes principales après un délai
  setTimeout(() => {
    criticalRoutes.forEach((route) => preloadRoute(route));
  }, 2000);
}

// Optimisation des images
export function getOptimizedImageUrl(
  src: string,
  width: number,
  height?: number,
  quality: number = 80,
) {
  // Adaptation selon votre CDN (Cloudinary, Vercel, etc.)
  const params = new URLSearchParams({
    w: width.toString(),
    q: quality.toString(),
    ...(height && { h: height.toString() }),
  });

  return `${src}?${params.toString()}`;
}

// Mesure des performances
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string) {
    if (typeof window === "undefined") return;
    performance.mark(`${name}-start`);
  }

  endMeasure(name: string) {
    if (typeof window === "undefined") return;

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name)[0];
    this.metrics.set(name, measure.duration);

    // Log si la performance est dégradée
    if (measure.duration > 100) {
      console.warn(
        `Performance warning: ${name} took ${measure.duration.toFixed(2)}ms`,
      );
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics() {
    this.metrics.clear();
    if (typeof window !== "undefined") {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// Hook pour mesurer les performances
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  return {
    startMeasure: monitor.startMeasure.bind(monitor),
    endMeasure: monitor.endMeasure.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
    clearMetrics: monitor.clearMetrics.bind(monitor),
  };
}

// Optimisation du bundle
export const bundleOptimizations = {
  // Chunking strategy
  chunkStrategy: {
    vendor: ["react", "react-dom", "next"],
    ui: ["@radix-ui", "lucide-react"],
    utils: ["clsx", "class-variance-authority"],
    layout: ["@/components/layout"],
  },

  // Prefetch strategy
  prefetchStrategy: {
    routes: ["/", "/login", "/register"],
    components: ["PublicHeader", "PublicFooter", "AuthLayout"],
    delay: 2000,
  },
};
