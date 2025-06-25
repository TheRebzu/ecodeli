 'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Package, 
  Wallet, 
  Star, 
  TrendingUp, 
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useDelivererDashboard, useDelivererProfile } from '../hooks/useDelivererData'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function DelivererDashboard() {
  const { stats, loading, fetchDashboard } = useDelivererDashboard()
  const { profile, fetchProfile } = useDelivererProfile()
  const router = useRouter()
  const t = useTranslations('deliverer.dashboard')

  useEffect(() => {
    fetchDashboard()
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'DOCUMENTS_SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'DOCUMENTS_SUBMITTED': return <Clock className="w-4 h-4" />
      case 'SUSPENDED': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header avec statut du compte */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('welcome')} {profile?.user.profile.firstName || 'Livreur'}
          </h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        
        {profile && (
          <div className="flex items-center space-x-2">
            {getStatusIcon(profile.status)}
            <Badge 
              variant="secondary" 
              className={getStatusColor(profile.status)}
            >
              {t(`status.${profile.status.toLowerCase()}`)}
            </Badge>
          </div>
        )}
      </div>

      {/* Alerte si compte non validé */}
      {profile?.status !== 'APPROVED' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              {t('validation.title')}
            </CardTitle>
            <CardDescription className="text-yellow-700">
              {profile?.status === 'PENDING' && t('validation.pending')}
              {profile?.status === 'DOCUMENTS_SUBMITTED' && t('validation.submitted')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/deliverer/documents')}
              variant="outline"
              className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            >
              {t('validation.manage_documents')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.total_deliveries')}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDeliveries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedDeliveries || 0} {t('stats.completed')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.monthly_earnings')}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.monthlyEarnings?.toFixed(2) || '0.00'}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.total')}: {stats?.totalEarnings?.toFixed(2) || '0.00'}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.rating')}
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {stats?.averageRating?.toFixed(1) || '0.0'}
              <Star className="h-5 w-5 text-yellow-500 ml-1 fill-current" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.completion_rate')}: {stats?.completionRate?.toFixed(1) || '0'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.opportunities')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.availableOpportunities || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeDeliveries || 0} {t('stats.active')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progression du taux de complétion */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>{t('completion.title')}</CardTitle>
            <CardDescription>
              {t('completion.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('completion.rate')}</span>
                <span>{stats.completionRate?.toFixed(1) || 0}%</span>
              </div>
              <Progress value={stats.completionRate || 0} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {stats.completedDeliveries} {t('completion.of')} {stats.totalDeliveries} {t('completion.completed')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => router.push('/deliverer/opportunities')}>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              {t('actions.view_opportunities')}
            </CardTitle>
            <CardDescription>
              {t('actions.opportunities_desc')}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/deliverer/deliveries')}>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Package className="w-5 h-5 mr-2 text-green-600" />
              {t('actions.manage_deliveries')}
            </CardTitle>
            <CardDescription>
              {t('actions.deliveries_desc')}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/deliverer/planning')}>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Calendar className="w-5 h-5 mr-2 text-purple-600" />
              {t('actions.manage_planning')}
            </CardTitle>
            <CardDescription>
              {t('actions.planning_desc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}