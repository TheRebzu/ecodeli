# Guide d'Implémentation Livreur EcoDeli - Partie 3
## SYSTÈME DE TRAJETS PLANIFIÉS

Cette partie couvre l'implémentation du système unique de trajets planifiés d'EcoDeli, permettant aux livreurs de déclarer leurs trajets à l'avance et de recevoir des propositions de livraisons correspondantes.

## ÉTAPE 8 : SERVICE DE TRAJETS PLANIFIÉS

### 8.1 Service principal de gestion des trajets

```typescript
// src/server/services/deliverer/route-planning.service.ts

import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { addDays, parseISO, format } from 'date-fns';

export const routePlanningService = {
  /**
   * Crée un nouveau trajet planifié
   */
  async createPlannedRoute(delivererId: string, routeData: {
    name: string;
    description?: string;
    startAddress: string;
    endAddress: string;
    waypoints?: Array<{ lat: number; lng: number; name: string }>;
    departureTime: Date;
    arrivalTime: Date;
    isRecurring: boolean;
    recurringDays?: string[];
    availableWeight: number;
    availableVolume: number;
  }) {
    // Géocoder les adresses
    const startCoords = await this.geocodeAddress(routeData.startAddress);
    const endCoords = await this.geocodeAddress(routeData.endAddress);
    
    const route = await db.plannedRoute.create({
      data: {
        delivererId,
        name: routeData.name,
        description: routeData.description,
        startLatitude: startCoords.lat,
        startLongitude: startCoords.lng,
        endLatitude: endCoords.lat,
        endLongitude: endCoords.lng,
        waypoints: routeData.waypoints || [],
        departureTime: routeData.departureTime,
        arrivalTime: routeData.arrivalTime,
        isRecurring: routeData.isRecurring,
        recurringDays: routeData.recurringDays || [],
        availableWeight: routeData.availableWeight,
        availableVolume: routeData.availableVolume
      }
    });
    
    // Lancer la recherche d'annonces compatibles
    await this.findMatchingAnnouncements(route.id);
    
    return route;
  },

  /**
   * Trouve les annonces compatibles avec un trajet
   */
  async findMatchingAnnouncements(routeId: string) {
    const route = await db.plannedRoute.findUnique({
      where: { id: routeId },
      include: { deliverer: true }
    });
    
    if (!route) return [];
    
    // Rechercher des annonces dans un rayon de 10km du trajet
    const announcements = await db.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        delivererId: null,
        pickupDate: {
          gte: route.departureTime,
          lte: route.arrivalTime
        }
      },
      include: { client: true }
    });
    
    const matches = [];
    
    for (const announcement of announcements) {
      // Calculer la distance du pickup par rapport au trajet
      const pickupDistance = this.calculateDistanceToRoute(
        route,
        announcement.pickupLatitude,
        announcement.pickupLongitude
      );
      
      // Calculer la distance de delivery par rapport au trajet
      const deliveryDistance = this.calculateDistanceToRoute(
        route,
        announcement.deliveryLatitude,
        announcement.deliveryLongitude
      );
      
      // Critères de compatibilité
      const maxDetour = 5; // 5km de détour max
      const isPickupCompatible = pickupDistance <= maxDetour;
      const isDeliveryCompatible = deliveryDistance <= maxDetour;
      
      if (isPickupCompatible && isDeliveryCompatible) {
        const matchScore = this.calculateMatchScore(route, announcement, pickupDistance, deliveryDistance);
        const estimatedProfit = this.calculateEstimatedProfit(announcement, pickupDistance + deliveryDistance);
        
        // Créer le match
        const match = await db.routeAnnouncementMatch.create({
          data: {
            routeId,
            announcementId: announcement.id,
            matchScore,
            estimatedProfit
          }
        });
        
        matches.push(match);
      }
    }
    
    return matches;
  },

  /**
   * Optimise l'itinéraire avec les livraisons acceptées
   */
  async optimizeRouteWithDeliveries(routeId: string) {
    const route = await db.plannedRoute.findUnique({
      where: { id: routeId },
      include: {
        matchedAnnouncements: {
          where: { isAccepted: true },
          include: { announcement: true }
        }
      }
    });
    
    if (!route || route.matchedAnnouncements.length === 0) {
      return { optimizedWaypoints: [], totalDistance: 0, estimatedDuration: 0 };
    }
    
    // Points à visiter (pickup et delivery de chaque annonce)
    const points = [];
    
    // Point de départ
    points.push({
      type: 'start',
      lat: route.startLatitude,
      lng: route.startLongitude,
      address: 'Point de départ'
    });
    
    // Ajouter tous les pickups et deliveries
    route.matchedAnnouncements.forEach(match => {
      const ann = match.announcement;
      points.push({
        type: 'pickup',
        lat: ann.pickupLatitude,
        lng: ann.pickupLongitude,
        address: ann.pickupAddress,
        announcementId: ann.id
      });
      points.push({
        type: 'delivery',
        lat: ann.deliveryLatitude,
        lng: ann.deliveryLongitude,
        address: ann.deliveryAddress,
        announcementId: ann.id
      });
    });
    
    // Point d'arrivée
    points.push({
      type: 'end',
      lat: route.endLatitude,
      lng: route.endLongitude,
      address: 'Point d\'arrivée'
    });
    
    // Optimiser l'ordre des points (algorithme simplifié)
    const optimizedOrder = await this.optimizePointsOrder(points);
    
    return {
      optimizedWaypoints: optimizedOrder,
      totalDistance: this.calculateTotalDistance(optimizedOrder),
      estimatedDuration: this.estimateTotalDuration(optimizedOrder)
    };
  },

  /**
   * Calcule le score de compatibilité entre un trajet et une annonce
   */
  calculateMatchScore(route: any, announcement: any, pickupDistance: number, deliveryDistance: number): number {
    let score = 100;
    
    // Pénalité pour la distance (max 20 points)
    const distancePenalty = Math.min(20, (pickupDistance + deliveryDistance) * 2);
    score -= distancePenalty;
    
    // Bonus pour la compatibilité horaire (max 10 points)
    const timeDiff = Math.abs(announcement.pickupDate.getTime() - route.departureTime.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    if (hoursDiff <= 2) score += 10;
    else if (hoursDiff <= 4) score += 5;
    
    // Bonus pour le prix attractif (max 10 points)
    if (announcement.suggestedPrice >= 15) score += 10;
    else if (announcement.suggestedPrice >= 10) score += 5;
    
    return Math.max(0, Math.min(100, score));
  },

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    // Simulation - en production, utiliser Google Maps Geocoding API
    return {
      lat: 48.8566 + (Math.random() - 0.5) * 0.1,
      lng: 2.3522 + (Math.random() - 0.5) * 0.1
    };
  }
};
```

## ÉTAPE 9 : COMPOSANTS UI POUR TRAJETS

### 9.1 Créateur de trajet avec carte

```typescript
// src/components/deliverer/routes/route-creator.tsx

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Clock, Package, Repeat } from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

const routeSchema = z.object({
  name: z.string().min(3, 'Nom requis (min 3 caractères)'),
  description: z.string().optional(),
  startAddress: z.string().min(5, 'Adresse de départ requise'),
  endAddress: z.string().min(5, 'Adresse d\'arrivée requise'),
  departureTime: z.string(),
  arrivalTime: z.string(),
  availableWeight: z.number().min(1, 'Capacité poids requise'),
  availableVolume: z.number().min(0.1, 'Capacité volume requise'),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.string()).default([])
});

type RouteForm = z.infer<typeof routeSchema>;

export default function RouteCreator({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const { mutate: createRoute, isLoading } = api.deliverer.routes.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Trajet créé',
        description: 'Votre trajet a été créé et la recherche de correspondances a commencé.'
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const form = useForm<RouteForm>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: '',
      description: '',
      startAddress: '',
      endAddress: '',
      departureTime: '',
      arrivalTime: '',
      availableWeight: 20,
      availableVolume: 1,
      isRecurring: false,
      recurringDays: []
    }
  });
  
  const daysOfWeek = [
    { id: 'monday', label: 'Lundi' },
    { id: 'tuesday', label: 'Mardi' },
    { id: 'wednesday', label: 'Mercredi' },
    { id: 'thursday', label: 'Jeudi' },
    { id: 'friday', label: 'Vendredi' },
    { id: 'saturday', label: 'Samedi' },
    { id: 'sunday', label: 'Dimanche' }
  ];
  
  const onSubmit = (data: RouteForm) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    createRoute({
      ...data,
      departureTime: new Date(`${tomorrow.toISOString().split('T')[0]}T${data.departureTime}`),
      arrivalTime: new Date(`${tomorrow.toISOString().split('T')[0]}T${data.arrivalTime}`),
      recurringDays: selectedDays
    });
  };
  
  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId)
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Créer un trajet planifié
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Nom et description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium">Nom du trajet</label>
              <Input
                placeholder="ex: Domicile → Travail"
                {...form.register('name')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optionnel)</label>
              <Textarea
                placeholder="Décrivez votre trajet habituel..."
                rows={2}
                {...form.register('description')}
              />
            </div>
          </div>
          
          {/* Itinéraire */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Itinéraire
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium">Adresse de départ</label>
                <Input
                  placeholder="123 Rue de la Paix, Paris"
                  {...form.register('startAddress')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Adresse d'arrivée</label>
                <Input
                  placeholder="456 Avenue des Champs, Paris"
                  {...form.register('endAddress')}
                />
              </div>
            </div>
          </div>
          
          {/* Horaires */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Heure de départ</label>
                <Input
                  type="time"
                  {...form.register('departureTime')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Heure d'arrivée</label>
                <Input
                  type="time"
                  {...form.register('arrivalTime')}
                />
              </div>
            </div>
          </div>
          
          {/* Capacité disponible */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Capacité disponible
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Poids (kg)</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  {...form.register('availableWeight', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Volume (m³)</label>
                <Input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  {...form.register('availableVolume', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
          
          {/* Récurrence */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                {...form.register('isRecurring')}
              />
              <label htmlFor="isRecurring" className="text-sm font-medium flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Trajet récurrent
              </label>
            </div>
            
            {form.watch('isRecurring') && (
              <div>
                <label className="text-sm font-medium">Jours de la semaine</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {daysOfWeek.map(day => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.id}
                        checked={selectedDays.includes(day.id)}
                        onCheckedChange={() => toggleDay(day.id)}
                      />
                      <label htmlFor={day.id} className="text-xs">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Création...' : 'Créer le trajet'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 9.2 Affichage des correspondances trouvées

```typescript
// src/components/deliverer/routes/route-matches.tsx

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  Euro, 
  TrendingUp, 
  Check, 
  X,
  Eye 
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

interface RouteMatchesProps {
  routeId: string;
}

export default function RouteMatches({ routeId }: RouteMatchesProps) {
  const { toast } = useToast();
  
  const { data: matches, refetch } = api.deliverer.routes.getMatches.useQuery(
    { routeId },
    { refetchInterval: 30000 }
  );
  
  const { mutate: acceptMatch } = api.deliverer.routes.acceptMatch.useMutation({
    onSuccess: () => {
      toast({
        title: 'Correspondance acceptée',
        description: 'La livraison a été ajoutée à votre trajet.'
      });
      refetch();
    }
  });
  
  const { mutate: rejectMatch } = api.deliverer.routes.rejectMatch.useMutation({
    onSuccess: () => {
      toast({
        title: 'Correspondance refusée',
        description: 'Cette proposition a été écartée.'
      });
      refetch();
    }
  });
  
  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">
            Aucune correspondance trouvée pour l'instant.
            Nous continuons à chercher des annonces compatibles.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Correspondances trouvées ({matches.length})
      </h3>
      
      {matches.map(match => (
        <Card key={match.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  {match.announcement.title}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Par {match.announcement.client.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={match.matchScore >= 80 ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  <TrendingUp className="h-3 w-3" />
                  {match.matchScore}%
                </Badge>
                {match.isAccepted && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    ✓ Acceptée
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Itinéraire */}
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-gray-600">Récupération:</span>
                <span className="ml-2">{match.announcement.pickupAddress}</span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-gray-600">Livraison:</span>
                <span className="ml-2">{match.announcement.deliveryAddress}</span>
              </div>
            </div>
            
            {/* Détails */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center text-green-600">
                  <Euro className="h-4 w-4 mr-1" />
                  <span className="font-semibold">
                    {match.estimatedProfit.toFixed(2)}€
                  </span>
                </div>
                <p className="text-xs text-gray-500">Profit estimé</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="font-semibold">
                    {match.announcement.suggestedPrice}€
                  </span>
                </div>
                <p className="text-xs text-gray-500">Prix total</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="font-semibold">
                    {(match.estimatedProfit / match.announcement.suggestedPrice * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Rentabilité</p>
              </div>
            </div>
            
            {/* Actions */}
            {!match.isAccepted && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Détails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rejectMatch({ matchId: match.id })}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptMatch({ matchId: match.id })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accepter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## ÉTAPE 10 : ROUTERS TRPC POUR TRAJETS

```typescript
// src/server/api/routers/deliverer/routes.router.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { routePlanningService } from '@/server/services/deliverer/route-planning.service';
import { TRPCError } from '@trpc/server';

export const delivererRoutesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(3),
      description: z.string().optional(),
      startAddress: z.string(),
      endAddress: z.string(),
      departureTime: z.date(),
      arrivalTime: z.date(),
      availableWeight: z.number(),
      availableVolume: z.number(),
      isRecurring: z.boolean(),
      recurringDays: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }
      
      return await routePlanningService.createPlannedRoute(
        ctx.session.user.id,
        input
      );
    }),

  getMyRoutes: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.plannedRoute.findMany({
        where: { delivererId: ctx.session.user.id },
        include: {
          matchedAnnouncements: {
            where: { isAccepted: true },
            include: { announcement: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getMatches: protectedProcedure
    .input(z.object({ routeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.routeAnnouncementMatch.findMany({
        where: { routeId: input.routeId },
        include: {
          announcement: {
            include: { client: true }
          }
        },
        orderBy: { matchScore: 'desc' }
      });
    }),

  acceptMatch: protectedProcedure
    .input(z.object({ matchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.routeAnnouncementMatch.update({
        where: { id: input.matchId },
        data: { isAccepted: true }
      });
    }),

  optimize: protectedProcedure
    .input(z.object({ routeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await routePlanningService.optimizeRouteWithDeliveries(input.routeId);
    })
});
```

Cette partie 3 couvre le système unique de trajets planifiés d'EcoDeli. La suite couvrira la carte NFC et les statistiques détaillées.

Souhaitez-vous que je continue avec la **Partie 4 : Carte NFC et validation** ?