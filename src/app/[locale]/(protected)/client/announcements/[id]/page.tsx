import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { AnnouncementCard } from '@/components/announcements/announcement-card';
import { AnnouncementMap } from '@/components/announcements/announcement-map';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/server/db';
import { notFound } from 'next/navigation';
import {
  Announcement,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementPriority,
  DeliveryApplication as AppDeliveryApplication,
} from '@/types/announcement';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@prisma/client';
import { PageProps, MetadataProps } from '@/types/next';

// Définir les types pour les applications de livraison qui incluent le livreur
interface DeliveryApplication {
  id: string;
  announcementId: string;
  delivererId: string;
  proposedPrice: number | null;
  message: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deliverer: User;
}

// Définir le type pour les données brutes de l'annonce récupérées de la base de données
interface RawAnnouncementData {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  pickupAddress: string;
  pickupLongitude: number | null;
  pickupLatitude: number | null;
  deliveryAddress: string;
  deliveryLongitude: number | null;
  deliveryLatitude: number | null;
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  isFragile: number | boolean;
  needsCooling: number | boolean;
  pickupDate: string | Date | null;
  pickupTimeWindow: string | null;
  deliveryDate: string | Date | null;
  deliveryTimeWindow: string | null;
  isFlexible: number | boolean;
  suggestedPrice: number | null;
  finalPrice: number | null;
  isNegotiable: number | boolean;
  paymentStatus: string | null;
  clientId: string;
  delivererId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  viewCount: number;
  applicationsCount: number;
  cancelReason: string | null;
  notes: string | null;
  tags: string[] | string | null;
  client: User;
  applications: DeliveryApplication[] | null;
}

interface AnnouncementDetailPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: AnnouncementDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  // Récupérer les détails de l'annonce
  try {
    const announcement = await db.$queryRaw<{ title: string }[]>`
      SELECT title FROM announcements WHERE id = ${id} LIMIT 1
    `;

    if (!announcement || announcement.length === 0) {
      return {
        title: t('announcementNotFound'),
      };
    }

    return {
      title: `${t('announcement')} - ${announcement[0].title}`,
      description: t('announcementDetailsDescription'),
    };
  } catch {
    return {
      title: t('announcementDetails'),
      description: t('announcementDetailsDescription'),
    };
  }
}

export default async function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'announcements' });

  try {
    // Récupérer d'abord les détails de l'annonce et l'information du client
    const announcementData = await db.$queryRaw<RawAnnouncementData[]>`
      SELECT 
        a.*,
        (
          SELECT json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'image', c.image
          )
          FROM users c
          WHERE c.id = a."clientId"
        ) as client
      FROM announcements a
      WHERE a.id = ${id}
    `;

    if (!announcementData || announcementData.length === 0) {
      notFound();
    }

    const rawAnnouncement = announcementData[0];

    // Récupérer séparément les applications de livraison
    const applications = await db.$queryRaw<DeliveryApplication[]>`
      SELECT 
        da.*,
        (
          SELECT json_build_object(
            'id', d.id,
            'name', d.name,
            'email', d.email,
            'image', d.image
          )
          FROM users d
          WHERE d.id = da."delivererId"
        ) as deliverer
      FROM delivery_applications da
      WHERE da."announcementId" = ${id}
    `;

    // Ajouter les applications à l'annonce
    rawAnnouncement.applications = applications.length > 0 ? applications : null;

    // Corriger les applications si null (aucune application)
    let appDeliveryApplications: AppDeliveryApplication[] = [];
    if (Array.isArray(rawAnnouncement.applications) && rawAnnouncement.applications.length > 0) {
      appDeliveryApplications = rawAnnouncement.applications.map(app => ({
        id: app.id,
        announcementId: app.announcementId,
        delivererId: app.delivererId,
        proposedPrice: app.proposedPrice !== null ? app.proposedPrice : undefined,
        message: app.message !== null ? app.message : undefined,
        status: app.status,
        createdAt: new Date(app.createdAt),
        updatedAt: new Date(app.updatedAt),
        deliverer: app.deliverer,
      }));
    }

    // Convertir en objet Announcement compatible avec les composants
    const announcement: Announcement = {
      id: rawAnnouncement.id,
      title: rawAnnouncement.title,
      description: rawAnnouncement.description,
      type: rawAnnouncement.type as AnnouncementType,
      status: rawAnnouncement.status as AnnouncementStatus,
      priority: rawAnnouncement.priority as AnnouncementPriority,
      pickupAddress: rawAnnouncement.pickupAddress,
      pickupLongitude:
        rawAnnouncement.pickupLongitude !== null ? rawAnnouncement.pickupLongitude : undefined,
      pickupLatitude:
        rawAnnouncement.pickupLatitude !== null ? rawAnnouncement.pickupLatitude : undefined,
      deliveryAddress: rawAnnouncement.deliveryAddress,
      deliveryLongitude:
        rawAnnouncement.deliveryLongitude !== null ? rawAnnouncement.deliveryLongitude : undefined,
      deliveryLatitude:
        rawAnnouncement.deliveryLatitude !== null ? rawAnnouncement.deliveryLatitude : undefined,
      weight: rawAnnouncement.weight !== null ? rawAnnouncement.weight : undefined,
      width: rawAnnouncement.width !== null ? rawAnnouncement.width : undefined,
      height: rawAnnouncement.height !== null ? rawAnnouncement.height : undefined,
      length: rawAnnouncement.length !== null ? rawAnnouncement.length : undefined,
      isFragile: Boolean(rawAnnouncement.isFragile),
      needsCooling: Boolean(rawAnnouncement.needsCooling),
      pickupDate: rawAnnouncement.pickupDate ? new Date(rawAnnouncement.pickupDate) : undefined,
      pickupTimeWindow:
        rawAnnouncement.pickupTimeWindow !== null ? rawAnnouncement.pickupTimeWindow : undefined,
      deliveryDate: rawAnnouncement.deliveryDate
        ? new Date(rawAnnouncement.deliveryDate)
        : undefined,
      deliveryTimeWindow:
        rawAnnouncement.deliveryTimeWindow !== null
          ? rawAnnouncement.deliveryTimeWindow
          : undefined,
      isFlexible: Boolean(rawAnnouncement.isFlexible),
      suggestedPrice:
        rawAnnouncement.suggestedPrice !== null ? rawAnnouncement.suggestedPrice : undefined,
      finalPrice: rawAnnouncement.finalPrice !== null ? rawAnnouncement.finalPrice : undefined,
      isNegotiable: Boolean(rawAnnouncement.isNegotiable),
      paymentStatus:
        rawAnnouncement.paymentStatus !== null ? rawAnnouncement.paymentStatus : undefined,
      clientId: rawAnnouncement.clientId,
      client: rawAnnouncement.client,
      delivererId: rawAnnouncement.delivererId !== null ? rawAnnouncement.delivererId : undefined,
      deliverer: undefined,
      createdAt: new Date(rawAnnouncement.createdAt),
      updatedAt: new Date(rawAnnouncement.updatedAt),
      viewCount: rawAnnouncement.viewCount,
      applicationsCount: rawAnnouncement.applicationsCount,
      cancelReason:
        rawAnnouncement.cancelReason !== null ? rawAnnouncement.cancelReason : undefined,
      notes: rawAnnouncement.notes !== null ? rawAnnouncement.notes : undefined,
      tags: Array.isArray(rawAnnouncement.tags)
        ? rawAnnouncement.tags
        : typeof rawAnnouncement.tags === 'string'
          ? JSON.parse(rawAnnouncement.tags)
          : [],
      applications: appDeliveryApplications,
    };

    // Vérifier si l'annonce peut être modifiée
    const isEditable =
      announcement.status === AnnouncementStatus.DRAFT ||
      announcement.status === AnnouncementStatus.PENDING;

    // Vérifier si l'annonce peut être supprimée
    const isDeletable =
      announcement.status === AnnouncementStatus.DRAFT ||
      announcement.status === AnnouncementStatus.PENDING ||
      announcement.status === AnnouncementStatus.PUBLISHED;

    return (
      <div className="container py-6 space-y-6">
        <PageHeader heading={announcement.title} description={t('announcementDetailsDescription')}>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/client/announcements`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Link>
          </Button>

          {isEditable && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/client/announcements/${announcement.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                {t('edit')}
              </Link>
            </Button>
          )}

          {isDeletable && (
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('delete')}
            </Button>
          )}
        </PageHeader>

        {announcement.status === AnnouncementStatus.DRAFT && (
          <Alert>
            <AlertTitle>{t('draftAnnouncementTitle')}</AlertTitle>
            <AlertDescription>{t('draftAnnouncementDescription')}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="details">{t('details')}</TabsTrigger>
            <TabsTrigger value="map">{t('mapView')}</TabsTrigger>
            <TabsTrigger value="applications">
              {t('applications')} (
              {announcement.applications ? announcement.applications.length : 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <AnnouncementCard announcement={announcement} isClientView={true} isDetailed={true} />
          </TabsContent>

          <TabsContent value="map">
            <AnnouncementMap
              announcements={[announcement]}
              selectedAnnouncement={announcement}
              height="500px"
            />
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>{t('delivererApplications')}</CardTitle>
              </CardHeader>
              <CardContent>
                {announcement.applications && announcement.applications.length > 0 ? (
                  <div className="space-y-4">
                    {announcement.applications.map(application => (
                      <div key={application.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{application.deliverer?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {t('proposedPrice')}:{' '}
                              {application.proposedPrice
                                ? `${application.proposedPrice} €`
                                : t('notSpecified')}
                            </div>
                            {application.message && (
                              <div className="mt-2 text-sm">
                                <div className="font-medium">{t('message')}:</div>
                                <p className="text-muted-foreground">{application.message}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              {t('viewProfile')}
                            </Button>
                            <Button size="sm">{t('acceptOffer')}</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{t('noApplicationsYet')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de l'annonce:", error);
    notFound();
  }
}
