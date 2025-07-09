'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Cloud, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity
} from 'lucide-react'

interface SystemConfig {
  oneSignal: {
    enabled: boolean
    status: string
  }
  stripe: {
    enabled: boolean
    status: string
  }
  email: {
    enabled: boolean
    status: string
  }
  storage: {
    enabled: boolean
    status: string
  }
}

interface SystemConfigDashboardProps {
  config: SystemConfig
}

export function SystemConfigDashboard({ config }: SystemConfigDashboardProps) {
  const t = useTranslations('admin.systemConfig')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case 'disconnected':
        return <Badge className="bg-red-100 text-red-800">Disconnected</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const services = [
    {
      name: 'OneSignal',
      description: t('oneSignal.description'),
      status: config.oneSignal.status,
      enabled: config.oneSignal.enabled
    },
    {
      name: 'Stripe',
      description: t('stripe.description'),
      status: config.stripe.status,
      enabled: config.stripe.enabled
    },
    {
      name: 'Email Service',
      description: t('email.description'),
      status: config.email.status,
      enabled: config.email.enabled
    },
    {
      name: 'Storage',
      description: t('storage.description'),
      status: config.storage.status,
      enabled: config.storage.enabled
    }
  ]

  const connectedServices = services.filter(service => service.status === 'connected').length
  const totalServices = services.length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('stats.totalServices')}
              </p>
              <p className="text-2xl font-bold">{totalServices}</p>
            </div>
            <Cloud className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('stats.connectedServices')}
              </p>
              <p className="text-2xl font-bold">{connectedServices}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('stats.connectionRate')}
              </p>
              <p className="text-2xl font-bold">
                {totalServices > 0 ? Math.round((connectedServices / totalServices) * 100) : 0}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('stats.disconnectedServices')}
              </p>
              <p className="text-2xl font-bold">{totalServices - connectedServices}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      {/* Service Status Overview */}
      <div className="col-span-full">
        <Card>
          <CardHeader>
            <CardTitle>{t('overview.serviceStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(service.status)}
                    {!service.enabled && (
                      <Badge variant="outline" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 