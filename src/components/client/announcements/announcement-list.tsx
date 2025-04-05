import { Suspense, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { AnnouncementCard } from './announcement-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnnouncements } from '@/hooks/use-announcements';
import Image from 'next/image';

interface Announcement {
  id: string;
  title: string;
  packageImages?: string[];
}

export function AnnouncementList() {
  const { ref, inView } = useInView();
  const { 
    announcements, 
    isLoading, 
    hasNextPage, 
    fetchNextPage 
  } = useAnnouncements();

  // Charger plus d'annonces quand on arrive en bas
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {announcements.map((announcement: Announcement) => (
        <Suspense
          key={announcement.id}
          fallback={<AnnouncementSkeleton />}
        >
          <div className="relative">
            <AnnouncementCard 
              announcement={announcement}
            />
            {announcement.packageImages?.length > 0 && (
              <Image
                src={announcement.packageImages[0]}
                alt={announcement.title}
                width={300}
                height={200}
                className="rounded-t-lg object-cover"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={announcement.packageImages[0]}
              />
            )}
          </div>
        </Suspense>
      ))}
      
      {/* Loader pour l'infinite scroll */}
      {hasNextPage && (
        <div ref={ref} className="col-span-full flex justify-center p-4">
          <Skeleton className="h-8 w-8 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function AnnouncementSkeleton() {
  return (
    <div className="relative rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="aspect-[4/3] w-full">
        <Skeleton className="h-full w-full rounded-t-lg" />
      </div>
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    </div>
  );
} 