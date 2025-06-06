'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { AnnouncementDetails } from '@/components/merchant/announcements/announcement-details';
import { DeliveryTimeline } from '@/components/merchant/announcements/delivery-timeline';
import { AnnouncementStatusBadge } from '@/components/announcements/merchant/announcement-status-badge';
import { AnnouncementActions } from '@/components/announcements/merchant/announcement-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Eye, AlertTriangle } from 'lucide-react';
import { AnnouncementAnalytics } from '@/components/merchant/announcements/announcement-analytics';
import { DeliveryRequests } from '@/components/merchant/announcements/delivery-requests';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AnnouncementDetailsPage() {
  const t = useTranslations('merchant.announcements.details');
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');

  const id = params.id as string;

  // Récupération des détails de l'annonce
  const announcementQuery = api.merchant.announcements.getById.useQuery(
    { id },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Récupération des statistiques de l'annonce
  const analyticsQuery = api.merchant.announcements.getAnalytics.useQuery(
    { id },
    {
      enabled: !!announcementQuery.data,
      refetchOnWindowFocus: false,
    }
  );

  // Récupération des demandes de livraison pour cette annonce
  const deliveryRequestsQuery = api.merchant.announcements.getDeliveryRequests.useQuery(
    { id },
    {
      enabled: !!announcementQuery.data,
      refetchOnWindowFocus: false,
    }
  );

  // Mutation pour mettre à jour le statut de l'annonce
  const updateStatusMutation = api.merchant.announcements.updateStatus.useMutation({
    onSuccess: () => {
      announcementQuery.refetch();
      toast.success(t('statusUpdateSuccess'));
    },
    onError: error => {
      toast.error(t('statusUpdateError', { error: error.message }));
    },
  });

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push(`/merchant/announcements/${id}/edit`);
  };

  const handlePublish = () => {
    updateStatusMutation.mutate({ id, status: 'ACTIVE' });
  };

  const handleDeactivate = () => {
    updateStatusMutation.mutate({ id, status: 'INACTIVE' });
  };

  const handleReactivate = () => {
    updateStatusMutation.mutate({ id, status: 'ACTIVE' });
  };

  const handleDelete = () => {
    // Confirmer avant de supprimer
    if (window.confirm(t('deleteConfirmation'))) {
      updateStatusMutation.mutate({ id, status: 'DELETED' });
      router.push('/merchant/announcements');
    }
  };

  const isLoading = announcementQuery.isLoading;
  const isError = announcementQuery.isError;
  const announcement = announcementQuery.data;

  if (isError) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('announcementNotFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>

          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <AnnouncementStatusBadge status={announcement?.status} />
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <div className="flex gap-2">
            {announcement?.status === 'DRAFT' && (
              <Button onClick={handlePublish}>
                <Eye className="mr-2 h-4 w-4" />
                {t('publish')}
              </Button>
            )}
            {announcement?.status === 'ACTIVE' && (
              <Button variant="outline" onClick={handleDeactivate}>
                {t('deactivate')}
              </Button>
            )}
            {announcement?.status === 'INACTIVE' && (
              <Button onClick={handleReactivate}>{t('reactivate')}</Button>
            )}
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t('edit')}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : (
        <PageHeader
          heading={announcement?.title || t('noTitle')}
          description={announcement?.description?.substring(0, 100) + '...' || t('noDescription')}
        />
      )}

      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="details">{t('tabs.details')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('tabs.timeline')}</TabsTrigger>
          <TabsTrigger value="requests">{t('tabs.requests')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('tabs.analytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <AnnouncementDetails announcement={announcement} />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={handleDelete}>
              {t('delete')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryTimeline')}</CardTitle>
                <CardDescription>{t('deliveryTimelineDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryTimeline announcementId={id} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryRequests')}</CardTitle>
                <CardDescription>{t('deliveryRequestsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryRequests
                  announcementId={id}
                  requests={deliveryRequestsQuery.data || []}
                  isLoading={deliveryRequestsQuery.isLoading}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics')}</CardTitle>
                <CardDescription>{t('analyticsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <AnnouncementAnalytics
                  data={analyticsQuery.data}
                  isLoading={analyticsQuery.isLoading}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
