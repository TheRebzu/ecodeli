import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Store,
  Package,
  ShoppingCart,
  Euro,
  Plus,
  Eye,
  FileText,
  AlertCircle,
  TrendingUp,
  Bell,
  Calendar,
  MapPin,
  Clock,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tableau de Bord Commerçant - EcoDeli',
  description: 'Gérez vos annonces, commandes et partenariats'
}

async function getMerchantData(userId: string) {
  try {
    const merchantProfile = await prisma.merchantProfile.findUnique({
      where: { userId },
      include: {
        user: true
      }
    })

    if (!merchantProfile) {
      return null
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalAnnouncements,
      activeAnnouncements,
      announcementsThisMonth,
      totalOrders,
      pendingOrders,
      ordersThisMonth,
      monthlyRevenue,
      totalRevenue,
      recentAnnouncements,
      recentOrders,
      pendingInvoices
    ] = await Promise.all([
      prisma.announcement.count({
        where: { 
          merchantId: merchantProfile.id 
        }
      }),
      prisma.announcement.count({
        where: { 
          merchantId: merchantProfile.id,
          status: 'ACTIVE'
        }
      }),
      prisma.announcement.count({
        where: { 
          merchantId: merchantProfile.id,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.order.count({
        where: { merchantId: merchantProfile.id }
      }),
      prisma.order.count({
        where: { 
          merchantId: merchantProfile.id,
          status: 'PENDING'
        }
      }),
      prisma.order.count({
        where: { 
          merchantId: merchantProfile.id,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.order.aggregate({
        where: { 
          merchantId: merchantProfile.id,
          createdAt: { gte: startOfMonth },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: { 
          merchantId: merchantProfile.id,
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true }
      }),
      prisma.announcement.findMany({
        where: { merchantId: merchantProfile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: {
            select: { applications: true }
          }
        }
      }),
      prisma.order.findMany({
        where: { merchantId: merchantProfile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: {
            include: { user: true }
          }
        }
      }),
      prisma.invoice.findMany({
        where: { 
          merchantId: merchantProfile.id,
          status: 'PENDING'
        },
        orderBy: { dueDate: 'asc' },
        take: 3
      })
    ])

    return {
      merchant: merchantProfile,
      stats: {
        totalAnnouncements: totalAnnouncements || 0,
        activeAnnouncements: activeAnnouncements || 0,
        announcementsThisMonth: announcementsThisMonth || 0,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        ordersThisMonth: ordersThisMonth || 0,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
        totalRevenue: totalRevenue._sum.totalAmount || 0
      },
      recentAnnouncements: recentAnnouncements || [],
      recentOrders: recentOrders || [],
      pendingInvoices: pendingInvoices || []
    }
  } catch (error) {
    console.error('Error fetching merchant data:', error)
    return {
      merchant: null,
      stats: {
        totalAnnouncements: 0,
        activeAnnouncements: 0,
        announcementsThisMonth: 0,
        totalOrders: 0,
        pendingOrders: 0,
        ordersThisMonth: 0,
        monthlyRevenue: 0,
        totalRevenue: 0
      },
      recentAnnouncements: [],
      recentOrders: [],
      pendingInvoices: []
    }
  }
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    DRAFT: 'secondary',
    COMPLETED: 'outline',
    CANCELLED: 'destructive',
    PENDING: 'secondary',
    VALIDATED: 'outline'
  }

  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    DRAFT: 'Brouillon',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
    PENDING: 'En attente',
    VALIDATED: 'Validé'
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

export default async function MerchantDashboardPage() {
  const session = await auth()
  
  if (!session || session.user.role !== 'MERCHANT') {
    redirect('/login')
  }

  const data = await getMerchantData(session.user.id)

  if (!data.merchant) {
    redirect('/merchant/onboarding')
  }

  const { merchant, stats, recentAnnouncements, recentOrders, pendingInvoices } = data

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Commerçant</h1>
          <p className="text-muted-foreground">
            Gérez vos annonces et partenariats EcoDeli
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/merchant/orders">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Commandes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/merchant/announcements/create">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Annonce
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerte contrat */}
      {merchant.contractStatus !== 'VALIDATED' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">
                  {merchant.contractStatus === 'PENDING' ? 'Contrat en attente de validation' : 'Contrat à finaliser'}
                </h3>
                <p className="text-sm text-orange-700">
                  {merchant.contractStatus === 'PENDING' 
                    ? 'Votre contrat partenaire est en cours de validation par notre équipe.'
                    : 'Finalisez votre contrat partenaire pour commencer à publier des annonces.'
                  }
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/merchant/contract">
                  Voir contrat
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
            <CardTitle className="text-sm font-medium">Annonces Actives</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAnnouncements}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAnnouncements} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes ce Mois</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ordersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus ce Mois</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toFixed(2)}€</div>
            <p className="text-xs text-green-600">
              {stats.totalRevenue.toFixed(2)}€ total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Lâcher</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {merchant.cartDropEnabled ? 'Actif' : 'Inactif'}
            </div>
            <p className="text-xs text-muted-foreground">
              Service automatisé
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
              <Link href="/merchant/announcements/create">
                <Package className="h-6 w-6 mb-2" />
                Nouvelle Annonce
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/merchant/cart-drop">
                <ShoppingCart className="h-6 w-6 mb-2" />
                Lâcher de Chariot
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/merchant/analytics">
                <TrendingUp className="h-6 w-6 mb-2" />
                Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/merchant/billing">
                <CreditCard className="h-6 w-6 mb-2" />
                Facturation
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
              <CardTitle>Mes Annonces</CardTitle>
              <CardDescription>
                Dernières annonces publiées
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/merchant/announcements">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnnouncements.length > 0 ? (
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
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {announcement.pickupAddress}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {announcement._count.applications} candidature(s)
                      </span>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune annonce publiée</p>
                  <Button asChild className="mt-4">
                    <Link href="/merchant/announcements/create">
                      Créer ma première annonce
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commandes récentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Commandes Récentes</CardTitle>
              <CardDescription>
                Dernières commandes reçues
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/merchant/orders">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Commande #{order.orderNumber}</h4>
                      <p className="text-sm text-muted-foreground">
                        Client: {order.client.user.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        <span className="text-xs text-muted-foreground">
                          {order.totalAmount}€
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune commande reçue</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factures en attente */}
      {pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Factures en Attente</CardTitle>
            <CardDescription>
              Factures nécessitant votre attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Facture #{invoice.invoiceNumber}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{invoice.amount}€</p>
                    <Button size="sm" variant="outline">
                      Payer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conseils et notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Conseils et Notifications</CardTitle>
          <CardDescription>
            Optimisez votre activité avec EcoDeli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Nouveaux clients dans votre zone</p>
                <p className="text-muted-foreground">
                  15 nouveaux clients actifs cette semaine dans un rayon de 5km
                </p>
                <p className="text-xs text-muted-foreground mt-1">Il y a 2 heures</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Optimisez vos tarifs</p>
                <p className="text-muted-foreground">
                  Les annonces avec livraison express génèrent +30% de revenus
                </p>
                <p className="text-xs text-muted-foreground mt-1">Conseil du jour</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration lâcher de chariot</p>
                <p className="text-muted-foreground">
                  Activez le service automatisé pour augmenter vos ventes de 40%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Recommandation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 