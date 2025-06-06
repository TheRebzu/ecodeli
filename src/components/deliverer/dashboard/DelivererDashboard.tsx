'use client';

import { useState, useEffect } from 'react';
import { 
  TruckIcon, 
  MapPinIcon, 
  EuroIcon, 
  ClockIcon,
  BellIcon,
  TrendingUpIcon,
  RouteIcon,
  CheckCircleIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RouteCreationDialog } from '@/components/deliverer/route-planning/RouteCreationDialog';
import { RouteMatchesCard } from '@/components/deliverer/route-planning/RouteMatchesCard';

interface DelivererStats {
  totalRoutes: number;
  activeRoutes: number;
  totalMatches: number;
  acceptedMatches: number;
  rejectedMatches: number;
  totalPotentialProfit: number;
  acceptanceRate: number;
}

interface DelivererDashboardProps {
  delivererId: string;
}

export function DelivererDashboard({ delivererId }: DelivererDashboardProps) {
  const [stats, setStats] = useState<DelivererStats>({
    totalRoutes: 0,
    activeRoutes: 0,
    totalMatches: 0,
    acceptedMatches: 0,
    rejectedMatches: 0,
    totalPotentialProfit: 0,
    acceptanceRate: 0
  });

  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeMatches, setRouteMatches] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Simulation des données (remplacer par les vrais appels API)
  useEffect(() => {
    // Simuler le chargement des données
    const mockStats: DelivererStats = {
      totalRoutes: 3,
      activeRoutes: 2,
      totalMatches: 12,
      acceptedMatches: 5,
      rejectedMatches: 2,
      totalPotentialProfit: 127.50,
      acceptanceRate: 71
    };

    const mockRoutes = [
      {
        id: 'route_1',
        name: 'Paris-Lyon hebdomadaire',
        startAddress: 'Paris, France',
        endAddress: 'Lyon, France',
        departureTime: '2024-01-15T08:00:00Z',
        isActive: true,
        matchCount: 4,
        acceptedMatches: 2
      },
      {
        id: 'route_2', 
        name: 'Marseille-Nice quotidien',
        startAddress: 'Marseille, France',
        endAddress: 'Nice, France',
        departureTime: '2024-01-16T14:00:00Z',
        isActive: true,
        matchCount: 3,
        acceptedMatches: 1
      }
    ];

    const mockNotifications = [
      {
        id: '1',
        title: 'Nouvelle correspondance trouvée !',
        message: 'Une livraison compatible avec votre trajet "Paris-Lyon" : Colis fragile 15€',
        type: 'ROUTE_MATCH',
        createdAt: new Date(),
        read: false
      },
      {
        id: '2',
        title: 'Trajet optimisé',
        message: 'Votre itinéraire a été optimisé avec 2 livraisons acceptées',
        type: 'ROUTE_OPTIMIZED',
        createdAt: new Date(),
        read: false
      }
    ];

    setStats(mockStats);
    setRoutes(mockRoutes);
    setNotifications(mockNotifications);
  }, []);

  const handleRouteCreated = (newRoute: any) => {
    setRoutes(prev => [...prev, { ...newRoute, id: `route_${Date.now()}` }]);
  };

  const handleAcceptMatch = async (matchId: string) => {
    console.log('Accepting match:', matchId);
    // TODO: Intégrer avec l'API
  };

  const handleRejectMatch = async (matchId: string, reason?: string) => {
    console.log('Rejecting match:', matchId, reason);
    // TODO: Intégrer avec l'API
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Livreur</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos trajets et découvrez de nouvelles opportunités de livraison
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="relative">
            <BellIcon className="w-4 h-4 mr-2" />
            Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </Button>
          <RouteCreationDialog onRouteCreated={handleRouteCreated} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trajets Actifs</CardTitle>
            <RouteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRoutes}</div>
            <p className="text-xs text-muted-foreground">
              sur {stats.totalRoutes} trajets créés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correspondances</CardTitle>
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground">
              {stats.acceptedMatches} acceptées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'Acceptation</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Très bon taux ✨
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Potentiel</CardTitle>
            <EuroIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalPotentialProfit}</div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes">Mes Trajets</TabsTrigger>
          <TabsTrigger value="matches">Correspondances</TabsTrigger>
          <TabsTrigger value="deliveries">Livraisons Actives</TabsTrigger>
          <TabsTrigger value="analytics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Trajets Planifiés</h2>
            <Badge variant="secondary">
              {routes.filter(r => r.isActive).length} actifs
            </Badge>
          </div>

          {routes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Aucun trajet planifié</h3>
                <p className="text-gray-600 mb-4">
                  Créez votre premier trajet pour commencer à recevoir des propositions de livraison automatiques.
                </p>
                <RouteCreationDialog onRouteCreated={handleRouteCreated} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {routes.map((route) => (
                <Card key={route.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{route.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        {route.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                        <Badge variant="outline">
                          {route.matchCount || 0} correspondances
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{route.startAddress} → {route.endAddress}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>
                          {new Date(route.departureTime).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    
                    {route.acceptedMatches > 0 && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center text-green-800 text-sm">
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          {route.acceptedMatches} livraison{route.acceptedMatches > 1 ? 's' : ''} acceptée{route.acceptedMatches > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedRouteId(route.id)}
                      >
                        Voir correspondances
                      </Button>
                      <Button variant="outline" size="sm">
                        Optimiser itinéraire
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {selectedRouteId ? (
            <RouteMatchesCard
              matches={routeMatches}
              routeName={routes.find(r => r.id === selectedRouteId)?.name || ''}
              onAcceptMatch={handleAcceptMatch}
              onRejectMatch={handleRejectMatch}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPinIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Sélectionnez un trajet</h3>
                <p className="text-gray-600">
                  Choisissez un trajet dans l'onglet "Mes Trajets" pour voir ses correspondances.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Livraisons en Cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucune livraison en cours</p>
                <p className="text-sm mt-2">
                  Vos livraisons acceptées apparaîtront ici avec le suivi GPS en temps réel.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance des Trajets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Correspondances trouvées</span>
                    <span className="font-medium">{stats.totalMatches}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taux d'acceptation</span>
                    <span className="font-medium text-green-600">{stats.acceptanceRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profit moyen par livraison</span>
                    <span className="font-medium">
                      €{stats.acceptedMatches > 0 ? (stats.totalPotentialProfit / stats.acceptedMatches).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Évolution EcoDeli</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Système de trajets planifiés actif</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Matching automatique opérationnel</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Optimisation IA en cours de déploiement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Cartes NFC bientôt disponibles</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}