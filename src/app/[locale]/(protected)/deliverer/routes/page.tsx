import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RoutePlanner } from '@/components/maps/route-planner'
import { Separator } from '@/components/ui/separator'
import { Plus, Route, Calendar, Clock, MapPin, Navigation, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface RoutePageProps {
  params: {
    locale: string
  }
  searchParams: {
    date?: string
    status?: string
  }
}

async function getDelivererRoutes(searchParams: any) {
  try {
    const params = new URLSearchParams({
      date: searchParams.date || new Date().toISOString().split('T')[0],
      status: searchParams.status || 'all'
    })
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/deliverer/routes?${params}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) return { routes: [], stats: null }
    return response.json()
  } catch {
    return { routes: [], stats: null }
  }
}

function RoutePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>
      
      <div className="h-96 bg-muted rounded animate-pulse" />
    </div>
  )
}

async function RouteContent({ searchParams }: { searchParams: any }) {
  const data = await getDelivererRoutes(searchParams)
  
  if (!data.routes) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
          <p className="text-muted-foreground">
            Impossible de charger vos routes. Veuillez réessayer.
          </p>
        </CardContent>
      </Card>
    )
  }

  const selectedDate = searchParams.date || new Date().toISOString().split('T')[0]
  const todayRoutes = data.routes.filter((route: any) => route.date === selectedDate)
  const activeRoute = todayRoutes.find((route: any) => route.status === 'ACTIVE')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes routes</h1>
          <p className="text-muted-foreground">
            Planifiez et gérez vos itinéraires de livraison
          </p>
        </div>
        <Link href="/deliverer/routes/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Créer une route
          </Button>
        </Link>
      </div>

      {data.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Routes aujourd'hui</p>
                  <p className="text-2xl font-bold">{data.stats.todayRoutes}</p>
                </div>
                <Route className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Livraisons planifiées</p>
                  <p className="text-2xl font-bold">{data.stats.plannedDeliveries}</p>
                </div>
                <MapPin className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Distance totale</p>
                  <p className="text-2xl font-bold">{data.stats.totalDistance} km</p>
                </div>
                <Navigation className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Temps estimé</p>
                  <p className="text-2xl font-bold">{Math.round(data.stats.totalDuration / 60)}h</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeRoute && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Navigation className="h-5 w-5" />
                Route active: {activeRoute.name}
              </CardTitle>
              <Badge className="bg-green-500">En cours</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <RoutePlanner
              stops={activeRoute.stops.map((stop: any) => ({
                id: stop.id,
                address: stop.address,
                lat: stop.latitude,
                lon: stop.longitude,
                type: stop.type,
                announcementId: stop.announcementId,
                estimatedTime: stop.estimatedTime,
                clientName: stop.clientName,
                clientPhone: stop.clientPhone
              }))}
              showInstructions={true}
              height="400px"
            />
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {activeRoute.stops.length} arrêts
                </span>
                <span className="flex items-center gap-1">
                  <Navigation className="h-4 w-4" />
                  {activeRoute.totalDistance} km
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(activeRoute.totalDuration / 60)} min
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Voir détails
                </Button>
                <Button size="sm">
                  Continuer la route
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Routes planifiées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayRoutes.length > 0 ? (
            <div className="space-y-4">
              {todayRoutes.map((route: any) => (
                <div key={route.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{route.name}</h3>
                      <Badge variant={getStatusVariant(route.status)}>
                        {getStatusLabel(route.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {route.startTime} - {route.endTime || 'Non défini'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{route.stops.length} arrêts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span>{route.totalDistance || 0} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{Math.round((route.totalDuration || 0) / 60)} min</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/deliverer/routes/${route.id}/edit`}>
                          Modifier
                        </Link>
                      </Button>
                      {route.status === 'PLANNED' && (
                        <Button size="sm" asChild>
                          <Link href={`/deliverer/routes/${route.id}/start`}>
                            Démarrer
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Aucune route planifiée</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre première route pour organiser vos livraisons
              </p>
              <Link href="/deliverer/routes/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une route
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
  const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
    ACTIVE: 'default',
    COMPLETED: 'outline',
    PLANNED: 'secondary',
    DRAFT: 'outline'
  }
  return variants[status] || 'outline'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PLANNED: 'Planifiée',
    ACTIVE: 'En cours',
    COMPLETED: 'Terminée'
  }
  return labels[status] || status
}

export default function DelivererRoutesPage({ params, searchParams }: RoutePageProps) {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<RoutePageSkeleton />}>
        <RouteContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}