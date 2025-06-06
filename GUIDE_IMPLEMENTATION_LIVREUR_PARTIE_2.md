# Guide d'Implémentation Livreur EcoDeli - Partie 2
## WORKFLOW COMPLET D'EXÉCUTION DES LIVRAISONS

Cette partie couvre l'implémentation du workflow complet d'exécution des livraisons, depuis l'acceptation d'une candidature jusqu'à la finalisation avec paiement.

## ÉTAPE 5 : SERVICE D'EXÉCUTION DES LIVRAISONS

### 5.1 Service principal d'exécution

```typescript
// src/server/services/deliverer/delivery-execution.service.ts

import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { DeliveryStatus, TransactionType } from '@prisma/client';
import { walletService } from '../wallet.service';
import { notificationService } from '../notification.service';

export const deliveryExecutionService = {
  /**
   * Démarre une livraison (passage au statut "en cours")
   */
  async startDelivery(deliveryId: string, delivererId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: {
          include: { client: true }
        },
        deliverer: true
      }
    });
    
    if (!delivery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée'
      });
    }
    
    if (delivery.delivererId !== delivererId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Non autorisé pour cette livraison'
      });
    }
    
    if (delivery.status !== 'ACCEPTED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'La livraison ne peut pas être démarrée dans cet état'
      });
    }
    
    return await db.$transaction(async (tx) => {
      // Mettre à jour le statut
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'IN_TRANSIT',
          startTime: new Date()
        }
      });
      
      // Créer un log
      await tx.deliveryLog.create({
        data: {
          deliveryId,
          status: 'IN_TRANSIT',
          message: 'Livraison démarrée par le livreur',
          location: delivery.announcement.pickupAddress
        }
      });
      
      // Générer le code de validation unique
      const validationCode = this.generateValidationCode();
      await tx.deliveryValidationCode.create({
        data: {
          deliveryId,
          code: validationCode,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        }
      });
      
      // Notifier le client
      await notificationService.createNotification({
        userId: delivery.announcement.clientId,
        title: 'Livraison en cours',
        message: `Votre livreur ${delivery.deliverer.name} a démarré la livraison.`,
        type: 'DELIVERY_UPDATE',
        data: { deliveryId, status: 'IN_TRANSIT' }
      });
      
      return { ...updatedDelivery, validationCode };
    });
  },

  /**
   * Met à jour la position GPS du livreur
   */
  async updateDeliveryLocation(deliveryId: string, location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
  }) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      select: { status: true }
    });
    
    if (!delivery || !['IN_TRANSIT', 'NEARBY'].includes(delivery.status)) {
      return; // Ignorer silencieusement si pas en cours
    }
    
    // Enregistrer les coordonnées
    await db.deliveryCoordinates.create({
      data: {
        deliveryId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        timestamp: new Date()
      }
    });
    
    // Vérifier si proche de la destination (dans un rayon de 200m)
    const isNearby = await this.checkIfNearDestination(deliveryId, location);
    
    if (isNearby && delivery.status === 'IN_TRANSIT') {
      await db.delivery.update({
        where: { id: deliveryId },
        data: { status: 'NEARBY' }
      });
      
      await db.deliveryLog.create({
        data: {
          deliveryId,
          status: 'NEARBY',
          message: 'Livreur à proximité de la destination',
          location: `${location.latitude},${location.longitude}`
        }
      });
    }
    
    return { updated: true, isNearby };
  },

  /**
   * Signale un problème pendant la livraison
   */
  async reportDeliveryIssue(deliveryId: string, issue: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    location?: string;
    photos?: string[];
  }) {
    return await db.$transaction(async (tx) => {
      // Créer le signalement
      const issueReport = await tx.deliveryIssue.create({
        data: {
          deliveryId,
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          location: issue.location,
          status: 'OPEN',
          photos: issue.photos || []
        }
      });
      
      // Créer un log
      await tx.deliveryLog.create({
        data: {
          deliveryId,
          status: 'PROBLEM',
          message: `Problème signalé: ${issue.description}`,
          location: issue.location
        }
      });
      
      // Mettre à jour le statut si critique
      if (issue.severity === 'CRITICAL') {
        await tx.delivery.update({
          where: { id: deliveryId },
          data: { status: 'PROBLEM' }
        });
      }
      
      // Notifier l'équipe support si nécessaire
      if (['HIGH', 'CRITICAL'].includes(issue.severity)) {
        await notificationService.notifySupport({
          type: 'DELIVERY_ISSUE',
          severity: issue.severity,
          deliveryId,
          description: issue.description
        });
      }
      
      return issueReport;
    });
  },

  /**
   * Valide la livraison avec le code de validation
   */
  async validateDeliveryWithCode(deliveryId: string, code: string, proof: {
    photos?: string[];
    signature?: string;
    notes?: string;
    recipientName?: string;
  }) {
    // Vérifier le code
    const validationCode = await db.deliveryValidationCode.findFirst({
      where: {
        deliveryId,
        code,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!validationCode) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Code de validation invalide ou expiré'
      });
    }
    
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: true,
        deliverer: { include: { user: true } }
      }
    });
    
    if (!delivery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée'
      });
    }
    
    return await db.$transaction(async (tx) => {
      // Marquer le code comme utilisé
      await tx.deliveryValidationCode.update({
        where: { id: validationCode.id },
        data: { isUsed: true, usedAt: new Date() }
      });
      
      // Créer les preuves de livraison
      if (proof.photos?.length) {
        for (const photoUrl of proof.photos) {
          await tx.deliveryProof.create({
            data: {
              deliveryId,
              type: 'photo',
              fileUrl: photoUrl,
              notes: proof.notes
            }
          });
        }
      }
      
      if (proof.signature) {
        await tx.deliveryProof.create({
          data: {
            deliveryId,
            type: 'signature',
            fileUrl: proof.signature,
            notes: `Signé par: ${proof.recipientName || 'Destinataire'}`
          }
        });
      }
      
      // Mettre à jour le statut de livraison
      const completedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          completionTime: new Date(),
          actualDeliveryTime: new Date()
        }
      });
      
      // Créer un log final
      await tx.deliveryLog.create({
        data: {
          deliveryId,
          status: 'DELIVERED',
          message: `Livraison terminée avec succès. Code: ${code}`,
          location: delivery.announcement.deliveryAddress
        }
      });
      
      // Mettre à jour l'annonce
      await tx.announcement.update({
        where: { id: delivery.announcementId },
        data: { status: 'DELIVERED' }
      });
      
      // Déclencher le paiement automatique
      await this.processDeliveryPayment(tx, delivery);
      
      return completedDelivery;
    });
  },

  /**
   * Traite le paiement automatique après livraison
   */
  async processDeliveryPayment(tx: any, delivery: any) {
    const delivererWallet = await walletService.getOrCreateWallet(delivery.deliverer.userId);
    
    // Calculer les montants
    const totalPrice = delivery.price;
    const platformCommission = totalPrice * 0.15; // 15% commission
    const delivererEarnings = totalPrice - platformCommission;
    
    // Créer la transaction pour le livreur
    await walletService.createWalletTransaction(delivererWallet.id, {
      amount: delivererEarnings,
      type: 'EARNING',
      description: `Paiement livraison #${delivery.trackingCode}`,
      reference: `DELIVERY_${delivery.id}`,
      deliveryId: delivery.id,
      metadata: {
        totalPrice,
        commission: platformCommission,
        commissionRate: 0.15
      }
    });
    
    // Notifier le livreur
    await notificationService.createNotification({
      userId: delivery.deliverer.userId,
      title: 'Paiement reçu',
      message: `Vous avez reçu ${delivererEarnings.toFixed(2)}€ pour votre livraison.`,
      type: 'PAYMENT_RECEIVED',
      data: { deliveryId: delivery.id, amount: delivererEarnings }
    });
  },

  /**
   * Génère un code de validation unique à 6 chiffres
   */
  generateValidationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Vérifie si le livreur est proche de la destination
   */
  async checkIfNearDestination(deliveryId: string, currentLocation: {
    latitude: number;
    longitude: number;
  }): Promise<boolean> {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: { announcement: true }
    });
    
    if (!delivery?.announcement.deliveryLatitude || !delivery?.announcement.deliveryLongitude) {
      return false;
    }
    
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      delivery.announcement.deliveryLatitude,
      delivery.announcement.deliveryLongitude
    );
    
    return distance <= 0.2; // 200 mètres
  },

  /**
   * Calcule la distance entre deux points en km
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
};
```

### 5.2 Modèles supplémentaires pour l'exécution

```prisma
// Ajouter au schema Prisma

model DeliveryValidationCode {
  id         String    @id @default(cuid())
  deliveryId String
  code       String
  isUsed     Boolean   @default(false)
  usedAt     DateTime?
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  
  delivery   Delivery  @relation(fields: [deliveryId], references: [id])
  
  @@index([deliveryId])
  @@index([code])
  @@map("delivery_validation_codes")
}

model DeliveryIssue {
  id          String       @id @default(cuid())
  deliveryId  String
  type        String       // 'ACCESS_PROBLEM', 'CUSTOMER_ABSENT', etc.
  severity    IssueSeverity
  description String
  location    String?
  photos      String[]     @default([])
  status      IssueStatus  @default(OPEN)
  resolvedAt  DateTime?
  createdAt   DateTime     @default(now())
  
  delivery    Delivery     @relation(fields: [deliveryId], references: [id])
  
  @@index([deliveryId])
  @@index([status])
  @@map("delivery_issues")
}
```

## ÉTAPE 6 : COMPOSANTS D'EXÉCUTION

### 6.1 Composant de suivi GPS temps réel

```typescript
// src/components/deliverer/deliveries/delivery-tracking.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Phone, 
  Camera, 
  AlertTriangle,
  CheckCircle2 
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

interface DeliveryTrackingProps {
  deliveryId: string;
  onComplete: () => void;
}

export default function DeliveryTracking({ deliveryId, onComplete }: DeliveryTrackingProps) {
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  
  const { data: delivery, refetch } = api.deliverer.deliveries.getById.useQuery(
    { id: deliveryId },
    { refetchInterval: 30000 } // Rafraîchir toutes les 30s
  );
  
  const { mutate: updateLocation } = api.deliverer.deliveries.updateLocation.useMutation();
  
  const { mutate: startDelivery } = api.deliverer.deliveries.start.useMutation({
    onSuccess: () => {
      toast({
        title: 'Livraison démarrée',
        description: 'Le suivi GPS est maintenant actif.'
      });
      refetch();
    }
  });
  
  // Démarrer le suivi GPS
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'GPS non disponible',
        description: 'Votre appareil ne supporte pas la géolocalisation.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsTracking(true);
    
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        setCurrentLocation(coords);
        
        // Envoyer la position au serveur
        updateLocation({
          deliveryId,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            speed: coords.speed || undefined
          }
        });
      },
      (error) => {
        console.error('Erreur GPS:', error);
        toast({
          title: 'Erreur GPS',
          description: 'Impossible d\'obtenir votre position.',
          variant: 'destructive'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };
  
  // Arrêter le suivi GPS
  const stopTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };
  
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);
  
  if (!delivery) {
    return <div>Chargement...</div>;
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'IN_TRANSIT': return 'bg-amber-100 text-amber-800';
      case 'NEARBY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getProgressValue = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 25;
      case 'IN_TRANSIT': return 50;
      case 'NEARBY': return 75;
      case 'DELIVERED': return 100;
      default: return 0;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Statut de la livraison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Livraison #{delivery.trackingCode}
            </CardTitle>
            <Badge className={getStatusColor(delivery.status)}>
              {delivery.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={getProgressValue(delivery.status)} className="w-full" />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Récupération</p>
                <p className="text-gray-600">{delivery.announcement.pickupAddress}</p>
              </div>
              <div>
                <p className="font-medium">Livraison</p>
                <p className="text-gray-600">{delivery.announcement.deliveryAddress}</p>
              </div>
            </div>
            
            {currentLocation && (
              <div className="text-sm text-gray-600">
                <p>📍 Position actuelle: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</p>
                <p>🎯 Précision: {currentLocation.accuracy?.toFixed(0)}m</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Actions selon le statut */}
      <Card>
        <CardContent className="pt-6">
          {delivery.status === 'ACCEPTED' && (
            <div className="space-y-3">
              <Button 
                onClick={() => startDelivery({ deliveryId })}
                className="w-full"
                size="lg"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Démarrer la livraison
              </Button>
            </div>
          )}
          
          {delivery.status === 'IN_TRANSIT' && (
            <div className="space-y-3">
              {!isTracking ? (
                <Button onClick={startTracking} className="w-full" size="lg">
                  <MapPin className="h-4 w-4 mr-2" />
                  Activer le suivi GPS
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="outline" className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  Arrêter le suivi GPS
                </Button>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Appeler client
                </Button>
                <Button variant="outline" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Signaler problème
                </Button>
              </div>
            </div>
          )}
          
          {delivery.status === 'NEARBY' && (
            <div className="space-y-3">
              <div className="text-center text-green-600 font-medium">
                🎯 Vous êtes arrivé à destination !
              </div>
              <Button className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Finaliser la livraison
              </Button>
            </div>
          )}
          
          {delivery.status === 'DELIVERED' && (
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-green-600">Livraison terminée avec succès !</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Informations de contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>{delivery.announcement.client.name}</span>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Appeler
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>📞 Téléphone masqué pour la sécurité</p>
              <p>💬 Utilisez le chat intégré pour communiquer</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.2 Composant de validation par code

```typescript
// src/components/deliverer/deliveries/code-validation.tsx

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, FileSignature, User, CheckCircle2 } from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

const validationSchema = z.object({
  code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
  recipientName: z.string().min(2, 'Nom du destinataire requis'),
  notes: z.string().optional()
});

type ValidationForm = z.infer<typeof validationSchema>;

interface CodeValidationProps {
  deliveryId: string;
  onSuccess: () => void;
}

export default function CodeValidation({ deliveryId, onSuccess }: CodeValidationProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { mutate: validateDelivery, isLoading } = api.deliverer.deliveries.validate.useMutation({
    onSuccess: () => {
      toast({
        title: 'Livraison validée',
        description: 'La livraison a été finalisée avec succès.'
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Erreur de validation',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const form = useForm<ValidationForm>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      code: '',
      recipientName: '',
      notes: ''
    }
  });
  
  const onSubmit = (data: ValidationForm) => {
    validateDelivery({
      deliveryId,
      code: data.code,
      proof: {
        photos,
        signature,
        notes: data.notes,
        recipientName: data.recipientName
      }
    });
  };
  
  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      // Ici vous implémenterez l'upload vers votre service de stockage
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/delivery-proof', {
        method: 'POST',
        body: formData
      });
      
      const { url } = await response.json();
      setPhotos(prev => [...prev, url]);
      
      toast({
        title: 'Photo ajoutée',
        description: 'La photo de preuve a été ajoutée.'
      });
    } catch (error) {
      toast({
        title: 'Erreur d\'upload',
        description: 'Impossible d\'uploader la photo.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Finaliser la livraison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Code de validation */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Code de validation</label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest"
              {...form.register('code')}
            />
            <p className="text-xs text-gray-600">
              Demandez le code à 6 chiffres au destinataire
            </p>
          </div>
          
          {/* Nom du destinataire */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom du destinataire</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nom complet"
                className="pl-10"
                {...form.register('recipientName')}
              />
            </div>
          </div>
          
          {/* Photos de preuve */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Photos de preuve</label>
            
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={photo} 
                      alt={`Preuve ${index + 1}`} 
                      className="w-full h-20 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
                id="photo-capture"
                disabled={isUploading}
              />
              <label
                htmlFor="photo-capture"
                className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">
                    {isUploading ? 'Upload en cours...' : 'Prendre une photo'}
                  </span>
                </div>
              </label>
            </div>
          </div>
          
          {/* Signature (optionnel) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Signature (optionnel)</label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                // Ici vous ouvrirez un modal de signature
                // Pour l'instant, simulation
                setSignature('signature_placeholder.png');
              }}
            >
              <FileSignature className="h-4 w-4 mr-2" />
              {signature ? 'Signature ajoutée' : 'Ajouter une signature'}
            </Button>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optionnel)</label>
            <Textarea
              placeholder="Commentaires sur la livraison..."
              rows={3}
              {...form.register('notes')}
            />
          </div>
          
          {/* Actions */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isLoading || isUploading}
          >
            {isLoading ? 'Validation...' : 'Finaliser la livraison'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## ÉTAPE 7 : PAGES D'EXÉCUTION

### 7.1 Page de livraison active

```typescript
// src/app/[locale]/(protected)/deliverer/deliveries/[id]/page.tsx

import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';
import { db } from '@/server/db';
import DeliveryExecutionInterface from '@/components/deliverer/deliveries/delivery-execution-interface';

type Props = {
  params: { locale: string; id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Exécution de livraison | EcoDeli',
    description: 'Gérez votre livraison en cours sur EcoDeli',
  };
}

export default async function DeliveryExecutionPage({ params }: Props) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'DELIVERER') {
    redirect(`/${resolvedParams.locale}/login`);
  }

  // Vérifier que la livraison appartient au livreur
  const delivery = await db.delivery.findUnique({
    where: { id: resolvedParams.id },
    include: {
      announcement: {
        include: { client: true }
      },
      deliverer: { include: { user: true } }
    }
  });

  if (!delivery || delivery.deliverer.userId !== session.user.id) {
    redirect(`/${resolvedParams.locale}/deliverer/deliveries`);
  }

  return (
    <div className="container mx-auto py-8">
      <DeliveryExecutionInterface 
        deliveryId={resolvedParams.id}
        locale={resolvedParams.locale}
      />
    </div>
  );
}
```

Cette partie couvre le workflow complet d'exécution des livraisons. La suite du guide couvrira les trajets planifiés, la carte NFC, et les statistiques.

Souhaitez-vous que je continue avec la **Partie 3 : Système de trajets planifiés** ?