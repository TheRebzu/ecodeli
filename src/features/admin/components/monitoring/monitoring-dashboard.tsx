'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Globe,
  Users,
  Package
} from 'lucide-react'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature: number
  }
  memory: {
    total: number
    used: number
    available: number
    usage: number
  }
  disk: {
    total: number
    used: number
    available: number
    usage: number
  }
  network: {
    upload: number
    download: number
    connections: number
  }
  database: {
    connections: number
    queries: number
    responseTime: number
  }
  uptime: number
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  responseTime: number
  uptime: number
  lastCheck: string
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Chargement des données de monitoring...')
      
      // Récupérer les vraies données depuis les API
      const [metricsResponse, alertsResponse, servicesResponse] = await Promise.all([
        fetch('/api/admin/monitoring/metrics'),
        fetch('/api/admin/monitoring/alerts'),
        fetch('/api/admin/monitoring/services')
      ])

      console.log('📊 Réponses API:', {
        metrics: metricsResponse.status,
        alerts: alertsResponse.status,
        services: servicesResponse.status
      })

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        console.log('📈 Métriques reçues:', metricsData)
        setMetrics(metricsData.metrics)
      } else {
        console.error('❌ Erreur métriques:', metricsResponse.status, await metricsResponse.text())
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        console.log('🚨 Alertes reçues:', alertsData)
        setAlerts(alertsData.alerts)
      } else {
        console.error('❌ Erreur alertes:', alertsResponse.status, await alertsResponse.text())
      }

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        console.log('🔧 Services reçus:', servicesData)
        setServices(servicesData.services)
      } else {
        console.error('❌ Erreur services:', servicesResponse.status, await servicesResponse.text())
      }

      setLastUpdate(new Date())
      console.log('✅ Données de monitoring mises à jour')
    } catch (error) {
      console.error('💥 Erreur chargement monitoring:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
    
    // Actualisation automatique toutes les 30 secondes
    const interval = setInterval(fetchMonitoringData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'offline': return 'text-red-600'
      case 'degraded': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'offline': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'degraded': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUptime = (days: number) => {
    if (days < 1) return '< 1 jour'
    if (days === 1) return '1 jour'
    return `${days} jours`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec dernière mise à jour */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Métriques Système</h2>
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchMonitoringData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Métriques principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.cpu.usage}%</div>
              <Progress value={metrics.cpu.usage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.cpu.cores} cœurs • {metrics.cpu.temperature}°C
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mémoire</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.memory.usage}%</div>
              <Progress value={metrics.memory.usage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disque</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.disk.usage}%</div>
              <Progress value={metrics.disk.usage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(metrics.uptime)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Système stable
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métriques réseau et base de données */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Réseau
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Upload</span>
                <span className="text-sm font-medium">{metrics.network.upload} MB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Download</span>
                <span className="text-sm font-medium">{metrics.network.download} MB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Connexions</span>
                <span className="text-sm font-medium">{metrics.network.connections}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Base de données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Connexions</span>
                <span className="text-sm font-medium">{metrics.database.connections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Requêtes/s</span>
                <span className="text-sm font-medium">{metrics.database.queries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Temps réponse</span>
                <span className="text-sm font-medium">{metrics.database.responseTime}ms</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Statut</span>
                <Badge variant="default" className="text-xs">Sécurisé</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Tentatives d'accès</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Dernière alerte</span>
                <span className="text-sm font-medium">-</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets pour Alertes et Services */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Services ({services.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertes ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Statut des Services</CardTitle>
              <CardDescription>
                Monitoring en temps réel des services critiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uptime: {service.uptime}% • Réponse: {service.responseTime}ms
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={service.status === 'online' ? 'default' : 'secondary'}
                        className={getStatusColor(service.status)}
                      >
                        {service.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(service.lastCheck).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertes Système</CardTitle>
              <CardDescription>
                Notifications et alertes de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune alerte active</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm mt-1">{alert.message}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs mt-2 opacity-75">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions de Maintenance</CardTitle>
          <CardDescription>
            Outils de diagnostic et maintenance système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Database className="h-6 w-6 mb-2" />
              <span>Backup DB</span>
              <span className="text-xs text-muted-foreground">Sauvegarde</span>
            </Button>

            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Activity className="h-6 w-6 mb-2" />
              <span>Diagnostic</span>
              <span className="text-xs text-muted-foreground">Vérification</span>
            </Button>

            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Shield className="h-6 w-6 mb-2" />
              <span>Sécurité</span>
              <span className="text-xs text-muted-foreground">Audit</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 