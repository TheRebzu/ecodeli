import { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'Tableau de Bord Client - EcoDeli',
  description: 'Gérez vos annonces, livraisons et services EcoDeli'
}

// Données fictives pour la démonstration
const clientStats = {
  totalAnnouncements: 8,
  activeDeliveries: 3,
  completedDeliveries: 15,
  totalSpent: 485.50,
  savedAmount: 125.80,
  averageRating: 4.7,
  storageBoxes: 2,
  pendingPayments: 1
}

const recentAnnouncements = [
  {
    id: '1',
    title: 'Transport meuble Paris - Lyon',
    type: 'TRANSPORT',
    status: 'ACTIVE',
    price: 120,
    createdAt: '2024-12-20',
    interestedDeliverers: 5,
    pickupDate: '2024-12-28'
  },
  {
    id: '2',
    title: 'Livraison courses alimentaires',
    type: 'DELIVERY',
    status: 'COMPLETED',
    price: 25,
    createdAt: '2024-12-18',
    completedAt: '2024-12-19',
    rating: 5
  },
  {
    id: '3',
    title: 'Déménagement studio',
    type: 'MOVING',
    status: 'IN_PROGRESS',
    price: 280,
    createdAt: '2024-12-15',
    delivererName: 'Pierre Martin',
    estimatedCompletion: '2024-12-25'
  }
]

const activeServices = [
  {
    id: '1',
    providerName: 'Marie Dubois',
    serviceType: 'Ménage à domicile',
    nextAppointment: '2024-12-24T10:00:00',
    status: 'SCHEDULED',
    price: 45,
    frequency: 'Hebdomadaire'
  },
  {
    id: '2',
    providerName: 'Jean Dupont',
    serviceType: 'Jardinage',
    nextAppointment: '2024-12-26T14:00:00',
    status: 'SCHEDULED',
    price: 60,
    frequency: 'Bimensuel'
  }
]

const storageBoxes = [
  {
    id: '1',
    location: 'Paris 11ème - République',
    size: 'Medium (2m³)',
    status: 'ACTIVE',
    rentedUntil: '2024-12-31',
    monthlyPrice: 35,
    accessCode: 'A1B2C3'
  },
  {
    id: '2',
    location: 'Paris 15ème - Vaugirard',
    size: 'Large (5m³)',
    status: 'ACTIVE',
    rentedUntil: '2025-01-15',
    monthlyPrice: 65,
    accessCode: 'D4E5F6'
  }
]

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
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord</h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre espace client EcoDeli
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/client/support">
              <Bell className="mr-2 h-4 w-4" />
              Support
            </Link>
          </Button>
          <Button asChild>
            <Link href="/client/announcements/create">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Annonce
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annonces Actives</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.totalAnnouncements}</div>
            <p className="text-xs text-muted-foreground">
              {clientStats.activeDeliveries} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.completedDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Terminées avec succès
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Économies</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.savedAmount}€</div>
            <p className="text-xs text-green-600">
              vs solutions traditionnelles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.averageRating}/5</div>
            <p className="text-xs text-muted-foreground">
              Satisfaction générale
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
              <CardTitle>Mes Annonces</CardTitle>
              <CardDescription>
                Dernières annonces créées
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/announcements">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{announcement.title}</h4>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(announcement.status)}
                      <span className="text-xs text-muted-foreground">
                        {announcement.price}€
                      </span>
                    </div>
                    {announcement.status === 'ACTIVE' && (
                      <p className="text-xs text-muted-foreground">
                        {announcement.interestedDeliverers} livreurs intéressés
                      </p>
                    )}
                    {announcement.status === 'IN_PROGRESS' && (
                      <p className="text-xs text-muted-foreground">
                        Livreur: {announcement.delivererName}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Services actifs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Services Programmés</CardTitle>
              <CardDescription>
                Prochains rendez-vous avec vos prestataires
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/services">
                Gérer
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeServices.map((service) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Box de stockage */}
      {storageBoxes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mes Box de Stockage</CardTitle>
              <CardDescription>
                Box louées pour le stockage temporaire
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/storage">
                Gérer
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storageBoxes.map((box) => (
                <div key={box.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{box.size}</h4>
                    <Badge variant="outline">{box.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {box.location}
                    </div>
                    <p>Code d'accès: <span className="font-mono font-bold">{box.accessCode}</span></p>
                    <p>Loué jusqu'au {new Date(box.rentedUntil).toLocaleDateString('fr-FR')}</p>
                    <p className="font-medium">{box.monthlyPrice}€/mois</p>
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
          <CardTitle>Notifications Récentes</CardTitle>
          <CardDescription>
            Dernières mises à jour concernant vos activités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Nouveau livreur intéressé</p>
                <p className="text-muted-foreground">
                  Pierre Martin s'est proposé pour votre annonce "Transport meuble Paris - Lyon"
                </p>
                <p className="text-xs text-muted-foreground mt-1">Il y a 2 heures</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Livraison terminée avec succès</p>
                <p className="text-muted-foreground">
                  Votre livraison de courses alimentaires a été complétée
                </p>
                <p className="text-xs text-muted-foreground mt-1">Hier à 14:30</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Rappel: Service programmé demain</p>
                <p className="text-muted-foreground">
                  Marie Dubois viendra pour le ménage à domicile à 10h00
                </p>
                <p className="text-xs text-muted-foreground mt-1">Demain 10:00</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}