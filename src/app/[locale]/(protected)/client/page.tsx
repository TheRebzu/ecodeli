"use client"

import { useClientDashboard } from '@/features/client/hooks/useClientDashboard'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  Truck, 
  Clock, 
  Star, 
  MapPin,
  Plus,
  Eye,
  Calendar,
  CreditCard,
  Bell,
  User,
  FileText,
  Shield,
  Box
} from 'lucide-react'
import Link from 'next/link'

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    COMPLETED: 'outline',
    IN_PROGRESS: 'secondary',
    CANCELLED: 'destructive',
    SCHEDULED: 'default'
  }

  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    COMPLETED: 'Terminée',
    IN_PROGRESS: 'En cours',
    CANCELLED: 'Annulée',
    SCHEDULED: 'Programmé'
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

export default function ClientDashboardPage() {
  const t = useTranslations()
  const { stats, recentAnnouncements, activeServices, storageBoxes, notifications, isLoading, error } = useClientDashboard()

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="text-red-600 text-lg mb-2">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title', 'Tableau de Bord')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle', 'Bienvenue sur votre espace client EcoDeli')}
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/client/support">
              <Bell className="mr-2 h-4 w-4" />
              {t('dashboard.support', 'Support')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/client/announcements/create">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.newAnnouncement', 'Nouvelle Annonce')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.announcements', 'Annonces')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnnouncements}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeDeliveries} {t('dashboard.stats.active', 'actives')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.deliveries', 'Livraisons')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.completed', 'Terminées avec succès')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.savings', 'Économies')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.savedAmount}€</div>
            <p className="text-xs text-green-600">
              {t('dashboard.stats.vsTradition', 'vs solutions traditionnelles')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.rating', 'Note Moyenne')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}/5</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.satisfaction', 'Satisfaction générale')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Accédez rapidement aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild className="h-20 flex-col">
              <Link href="/client/announcements/create">
                <Plus className="h-6 w-6 mb-2" />
                Créer Annonce
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/client/services">
                <Calendar className="h-6 w-6 mb-2" />
                Réserver Service
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/client/storage">
                <Box className="h-6 w-6 mb-2" />
                Louer Box
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/client/payments">
                <CreditCard className="h-6 w-6 mb-2" />
                Paiements
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Annonces récentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.announcements.title', 'Mes Annonces')}</CardTitle>
              <CardDescription>
                {t('dashboard.announcements.description', 'Dernières annonces créées')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/announcements">
                {t('dashboard.seeAll', 'Voir tout')}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnnouncements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {t('dashboard.announcements.empty', 'Aucune annonce')}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {t('dashboard.announcements.emptyDesc', 'Créez votre première annonce pour commencer')}
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/client/announcements/create">
                      {t('dashboard.announcements.create', 'Créer une annonce')}
                    </Link>
                  </Button>
                </div>
              ) : (
                recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(announcement.status)}
                        <span className="text-xs text-muted-foreground">
                          {announcement.price}€
                        </span>
                      </div>
                      {announcement.status === 'ACTIVE' && announcement.interestedDeliverers && (
                        <p className="text-xs text-muted-foreground">
                          {announcement.interestedDeliverers} {t('dashboard.announcements.interested', 'livreurs intéressés')}
                        </p>
                      )}
                      {announcement.status === 'IN_PROGRESS' && announcement.delivererName && (
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.announcements.deliverer', 'Livreur')}: {announcement.delivererName}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/client/announcements/${announcement.id}`}>
                        <Eye className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services actifs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.services.title', 'Services Programmés')}</CardTitle>
              <CardDescription>
                {t('dashboard.services.description', 'Prochains rendez-vous avec vos prestataires')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/services">
                {t('dashboard.manage', 'Gérer')}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeServices.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {t('dashboard.services.empty', 'Aucun service programmé')}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {t('dashboard.services.emptyDesc', 'Réservez un service pour commencer')}
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/client/services">
                      {t('dashboard.services.book', 'Réserver un service')}
                    </Link>
                  </Button>
                </div>
              ) : (
                activeServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{service.serviceType}</h4>
                      <p className="text-sm text-muted-foreground">{service.providerName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(service.nextAppointment).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(service.nextAppointment).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{service.price}€</p>
                      <p className="text-xs text-muted-foreground">{service.frequency}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Box de stockage */}
      {storageBoxes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.storage.title', 'Mes Box de Stockage')}</CardTitle>
              <CardDescription>
                {t('dashboard.storage.description', 'Box louées pour le stockage temporaire')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/storage">
                {t('dashboard.manage', 'Gérer')}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storageBoxes.map((box) => (
                <div key={box.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{box.size}</h4>
                    <Badge variant="outline">
                      {box.status === 'ACTIVE' ? t('dashboard.storage.active', 'Active') : t('dashboard.storage.inactive', 'Inactive')}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {box.location}
                    </div>
                    <p>
                      {t('dashboard.storage.accessCode', 'Code d\'accès')}: <span className="font-mono font-bold">{box.accessCode}</span>
                    </p>
                    <p>
                      {t('dashboard.storage.rentedUntil', 'Loué jusqu\'au')} {new Date(box.rentedUntil).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="font-medium">{box.monthlyPrice}€/{t('dashboard.storage.month', 'mois')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications et alertes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.notifications.title', 'Notifications Récentes')}</CardTitle>
          <CardDescription>
            {t('dashboard.notifications.description', 'Dernières mises à jour concernant vos activités')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {t('dashboard.notifications.empty', 'Aucune notification')}
                </h3>
                <p className="text-xs text-gray-500">
                  {t('dashboard.notifications.emptyDesc', 'Vous êtes à jour !')}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    notification.type === 'success' ? 'bg-green-50' :
                    notification.type === 'warning' ? 'bg-orange-50' :
                    notification.type === 'info' ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`h-4 w-4 mt-0.5 ${
                    notification.type === 'success' ? 'text-green-600' :
                    notification.type === 'warning' ? 'text-orange-600' :
                    notification.type === 'info' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {notification.type === 'success' ? <Shield className="h-4 w-4" /> :
                     notification.type === 'warning' ? <Clock className="h-4 w-4" /> :
                     <Bell className="h-4 w-4" />}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}