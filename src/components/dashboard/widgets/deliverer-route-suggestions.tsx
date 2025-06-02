'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Navigation,
  Star,
  TrendingUp,
  ChevronRight,
  Route,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

type RouteSuggestion = {
  id: string;
  from: string;
  to: string;
  estimatedEarnings: number;
  estimatedTime: number; // en minutes
  distance: number; // en km
  priority: 'high' | 'medium' | 'low';
  availableDeliveries: number;
  popularity: number; // score de 1-5
  traffic: 'light' | 'moderate' | 'heavy';
  bestTimeSlots: string[];
};

type DelivererRouteSuggestionsProps = {
  suggestions?: RouteSuggestion[];
  isLoading?: boolean;
  currency?: string;
};

export function DelivererRouteSuggestions({ 
  suggestions, 
  isLoading = false, 
  currency = '€' 
}: DelivererRouteSuggestionsProps) {
  const t = useTranslations('dashboard.deliverer');
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === '€' ? 'EUR' : 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'light':
        return 'text-green-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'heavy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrafficIcon = (traffic: string) => {
    switch (traffic) {
      case 'light':
        return '🟢';
      case 'moderate':
        return '🟡';
      case 'heavy':
        return '🔴';
      default:
        return '⚪';
    }
  };

  // Données par défaut si aucune suggestion n'est fournie
  const defaultSuggestions: RouteSuggestion[] = [
    {
      id: '1',
      from: 'Centre-ville',
      to: 'Quartier Nord',
      estimatedEarnings: 25.50,
      estimatedTime: 45,
      distance: 8.2,
      priority: 'high',
      availableDeliveries: 12,
      popularity: 5,
      traffic: 'light',
      bestTimeSlots: ['08:00-10:00', '17:00-19:00']
    },
    {
      id: '2',
      from: 'Zone commerciale',
      to: 'Résidentiel Est',
      estimatedEarnings: 18.75,
      estimatedTime: 35,
      distance: 6.5,
      priority: 'medium',
      availableDeliveries: 8,
      popularity: 4,
      traffic: 'moderate',
      bestTimeSlots: ['11:00-14:00', '19:00-21:00']
    },
    {
      id: '3',
      from: 'Campus universitaire',
      to: 'Centre historique',
      estimatedEarnings: 15.25,
      estimatedTime: 25,
      distance: 4.8,
      priority: 'medium',
      availableDeliveries: 6,
      popularity: 3,
      traffic: 'light',
      bestTimeSlots: ['12:00-14:00', '18:00-20:00']
    }
  ];

  const routeData = suggestions || defaultSuggestions;

  const goToRoutes = () => router.push('/deliverer/my-routes');
  const selectRoute = (routeId: string) => {
    router.push(`/deliverer/my-routes/create?suggested=${routeId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          {t('routes.suggestions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {routeData.length > 0 ? (
          routeData.map((route) => (
            <div
              key={route.id}
              className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => selectRoute(route.id)}
            >
              {/* En-tête de la route */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {route.from} → {route.to}
                  </span>
                </div>
                <Badge className={getPriorityColor(route.priority)}>
                  {t(`routes.priority.${route.priority}`)}
                </Badge>
              </div>

              {/* Informations principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-600">
                    {formatCurrency(route.estimatedEarnings)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{formatTime(route.estimatedTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-muted-foreground" />
                  <span>{route.distance} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{getTrafficIcon(route.traffic)}</span>
                  <span className={getTrafficColor(route.traffic)}>
                    {t(`routes.traffic.${route.traffic}`)}
                  </span>
                </div>
              </div>

              {/* Détails supplémentaires */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{route.availableDeliveries} {t('routes.availableDeliveries')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{route.popularity}/5</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{t('routes.bestTimes')}: {route.bestTimeSlots.join(', ')}</span>
                </div>
              </div>

              {/* Bouton d'action */}
              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" className="text-xs">
                  {t('routes.selectRoute')}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
            <p className="text-muted-foreground">{t('routes.noSuggestions')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('routes.noSuggestionsHelp')}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={goToRoutes}>
          {t('routes.manageRoutes')}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}