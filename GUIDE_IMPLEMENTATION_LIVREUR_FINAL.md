# Guide d'Implémentation Livreur EcoDeli - Partie Finale
## CARTE NFC, STATISTIQUES & DÉPLOIEMENT

Cette partie finale couvre l'implémentation de la carte NFC, du système de statistiques avancées, et fournit le plan de déploiement complet.

## ÉTAPE 11 : SYSTÈME CARTE NFC

### 11.1 Service de gestion NFC

```typescript
// src/server/services/deliverer/nfc-card.service.ts

import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { generateQRCode } from '@/lib/utils/qr-generator';

export const nfcCardService = {
  /**
   * Active une carte NFC pour un livreur
   */
  async activateNFCCard(delivererId: string, cardNumber: string) {
    // Vérifier que le livreur est vérifié
    const deliverer = await db.deliverer.findUnique({
      where: { userId: delivererId },
      include: { user: true }
    });
    
    if (!deliverer?.user.isVerified) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Livreur non vérifié'
      });
    }
    
    // Générer QR code de secours
    const qrBackup = await generateQRCode({
      type: 'nfc_backup',
      delivererId,
      cardNumber,
      timestamp: Date.now()
    });
    
    return await db.nFCCard.create({
      data: {
        delivererId,
        cardNumber,
        isActive: true,
        activatedAt: new Date(),
        qrBackup
      }
    });
  },

  /**
   * Valide une livraison par NFC
   */
  async validateDeliveryByNFC(cardNumber: string, deliveryId: string) {
    const card = await db.nFCCard.findUnique({
      where: { cardNumber, isActive: true },
      include: { deliverer: true }
    });
    
    if (!card) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Carte NFC non trouvée ou inactive'
      });
    }
    
    // Vérifier que la livraison appartient au livreur
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: card.deliverer.userId
      }
    });
    
    if (!delivery) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Livraison non autorisée pour cette carte'
      });
    }
    
    // Mettre à jour la dernière utilisation
    await db.nFCCard.update({
      where: { id: card.id },
      data: { lastUsedAt: new Date() }
    });
    
    return { success: true, deliveryId, delivererId: card.deliverer.userId };
  }
};
```

### 11.2 Composant de gestion NFC

```typescript
// src/components/deliverer/nfc/nfc-card-manager.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreditCard, QrCode, Smartphone, CheckCircle2 } from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

export default function NFCCardManager() {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState('');
  
  const { data: nfcCard, refetch } = api.deliverer.nfc.getCard.useQuery();
  
  const { mutate: activateCard, isLoading } = api.deliverer.nfc.activate.useMutation({
    onSuccess: () => {
      toast({
        title: 'Carte activée',
        description: 'Votre carte NFC est maintenant active.'
      });
      refetch();
    }
  });
  
  if (nfcCard?.isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Ma carte NFC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Statut</span>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Numéro de carte</span>
            <span className="font-mono">****{nfcCard.cardNumber.slice(-4)}</span>
          </div>
          
          <div className="space-y-2">
            <Button variant="outline" className="w-full">
              <QrCode className="h-4 w-4 mr-2" />
              Afficher QR de secours
            </Button>
            <Button variant="outline" className="w-full">
              <Smartphone className="h-4 w-4 mr-2" />
              Tester la carte
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activer ma carte NFC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Numéro de carte</label>
          <Input
            placeholder="Saisissez le numéro de votre carte"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={() => activateCard({ cardNumber })}
          disabled={!cardNumber || isLoading}
          className="w-full"
        >
          {isLoading ? 'Activation...' : 'Activer la carte'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## ÉTAPE 12 : SYSTÈME DE STATISTIQUES AVANCÉES

### 12.1 Service de statistiques

```typescript
// src/server/services/deliverer/deliverer-stats.service.ts

import { db } from '@/server/db';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const delivererStatsService = {
  /**
   * Récupère les statistiques complètes d'un livreur
   */
  async getDelivererStats(delivererId: string) {
    const currentMonth = new Date();
    const previousMonth = subMonths(currentMonth, 1);
    
    // Statistiques générales
    const totalDeliveries = await db.delivery.count({
      where: { delivererId }
    });
    
    const completedDeliveries = await db.delivery.count({
      where: { delivererId, status: 'DELIVERED' }
    });
    
    const successRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;
    
    // Revenus
    const earnings = await db.walletTransaction.aggregate({
      where: {
        wallet: { userId: delivererId },
        type: 'EARNING',
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });
    
    // Revenus du mois
    const monthlyEarnings = await db.walletTransaction.aggregate({
      where: {
        wallet: { userId: delivererId },
        type: 'EARNING',
        status: 'COMPLETED',
        createdAt: {
          gte: startOfMonth(currentMonth),
          lte: endOfMonth(currentMonth)
        }
      },
      _sum: { amount: true }
    });
    
    // Distance totale
    const routes = await db.plannedRoute.findMany({
      where: { delivererId },
      select: { 
        startLatitude: true, 
        startLongitude: true,
        endLatitude: true,
        endLongitude: true
      }
    });
    
    const totalDistance = routes.reduce((sum, route) => {
      return sum + this.calculateDistance(
        route.startLatitude, route.startLongitude,
        route.endLatitude, route.endLongitude
      );
    }, 0);
    
    // Évaluations
    const ratings = await db.deliveryRating.aggregate({
      where: { targetId: delivererId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    
    return {
      totalDeliveries,
      successRate,
      totalEarnings: earnings._sum.amount || 0,
      monthlyEarnings: monthlyEarnings._sum.amount || 0,
      totalDistance: Math.round(totalDistance),
      averageRating: ratings._avg.rating || 0,
      totalRatings: ratings._count.rating,
      badges: await this.calculateBadges(delivererId, {
        totalDeliveries,
        successRate,
        averageRating: ratings._avg.rating || 0
      })
    };
  },

  /**
   * Calcule les badges/achievements du livreur
   */
  async calculateBadges(delivererId: string, stats: any) {
    const badges = [];
    
    if (stats.totalDeliveries >= 10) badges.push('rookie');
    if (stats.totalDeliveries >= 50) badges.push('experienced');
    if (stats.totalDeliveries >= 100) badges.push('veteran');
    
    if (stats.successRate >= 95) badges.push('reliable');
    if (stats.averageRating >= 4.5) badges.push('top_rated');
    
    return badges;
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
};
```

### 12.2 Dashboard de statistiques

```typescript
// src/components/deliverer/stats/stats-dashboard.tsx

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Package, 
  Euro, 
  MapPin, 
  Star,
  Award
} from 'lucide-react';
import { api } from '@/trpc/react';

export default function StatsDelivererDashboard() {
  const { data: stats } = api.deliverer.stats.getOverview.useQuery();
  
  if (!stats) return <div>Chargement...</div>;
  
  const badgeLabels = {
    rookie: { label: 'Débutant', icon: '🚀', color: 'bg-blue-100 text-blue-800' },
    experienced: { label: 'Expérimenté', icon: '💪', color: 'bg-green-100 text-green-800' },
    veteran: { label: 'Vétéran', icon: '🏆', color: 'bg-purple-100 text-purple-800' },
    reliable: { label: 'Fiable', icon: '✨', color: 'bg-amber-100 text-amber-800' },
    top_rated: { label: 'Top Évalué', icon: '⭐', color: 'bg-red-100 text-red-800' }
  };
  
  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.successRate.toFixed(1)}% de réussite
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEarnings}€</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyEarnings}€ ce mois
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistance} km</div>
            <p className="text-xs text-muted-foreground">
              Parcours total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Évaluation</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRatings} évaluations
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Badges et achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Mes badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.badges.map(badge => {
              const badgeInfo = badgeLabels[badge];
              return (
                <Badge key={badge} className={badgeInfo.color}>
                  <span className="mr-1">{badgeInfo.icon}</span>
                  {badgeInfo.label}
                </Badge>
              );
            })}
            {stats.badges.length === 0 && (
              <p className="text-gray-500">
                Complétez des livraisons pour débloquer des badges !
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Progression vers le prochain niveau */}
      <Card>
        <CardHeader>
          <CardTitle>Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Vers "Expérimenté" (50 livraisons)</span>
                <span>{Math.min(stats.totalDeliveries, 50)}/50</span>
              </div>
              <Progress 
                value={Math.min((stats.totalDeliveries / 50) * 100, 100)} 
                className="mt-2" 
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm">
                <span>Vers "Fiable" (95% de réussite)</span>
                <span>{stats.successRate.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(stats.successRate, 100)} 
                className="mt-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## ÉTAPE 13 : PLAN DE DÉPLOIEMENT COMPLET

### 13.1 Checklist de déploiement

#### Phase 1 : Modèles et Services Backend
- [ ] Étendre le modèle Deliverer existant
- [ ] Créer les nouveaux modèles (PlannedRoute, NFCCard, etc.)
- [ ] Implémenter les services d'onboarding
- [ ] Créer le service de matching trajets/annonces
- [ ] Développer le service d'exécution livraisons
- [ ] Mettre en place le service NFC
- [ ] Créer le service de statistiques

#### Phase 2 : API et Routers TRPC
- [ ] Router d'onboarding livreur
- [ ] Router de candidatures/matching
- [ ] Router de trajets planifiés
- [ ] Router d'exécution livraisons
- [ ] Router de gestion NFC
- [ ] Router de statistiques

#### Phase 3 : Composants UI
- [ ] Wizard d'onboarding complet
- [ ] Interface de candidature aux annonces
- [ ] Créateur de trajets avec carte
- [ ] Interface de suivi GPS
- [ ] Validation par code/NFC
- [ ] Dashboard de statistiques

#### Phase 4 : Pages et Navigation
- [ ] Pages d'onboarding
- [ ] Pages de gestion des trajets
- [ ] Pages d'exécution de livraisons
- [ ] Pages de statistiques
- [ ] Mise à jour de la navigation

#### Phase 5 : Intégrations
- [ ] API Google Maps pour géocodage
- [ ] Service de notifications push
- [ ] Intégration NFC (Web NFC API)
- [ ] Service d'upload de fichiers
- [ ] Optimisation des performances

### 13.2 Configuration requise

```typescript
// .env.example ajouts
GOOGLE_MAPS_API_KEY=your_google_maps_key
NFC_VALIDATION_SECRET=your_nfc_secret
UPLOAD_SERVICE_ENDPOINT=your_upload_service
PUSH_NOTIFICATION_VAPID_KEY=your_vapid_key
```

### 13.3 Migrations de base de données

```sql
-- Migration pour les nouvelles tables
CREATE TABLE deliverer_profiles (
  id TEXT PRIMARY KEY,
  deliverer_id TEXT UNIQUE NOT NULL REFERENCES deliverers(id),
  vehicle_brand TEXT,
  vehicle_model TEXT,
  -- ... autres champs
);

CREATE TABLE planned_routes (
  id TEXT PRIMARY KEY,
  deliverer_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  -- ... autres champs
);

CREATE TABLE nfc_cards (
  id TEXT PRIMARY KEY,
  deliverer_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  card_number TEXT UNIQUE NOT NULL,
  -- ... autres champs
);
```

### 13.4 Tests à implémenter

```typescript
// Tests unitaires prioritaires
describe('DelivererOnboardingService', () => {
  test('complete registration with valid data');
  test('validate required documents');
  test('check document completeness');
});

describe('RoutePlanningService', () => {
  test('create planned route');
  test('find matching announcements');
  test('optimize route with deliveries');
});

describe('DeliveryExecutionService', () => {
  test('start delivery');
  test('validate delivery with code');
  test('process payment after delivery');
});
```

## CONCLUSION

Ce guide couvre l'implémentation complète de l'espace livreur EcoDeli avec :

✅ **Système d'onboarding complet** avec validation documents
✅ **Gestion avancée des candidatures** aux annonces
✅ **Trajets planifiés unique** avec matching automatique
✅ **Workflow d'exécution** avec GPS et validation
✅ **Carte NFC** pour validation sans contact
✅ **Statistiques détaillées** et système de badges
✅ **Architecture scalable** et maintenable

### Fonctionnalités uniques EcoDeli implémentées :
- 🚛 Trajets planifiés avec matching intelligent
- 📱 Validation par code unique + NFC de secours
- 📊 Système de badges et achievements
- 🎯 Optimisation automatique des itinéraires
- 💰 Calcul transparent des profits
- 📍 Suivi GPS temps réel avec notifications

Le système est maintenant prêt pour supporter tous les besoins métier des livreurs EcoDeli selon le cahier des charges.