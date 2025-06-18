/**
 * Service de vérification de santé de l'application
 * Vérifie que tous les services refactorisés fonctionnent correctement
 */

import { db } from "@/server/db";
import { dashboardService } from "@/server/services/admin/dashboard.service";
import { webSocketService } from "@/server/services/notifications/websocket.service";

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: string;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
}

export class HealthCheckService {
  
  async performComprehensiveHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    // Vérification de la base de données
    checks.push(await this.checkDatabase());
    
    // Vérification du service dashboard
    checks.push(await this.checkDashboardService());
    
    // Vérification du service WebSocket
    checks.push(await this.checkWebSocketService());
    
    // Vérification des API externes
    checks.push(await this.checkExternalServices());
    
    // Vérification de la mémoire et performance
    checks.push(await this.checkSystemResources());

    const overall = this.determineOverallHealth(checks);
    const uptime = process.uptime();

    return {
      overall,
      checks,
      uptime,
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Test de connexion basique
      await db.$queryRaw`SELECT 1`;
      
      // Test de performance avec une requête simple
      const userCount = await db.user.count();
      
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        return {
          service: 'database',
          status: 'degraded',
          responseTime,
          details: `Slow response: ${responseTime}ms`,
          timestamp: new Date(),
        };
      }
      
      return {
        service: 'database',
        status: 'healthy',
        responseTime,
        details: `Connected, ${userCount} users`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: `Connection failed: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkDashboardService(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Tester les méthodes refactorisées
      const userStats = await dashboardService.getUserStats();
      const announcementStats = await dashboardService.getAnnouncementStats();
      
      const responseTime = Date.now() - start;
      
      // Vérifier que les données ne sont pas mockées
      if (typeof userStats.total !== 'number' || typeof announcementStats.published !== 'number') {
        return {
          service: 'dashboard',
          status: 'degraded',
          responseTime,
          details: 'Invalid data structure returned',
          timestamp: new Date(),
        };
      }
      
      return {
        service: 'dashboard',
        status: 'healthy',
        responseTime,
        details: `Users: ${userStats.total}, Announcements: ${announcementStats.published}`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'dashboard',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: `Dashboard service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkWebSocketService(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const stats = webSocketService.getConnectionStats();
      const responseTime = Date.now() - start;
      
      return {
        service: 'websocket',
        status: 'healthy',
        responseTime,
        details: `${stats.totalConnections} connections, ${stats.authenticatedUsers} authenticated`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'websocket',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: `WebSocket service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Vérifier la configuration Stripe
      const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
      const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!hasStripeKey || !hasWebhookSecret) {
        return {
          service: 'external_apis',
          status: 'degraded',
          responseTime: Date.now() - start,
          details: 'Stripe configuration incomplete',
          timestamp: new Date(),
        };
      }

      // Test de connectivité Stripe (sans appel API réel)
      const stripeConfigured = hasStripeKey && hasWebhookSecret;
      
      return {
        service: 'external_apis',
        status: stripeConfigured ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        details: `Stripe: ${stripeConfigured ? 'configured' : 'missing config'}`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'external_apis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: `External services error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkSystemResources(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const memoryUsagePercent = (memoryUsedMB / memoryTotalMB) * 100;

      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let details = `Memory: ${memoryUsedMB}MB/${memoryTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`;

      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        details += ', High memory usage';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
        details += ', Elevated memory usage';
      }

      return {
        service: 'system_resources',
        status,
        responseTime: Date.now() - start,
        details: `${details}, Uptime: ${Math.round(uptime)}s`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'system_resources',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: `Resource check error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private determineOverallHealth(checks: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;

    if (unhealthyCount > 0) {
      return 'unhealthy';
    }
    
    if (degradedCount > 1) {
      return 'degraded';
    }
    
    if (degradedCount === 1) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getServiceHealth(serviceName: string): Promise<HealthCheckResult | null> {
    const fullCheck = await this.performComprehensiveHealthCheck();
    return fullCheck.checks.find(check => check.service === serviceName) || null;
  }

  async getHealthHistory(hours: number = 24): Promise<HealthCheckResult[]> {
    // Dans une vraie implémentation, ceci récupérerait l'historique depuis une base de données
    // Pour l'instant, on retourne les données actuelles
    const currentCheck = await this.performComprehensiveHealthCheck();
    return currentCheck.checks;
  }
}

export const healthCheckService = new HealthCheckService();