/**
 * Endpoint de health check pour le monitoring
 * GET /api/health - Vérification de santé globale
 * GET /api/health/detailed - Vérification détaillée de tous les services
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthCheckService } from '@/lib/monitoring/health-check.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  try {
    if (detailed) {
      // Health check détaillé
      const healthStatus = await healthCheckService.performComprehensiveHealthCheck();
      
      return NextResponse.json(healthStatus, {
        status: healthStatus.overall === 'healthy' ? 200 : 
                healthStatus.overall === 'degraded' ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } else {
      // Health check rapide
      const quickCheck = await healthCheckService.getServiceHealth('database');
      
      if (!quickCheck || quickCheck.status === 'unhealthy') {
        return NextResponse.json(
          { status: 'unhealthy', timestamp: new Date().toISOString() },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          status: quickCheck.status, 
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Health check endpoint error:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}