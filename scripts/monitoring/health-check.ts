#!/usr/bin/env node

import axios, { AxiosError } from 'axios';

interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'error';
  httpCode?: number;
  responseTime: number;
  error?: string;
}

interface HealthCheckReport {
  timestamp: string;
  globalStatus: 'Sain' | 'Dégradé' | 'Critique';
  summary: {
    totalPages: number;
    testedPages: number;
    avgResponseTime: number;
    errorsCount: number;
  };
  results: {
    publicPages: HealthCheckResult[];
    protectedPages: HealthCheckResult[];
    apiEndpoints: HealthCheckResult[];
  };
  recommendations: string[];
}

class EcoDeliHealthMonitor {
  private baseUrl: string;
  private apiToken?: string;
  private results: HealthCheckResult[] = [];

  constructor(baseUrl: string, apiToken?: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
  }

  private async testEndpoint(endpoint: string, expectedCode: number = 200): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await axios.get(url, {
        headers: this.apiToken ? {
          'x-api-key': this.apiToken,
          'Content-Type': 'application/json'
        } : {},
        maxRedirects: 0,
        validateStatus: (status) => true,
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;
      const status = response.status === expectedCode ? 'healthy' : 'degraded';

      return {
        endpoint,
        status,
        httpCode: response.status,
        responseTime,
        error: response.status !== expectedCode ? `Expected ${expectedCode}, got ${response.status}` : undefined
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;
      
      return {
        endpoint,
        status: 'error',
        responseTime,
        error: axiosError.message || 'Unknown error'
      };
    }
  }

  async runHealthCheck(): Promise<HealthCheckReport> {
    console.log('🔍 Starting EcoDeli Health Check...\n');

    // Public pages (expecting 200)
    const publicPages = [
      '/',
      '/login',
      '/register',
      '/about',
      '/contact',
      '/faq',
      '/pricing',
      '/services'
    ];

    // Protected pages (expecting 302 redirect when not authenticated)
    const protectedPages = [
      '/client/dashboard',
      '/client/announcements',
      '/deliverer/dashboard',
      '/deliverer/deliveries',
      '/merchant/dashboard',
      '/merchant/announcements',
      '/provider/dashboard',
      '/provider/services',
      '/admin/dashboard',
      '/admin/users'
    ];

    // API endpoints
    const apiEndpoints = [
      '/api/health',
      '/api/trpc/public.health'
    ];

    console.log('📋 Testing public pages...');
    const publicResults = await Promise.all(
      publicPages.map(page => this.testEndpoint(page, 200))
    );

    console.log('🔒 Testing protected pages...');
    const protectedResults = await Promise.all(
      protectedPages.map(page => this.testEndpoint(page, 302))
    );

    console.log('🔌 Testing API endpoints...');
    const apiResults = await Promise.all(
      apiEndpoints.map(endpoint => this.testEndpoint(endpoint, 200))
    );

    // Calculate summary
    const allResults = [...publicResults, ...protectedResults, ...apiResults];
    const totalErrors = allResults.filter(r => r.status === 'error').length;
    const totalDegraded = allResults.filter(r => r.status === 'degraded').length;
    const avgResponseTime = Math.round(
      allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length
    );

    // Determine global status
    let globalStatus: 'Sain' | 'Dégradé' | 'Critique';
    if (totalErrors > allResults.length * 0.1) {
      globalStatus = 'Critique';
    } else if (totalErrors > 0 || totalDegraded > 0 || avgResponseTime > 3000) {
      globalStatus = 'Dégradé';
    } else {
      globalStatus = 'Sain';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgResponseTime > 3000) {
      recommendations.push('⚠️ Temps de réponse moyen élevé (>3s). Vérifier les performances du serveur.');
    }
    if (totalErrors > 0) {
      recommendations.push('❌ Des endpoints sont en erreur. Vérifier les logs serveur.');
    }
    const slowPages = allResults.filter(r => r.responseTime > 5000);
    if (slowPages.length > 0) {
      recommendations.push(`🐌 ${slowPages.length} pages avec temps de réponse > 5s. Optimiser ces pages.`);
    }

    const report: HealthCheckReport = {
      timestamp: new Date().toISOString(),
      globalStatus,
      summary: {
        totalPages: allResults.length,
        testedPages: allResults.length,
        avgResponseTime,
        errorsCount: totalErrors
      },
      results: {
        publicPages: publicResults,
        protectedPages: protectedResults,
        apiEndpoints: apiResults
      },
      recommendations
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: HealthCheckReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT DE MONITORING ECODELI');
    console.log('='.repeat(60));
    console.log(`Date : ${new Date(report.timestamp).toLocaleString('fr-FR')}`);
    console.log(`Statut global : ${this.getStatusEmoji(report.globalStatus)} ${report.globalStatus}`);
    console.log('\n📈 RÉSUMÉ EXÉCUTIF');
    console.log('─'.repeat(40));
    console.log(`Pages testées : ${report.summary.testedPages}/${report.summary.totalPages}`);
    console.log(`Temps de réponse moyen : ${report.summary.avgResponseTime}ms`);
    console.log(`Erreurs détectées : ${report.summary.errorsCount}`);

    console.log('\n📝 DÉTAILS PAR CATÉGORIE');
    console.log('─'.repeat(40));
    
    console.log('\n🌐 Pages publiques:');
    this.printResults(report.results.publicPages);
    
    console.log('\n🔒 Pages protégées:');
    this.printResults(report.results.protectedPages);
    
    console.log('\n🔌 Endpoints API:');
    this.printResults(report.results.apiEndpoints);

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMANDATIONS');
      console.log('─'.repeat(40));
      report.recommendations.forEach(rec => console.log(rec));
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  private printResults(results: HealthCheckResult[]): void {
    results.forEach(result => {
      const statusIcon = this.getStatusIcon(result.status);
      const timeColor = result.responseTime > 3000 ? '🔴' : result.responseTime > 1000 ? '🟡' : '🟢';
      console.log(`  ${statusIcon} ${result.endpoint.padEnd(30)} ${timeColor} ${result.responseTime}ms ${result.httpCode ? `(HTTP ${result.httpCode})` : ''} ${result.error ? `- ${result.error}` : ''}`);
    });
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'Sain': return '✅';
      case 'Dégradé': return '⚠️';
      case 'Critique': return '❌';
      default: return '❓';
    }
  }
}

// Run the health check
async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const apiToken = process.env.API_MONITORING_TOKEN || process.env.TOKEN_API_GLOBAL;
  
  const monitor = new EcoDeliHealthMonitor(baseUrl, apiToken);
  
  try {
    await monitor.runHealthCheck();
  } catch (error) {
    console.error('❌ Erreur lors du health check:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { EcoDeliHealthMonitor, HealthCheckReport };