# Guide d'Implémentation Exhaustif - Espace Livreur EcoDeli

## INTRODUCTION

Ce guide fournit l'implémentation complète de l'espace livreur EcoDeli selon Mission 1 et le cahier des charges. Il couvre TOUTES les fonctionnalités nécessaires pour les livreurs, en s'appuyant sur l'architecture existante.

## ANALYSE DE L'EXISTANT

### Ce qui existe déjà :
- ✅ Modèle Prisma `Deliverer` complet avec champs essentiels
- ✅ Dashboard livreur basique avec actions rapides
- ✅ Service `wallet.service.ts` pour la gestion financière
- ✅ Service `delivery-tracking.service.ts` pour le suivi
- ✅ Page d'annonces `/deliverer/announcements`
- ✅ Structure de base des pages livreur
- ✅ Système d'authentification et permissions

### Ce qui reste à implémenter :
- 🔲 Système complet d'onboarding et validation documents
- 🔲 Gestion des trajets planifiés (matching automatique)
- 🔲 Workflow complet d'exécution de livraison
- 🔲 Planning et disponibilités avancés
- 🔲 Système de candidatures aux annonces
- 🔲 Carte NFC et validation sans contact
- 🔲 Statistiques et performance détaillées
- 🔲 Optimisation trajets multi-livraisons

## ÉTAPE 1 : MODÈLES DE DONNÉES AVANCÉS

### 1.1 Extensions du modèle Deliverer existant

```prisma
// Dans prisma/schemas/deliverer/deliverer-profile.prisma

model DelivererProfile {
  id                    String    @id @default(cuid())
  delivererId           String    @unique
  // Véhicule détaillé
  vehicleBrand          String?
  vehicleModel          String?
  vehicleYear           Int?
  vehicleColor          String?
  vehicleCapacityKg     Float?
  vehicleCapacityM3     Float?
  
  // Zone de service
  serviceRadius         Int       @default(10)  // km
  preferredCities       String[]
  blacklistedCities     String[]
  
  // Préférences métier
  acceptsAnimals        Boolean   @default(false)
  acceptsFragile        Boolean   @default(true)
  acceptsFood           Boolean   @default(true)
  acceptsLargePackages  Boolean   @default(true)
  
  // Horaires de travail
  workingDays           String[]  // ["monday", "tuesday", ...]
  workingHoursStart     String?   // "08:00"
  workingHoursEnd       String?   // "18:00"
  
  // Statut et performance
  totalDeliveries       Int       @default(0)
  successRate           Float     @default(100.0)
  averageRating         Float?
  totalDistance         Float     @default(0)
  
  // Relation
  deliverer             Deliverer @relation(fields: [delivererId], references: [id])
  
  @@map("deliverer_profiles")
}

model PlannedRoute {
  id              String    @id @default(cuid())
  delivererId     String
  name            String
  description     String?
  
  // Itinéraire
  startLatitude   Float
  startLongitude  Float
  endLatitude     Float
  endLongitude    Float
  waypoints       Json      // [{lat, lng, name}, ...]
  
  // Planning
  departureTime   DateTime
  arrivalTime     DateTime
  isRecurring     Boolean   @default(false)
  recurringDays   String[]  // ["monday", "friday"]
  
  // Capacité disponible
  availableWeight Float
  availableVolume Float
  
  // Statut
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  deliverer       User      @relation(fields: [delivererId], references: [id])
  matchedAnnouncements RouteAnnouncementMatch[]
  
  @@map("planned_routes")
}

model RouteAnnouncementMatch {
  id              String        @id @default(cuid())
  routeId         String
  announcementId  String
  isAccepted      Boolean       @default(false)
  matchScore      Float         // 0-100
  estimatedProfit Float
  
  route           PlannedRoute  @relation(fields: [routeId], references: [id])
  announcement    Announcement  @relation(fields: [announcementId], references: [id])
  
  @@unique([routeId, announcementId])
  @@map("route_announcement_matches")
}

model DelivererAvailability {
  id          String    @id @default(cuid())
  delivererId String
  date        DateTime
  startTime   String    // "09:00"
  endTime     String    // "17:00"
  isAvailable Boolean   @default(true)
  notes       String?
  
  deliverer   User      @relation(fields: [delivererId], references: [id])
  
  @@index([delivererId, date])
  @@map("deliverer_availability")
}

model NFCCard {
  id          String    @id @default(cuid())
  delivererId String    @unique
  cardNumber  String    @unique
  isActive    Boolean   @default(false)
  activatedAt DateTime?
  lastUsedAt  DateTime?
  qrBackup    String?   // QR code de secours
  
  deliverer   User      @relation(fields: [delivererId], references: [id])
  
  @@map("nfc_cards")
}
```

### 1.2 Extensions pour les candidatures avancées

```prisma
// Extension du modèle DeliveryApplication existant
model DeliveryProposal {
  id               String            @id @default(cuid())
  applicationId    String            @unique
  proposedPrice    Float
  message          String?
  estimatedDuration Int              // minutes
  canPickupEarly   Boolean          @default(false)
  canDeliverLate   Boolean          @default(false)
  equipment        String[]         // ["refrigerated", "fragile_handling"]
  
  // Négociation
  counterOfferPrice Float?
  isNegotiating    Boolean          @default(false)
  finalPrice       Float?
  
  application      DeliveryApplication @relation(fields: [applicationId], references: [id])
  
  @@map("delivery_proposals")
}
```

## ÉTAPE 2 : SERVICES BACKEND COMPLETS

### 2.1 Service d'onboarding livreur

```typescript
// src/server/services/deliverer/deliverer-onboarding.service.ts

import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { DocumentType, VerificationStatus } from '@prisma/client';

export const delivererOnboardingService = {
  /**
   * Complète l'inscription d'un livreur avec toutes les informations
   */
  async completeDelivererRegistration(userId: string, data: {
    // Informations personnelles étendues
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
    
    // Véhicule
    vehicleType: string;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: number;
    licensePlate: string;
    vehicleCapacityKg: number;
    vehicleCapacityM3: number;
    
    // Zone de service
    serviceRadius: number;
    preferredCities: string[];
    
    // Préférences
    acceptsAnimals: boolean;
    acceptsFragile: boolean;
    acceptsFood: boolean;
    
    // Horaires
    workingDays: string[];
    workingHoursStart: string;
    workingHoursEnd: string;
    
    // Bancaire
    bankName: string;
    iban: string;
    bic: string;
  }) {
    return await db.$transaction(async (tx) => {
      // Mettre à jour le profil deliverer existant
      const deliverer = await tx.deliverer.update({
        where: { userId },
        data: {
          phone: data.phone,
          address: data.address,
          vehicleType: data.vehicleType,
          licensePlate: data.licensePlate,
          maxCapacity: data.vehicleCapacityKg,
          bankInfo: {
            bankName: data.bankName,
            iban: data.iban,
            bic: data.bic
          }
        }
      });
      
      // Créer le profil étendu
      const profile = await tx.delivererProfile.create({
        data: {
          delivererId: deliverer.id,
          vehicleBrand: data.vehicleBrand,
          vehicleModel: data.vehicleModel,
          vehicleYear: data.vehicleYear,
          vehicleCapacityKg: data.vehicleCapacityKg,
          vehicleCapacityM3: data.vehicleCapacityM3,
          serviceRadius: data.serviceRadius,
          preferredCities: data.preferredCities,
          acceptsAnimals: data.acceptsAnimals,
          acceptsFragile: data.acceptsFragile,
          acceptsFood: data.acceptsFood,
          workingDays: data.workingDays,
          workingHoursStart: data.workingHoursStart,
          workingHoursEnd: data.workingHoursEnd
        }
      });
      
      // Créer le portefeuille
      await tx.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'EUR',
          accountHolder: `${data.bankName} - ${data.iban.slice(-4)}`,
          iban: data.iban
        }
      });
      
      return { deliverer, profile };
    });
  },

  /**
   * Upload et validation des documents obligatoires
   */
  async uploadRequiredDocument(userId: string, documentType: DocumentType, fileData: {
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
  }) {
    // Vérifier que le type de document est obligatoire pour les livreurs
    const requiredDocs = [
      DocumentType.ID_CARD,
      DocumentType.DRIVING_LICENSE,
      DocumentType.VEHICLE_REGISTRATION,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS
    ];
    
    if (!requiredDocs.includes(documentType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Type de document non requis pour les livreurs'
      });
    }
    
    // Vérifier si un document de ce type existe déjà
    const existingDoc = await db.document.findFirst({
      where: {
        userId,
        type: documentType,
        isDeleted: false
      }
    });
    
    if (existingDoc) {
      // Marquer l'ancien comme supprimé et créer le nouveau
      await db.document.update({
        where: { id: existingDoc.id },
        data: { isDeleted: true }
      });
    }
    
    // Créer le nouveau document
    const document = await db.document.create({
      data: {
        userId,
        type: documentType,
        fileName: fileData.fileName,
        fileUrl: fileData.fileUrl,
        mimeType: fileData.mimeType,
        fileSize: fileData.fileSize,
        status: 'PENDING',
        uploadedAt: new Date()
      }
    });
    
    // Vérifier si tous les documents requis sont uploadés
    await this.checkDocumentCompleteness(userId);
    
    return document;
  },

  /**
   * Vérifie si tous les documents requis sont présents
   */
  async checkDocumentCompleteness(userId: string) {
    const requiredDocs = [
      DocumentType.ID_CARD,
      DocumentType.DRIVING_LICENSE,
      DocumentType.VEHICLE_REGISTRATION,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS
    ];
    
    const uploadedDocs = await db.document.groupBy({
      by: ['type'],
      where: {
        userId,
        isDeleted: false,
        type: { in: requiredDocs }
      }
    });
    
    const isComplete = uploadedDocs.length === requiredDocs.length;
    
    if (isComplete) {
      // Marquer l'utilisateur comme ayant terminé l'onboarding
      await db.user.update({
        where: { id: userId },
        data: {
          hasCompletedOnboarding: true,
          onboardingCompletionDate: new Date()
        }
      });
      
      // Créer une demande de vérification
      await db.verification.create({
        data: {
          userId,
          type: 'IDENTITY_VERIFICATION',
          status: VerificationStatus.PENDING,
          requestedAt: new Date()
        }
      });
    }
    
    return { isComplete, uploadedDocs: uploadedDocs.length, requiredDocs: requiredDocs.length };
  },

  /**
   * Obtient le statut de validation complet
   */
  async getValidationStatus(userId: string) {
    const documents = await db.document.findMany({
      where: { userId, isDeleted: false },
      select: { type: true, status: true, updatedAt: true }
    });
    
    const verification = await db.verification.findFirst({
      where: { userId, type: 'IDENTITY_VERIFICATION' },
      orderBy: { requestedAt: 'desc' }
    });
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        hasCompletedOnboarding: true, 
        isVerified: true,
        status: true 
      }
    });
    
    return {
      documents,
      verification,
      user,
      canStartWorking: user?.isVerified && user?.hasCompletedOnboarding
    };
  }
};
```

### 2.2 Service de matching et candidatures

```typescript
// src/server/services/deliverer/deliverer-matching.service.ts

import { db } from '@/server/db';
import { calculateDistance, calculateDeliveryPrice } from '@/lib/utils/geo';

export const delivererMatchingService = {
  /**
   * Trouve les annonces compatibles avec un livreur
   */
  async findMatchingAnnouncements(delivererId: string, filters: {
    maxDistance?: number;
    minPrice?: number;
    maxPrice?: number;
    startDate?: Date;
    endDate?: Date;
    packageTypes?: string[];
    cities?: string[];
  } = {}) {
    const deliverer = await db.deliverer.findUnique({
      where: { id: delivererId },
      include: { profile: true }
    });
    
    if (!deliverer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil livreur non trouvé'
      });
    }
    
    // Construire les filtres
    const where: any = {
      status: 'PUBLISHED',
      delivererId: null, // Pas encore assignée
    };
    
    // Filtre par dates
    if (filters.startDate || filters.endDate) {
      where.OR = [
        {
          pickupDate: filters.startDate ? { gte: filters.startDate } : undefined,
          deliveryDate: filters.endDate ? { lte: filters.endDate } : undefined
        }
      ];
    }
    
    // Filtre par prix
    if (filters.minPrice || filters.maxPrice) {
      where.suggestedPrice = {
        gte: filters.minPrice,
        lte: filters.maxPrice
      };
    }
    
    // Filtre par villes préférées
    if (filters.cities?.length) {
      where.OR = [
        { pickupCity: { in: filters.cities } },
        { deliveryCity: { in: filters.cities } }
      ];
    }
    
    const announcements = await db.announcement.findMany({
      where,
      include: {
        client: {
          select: { name: true, image: true }
        },
        applications: {
          where: { delivererId },
          select: { id: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculer la distance et la compatibilité pour chaque annonce
    const enrichedAnnouncements = announcements.map(announcement => {
      const distance = deliverer.currentLocation 
        ? calculateDistance(
            deliverer.currentLocation,
            `${announcement.pickupLatitude},${announcement.pickupLongitude}`
          )
        : null;
      
      const isInRange = distance ? distance <= (filters.maxDistance || deliverer.profile?.serviceRadius || 50) : true;
      const hasApplied = announcement.applications.length > 0;
      
      return {
        ...announcement,
        distance,
        isInRange,
        hasApplied,
        estimatedProfit: this.calculateEstimatedProfit(announcement, distance)
      };
    });
    
    // Filtrer par distance si spécifiée
    return enrichedAnnouncements.filter(a => 
      !filters.maxDistance || a.isInRange
    );
  },

  /**
   * Soumet une candidature avec proposition
   */
  async submitApplication(delivererId: string, announcementId: string, proposal: {
    proposedPrice: number;
    message?: string;
    estimatedDuration: number;
    canPickupEarly: boolean;
    canDeliverLate: boolean;
    equipment: string[];
  }) {
    // Vérifier que l'annonce existe et est disponible
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { applications: true }
    });
    
    if (!announcement || announcement.status !== 'PUBLISHED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Annonce non disponible'
      });
    }
    
    // Vérifier qu'il n'y a pas déjà de candidature
    const existingApplication = announcement.applications.find(
      app => app.delivererId === delivererId
    );
    
    if (existingApplication) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Candidature déjà soumise'
      });
    }
    
    return await db.$transaction(async (tx) => {
      // Créer la candidature
      const application = await tx.deliveryApplication.create({
        data: {
          delivererId,
          announcementId,
          message: proposal.message,
          proposedPrice: proposal.proposedPrice,
          status: 'PENDING'
        }
      });
      
      // Créer la proposition détaillée
      const detailedProposal = await tx.deliveryProposal.create({
        data: {
          applicationId: application.id,
          proposedPrice: proposal.proposedPrice,
          message: proposal.message,
          estimatedDuration: proposal.estimatedDuration,
          canPickupEarly: proposal.canPickupEarly,
          canDeliverLate: proposal.canDeliverLate,
          equipment: proposal.equipment
        }
      });
      
      // Mettre à jour le statut de l'annonce
      await tx.announcement.update({
        where: { id: announcementId },
        data: { status: 'IN_APPLICATION' }
      });
      
      return { application, proposal: detailedProposal };
    });
  },

  /**
   * Calcule le profit estimé d'une livraison
   */
  calculateEstimatedProfit(announcement: any, distance: number | null): number {
    const basePrice = announcement.suggestedPrice || 0;
    const distanceCost = distance ? distance * 0.3 : 5; // 0.30€/km
    const timeCost = 2 * 15; // 2h estimées à 15€/h
    const platformFee = basePrice * 0.15; // 15% commission
    
    return Math.max(0, basePrice - distanceCost - timeCost - platformFee);
  }
};
```

## ÉTAPE 3 : COMPOSANTS UI AVANCÉS

### 3.1 Composant de candidature aux annonces

```typescript
// src/components/deliverer/announcements/application-form.tsx

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';
import { Euro, Clock, Package, Truck } from 'lucide-react';

const applicationSchema = z.object({
  proposedPrice: z.number().min(5, 'Prix minimum 5€'),
  message: z.string().optional(),
  estimatedDuration: z.number().min(30, 'Durée minimum 30 minutes'),
  canPickupEarly: z.boolean().default(false),
  canDeliverLate: z.boolean().default(false),
  equipment: z.array(z.string()).default([])
});

type ApplicationForm = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  announcementId: string;
  announcement: {
    title: string;
    suggestedPrice?: number;
    pickupAddress: string;
    deliveryAddress: string;
    distance?: number;
    estimatedProfit?: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ApplicationForm({ 
  announcementId, 
  announcement, 
  onSuccess, 
  onCancel 
}: ApplicationFormProps) {
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  
  const { mutate: submitApplication, isLoading } = api.deliverer.applications.submit.useMutation({
    onSuccess: () => {
      toast({
        title: 'Candidature envoyée',
        description: 'Votre candidature a été transmise au client.'
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
  
  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      proposedPrice: announcement.suggestedPrice || 0,
      estimatedDuration: 120,
      canPickupEarly: false,
      canDeliverLate: false,
      equipment: []
    }
  });
  
  const equipmentOptions = [
    { id: 'refrigerated', label: 'Véhicule réfrigéré', icon: '❄️' },
    { id: 'fragile_handling', label: 'Manipulation fragile', icon: '📦' },
    { id: 'large_capacity', label: 'Grande capacité', icon: '🚛' },
    { id: 'express_delivery', label: 'Livraison express', icon: '⚡' },
    { id: 'secure_transport', label: 'Transport sécurisé', icon: '🔒' }
  ];
  
  const onSubmit = (data: ApplicationForm) => {
    submitApplication({
      announcementId,
      proposal: {
        ...data,
        equipment: selectedEquipment
      }
    });
  };
  
  const toggleEquipment = (equipmentId: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Candidater pour cette livraison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Résumé de l'annonce */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium">{announcement.title}</h4>
            <div className="text-sm text-gray-600">
              <p>📍 {announcement.pickupAddress}</p>
              <p>🎯 {announcement.deliveryAddress}</p>
              {announcement.distance && (
                <p>📏 Distance: {announcement.distance.toFixed(1)} km</p>
              )}
            </div>
          </div>
          
          {/* Prix proposé */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prix proposé</label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                step="0.50"
                min="5"
                placeholder="0.00"
                className="pl-10"
                {...form.register('proposedPrice', { valueAsNumber: true })}
              />
            </div>
            {announcement.estimatedProfit !== undefined && (
              <p className="text-sm text-gray-600">
                Profit estimé: {Math.max(0, announcement.estimatedProfit).toFixed(2)}€
              </p>
            )}
          </div>
          
          {/* Durée estimée */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Durée estimée (minutes)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                min="30"
                step="15"
                placeholder="120"
                className="pl-10"
                {...form.register('estimatedDuration', { valueAsNumber: true })}
              />
            </div>
          </div>
          
          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message au client (optionnel)</label>
            <Textarea
              placeholder="Présentez-vous et vos atouts pour cette livraison..."
              rows={3}
              {...form.register('message')}
            />
          </div>
          
          {/* Flexibilité */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Flexibilité</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canPickupEarly"
                  {...form.register('canPickupEarly')}
                />
                <label htmlFor="canPickupEarly" className="text-sm">
                  Je peux récupérer plus tôt que prévu
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDeliverLate"
                  {...form.register('canDeliverLate')}
                />
                <label htmlFor="canDeliverLate" className="text-sm">
                  Je peux livrer plus tard si nécessaire
                </label>
              </div>
            </div>
          </div>
          
          {/* Équipements spécialisés */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Équipements spécialisés</label>
            <div className="grid grid-cols-2 gap-2">
              {equipmentOptions.map(equipment => (
                <div
                  key={equipment.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEquipment.includes(equipment.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleEquipment(equipment.id)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{equipment.icon}</span>
                    <span className="text-sm">{equipment.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Envoi...' : 'Envoyer la candidature'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

## ÉTAPE 4 : PAGES COMPLÈTES

Cette première partie du guide couvre les bases. Le guide complet sera fourni en plusieurs parties pour éviter les limitations de tokens.

## ÉTAPES SUIVANTES

1. **Partie 2** : Workflow d'exécution des livraisons
2. **Partie 3** : Système de trajets planifiés
3. **Partie 4** : Carte NFC et validation
4. **Partie 5** : Statistiques et performance
5. **Partie 6** : Intégrations et temps réel

Souhaitez-vous que je continue avec une partie spécifique ?