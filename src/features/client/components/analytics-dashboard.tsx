'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Euro, 
  Clock, 
  Star,
  Calendar,
  MapPin
} from 'lucide-react'

interface AnalyticsData {
  totalDeliveries: number
  totalSpent: number
  averageRating: number
  totalSavings: number
  deliveriesThisMonth: number
  activeSubscriptions: number
  topCities: Array<{ city: string; count: number }>
  monthlyStats: Array<{ month: string; deliveries: number; spending: number }>
  recentDeliveries: Array<{
    id: string
    title: string
    status: string
    amount: number
    createdAt: string
  }>
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>('30')

  // Récupération des données analytiques
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/client/analytics?timeRange=${timeRange}`)
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des données')
        }

        const data = await response.json()
        setAnalyticsData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeRange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Aucune donnée disponible
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tableau de bord analytique</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">3 derniers mois</SelectItem>
            <SelectItem value="365">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons totales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              +{analyticsData.deliveriesThisMonth} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses totales</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalSpent}€</div>
            <p className="text-xs text-muted-foreground">
              Moyenne par livraison
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Sur 5 étoiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Économies réalisées</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalSavings}€</div>
            <p className="text-xs text-muted-foreground">
              Grâce à votre abonnement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top villes */}
        <Card>
          <CardHeader>
            <CardTitle>Top villes de livraison</CardTitle>
            <CardDescription>
              Vos destinations les plus fréquentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.topCities.map((city, index) => (
                <div key={city.city} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{city.city}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {city.count} livraisons
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistiques mensuelles */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle</CardTitle>
            <CardDescription>
              Livraisons et dépenses par mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.monthlyStats.map((stat) => (
                <div key={stat.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{stat.month}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-muted-foreground">
                      {stat.deliveries} livraisons
                    </span>
                    <span className="font-medium">
                      {stat.spending}€
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Livraisons récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Livraisons récentes</CardTitle>
          <CardDescription>
            Vos dernières livraisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.recentDeliveries.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{delivery.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(delivery.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    delivery.status === 'DELIVERED' ? 'default' : 
                    delivery.status === 'IN_TRANSIT' ? 'secondary' : 'outline'
                  }>
                    {delivery.status}
                  </Badge>
                  <span className="text-sm font-medium">{delivery.amount}€</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex space-x-4">
        <Button variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Exporter les données
        </Button>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Voir l'historique complet
        </Button>
      </div>
    </div>
  )
} 