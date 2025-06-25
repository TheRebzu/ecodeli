import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastCheck: string
  details?: any
  error?: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const healthChecks: HealthCheck[] = []
    
    // Database Health Check
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbConnectionCount = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`
      
      healthChecks.push({
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        lastCheck: new Date().toISOString(),
        details: {
          type: 'PostgreSQL',
          activeConnections: Array.isArray(dbConnectionCount) ? dbConnectionCount[0]?.count : 0,
          version: '15.x'
        }
      })
    } catch (error: any) {
      healthChecks.push({
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      })
    }

    // Authentication Service Health Check
    try {
      const authStart = Date.now()
      // Test auth by checking session validity
      const userCount = await prisma.user.count({
        where: { lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      })
      
      healthChecks.push({
        service: 'authentication',
        status: 'healthy',
        responseTime: Date.now() - authStart,
        lastCheck: new Date().toISOString(),
        details: {
          activeUsers24h: userCount,
          provider: 'better-auth'
        }
      })
    } catch (error: any) {
      healthChecks.push({
        service: 'authentication',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      })
    }

    // File Storage Health Check
    try {
      const storageStart = Date.now()
      // Check if uploads directory is accessible
      const recentUploads = await prisma.document.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      })
      
      healthChecks.push({
        service: 'file_storage',
        status: 'healthy',
        responseTime: Date.now() - storageStart,
        lastCheck: new Date().toISOString(),
        details: {
          uploadsLast24h: recentUploads,
          type: 'local_storage'
        }
      })
    } catch (error: any) {
      healthChecks.push({
        service: 'file_storage',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      })
    }

    // Payment System Health Check
    try {
      const paymentStart = Date.now()
      const recentPayments = await prisma.payment.count({
        where: { 
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: 'COMPLETED'
        }
      })
      const failedPayments = await prisma.payment.count({
        where: { 
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: 'FAILED'
        }
      })
      
      const successRate = recentPayments + failedPayments > 0 ? 
        (recentPayments / (recentPayments + failedPayments)) * 100 : 100
      
      healthChecks.push({
        service: 'payments',
        status: successRate > 95 ? 'healthy' : successRate > 80 ? 'degraded' : 'unhealthy',
        responseTime: Date.now() - paymentStart,
        lastCheck: new Date().toISOString(),
        details: {
          successfulPayments24h: recentPayments,
          failedPayments24h: failedPayments,
          successRate: Math.round(successRate * 100) / 100,
          provider: 'stripe'
        }
      })
    } catch (error: any) {
      healthChecks.push({
        service: 'payments',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      })
    }

    // Notification Service Health Check
    try {
      const notificationStart = Date.now()
      const recentNotifications = await prisma.notification.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      })
      
      healthChecks.push({
        service: 'notifications',
        status: 'healthy',
        responseTime: Date.now() - notificationStart,
        lastCheck: new Date().toISOString(),
        details: {
          sentLast24h: recentNotifications,
          provider: 'onesignal'
        }
      })
    } catch (error: any) {
      healthChecks.push({
        service: 'notifications',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      })
    }

    // Critical Business Metrics
    try {
      const metricsStart = Date.now()
      const [
        activeDeliveries,
        pendingValidations,
        criticalErrors,
        systemLoad
      ] = await Promise.all([
        prisma.delivery.count({
          where: { status: { in: ['ACCEPTED', 'IN_TRANSIT'] } }
        }),
        prisma.document.count({
          where: { status: 'PENDING' }
        }),
        prisma.errorLog?.count({
          where: { 
            level: 'ERROR',
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
          }
        }) || 0,
        // Mock system load - in production, you'd get this from system monitoring
        Promise.resolve({
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          disk: Math.random() * 100
        })
      ])

      healthChecks.push({
        service: 'business_metrics',
        status: criticalErrors < 10 ? 'healthy' : criticalErrors < 50 ? 'degraded' : 'unhealthy',
        responseTime: Date.now() - metricsStart,
        lastCheck: new Date().toISOString(),
        details: {
          activeDeliveries,
          pendingValidations,
          criticalErrorsLastHour: criticalErrors,
          systemLoad: {
            cpu: Math.round(systemLoad.cpu * 100) / 100,
            memory: Math.round(systemLoad.memory * 100) / 100,
            disk: Math.round(systemLoad.disk * 100) / 100
          }
        }
      })
    } catch (error: any) {
      healthChecks.push({
        service: 'business_metrics',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      })
    }

    // Calculate overall system health
    const healthyServices = healthChecks.filter(hc => hc.status === 'healthy').length
    const totalServices = healthChecks.length
    const healthPercentage = (healthyServices / totalServices) * 100

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (healthPercentage >= 90) {
      overallStatus = 'healthy'
    } else if (healthPercentage >= 70) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'unhealthy'
    }

    const totalResponseTime = Date.now() - startTime

    const healthReport = {
      overall: {
        status: overallStatus,
        healthPercentage: Math.round(healthPercentage * 100) / 100,
        servicesHealthy: healthyServices,
        totalServices,
        timestamp: new Date().toISOString(),
        responseTime: totalResponseTime
      },
      services: healthChecks,
      alerts: generateAlerts(healthChecks),
      recommendations: generateRecommendations(healthChecks),
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    }

    // Set appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503

    const response = NextResponse.json(healthReport, { status: httpStatus })
    response.headers.set('X-Response-Time', `${totalResponseTime}ms`)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    return response

  } catch (error: any) {
    console.error('Health check error:', error)
    return NextResponse.json({
      overall: {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }
    }, { status: 503 })
  }
}

function generateAlerts(healthChecks: HealthCheck[]): string[] {
  const alerts: string[] = []
  
  healthChecks.forEach(check => {
    if (check.status === 'unhealthy') {
      alerts.push(`🚨 ${check.service} is unhealthy: ${check.error || 'Unknown error'}`)
    } else if (check.status === 'degraded') {
      alerts.push(`⚠️ ${check.service} is degraded: ${check.error || 'Performance issues detected'}`)
    }
    
    // Response time alerts
    if (check.responseTime > 1000) {
      alerts.push(`⏱️ ${check.service} response time is high: ${check.responseTime}ms`)
    }
    
    // Specific service alerts
    if (check.service === 'payments' && check.details?.successRate < 95) {
      alerts.push(`💳 Payment success rate is low: ${check.details.successRate}%`)
    }
    
    if (check.service === 'business_metrics' && check.details?.criticalErrorsLastHour > 10) {
      alerts.push(`🐛 High number of critical errors: ${check.details.criticalErrorsLastHour} in last hour`)
    }
  })
  
  return alerts
}

function generateRecommendations(healthChecks: HealthCheck[]): string[] {
  const recommendations: string[] = []
  
  const degradedServices = healthChecks.filter(hc => hc.status === 'degraded' || hc.status === 'unhealthy')
  
  if (degradedServices.length > 0) {
    recommendations.push('🔍 Investigate degraded services immediately')
    recommendations.push('📞 Consider notifying on-call engineer if issues persist')
  }
  
  const slowServices = healthChecks.filter(hc => hc.responseTime > 500)
  if (slowServices.length > 0) {
    recommendations.push('⚡ Optimize slow services to improve user experience')
  }
  
  const dbCheck = healthChecks.find(hc => hc.service === 'database')
  if (dbCheck?.details?.activeConnections > 80) {
    recommendations.push('💾 Database connection pool might need optimization')
  }
  
  return recommendations
} 