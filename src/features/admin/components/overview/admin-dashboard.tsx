'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Euro,
  FileText,
  Truck,
  Store
} from 'lucide-react'

interface DashboardStats {
  users: {
    total: number
    clients: number
    deliverers: number
    merchants: number
    providers: number
    newThisMonth: number
  }
  deliveries: {
    total: number
    active: number
    completed: number
    cancelled: number
    revenue: number
  }
  validation: {
    pendingDocuments: number
    pendingUsers: number
    rejectedToday: number
  }
  financial: {
    monthlyRevenue: number
    commissionRate: number
    totalCommissions: number
    pendingPayments: number
  }
}

interface RecentActivity {
  id: string
  type: 'USER_REGISTRATION' | 'DELIVERY_COMPLETED' | 'DOCUMENT_VALIDATION' | 'PAYMENT_PROCESSED'
  description: string
  timestamp: string
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentActivity(data.recentActivity || [])
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'USER_REGISTRATION': return Users
      case 'DELIVERY_COMPLETED': return Package
      case 'DOCUMENT_VALIDATION': return FileText
      case 'PAYMENT_PROCESSED': return Euro
      default: return AlertTriangle
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800">Succès</Badge>
      case 'PENDING':
        return <Badge variant="secondary">En attente</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Échec</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold">Administration EcoDeli</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de l'activité et gestion générale de la plateforme
        </p>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilisateurs total</p>
                <p className="text-2xl font-bold">{stats.users.total}</p>
                <p className="text-xs text-muted-foreground">
                  +{stats.users.newThisMonth} ce mois
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Livraisons actives</p>
                <p className="text-2xl font-bold">{stats.deliveries.active}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.deliveries.completed} terminées
                </p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus du mois</p>
                <p className="text-2xl font-bold">{stats.financial.monthlyRevenue.toLocaleString()}€</p>
                <p className="text-xs text-muted-foreground">
                  {stats.financial.commissionRate}% de commission
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Validations en attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.validation.pendingDocuments}</p>
                <p className="text-xs text-muted-foreground">
                  Documents à vérifier
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition des utilisateurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des utilisateurs</CardTitle>
            <CardDescription>Distribution par type de compte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.users.clients}</span>
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-blue-600 rounded"
                      style={{ width: `${(stats.users.clients / stats.users.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span>Livreurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.users.deliverers}</span>
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-green-600 rounded"
                      style={{ width: `${(stats.users.deliverers / stats.users.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-purple-600" />
                  <span>Commerçants</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.users.merchants}</span>
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-purple-600 rounded"
                      style={{ width: `${(stats.users.merchants / stats.users.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span>Prestataires</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.users.providers}</span>
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-orange-600 rounded"
                      style={{ width: `${(stats.users.providers / stats.users.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques financières</CardTitle>
            <CardDescription>Performance économique du mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Commissions totales</span>
                <span className="font-bold text-green-600">
                  {stats.financial.totalCommissions.toLocaleString()}€
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Paiements en attente</span>
                <span className="font-medium text-orange-600">
                  {stats.financial.pendingPayments.toLocaleString()}€
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Taux de commission</span>
                <span className="font-medium">
                  {stats.financial.commissionRate}%
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Revenus nets EcoDeli</span>
                  <span className="font-bold text-2xl">
                    {(stats.financial.monthlyRevenue - stats.financial.pendingPayments).toLocaleString()}€
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Accès direct aux fonctions d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span className="text-sm">Valider documents</span>
              {stats.validation.pendingDocuments > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.validation.pendingDocuments}
                </Badge>
              )}
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="w-6 h-6" />
              <span className="text-sm">Gérer utilisateurs</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Euro className="w-6 h-6" />
              <span className="text-sm">Finances</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Package className="w-6 h-6" />
              <span className="text-sm">Livraisons</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activité récente */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>Dernières actions sur la plateforme</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune activité récente
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type)
                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ActivityIcon className="w-4 h-4" />
                          <span className="capitalize">
                            {activity.type.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{activity.description}</TableCell>
                      <TableCell>{getStatusBadge(activity.status)}</TableCell>
                      <TableCell>
                        {new Date(activity.timestamp).toLocaleString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}