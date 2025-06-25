import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Settings,
  Calendar,
  DollarSign,
  Star,
  Plus,
  Eye,
  Clock,
  MapPin,
  AlertCircle,
  TrendingUp,
  Bell,
  Award,
  FileText,
  Users,
  Shield
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tableau de Bord Prestataire - EcoDeli',
  description: 'Gérez vos services, disponibilités et interventions'
}

async function getProviderData(userId: string) {
  try {
    console.log('🔍 getProviderData - userId:', userId);
    
    const providerProfile = await prisma.provider.findUnique({
      where: { userId },
      include: {
        user: true
      }
    })

    console.log('🔍 getProviderData - providerProfile trouvé:', !!providerProfile);
    if (providerProfile) {
      console.log('🔍 getProviderData - providerProfile.id:', providerProfile.id);
      console.log('🔍 getProviderData - providerProfile.businessName:', providerProfile.businessName);
    }

    if (!providerProfile) {
      console.log('❌ getProviderData - Aucun profil provider trouvé pour userId:', userId);
      return null
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    console.log('🔍 getProviderData - Récupération des statistiques...');

    const [
      totalServices,
      activeServices,
      totalBookings,
      bookingsThisMonth,
      pendingBookings,
      completedBookings,
      monthlyEarnings,
      totalEarnings,
      averageRating,
      totalReviews,
      recentServices,
      upcomingBookings,
      recentBookings,
      certifications,
      nextBillingDate
    ] = await Promise.all([
      prisma.service.count({
        where: { providerId: providerProfile.id }
      }),
      prisma.service.count({
        where: { 
          providerId: providerProfile.id,
          isActive: true
        }
      }),
      prisma.booking.count({
        where: { service: { providerId: providerProfile.id } }
      }),
      prisma.booking.count({
        where: { 
          service: { providerId: providerProfile.id },
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.booking.count({
        where: { 
          service: { providerId: providerProfile.id },
          status: 'CONFIRMED'
        }
      }),
      prisma.booking.count({
        where: { 
          service: { providerId: providerProfile.id },
          status: 'COMPLETED'
        }
      }),
      prisma.booking.aggregate({
        where: { 
          service: { providerId: providerProfile.id },
          createdAt: { gte: startOfMonth },
          status: 'COMPLETED'
        },
        _sum: { totalPrice: true }
      }),
      prisma.booking.aggregate({
        where: { 
          service: { providerId: providerProfile.id },
          status: 'COMPLETED'
        },
        _sum: { totalPrice: true }
      }),
      prisma.review.aggregate({
        where: { providerId: providerProfile.id },
        _avg: { rating: true }
      }),
      prisma.review.count({
        where: { providerId: providerProfile.id }
      }),
      prisma.service.findMany({
        where: { providerId: providerProfile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: {
            select: { bookings: true }
          }
        }
      }),
      prisma.booking.findMany({
        where: { 
          service: { providerId: providerProfile.id },
          status: 'CONFIRMED',
          scheduledDate: { gte: now }
        },
        orderBy: { scheduledDate: 'asc' },
        take: 5,
        include: {
          service: true,
          client: {
            include: { user: true }
          }
        }
      }),
      prisma.booking.findMany({
        where: { service: { providerId: providerProfile.id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          service: true,
          client: {
            include: { user: true }
          }
        }
      }),
      prisma.certification.findMany({
        where: { providerId: providerProfile.id },
        orderBy: { issuedAt: 'desc' },
        take: 3
      }),
      Promise.resolve(new Date(now.getFullYear(), now.getMonth() + 1, providerProfile.monthlyInvoiceDay || 30))
    ])

    console.log('✅ getProviderData - Données récupérées avec succès');

    return {
      provider: providerProfile,
      stats: {
        totalServices: totalServices || 0,
        activeServices: activeServices || 0,
        totalBookings: totalBookings || 0,
        bookingsThisMonth: bookingsThisMonth || 0,
        pendingBookings: pendingBookings || 0,
        completedBookings: completedBookings || 0,
        monthlyEarnings: monthlyEarnings._sum.totalPrice || 0,
        totalEarnings: totalEarnings._sum.totalPrice || 0,
        averageRating: averageRating._avg.rating || 0,
        totalReviews: totalReviews || 0
      },
      recentServices: recentServices || [],
      upcomingBookings: upcomingBookings || [],
      recentBookings: recentBookings || [],
      certifications: certifications || [],
      nextBillingDate
    }
  } catch (error) {
    console.error('❌ getProviderData - Erreur:', error)
    return {
      provider: null,
      stats: {
        totalServices: 0,
        activeServices: 0,
        totalBookings: 0,
        bookingsThisMonth: 0,
        pendingBookings: 0,
        completedBookings: 0,
        monthlyEarnings: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalReviews: 0
      },
      recentServices: [],
      upcomingBookings: [],
      recentBookings: [],
      certifications: [],
      nextBillingDate: new Date()
    }
  }
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    CONFIRMED: 'default',
    PENDING: 'secondary',
    COMPLETED: 'outline',
    CANCELLED: 'destructive',
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    VALIDATED: 'outline'
  }

  const labels: Record<string, string> = {
    CONFIRMED: 'Confirmée',
    PENDING: 'En attente',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    VALIDATED: 'Validé'
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

export default async function ProviderDashboardPage() {
  const session = await auth()
  
  if (!session || session.user.role !== 'PROVIDER') {
    redirect('/login')
  }

  const data = await getProviderData(session.user.id)

  if (!data.provider) {
    redirect('/provider/onboarding')
  }

  const { provider, stats, recentServices, upcomingBookings, recentBookings, certifications, nextBillingDate } = data

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Prestataire</h1>
          <p className="text-muted-foreground">
            Gérez vos services et interventions EcoDeli
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/provider/availability">
              <Calendar className="mr-2 h-4 w-4" />
              Calendrier
            </Link>
          </Button>
          <Button asChild>
            <Link href="/provider/services/create">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Service
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerte validation */}
      {provider.verificationStatus !== 'VERIFIED' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">
                  {provider.verificationStatus === 'PENDING' ? 'Profil en attente de validation' : 'Profil à compléter'}
                </h3>
                <p className="text-sm text-orange-700">
                  {provider.verificationStatus === 'PENDING' 
                    ? 'Votre profil prestataire est en cours de validation par notre équipe.'
                    : 'Complétez votre profil et documents pour commencer à proposer vos services.'
                  }
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/provider/documents">
                  Voir documents
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Actifs</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalServices} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations ce Mois</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookingsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingBookings} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus ce Mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyEarnings.toFixed(2)}€</div>
            <p className="text-xs text-green-600">
              {stats.totalEarnings.toFixed(2)}€ total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReviews} évaluation(s)
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
              <Link href="/provider/services/create">
                <Plus className="h-6 w-6 mb-2" />
                Nouveau Service
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/provider/availability">
                <Calendar className="h-6 w-6 mb-2" />
                Disponibilités
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/provider/certifications">
                <Award className="h-6 w-6 mb-2" />
                Certifications
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/provider/billing">
                <FileText className="h-6 w-6 mb-2" />
                Facturation
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prochaines interventions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Prochaines Interventions</CardTitle>
              <CardDescription>
                Réservations confirmées à venir
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/bookings">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{booking.service.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Client: {booking.client.user.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                        <span className="text-xs text-muted-foreground">
                          {booking.totalPrice}€
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(booking.scheduledDate).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(booking.scheduledDate).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune intervention programmée</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mes services */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mes Services</CardTitle>
              <CardDescription>
                Services proposés aux clients
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/services">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentServices.length > 0 ? (
                recentServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{service.title}</h4>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(service.isActive ? 'ACTIVE' : 'INACTIVE')}
                        <span className="text-xs text-muted-foreground">
                          {service.price}€/{service.duration}min
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {service._count.bookings} réservation(s)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun service créé</p>
                  <Button asChild className="mt-4">
                    <Link href="/provider/services/create">
                      Créer mon premier service
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certifications récentes */}
      {certifications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mes Certifications</CardTitle>
              <CardDescription>
                Certifications et qualifications validées
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/certifications">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {certifications.map((cert) => (
                <div key={cert.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-sm">{cert.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Délivré par: {cert.issuingOrganization}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(cert.issuedAt).toLocaleDateString('fr-FR')}
                    </span>
                    {getStatusBadge('VALIDATED')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info facturation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Facturation Automatique</CardTitle>
          <CardDescription className="text-blue-700">
            Informations sur votre prochaine facturation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Prochaine facturation</span>
              <span className="text-sm text-blue-700">
                {nextBillingDate.toLocaleDateString('fr-FR')} à 23h00
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Revenus du mois</span>
              <span className="text-sm text-blue-700">{stats.monthlyEarnings.toFixed(2)}€</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Commission EcoDeli (15%)</span>
              <span className="text-sm text-blue-700">
                -{(stats.monthlyEarnings * 0.15).toFixed(2)}€
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-blue-300 pt-2">
              <span className="font-semibold text-blue-900">Net à recevoir</span>
              <span className="font-semibold text-blue-700">
                {(stats.monthlyEarnings * 0.85).toFixed(2)}€
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conseils et notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Conseils et Notifications</CardTitle>
          <CardDescription>
            Optimisez votre activité de prestataire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Optimisez vos créneaux</p>
                <p className="text-muted-foreground">
                  Les créneaux de fin de semaine génèrent +40% de réservations
                </p>
                <p className="text-xs text-muted-foreground mt-1">Conseil du jour</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Nouvelle certification disponible</p>
                <p className="text-muted-foreground">
                  Certification "Service Premium" maintenant disponible
                </p>
                <p className="text-xs text-muted-foreground mt-1">Il y a 1 heure</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Shield className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Assurance professionnelle</p>
                <p className="text-muted-foreground">
                  Pensez à renouveler votre assurance avant le 31/01/2025
                </p>
                <p className="text-xs text-muted-foreground mt-1">Rappel</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 