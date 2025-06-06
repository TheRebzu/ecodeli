'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PackageCheck,
  MapPin,
  Clock,
  Calendar,
  User,
  Truck,
  CreditCard,
  Weight,
  ThermometerSnowflake,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Star,
  PackageOpen,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AnnouncementStatus, UserRole, type Announcement } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils/common';

// Types pour les détails de l'annonce
type AnnouncementWithDetails = Announcement & {
  client?: {
    id: string;
    name: string;
    image?: string | null;
    rating?: number;
  };
  deliverer?: {
    id: string;
    userId: string;
    name: string;
    image?: string | null;
    rating?: number;
  };
  applications?: Array<{
    id: string;
    delivererId: string;
    status: string;
    proposedPrice: number;
    createdAt: Date;
    message?: string;
  }>;
  isFavorite?: boolean;
};

// Props du composant
interface AnnouncementDetailProps {
  announcement: AnnouncementWithDetails;
  userRole: UserRole;
  onApply?: (id: string, price?: number, message?: string) => void;
  onCancel?: (id: string, reason?: string) => void;
  onAccept?: (id: string, applicationId: string) => void;
  onReject?: (id: string, applicationId: string) => void;
  onComplete?: (id: string) => void;
  onPayNow?: (id: string) => void;
  onChatWith?: (userId: string) => void;
  onFavoriteToggle?: (id: string) => void;
  className?: string;
}

/**
 * Composant détaillé pour afficher toutes les informations d'une annonce
 */
export function AnnouncementDetail({
  announcement,
  userRole,
  onApply,
  onCancel,
  onAccept,
  onReject,
  onComplete,
  onPayNow,
  onChatWith,
  onFavoriteToggle,
  className,
}: AnnouncementDetailProps) {
  const t = useTranslations('announcements');
  const [activeTab, setActiveTab] = useState('details');
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState('');
  const [proposedPrice, setProposedPrice] = useState(
    announcement.suggestedPrice || announcement.finalPrice || 0
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);

  // Statut de l'annonce
  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">{t('statusDraft')}</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">{t('statusPending')}</Badge>;
      case 'PUBLISHED':
        return <Badge variant="default">{t('statusPublished')}</Badge>;
      case 'ASSIGNED':
        return (
          <Badge variant="default" className="bg-blue-500">
            {t('statusAssigned')}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="default" className="bg-amber-500">
            {t('statusInProgress')}
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-500">
            {t('statusCompleted')}
          </Badge>
        );
      case 'CANCELLED':
        return <Badge variant="destructive">{t('statusCancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Type de l'annonce
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PACKAGE':
        return t('typePackage');
      case 'GROCERIES':
        return t('typeGroceries');
      case 'DOCUMENTS':
        return t('typeDocuments');
      case 'MEAL':
        return t('typeMeal');
      case 'FURNITURE':
        return t('typeFurniture');
      case 'OTHER':
        return t('typeOther');
      default:
        return type;
    }
  };

  // Priorité de l'annonce
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="outline">{t('priorityLow')}</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">{t('priorityMedium')}</Badge>;
      case 'HIGH':
        return <Badge className="bg-amber-500">{t('priorityHigh')}</Badge>;
      case 'URGENT':
        return <Badge variant="destructive">{t('priorityUrgent')}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Formatage des dates
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return t('notSpecified');
    return format(new Date(date), 'PPP', { locale: fr });
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return t('notSpecified');
    return format(new Date(date), 'PPp', { locale: fr });
  };

  // Actions disponibles en fonction du rôle et du statut
  const renderActions = () => {
    // Client
    if (userRole === 'CLIENT') {
      switch (announcement.status) {
        case 'DRAFT':
        case 'PENDING':
          return (
            <>
              <Button variant="default" onClick={() => onPayNow && onPayNow(announcement.id)}>
                <CreditCard className="mr-2 h-4 w-4" />
                {t('publishAndPay')}
              </Button>
              <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                {t('cancel')}
              </Button>
            </>
          );
        case 'PUBLISHED':
          if (announcement.applications && announcement.applications.length > 0) {
            return (
              <>
                <Button variant="default" onClick={() => setActiveTab('applications')}>
                  <User className="mr-2 h-4 w-4" />
                  {t('viewApplications', { count: announcement.applications.length })}
                </Button>
                <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                  {t('cancel')}
                </Button>
              </>
            );
          }
          return (
            <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
              {t('cancel')}
            </Button>
          );
        case 'ASSIGNED':
        case 'IN_PROGRESS':
          return (
            <>
              {announcement.deliverer && (
                <Button
                  variant="default"
                  onClick={() => onChatWith && announcement.deliverer?.userId && onChatWith(announcement.deliverer.userId)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('chatWithDeliverer')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                {t('cancel')}
              </Button>
            </>
          );
        case 'COMPLETED':
          return (
            <Button variant="outline" onClick={() => onComplete && onComplete(announcement.id)}>
              <Star className="mr-2 h-4 w-4" />
              {t('leaveReview')}
            </Button>
          );
        default:
          return null;
      }
    }

    // Livreur
    if (userRole === 'DELIVERER') {
      switch (announcement.status) {
        case 'PUBLISHED':
          // Vérifier si le livreur a déjà postulé
          const hasApplied = announcement.applications?.some(
            app => app.delivererId === announcement.deliverer?.id
          );

          if (hasApplied) {
            return (
              <Button variant="outline" disabled>
                {t('alreadyApplied')}
              </Button>
            );
          }

          return (
            <>
              <Button variant="default" onClick={() => setShowApplyDialog(true)}>
                <Truck className="mr-2 h-4 w-4" />
                {t('applyForDelivery')}
              </Button>
              {onFavoriteToggle && (
                <Button variant="outline" onClick={() => onFavoriteToggle(announcement.id)}>
                  {announcement.isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                </Button>
              )}
            </>
          );
        case 'ASSIGNED':
          // Si le livreur est assigné à cette annonce
          if (announcement.deliverer?.id === announcement.deliverer?.id) {
            return (
              <>
                <Button variant="default" onClick={() => onComplete && onComplete(announcement.id)}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  {t('startDelivery')}
                </Button>
                {announcement.client && (
                  <Button
                    variant="outline"
                    onClick={() => onChatWith && announcement.client?.id && onChatWith(announcement.client.id)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('chatWithClient')}
                  </Button>
                )}
              </>
            );
          }
          return null;
        case 'IN_PROGRESS':
          // Si le livreur est assigné à cette annonce
          if (announcement.deliverer?.id === announcement.deliverer?.id) {
            return (
              <>
                <Button variant="default" onClick={() => onComplete && onComplete(announcement.id)}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  {t('completeDelivery')}
                </Button>
                {announcement.client && (
                  <Button
                    variant="outline"
                    onClick={() => onChatWith && announcement.client?.id && onChatWith(announcement.client.id)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('chatWithClient')}
                  </Button>
                )}
              </>
            );
          }
          return null;
        default:
          return null;
      }
    }

    return null;
  };

  // Affichage de la vignette client/livreur
  const renderUserCard = (user: any, role: string) => {
    if (!user) return null;

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer">
            <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback>
                {user.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="flex justify-between space-x-4">
            <Avatar>
                                <AvatarImage src={user.image || undefined} />
              <AvatarFallback>
                {user.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">{user.name}</h4>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={cn(
                      'h-4 w-4',
                      star <= (user.rating || 0)
                        ? 'fill-primary text-primary'
                        : 'fill-muted text-muted'
                    )}
                  />
                ))}
                <span className="ml-1 text-xs">
                  {user.rating ? user.rating.toFixed(1) : t('noRatings')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {role === t('client')
                  ? t('clientSince', { date: format(new Date(), 'MMMM yyyy') })
                  : t('delivererSince', { date: format(new Date(), 'MMMM yyyy') })}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button size="sm" className="w-full" onClick={() => onChatWith && onChatWith(user.id)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('startChat')}
            </Button>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  // Affichage des candidatures (pour le client)
  const renderApplications = () => {
    if (!announcement.applications || announcement.applications.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">{t('noApplicationsYet')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {announcement.applications.map(application => (
          <Card key={application.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {application.delivererId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      Livreur #{application.delivererId.substring(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {format(application.createdAt, 'Pp', { locale: fr })}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={
                    application.status === 'PENDING'
                      ? 'outline'
                      : application.status === 'ACCEPTED'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {application.status === 'PENDING'
                    ? t('pending')
                    : application.status === 'ACCEPTED'
                      ? t('accepted')
                      : t('rejected')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {application.proposedPrice && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('proposedPrice')}</span>
                    <span className="font-medium">
                      {application.proposedPrice.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                )}
                {application.message && <p className="text-sm">{application.message}</p>}
              </div>
            </CardContent>
            {application.status === 'PENDING' && (
              <CardFooter className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onAccept && onAccept(announcement.id, application.id)}
                >
                  {t('accept')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject && onReject(announcement.id, application.id)}
                >
                  {t('reject')}
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    );
  };

  // Vérifier si l'annonce a des applications
  const hasApplications = announcement.applications && announcement.applications.length > 0;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{announcement.title}</CardTitle>
            <CardDescription className="mt-1">
              <div className="flex flex-wrap gap-2 mt-1">
                {getStatusBadge(announcement.status)}
                <Badge variant="secondary">{getTypeLabel(announcement.type)}</Badge>
                {getPriorityBadge(announcement.priority)}
              </div>
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {announcement.finalPrice
                ? announcement.finalPrice.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })
                : announcement.suggestedPrice
                  ? announcement.suggestedPrice.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })
                  : t('priceNotSet')}
            </p>
            {announcement.isNegotiable && (
              <p className="text-xs text-muted-foreground">{t('priceNegotiable')}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">
              {t('details')}
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">
              {t('photos')} {announcement.photos?.length ? `(${announcement.photos.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1">
              {t('map')}
            </TabsTrigger>
            {userRole === 'CLIENT' && hasApplications && (
              <TabsTrigger value="applications" className="flex-1">
                {t('applications')} ({announcement.applications?.length || 0})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Onglet Détails */}
          <TabsContent value="details" className="p-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {/* Description */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">{t('description')}</h3>
                  <p className="text-sm">{announcement.description}</p>
                </div>

                {/* Adresses */}
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('pickupAddress')}</p>
                      <p className="text-sm">{announcement.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('deliveryAddress')}</p>
                      <p className="text-sm">{announcement.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('pickupDate')}</p>
                      <p className="text-sm">
                        {formatDate(announcement.pickupDate)}
                        {announcement.pickupTimeWindow && ` (${announcement.pickupTimeWindow})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('deliveryDate')}</p>
                      <p className="text-sm">
                        {formatDate(announcement.deliveryDate)}
                        {announcement.deliveryTimeWindow && ` (${announcement.deliveryTimeWindow})`}
                      </p>
                    </div>
                  </div>
                  {announcement.isFlexible && (
                    <p className="text-xs text-muted-foreground">{t('flexibleSchedule')}</p>
                  )}
                </div>
              </div>

              <div>
                {/* Détails du colis */}
                <div className="space-y-3 mb-4">
                  <h3 className="text-sm font-medium">{t('packageDetails')}</h3>
                  {announcement.weight && (
                    <div className="flex gap-2">
                      <Weight className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">
                          {t('weight')}: {announcement.weight} kg
                        </p>
                      </div>
                    </div>
                  )}
                  {(announcement.width || announcement.height || announcement.length) && (
                    <div className="flex gap-2">
                      <PackageOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">
                          {t('dimensions')}:
                          {announcement.width ? ` ${t('width')}: ${announcement.width} cm` : ''}
                          {announcement.height ? ` ${t('height')}: ${announcement.height} cm` : ''}
                          {announcement.length ? ` ${t('length')}: ${announcement.length} cm` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {announcement.isFragile && (
                    <div className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm">{t('fragilePackage')}</p>
                      </div>
                    </div>
                  )}
                  {announcement.needsCooling && (
                    <div className="flex gap-2">
                      <ThermometerSnowflake className="h-5 w-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm">{t('needsCooling')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Exigences spéciales */}
                <div className="space-y-3 mb-4">
                  <h3 className="text-sm font-medium">{t('specialRequirements')}</h3>
                  {announcement.requiresSignature && (
                    <div className="flex gap-2">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{t('requiresSignature')}</p>
                      </div>
                    </div>
                  )}
                  {announcement.requiresId && (
                    <div className="flex gap-2">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{t('requiresId')}</p>
                      </div>
                    </div>
                  )}
                  {announcement.specialInstructions && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">{t('specialInstructions')}</p>
                      <p className="text-sm">{announcement.specialInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Statistiques */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>
                      {t('createdAt')}: {formatDateTime(announcement.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="mr-1 h-4 w-4" />
                    <span>
                      {t('views')}: {announcement.viewCount}
                    </span>
                  </div>
                  {announcement.estimatedDistance && (
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      <span>
                        {t('distance')}: {announcement.estimatedDistance} km
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Personne liée (client ou livreur) */}
            <Separator className="my-4" />
            <div className="flex flex-wrap justify-between items-center">
              <div className="space-y-2">
                {announcement.client &&
                  userRole !== 'CLIENT' &&
                  renderUserCard(announcement.client, t('client'))}
                {announcement.deliverer &&
                  userRole !== 'DELIVERER' &&
                  renderUserCard(announcement.deliverer, t('deliverer'))}
              </div>

              {announcement.status === 'CANCELLED' && announcement.cancelReason && (
                <div className="p-3 bg-destructive/10 rounded-md max-w-md mt-2">
                  <p className="text-sm font-medium text-destructive">{t('cancelReason')}:</p>
                  <p className="text-sm">{announcement.cancelReason}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Onglet Photos */}
          <TabsContent value="photos" className="p-6 pt-4">
            {!announcement.photos || announcement.photos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('noPhotosAvailable')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {announcement.photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden cursor-pointer"
                    onClick={() => setCurrentPhoto(photo)}
                  >
                    <Image
                      src={photo}
                      alt={`${announcement.title} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Modal de prévisualisation */}
            <Dialog open={!!currentPhoto} onOpenChange={() => setCurrentPhoto(null)}>
              <DialogContent className="max-w-3xl p-0 overflow-hidden">
                <div className="relative w-full aspect-[4/3]">
                  {currentPhoto && (
                    <Image
                      src={currentPhoto}
                      alt={announcement.title}
                      fill
                      className="object-contain"
                    />
                  )}
                </div>
                <DialogFooter className="p-4">
                  <Button variant="outline" onClick={() => setCurrentPhoto(null)}>
                    {t('close')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Onglet Carte */}
          <TabsContent value="map" className="p-0">
            {announcement.pickupLatitude !== null &&
            announcement.pickupLongitude !== null &&
            announcement.deliveryLatitude !== null &&
            announcement.deliveryLongitude !== null ? (
              <div className="h-[400px] relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-center text-muted-foreground">{t('mapLoading')}</p>
                </div>
                <iframe
                  title={t('deliveryRoute')}
                  className="w-full h-full border-0"
                  src={`https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY&origin=${announcement.pickupLatitude},${announcement.pickupLongitude}&destination=${announcement.deliveryLatitude},${announcement.deliveryLongitude}&mode=driving`}
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-center text-muted-foreground">{t('noCoordinatesAvailable')}</p>
              </div>
            )}
          </TabsContent>

          {/* Onglet Candidatures */}
          {userRole === 'CLIENT' && hasApplications && (
            <TabsContent value="applications">{renderApplications()}</TabsContent>
          )}
        </Tabs>
      </CardContent>

      {/* Actions en pied de carte */}
      <CardFooter className="flex flex-wrap justify-end gap-2 p-6 pt-4">
        {renderActions()}
      </CardFooter>

      {/* Dialogue d'annulation */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancelAnnouncement')}</DialogTitle>
            <DialogDescription>{t('cancelAnnouncementDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('cancelReasonPlaceholder')}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onCancel && onCancel(announcement.id, cancelReason);
                setShowCancelDialog(false);
              }}
            >
              {t('confirmCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de candidature */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('applyForDelivery')}</DialogTitle>
            <DialogDescription>{t('applyForDeliveryDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('proposedPrice')}</label>
              <div className="flex items-center">
                <Input
                  type="number"
                  min={1}
                  step={0.5}
                  value={proposedPrice}
                  onChange={e => setProposedPrice(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2">€</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('message')}</label>
              <Textarea
                placeholder={t('applicationMessagePlaceholder')}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                onApply && onApply(announcement.id, proposedPrice, message);
                setShowApplyDialog(false);
              }}
            >
              {t('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
