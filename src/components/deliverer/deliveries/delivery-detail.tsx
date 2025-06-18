"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  MapPin,
  Clock,
  Euro,
  Truck,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Camera,
  FileText,
  QrCode,
  RefreshCw,
  ArrowLeft,
  Star,
  MessageSquare
} from 'lucide-react';
import { api } from '@/trpc/react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils/common';
import { useToast } from "@/components/ui/use-toast";

interface DeliveryDetailProps {
  deliveryId: string;
  className?: string;
}

export function DeliveryDetail({ deliveryId, className }: DeliveryDetailProps) {
  const t = useTranslations('deliverer.deliveries');
  const router = useRouter();
  const { toast } = useToast();
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isContactClientOpen, setIsContactClientOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Récupérer les détails de la livraison
  const { 
    data: delivery, 
    isLoading, 
    error,
    refetch 
  } = api.delivery.deliverer.getDeliveryDetail.useQuery({
    deliveryId
  });

  // Mutations pour les actions
  const updateStatusMutation = api.delivery.deliverer.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('status.updated'),
        description: t('status.updatedDescription'),
      });
      refetch();
      setIsStatusUpdateOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('error.title'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const confirmPickupMutation = api.delivery.deliverer.confirmPickup.useMutation({
    onSuccess: () => {
      toast({
        title: t('pickup.confirmed'),
        description: t('pickup.confirmedDescription'),
      });
      refetch();
    },
  });

  const confirmDeliveryMutation = api.delivery.deliverer.confirmDelivery.useMutation({
    onSuccess: () => {
      toast({
        title: t('delivery.confirmed'),
        description: t('delivery.confirmedDescription'),
      });
      refetch();
    },
  });

  // Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Géolocalisation non disponible:', error);
        }
      );
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-purple-100 text-purple-800';
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return {
          label: t('actions.confirmPickup'),
          action: () => confirmPickupMutation.mutate({ 
            deliveryId, 
            location: currentLocation,
            notes 
          }),
          icon: CheckCircle,
          variant: 'default' as const
        };
      case 'PICKED_UP':
        return {
          label: t('actions.startDelivery'),
          action: () => updateStatusMutation.mutate({ 
            deliveryId, 
            status: 'IN_TRANSIT',
            location: currentLocation 
          }),
          icon: Truck,
          variant: 'default' as const
        };
      case 'IN_TRANSIT':
        return {
          label: t('actions.confirmDelivery'),
          action: () => setIsStatusUpdateOpen(true),
          icon: CheckCircle,
          variant: 'default' as const
        };
      default:
        return null;
    }
  };

  const handleConfirmDelivery = () => {
    confirmDeliveryMutation.mutate({
      deliveryId,
      deliveryCode,
      location: currentLocation,
      notes
    });
  };

  const openNavigation = (address: string) => {
    const url = `https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 font-medium">{t('error.notFound')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('error.notFoundDescription')}</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextAction = getNextAction(delivery.status);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header avec navigation retour */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {delivery.announcement?.title || t('delivery.untitled')}
          </h1>
          <p className="text-muted-foreground">#{delivery.trackingNumber}</p>
        </div>
      </div>

      {/* Statut et action principale */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(delivery.status)}>
                {delivery.status}
              </Badge>
              <span className="text-2xl font-bold text-green-600">
                {delivery.price}€
              </span>
            </div>
            {nextAction && (
              <Button
                onClick={nextAction.action}
                variant={nextAction.variant}
                disabled={updateStatusMutation.isLoading || confirmPickupMutation.isLoading}
              >
                <nextAction.icon className="h-4 w-4 mr-2" />
                {nextAction.label}
              </Button>
            )}
          </div>

          {delivery.status === 'IN_TRANSIT' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t('delivery.inTransitMessage')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Adresses et navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('pickup.address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{delivery.pickupAddress}</p>
            {delivery.pickupInstructions && (
              <p className="text-xs text-muted-foreground">
                {delivery.pickupInstructions}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openNavigation(delivery.pickupAddress)}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {t('navigation.open')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              {t('delivery.address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{delivery.deliveryAddress}</p>
            {delivery.deliveryInstructions && (
              <p className="text-xs text-muted-foreground">
                {delivery.deliveryInstructions}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openNavigation(delivery.deliveryAddress)}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {t('navigation.open')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informations client */}
      {delivery.announcement?.client && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('client.contact')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{delivery.announcement.client.name}</p>
                <p className="text-sm text-muted-foreground">{delivery.announcement.client.email}</p>
              </div>
              <div className="flex gap-2">
                {delivery.announcement.client.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${delivery.announcement.client.phone}`)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContactClientOpen(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes et suivi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('delivery.notes')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('notes.description')}</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {delivery.description || t('notes.noDescription')}
            </p>
          </div>
          
          <div>
            <Label htmlFor="notes">{t('notes.deliverer')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notes.placeholder')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de livraison */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delivery.confirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryCode">{t('delivery.code')}</Label>
              <Input
                id="deliveryCode"
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
                placeholder={t('delivery.codePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="finalNotes">{t('notes.final')}</Label>
              <Textarea
                id="finalNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notes.finalPlaceholder')}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsStatusUpdateOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleConfirmDelivery}
                disabled={!deliveryCode || confirmDeliveryMutation.isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('delivery.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
