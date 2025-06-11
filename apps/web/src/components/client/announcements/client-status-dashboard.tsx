'use client';

import { useTranslations } from 'next-intl';
import { Announcement, AnnouncementStatus } from '@/types/announcements/announcement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PlusCircle, Package, CheckCircle, Clock, Truck } from 'lucide-react';

interface ClientStatusDashboardProps {
  announcements: Announcement[];
}

export function ClientStatusDashboard({ announcements }: ClientStatusDashboardProps) {
  const t = useTranslations('announcements');
  const router = useRouter();

  // Compter les annonces par statut
  const counts = {
    total: announcements.length,
    pending: announcements.filter(
      a => a.status === AnnouncementStatus.PENDING || a.status === AnnouncementStatus.PUBLISHED
    ).length,
    inProgress: announcements.filter(
      a => a.status === AnnouncementStatus.ASSIGNED || a.status === AnnouncementStatus.IN_PROGRESS
    ).length,
    completed: announcements.filter(a => a.status === AnnouncementStatus.COMPLETED).length,
  };

  // Obtenir les annonces récentes (jusqu'à 3)
  const recentAnnouncements = [...announcements]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('myAnnouncements')}</h2>
        <Button onClick={() => router.push('/client/announcements/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('createNewAnnouncement')}
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Package className="h-8 w-8 text-primary mb-2" />
            <p className="text-2xl font-bold">{counts.total}</p>
            <p className="text-sm text-muted-foreground">{t('totalAnnouncements')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Clock className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{counts.pending}</p>
            <p className="text-sm text-muted-foreground">{t('pendingAnnouncements')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Truck className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{counts.inProgress}</p>
            <p className="text-sm text-muted-foreground">{t('inProgressAnnouncements')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{counts.completed}</p>
            <p className="text-sm text-muted-foreground">{t('completedAnnouncements')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Annonces récentes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentAnnouncements')}</CardTitle>
          <CardDescription>{t('recentAnnouncementsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length > 0 ? (
            <div className="space-y-4">
              {recentAnnouncements.map(announcement => (
                <div
                  key={announcement.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/client/announcements/${announcement.id}`)}
                >
                  <div>
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <div className="flex space-x-4 text-sm text-muted-foreground">
                      <span>
                        {t('statusLabel')}: {t(`status.${announcement.status}`)}
                      </span>
                      <span>
                        {announcement.applications
                          ? t('proposalsCount', { count: announcement.applications.length })
                          : t('proposalsCount', { count: 0 })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      router.push(`/client/announcements/${announcement.id}`);
                    }}
                  >
                    {t('view')}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">{t('noAnnouncements')}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/client/announcements/create')}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('createYourFirstAnnouncement')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
