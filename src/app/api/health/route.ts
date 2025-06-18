import { NextResponse } from 'next/server';
import { healthCheckService } from '@/lib/monitoring/health-check.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Health check détaillé avec toutes les vérifications
      const healthStatus = await healthCheckService.getDetailedHealthStatus();
      
      return NextResponse.json({
        status: healthStatus.overallHealth === 'healthy' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        service: 'ecodeli-web',
        detailed: true,
        checks: healthStatus
      });
    } else {
      // Health check simple et rapide
      const basicHealth = await healthCheckService.getBasicHealthStatus();
      
      return NextResponse.json({
        status: basicHealth.healthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        service: 'ecodeli-web',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'ecodeli-web',
      error: 'Health check failed'
    }, { status: 503 });
  }
}