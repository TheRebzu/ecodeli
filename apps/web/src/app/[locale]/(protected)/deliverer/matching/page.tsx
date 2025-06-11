'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Bell, 
  RefreshCw, 
  AlertCircle, 
  Settings, 
  TrendingUp,
  MapPin,
  Clock,
  Filter,
  CheckCircle,
  X,
  MessageCircle,
} from 'lucide-react';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';
import { toast } from 'sonner';
import { AnnouncementMatchingDisplay } from '@/components/shared/announcements/announcement-matching-display';

// Types pour les matches (simulation)
interface MockAnnouncementMatch {
  id: string;
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupDate?: Date;
    deliveryDate?: Date;
    suggestedPrice: number;
    weight?: number;
    isFragile: boolean;
    needsCooling: boolean;
    client: {
      id: string;
      name: string;
      image?: string;
      rating: number;
      completedDeliveries: number;
    };
  };
  route: {
    id: string;
    title: string;
    departureAddress: string;
    arrivalAddress: string;
    departureDate?: Date;
    arrivalDate?: Date;
    deliverer: {
      id: string;
      name: string;
      image?: string;
      rating: number;
      completedDeliveries: number;
    };
  };
  matching: {
    routeId: string;
    announcementId: string;
    compatibilityScore: number;
    reasons: string[];
    distance: number;
    detourPercentage: number;
    priceEstimate: number;
    estimatedDuration: string;
    matchingPoints: {
      pickup: { latitude: number; longitude: number; address: string };
      delivery: { latitude: number; longitude: number; address: string };
    };
  };
  createdAt: Date;
  notified: boolean;
}

export default function DelivererMatchingPage() {
  useRoleProtection(['DELIVERER']);
  const t = useTranslations('matching');
  const [matches, setMatches] = useState<MockAnnouncementMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [minCompatibility, setMinCompatibility] = useState(60);
  const [maxDistance, setMaxDistance] = useState(25);

  // Charger les matches
  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simuler un appel API
      setTimeout(() => {
        const mockMatches: MockAnnouncementMatch[] = [
          {
            id: 'match-1',
            announcement: {
              id: 'ann-1',
              title: 'Livraison de colis urgent Paris → Lyon',
              description: 'Colis fragile, livraison express demandée',
              type: 'PACKAGE_DELIVERY',
              pickupAddress: '123 Rue de Rivoli, 75001 Paris',
              deliveryAddress: '456 Rue de la République, 69002 Lyon',
              pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              suggestedPrice: 45,
              weight: 2.5,
              isFragile: true,
              needsCooling: false,
              client: {
                id: 'client-1',
                name: 'Marie Dubois',
                image: undefined,
                rating: 4.8,
                completedDeliveries: 127,
              },
            },
            route: {
              id: 'route-1',
              title: 'Trajet Paris → Lyon (hebdomadaire)',
              departureAddress: '100 Avenue des Champs-Élysées, 75008 Paris',
              arrivalAddress: '789 Place Bellecour, 69002 Lyon',
              departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              arrivalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
              deliverer: {
                id: 'deliverer-1',
                name: 'Jean Martin',
                image: undefined,
                rating: 4.9,
                completedDeliveries: 234,
              },
            },
            matching: {
              routeId: 'route-1',
              announcementId: 'ann-1',
              compatibilityScore: 92,
              reasons: ['SAME_ROUTE', 'TIMING_COMPATIBLE', 'WEIGHT_COMPATIBLE', 'ACCEPTS_FRAGILE'],
              distance: 1.2,
              detourPercentage: 5,
              priceEstimate: 45,
              estimatedDuration: '4h 15min',
              matchingPoints: {
                pickup: { latitude: 48.856614, longitude: 2.352222, address: '123 Rue de Rivoli, 75001 Paris' },
                delivery: { latitude: 45.764043, longitude: 4.835659, address: '456 Rue de la République, 69002 Lyon' },
              },
            },
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
            notified: false,
          },
          {
            id: 'match-2',
            announcement: {
              id: 'ann-2',
              title: 'Course alimentaire Marseille centre',
              description: 'Produits frais à récupérer et livrer',
              type: 'GROCERY_SHOPPING',
              pickupAddress: 'Carrefour Marseille Centre, Marseille',
              deliveryAddress: '789 Cours Julien, 13006 Marseille',
              suggestedPrice: 25,
              weight: 15,
              isFragile: false,
              needsCooling: true,
              client: {
                id: 'client-2',
                name: 'Pierre Legrand',
                image: undefined,
                rating: 4.5,
                completedDeliveries: 89,
              },
            },
            route: {
              id: 'route-2',
              title: 'Tournée Marseille nord',
              departureAddress: 'La Joliette, Marseille',
              arrivalAddress: 'Cours Julien, Marseille',
              deliverer: {
                id: 'deliverer-1',
                name: 'Jean Martin',
                image: undefined,
                rating: 4.9,
                completedDeliveries: 234,
              },
            },
            matching: {
              routeId: 'route-2',
              announcementId: 'ann-2',
              compatibilityScore: 78,
              reasons: ['GEOGRAPHIC_PROXIMITY', 'ACCEPTS_COOLING', 'WEIGHT_COMPATIBLE'],
              distance: 0.8,
              detourPercentage: 12,
              priceEstimate: 25,
              estimatedDuration: '45min',
              matchingPoints: {
                pickup: { latitude: 43.296482, longitude: 5.369780, address: 'Carrefour Marseille Centre' },
                delivery: { latitude: 43.294482, longitude: 5.381440, address: '789 Cours Julien, 13006 Marseille' },
              },
            },
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            notified: true,
          },
          {
            id: 'match-3',
            announcement: {
              id: 'ann-3',
              title: 'Transport de documents Nice → Cannes',
              description: 'Documents confidentiels, signature requise',
              type: 'PACKAGE_DELIVERY',
              pickupAddress: 'Centre d\'affaires Nice Étoile, Nice',
              deliveryAddress: 'Palais des Festivals, Cannes',
              suggestedPrice: 35,
              weight: 0.5,
              isFragile: false,
              needsCooling: false,
              client: {
                id: 'client-3',
                name: 'Sophie Bernard',
                image: undefined,
                rating: 4.7,
                completedDeliveries: 156,
              },
            },
            route: {
              id: 'route-3',
              title: 'Liaison Côte d\'Azur',
              departureAddress: 'Aéroport Nice Côte d\'Azur',
              arrivalAddress: 'Gare SNCF Cannes',
              deliverer: {
                id: 'deliverer-1',
                name: 'Jean Martin',
                image: undefined,
                rating: 4.9,
                completedDeliveries: 234,
              },
            },
            matching: {
              routeId: 'route-3',
              announcementId: 'ann-3',
              compatibilityScore: 85,
              reasons: ['SAME_ROUTE', 'PRIORITY_COMPATIBLE', 'DOCUMENT_HANDLING'],
              distance: 2.1,
              detourPercentage: 8,
              priceEstimate: 35,
              estimatedDuration: '1h 10min',
              matchingPoints: {
                pickup: { latitude: 43.710173, longitude: 7.261953, address: 'Centre d\'affaires Nice Étoile' },
                delivery: { latitude: 43.552847, longitude: 7.017369, address: 'Palais des Festivals, Cannes' },
              },
            },
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            notified: true,
          },
        ];

        setMatches(mockMatches);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des correspondances';
      setError(message);
      setIsLoading(false);
    }
  };

  // Charger les matches au montage et configurer le rafraîchissement automatique
  useEffect(() => {
    fetchMatches();

    if (autoRefresh) {
      const interval = setInterval(fetchMatches, 30000); // Rafraîchir toutes les 30 secondes
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filtrer les matches selon les critères
  const filteredMatches = matches.filter(match => 
    match.matching.compatibilityScore >= minCompatibility &&
    match.matching.distance <= maxDistance
  );

  // Gérer les actions sur les matches
  const handleApply = async (matchId: string) => {
    try {
      // Simuler une candidature
      setTimeout(() => {
        toast.success(t('applicationSent'));
        // Retirer le match de la liste après candidature
        setMatches(prev => prev.filter(m => m.id !== matchId));
      }, 500);
    } catch (error) {
      toast.error(t('applicationError'));
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      // Simuler un rejet
      setMatches(prev => prev.filter(m => m.id !== matchId));
      toast.success(t('matchRejected'));
    } catch (error) {
      toast.error(t('rejectionError'));
    }
  };

  const handleContact = async (userId: string) => {
    // Rediriger vers la messagerie
    toast.info(t('redirectingToMessages'));
  };

  const handleViewDetails = (matchId: string) => {
    // Rediriger vers les détails
    toast.info(t('showingDetails'));
  };

  const handleMarkAsRead = (matchId: string) => {
    setMatches(prev => prev.map(match => 
      match.id === matchId ? { ...match, notified: true } : match
    ));
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('matchingSystem')}</h1>
          <p className="text-muted-foreground mt-1">{t('findCompatibleDeliveries')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMatches}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Paramètres de matching */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>{t('matchingSettings')}</span>
          </CardTitle>
          <CardDescription>{t('adjustYourPreferences')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Notifications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('notifications')}</label>
                <Switch 
                  checked={enableNotifications} 
                  onCheckedChange={setEnableNotifications} 
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('receiveNotifications')}</p>
            </div>

            {/* Rafraîchissement automatique */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('autoRefresh')}</label>
                <Switch 
                  checked={autoRefresh} 
                  onCheckedChange={setAutoRefresh} 
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('autoRefreshDescription')}</p>
            </div>

            {/* Compatibilité minimale */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('minCompatibility')}: {minCompatibility}%
              </label>
              <Slider
                value={[minCompatibility]}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) => setMinCompatibility(value[0])}
                className="w-full"
              />
            </div>

            {/* Distance maximale */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('maxDistance')}: {maxDistance} km
              </label>
              <Slider
                value={[maxDistance]}
                min={1}
                max={50}
                step={1}
                onValueChange={(value) => setMaxDistance(value[0])}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalMatches')}</p>
                <p className="text-2xl font-bold">{matches.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('newMatches')}</p>
                <p className="text-2xl font-bold">{matches.filter(m => !m.notified).length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('highCompatibility')}</p>
                <p className="text-2xl font-bold">{matches.filter(m => m.matching.compatibilityScore >= 85).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('nearbyMatches')}</p>
                <p className="text-2xl font-bold">{matches.filter(m => m.matching.distance <= 5).length}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Affichage des erreurs */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Composant d'affichage des matches */}
      <AnnouncementMatchingDisplay
        matches={filteredMatches}
        userRole="DELIVERER"
        isLoading={isLoading}
        onApply={handleApply}
        onReject={handleReject}
        onViewDetails={handleViewDetails}
        onContact={handleContact}
        onMarkAsRead={handleMarkAsRead}
        enableNotifications={enableNotifications}
        onNotificationToggle={setEnableNotifications}
      />
    </div>
  );
}