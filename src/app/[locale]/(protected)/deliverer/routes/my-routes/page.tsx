'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Route, 
  Calendar, 
  Clock, 
  MapPin, 
  Navigation, 
  Loader2, 
  Search,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  Package,
  DollarSign
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface Route {
  id: string
  name: string
  description?: string
  departureLocation: {
    address: string
    latitude: number
    longitude: number
  }
  arrivalLocation: {
    address: string
    latitude: number
    longitude: number
  }
  departureTime: string
  arrivalTime: string
  isRecurring: boolean
  recurringPattern?: string
  recurringDays?: number[]
  maxCapacity: number
  vehicleType: string
  pricePerKm?: number
  isActive: boolean
  createdAt: string
  currentLoad: number
  availableSpots: number
  totalEarnings: number
  announcements: Array<{
    id: string
    title: string
    type: string
    price: number
    pickupAddress: string
    deliveryAddress: string
    status: string
    matchScore: number
  }>
}

interface RoutesResponse {
  routes: Route[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats: {
    total: number
    active: number
    recurring: number
    totalCapacity: number
    totalMatches: number
  }
}

export default function MyRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const { toast } = useToast()
  const router = useRouter()

  // Charger les routes
  const loadRoutes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' ? 'true' : 'false' }),
        ...(typeFilter !== 'all' && { isRecurring: typeFilter === 'recurring' ? 'true' : 'false' })
      })

      const response = await fetch(`/api/deliverer/routes?${params}`)
      if (!response.ok) throw new Error('Erreur lors du chargement')

      const data: RoutesResponse = await response.json()
      setRoutes(data.routes)
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: 'Impossible de charger vos routes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoutes()
  }, [currentPage, statusFilter, typeFilter])

  // Filtrer les routes par recherche
  const filteredRoutes = routes.filter(route =>
    route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.departureLocation.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.arrivalLocation.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Toggle statut actif/inactif
  const toggleRouteStatus = async (routeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')

      toast({
        title: '✅ Route mise à jour',
        description: `Route ${!currentStatus ? 'activée' : 'désactivée'} avec succès`,
      })
      
      loadRoutes()
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: 'Impossible de mettre à jour la route',
        variant: 'destructive'
      })
    }
  }

  // Supprimer une route
  const deleteRoute = async (routeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette route ?')) return

    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      toast({
        title: '✅ Route supprimée',
        description: 'La route a été supprimée avec succès',
      })
      
      loadRoutes()
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: 'Impossible de supprimer la route',
        variant: 'destructive'
      })
    }
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Formater l'heure
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Obtenir le statut de la route
  const getRouteStatus = (route: Route) => {
    if (!route.isActive) return { label: 'Inactive', variant: 'secondary' as const }
    if (route.currentLoad >= route.maxCapacity) return { label: 'Complet', variant: 'destructive' as const }
    if (route.currentLoad > 0) return { label: 'En cours', variant: 'default' as const }
    return { label: 'Disponible', variant: 'outline' as const }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de vos routes...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes Routes</h1>
          <p className="text-muted-foreground">
            Gérez vos itinéraires de livraison et optimisez vos trajets
          </p>
        </div>
        <Button onClick={() => router.push('/deliverer/routes/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une route
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total routes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Route className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Routes actives</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <Play className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Routes récurrentes</p>
                  <p className="text-2xl font-bold">{stats.recurring}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Correspondances</p>
                  <p className="text-2xl font-bold">{stats.totalMatches}</p>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="inactive">Inactives</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="recurring">Récurrentes</SelectItem>
                <SelectItem value="one-time">Ponctuelles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des routes */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Toutes ({routes.length})</TabsTrigger>
          <TabsTrigger value="active">Actives ({routes.filter(r => r.isActive).length})</TabsTrigger>
          <TabsTrigger value="recurring">Récurrentes ({routes.filter(r => r.isRecurring).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune route trouvée
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Aucune route ne correspond à votre recherche.' : 'Vous n\'avez pas encore créé de routes.'}
                </p>
                <Button onClick={() => router.push('/deliverer/routes/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre première route
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRoutes.map((route) => {
                const status = getRouteStatus(route)
                return (
                  <Card key={route.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{route.name}</h3>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {route.isRecurring && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                Récurrente
                              </Badge>
                            )}
                          </div>
                          
                          {route.description && (
                            <p className="text-muted-foreground text-sm mb-3">
                              {route.description}
                            </p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Départ:</span>
                                <span>{route.departureLocation.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Arrivée:</span>
                                <span>{route.arrivalLocation.address}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Horaires:</span>
                                <span>{formatTime(route.departureTime)} - {formatTime(route.arrivalTime)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Capacité:</span>
                                <span>{route.currentLoad}/{route.maxCapacity} places</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Gains estimés</p>
                            <p className="text-lg font-bold text-green-600">
                              {route.totalEarnings.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/deliverer/routes/${route.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Détails
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/deliverer/routes/${route.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRouteStatus(route.id, route.isActive)}
                          >
                            {route.isActive ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Activer
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRoute(route.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Créée le {formatDate(route.createdAt)}
                        </div>
                      </div>

                      {/* Correspondances */}
                      {route.announcements.length > 0 && (
                        <>
                          <Separator className="my-4" />
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Correspondances ({route.announcements.length})
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {route.announcements.slice(0, 4).map((announcement) => (
                                <div key={announcement.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                                  <span className="truncate">{announcement.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {announcement.price} €
                                  </Badge>
                                </div>
                              ))}
                              {route.announcements.length > 4 && (
                                <div className="text-xs text-muted-foreground">
                                  +{route.announcements.length - 4} autres...
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {filteredRoutes.filter(r => r.isActive).map((route) => (
              <Card key={route.id} className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-green-800">{route.name}</h3>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Départ:</span>
                            <span>{route.departureLocation.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Arrivée:</span>
                            <span>{route.arrivalLocation.address}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Horaires:</span>
                            <span>{formatTime(route.departureTime)} - {formatTime(route.arrivalTime)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Capacité:</span>
                            <span>{route.currentLoad}/{route.maxCapacity} places</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-green-600">Gains estimés</p>
                      <p className="text-lg font-bold text-green-700">
                        {route.totalEarnings.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/deliverer/routes/${route.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRouteStatus(route.id, route.isActive)}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Désactiver
                      </Button>
                    </div>
                    
                    <div className="text-xs text-green-600">
                      Créée le {formatDate(route.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <div className="grid gap-4">
            {filteredRoutes.filter(r => r.isRecurring).map((route) => (
              <Card key={route.id} className="border-purple-200 bg-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-purple-800">{route.name}</h3>
                        <Badge className="bg-purple-500">Récurrente</Badge>
                        {route.isActive && <Badge className="bg-green-500">Active</Badge>}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Départ:</span>
                            <span>{route.departureLocation.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Arrivée:</span>
                            <span>{route.arrivalLocation.address}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Fréquence:</span>
                            <span>{route.recurringPattern || 'Personnalisée'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Horaires:</span>
                            <span>{formatTime(route.departureTime)} - {formatTime(route.arrivalTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-purple-600">Gains estimés</p>
                      <p className="text-lg font-bold text-purple-700">
                        {route.totalEarnings.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/deliverer/routes/${route.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/deliverer/routes/${route.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    </div>
                    
                    <div className="text-xs text-purple-600">
                      Créée le {formatDate(route.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
} 