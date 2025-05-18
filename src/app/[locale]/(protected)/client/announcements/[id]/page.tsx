'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Link } from '@/navigation';
import { useAnnouncement } from '@/hooks/use-announcement';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnouncementDetail } from '@/components/announcements/announcement-detail';
import DelivererProposalsList from '@/components/announcements/deliverer-proposals-list';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  Clock,
  Package,
  CreditCard,
  Trash2,
  ArrowUpRight,
  Truck,
  Loader,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRoleProtection } from '@/hooks/use-role-protection';
import { UserRole } from '@prisma/client';

// Définition précise du type d'application pour l'annonce
interface DelivererApplication {
  id: string;
  announcementId: string;
  delivererId: string;
  deliverer: {
    id: string;
    name: string;
    image?: string | null;
    rating?: number;
    completedDeliveries?: number;
    averageResponseTime?: number;
    verificationStatus?: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  proposedPrice: number;
  estimatedDeliveryTime?: string | Date;
  message: string;
  hasRequiredEquipment: boolean;
  canPickupAtScheduledTime: boolean;
  createdAt: Date;
}

export default function AnnouncementDetailsPage() {
  useRoleProtection(['CLIENT']);
  const t = useTranslations('announcements');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const {
    fetchAnnouncementById,
    currentAnnouncement,
    isLoading,
    error,
    deleteAnnouncement,
    isDeleting,
  } = useAnnouncement();

  // Récupérer les détails de l'annonce
  useEffect(() => {
    if (params.id) {
      fetchAnnouncementById(params.id);
    }
  }, [params.id, fetchAnnouncementById]);

  // Gérer la suppression d'une annonce
  const handleDeleteAnnouncement = async () => {
    if (!params.id) return;

    try {
      await deleteAnnouncement(params.id);

      toast.success(t('deleteSuccess'), {
        description: t('announcementDeleted'),
      });

      // Rediriger vers la liste des annonces
      router.push('/client/announcements');
    } catch (err) {
      toast.error(t('deleteError'), {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Afficher un skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Afficher un message d'erreur si l'annonce n'est pas trouvée
  if (error || !currentAnnouncement) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error || t('announcementNotFound')}</AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href="/client/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToList')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Vérifier si l'annonce a des applications/propositions
  const hasProposals =
    currentAnnouncement.applications && currentAnnouncement.applications.length > 0;
    
  // Adapter les données des applications pour le composant DelivererProposalsList
  const formattedProposals = currentAnnouncement.applications?.map(app => {
    // Cas par défaut si l'application n'a pas toutes les données attendues
    const application: DelivererApplication = {
      id: app.id,
      announcementId: params.id as string,
      delivererId: app.delivererId,
      deliverer: {
        id: app.delivererId,
        name: (app as any)?.deliverer?.name || 'Livreur inconnu',
        image: (app as any)?.deliverer?.image || null,
        rating: (app as any)?.deliverer?.rating || 0,
        completedDeliveries: (app as any)?.deliverer?.completedDeliveries || 0,
        averageResponseTime: (app as any)?.deliverer?.averageResponseTime,
        verificationStatus: (app as any)?.deliverer?.verificationStatus || 'PENDING'
      },
      status: (app.status as 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED') || 'PENDING',
      proposedPrice: app.proposedPrice,
      estimatedDeliveryTime: (app as any)?.estimatedDeliveryTime,
      message: (app as any)?.message || '',
      hasRequiredEquipment: (app as any)?.hasRequiredEquipment || false,
      canPickupAtScheduledTime: (app as any)?.canPickupAtScheduledTime || false,
      createdAt: app.createdAt
    };
    
    return application;
  }) || [];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{currentAnnouncement.title}</h1>
            <Badge className="ml-2">{t(`status.${currentAnnouncement.status}`)}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {t('createdAt')}: {new Date(currentAnnouncement.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/client/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/client/announcements/${params.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('edit')}
            </Link>
          </Button>

          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="details">
                <Package className="h-4 w-4 mr-2" />
                {t('details')}
              </TabsTrigger>
              <TabsTrigger value="proposals" disabled={!hasProposals}>
                <Clock className="h-4 w-4 mr-2" />
                {t('proposals')} {hasProposals && `(${currentAnnouncement.applications?.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <AnnouncementDetail 
                    announcement={currentAnnouncement} 
                    userRole="CLIENT"
                    className="space-y-4" 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-6">
              {hasProposals ? (
                <DelivererProposalsList
                  announcementId={params.id as string}
                  proposals={formattedProposals}
                  announcementTitle={currentAnnouncement.title}
                  suggestedPrice={currentAnnouncement.suggestedPrice || 0}
                  onAccept={(proposalId) => {
                    // Implémenter ultérieurement
                    return Promise.resolve();
                  }}
                  onReject={(proposalId) => {
                    // Implémenter ultérieurement
                    return Promise.resolve();
                  }}
                  onSendMessage={(delivererId) => {
                    // Implémenter ultérieurement
                  }}
                  onViewDelivererProfile={(delivererId) => {
                    // Implémenter ultérieurement
                  }}
                  onProposalAccepted={() => fetchAnnouncementById(params.id as string)}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">{t('noProposalsYet')}</h3>
                      <p className="text-muted-foreground">{t('proposalsWillAppearHere')}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">{t('quickActions')}</h3>

              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/client/announcements/${params.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('editAnnouncement')}
                  </Link>
                </Button>

                {/* Ajouter les boutons en fonction du statut de l'annonce */}
                {['ASSIGNED', 'IN_PROGRESS'].includes(currentAnnouncement.status) && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/client/announcements/${params.id}/tracking`}>
                      <Truck className="mr-2 h-4 w-4" />
                      {t('trackDelivery')}
                    </Link>
                  </Button>
                )}

                {currentAnnouncement.status === 'PUBLISHED' && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/client/announcements/${params.id}/payment`}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {t('makePayment')}
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">{t('announcementInfo')}</h3>

              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('locations')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('from')}: {currentAnnouncement.pickupAddress}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('to')}: {currentAnnouncement.deliveryAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('dates')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('pickupDate')}: {currentAnnouncement.pickupDate ? 
                        new Date(currentAnnouncement.pickupDate).toLocaleDateString() : 
                        t('notSpecified')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('deliveryDate')}: {currentAnnouncement.deliveryDate ?
                        new Date(currentAnnouncement.deliveryDate).toLocaleDateString() : 
                        t('notSpecified')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CreditCard className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('price')}</p>
                    <p className="text-sm font-semibold">
                      €{(currentAnnouncement.suggestedPrice || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmation')}</DialogTitle>
            <DialogDescription>{t('deleteConfirmationText')}</DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteAnnouncement} disabled={isDeleting}>
              {isDeleting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
