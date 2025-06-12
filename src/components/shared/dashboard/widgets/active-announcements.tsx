'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Clock, FileText, Megaphone, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

type AnnouncementStatus = 'PENDING' | 'PUBLISHED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

// Map des statuts d'annonce à des couleurs et icônes
const announcementStatusMap: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDING: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <Clock className="h-3 w-3" />,
  },
  PUBLISHED: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Megaphone className="h-3 w-3" />,
  },
  ASSIGNED: {
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: <FileText className="h-3 w-3" />,
  },
  COMPLETED: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <FileText className="h-3 w-3" />,
  },
  CANCELLED: {
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <Clock className="h-3 w-3" />,
  },
};

type Announcement = {
  id: string;
  title: string;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  delivererCount?: number;
};

type ActiveAnnouncementsProps = {
  announcements?: Announcement[];
  isLoading?: boolean;
};

export function ActiveAnnouncements({
  announcements = [],
  isLoading = false,
}: ActiveAnnouncementsProps) {
  const t = useTranslations('dashboard.client');
  const router = useRouter();
  const locale = useLocale();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between border-b pb-4">
              <div>
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </CardFooter>
      </Card>
    );
  }

  const goToAnnouncements = () => router.push('/client/announcements');
  const createNewAnnouncement = () => router.push('/client/announcements/create');

  const dateLocale = locale === 'fr' ? fr : enUS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          {t('activeAnnouncements')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map(announcement => {
            const statusInfo =
              announcementStatusMap[announcement.status] || announcementStatusMap.PENDING;
            const announcementDate = parseISO(announcement.createdAt);
            const formattedDate = formatDistanceToNow(announcementDate, {
              addSuffix: true,
              locale: dateLocale,
            });

            return (
              <div
                key={announcement.id}
                className="flex items-center justify-between border-b pb-4 last:border-b-0 cursor-pointer hover:bg-slate-50 p-2 rounded-md"
                onClick={() => router.push(`/client/announcements/${announcement.id}`)}
              >
                <div>
                  <h3 className="text-sm font-medium">{announcement.title}</h3>
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <span>{formattedDate}</span>
                    {announcement.delivererCount !== undefined && (
                      <span className="flex items-center">
                        •
                        <span className="ml-2">
                          {announcement.delivererCount} {t('delivererInterested')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`flex items-center gap-1 ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {t(`announcementStatus.${announcement.status.toLowerCase()}`)}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
            <p className="text-muted-foreground">{t('noActiveAnnouncements')}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="flex-1 mr-2" onClick={goToAnnouncements}>
          {t('viewAllAnnouncements')}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
        <Button className="flex-1 ml-2" onClick={createNewAnnouncement}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newAnnouncement')}
        </Button>
      </CardFooter>
    </Card>
  );
}
