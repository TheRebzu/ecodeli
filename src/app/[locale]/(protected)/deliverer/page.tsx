import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Truck, 
  MapPin, 
  Clock, 
  Star, 
  Euro,
  Plus,
  Eye,
  Calendar,
  Route,
  Wallet,
  FileText,
  Bell,
  TrendingUp,
  Package,
  Navigation
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tableau de Bord Livreur - EcoDeli',
  description: 'Gérez vos livraisons, routes et paiements'
}

// Données fictives pour la démonstration
const delivererStats = {
  totalDeliveries: 47,
  activeDeliveries: 2,
  completedThisMonth: 15,
  totalEarnings: 1285.50,
  pendingPayments: 245.80,
  averageRating: 4.8,
  activeRoutes: 3,
  documentsStatus: 'VALIDATED'
}

const activeDeliveries = [
  {
    id: '1',
    title: 'Transport meuble Paris - Lyon',
    client: 'Marie Dubois',
    status: 'IN_PROGRESS',
    pickup: 'Paris 11ème',
    delivery: 'Lyon 3ème',
    pickupDate: '2024-12-22T14:00:00',
    price: 120,
    estimatedDuration: 480 // minutes
  },
  {
    id: '2',
    title: 'Livraison courses alimentaires',
    client: 'Jean Martin',
    status: 'PICKUP',
    pickup: 'Carrefour République',
    delivery: 'Rue de la Paix',
    pickupDate: '2024-12-22T16:30:00',
    price: 25,
    estimatedDuration: 45
  }
]

const availableOpportunities = [
  {
    id: '1',
    title: 'Déménagement studio',
    client: 'Sophie Laurent',
    pickup: 'Paris 15ème',
    delivery: 'Boulogne',
    pickupDate: '2024-12-25T09:00:00',
    price: 280,
    distance: 8,
    matchScore: 95
  },
  {
    id: '2',
    title: 'Transport électroménager',
    client: 'Pierre Durand',
    pickup: 'Ikea Roissy',
    delivery: 'Créteil',
    pickupDate: '2024-12-26T14:00:00',
    price: 85,
    distance: 45,
    matchScore: 87
  },
  {
    id: '3',
    title: 'Livraison colis urgent',
    client: 'Emma Wilson',
    pickup: 'La Défense',
    delivery: 'Vincennes',
    pickupDate: '2024-12-22T18:00:00',
    price: 35,
    distance: 25,
    matchScore: 78
  }
]

const plannedRoutes = [
  {
    id: '1',
    name: 'Paris - Lyon quotidien',
    from: 'Paris',
    to: 'Lyon',
    schedule: 'Lundi, Mercredi, Vendredi',
    nextDeparture: '2024-12-25T08:00:00',
    capacity: 3,
    usedCapacity: 2
  },
  {
    id: '2',
    name: 'Banlieue Est',
    from: 'Paris',
    to: 'Marne-la-Vallée',
    schedule: 'Quotidien',
    nextDeparture: '2024-12-23T10:00:00',
    capacity: 5,
    usedCapacity: 1
  }
]

const recentEarnings = [
  {
    id: '1',
    description: 'Transport meuble - Marie D.',
    amount: 120,
    date: '2024-12-20',
    status: 'PAID'
  },
  {
    id: '2',
    description: 'Livraison courses - Jean M.',
    amount: 25,
    date: '2024-12-19',
    status: 'PAID'
  },
  {
    id: '3',
    description: 'Déménagement - Sophie L.',
    amount: 280,
    date: '2024-12-18',
    status: 'PENDING'
  }
]

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PICKUP: 'secondary',
    IN_PROGRESS: 'default',
    DELIVERED: 'outline',
    COMPLETED: 'outline',
    PAID: 'outline',
    PENDING: 'secondary'
  }

  const labels: Record<string, string> = {
    PICKUP: 'À récupérer',
    IN_PROGRESS: 'En cours',
    DELIVERED: 'Livrée',
    COMPLETED: 'Terminée',
    PAID: 'Payé',
    PENDING: 'En attente'
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

export default function DelivererDashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Livreur</h1>
          <p className="text-muted-foreground">
            Gérez vos livraisons et optimisez vos revenus
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/deliverer/planning">
              <Calendar className="mr-2 h-4 w-4" />
              Planning
            </Link>
          </Button>
          <Button asChild>
            <Link href="/deliverer/opportunities">
              <Plus className="mr-2 h-4 w-4" />
              Opportunités
            </Link>
          </Button>
        </div>
      </div>

      {/* Alertes de validation */}
      {delivererStats.documentsStatus !== 'VALIDATED' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">Documents en attente de validation</h3>
                <p className="text-sm text-orange-700">
                  Vos documents sont en cours de vérification. Vous pourrez accepter des livraisons dès validation.
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/deliverer/documents">
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
            <CardTitle className="text-sm font-medium">Livraisons Actives</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delivererStats.activeDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {delivererStats.totalDeliveries} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains ce Mois</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delivererStats.totalEarnings}€</div>
            <p className="text-xs text-green-600">
              +15% vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delivererStats.pendingPayments}€</div>
            <p className="text-xs text-muted-foreground">
              Paiements en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delivererStats.averageRating}/5</div>
            <p className="text-xs text-muted-foreground">
              Satisfaction clients
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
              <Link href="/deliverer/opportunities">
                <Package className="h-6 w-6 mb-2" />
                Opportunités
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/deliverer/routes">
                <Route className="h-6 w-6 mb-2" />
                Mes Routes
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/deliverer/planning">
                <Calendar className="h-6 w-6 mb-2" />
                Planning
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/deliverer/wallet">
                <Wallet className="h-6 w-6 mb-2" />
                Portefeuille
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Livraisons actives */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Livraisons en Cours</CardTitle>
              <CardDescription>
                Livraisons actuellement assignées
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/deliverer/deliveries">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{delivery.title}</h4>
                    <p className="text-sm text-muted-foreground">Client: {delivery.client}</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(delivery.status)}
                      <span className="text-xs text-muted-foreground">
                        {delivery.price}€
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {delivery.pickup} → {delivery.delivery}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Navigation className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opportunités disponibles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Opportunités Recommandées</CardTitle>
              <CardDescription>
                Livraisons correspondant à vos routes
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/deliverer/opportunities">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableOpportunities.map((opportunity) => (
                <div key={opportunity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{opportunity.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {opportunity.matchScore}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Client: {opportunity.client}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {opportunity.pickup} → {opportunity.delivery}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(opportunity.pickupDate).toLocaleDateString('fr-FR')}
                      <span>•</span>
                      <span>{opportunity.distance}km</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{opportunity.price}€</p>
                    <Button size="sm" className="mt-2">
                      Accepter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routes planifiées */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mes Routes Planifiées</CardTitle>
            <CardDescription>
              Routes régulières que vous effectuez
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/deliverer/routes">
              Gérer
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plannedRoutes.map((route) => (
              <div key={route.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{route.name}</h4>
                  <Badge variant="outline">
                    {route.usedCapacity}/{route.capacity}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Route className="h-3 w-3" />
                    {route.from} → {route.to}
                  </div>
                  <p>{route.schedule}</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Prochain: {new Date(route.nextDeparture).toLocaleDateString('fr-FR')} à{' '}
                    {new Date(route.nextDeparture).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gains récents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gains Récents</CardTitle>
            <CardDescription>
              Derniers paiements reçus et en attente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/deliverer/wallet">
              Voir tout
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEarnings.map((earning) => (
              <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">{earning.description}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(earning.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{earning.amount}€</p>
                  {getStatusBadge(earning.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications et conseils */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications et Conseils</CardTitle>
          <CardDescription>
            Dernières mises à jour et conseils pour optimiser vos gains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Nouvelle opportunité disponible</p>
                <p className="text-muted-foreground">
                  3 nouvelles livraisons correspondent à votre route Paris-Lyon
                </p>
                <p className="text-xs text-muted-foreground mt-1">Il y a 30 minutes</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Conseils pour augmenter vos gains</p>
                <p className="text-muted-foreground">
                  Activez les créneaux matinaux pour +20% de revenus
                </p>
                <p className="text-xs text-muted-foreground mt-1">Conseil du jour</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Star className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Nouvelle évaluation reçue</p>
                <p className="text-muted-foreground">
                  Marie Dubois vous a donné 5 étoiles pour la livraison du 20/12
                </p>
                <p className="text-xs text-muted-foreground mt-1">Hier à 16:45</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}