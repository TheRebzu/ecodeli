'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DataTablePagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Edit, MoreVertical, ArrowUpDown, AlertTriangle, Check, X } from 'lucide-react';
import { AnnouncementStatusBadge } from './announcement-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { type Announcement } from '@prisma/client';

interface ExtendedAnnouncement extends Announcement {
  _count?: {
    deliveries: number;
    views: number;
  };
}

interface AnnouncementListProps {
  announcements: ExtendedAnnouncement[];
  isLoading: boolean;
  isError: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function AnnouncementList({
  announcements,
  isLoading,
  isError,
  totalPages,
  currentPage,
  onPageChange,
}: AnnouncementListProps) {
  const t = useTranslations('merchant.announcements');
  const router = useRouter();

  // Mutation pour mettre à jour le statut d'une annonce
  const updateStatusMutation = api.merchant.announcements.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t('statusUpdateSuccess'));
      // Rafraîchir les données (à implémenter selon le contexte)
    },
    onError: error => {
      toast.error(t('statusUpdateError', { error: error.message }));
    },
  });

  const handleViewDetails = (id: string) => {
    router.push(`/merchant/announcements/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/merchant/announcements/${id}/edit`);
  };

  const handleUpdateStatus = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10 text-muted-foreground" />}
        title={t('error.title')}
        description={t('error.description')}
        action={<Button onClick={() => window.location.reload()}>{t('error.retry')}</Button>}
      />
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.title')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.createdAt')}</TableHead>
                <TableHead>{t('table.views')}</TableHead>
                <TableHead>{t('table.deliveries')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-10" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-9 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end my-4">
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <EmptyState
        title={t('noAnnouncements.title')}
        description={t('noAnnouncements.description')}
        action={
          <Button onClick={() => router.push('/merchant/announcements/create')}>
            {t('noAnnouncements.action')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">
                <div className="flex items-center space-x-1">
                  <span>{t('table.title')}</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.createdAt')}</TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>{t('table.views')}</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>{t('table.deliveries')}</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map(announcement => (
              <TableRow key={announcement.id}>
                <TableCell className="font-medium">
                  <div className="line-clamp-1">{announcement.title}</div>
                </TableCell>
                <TableCell>
                  <AnnouncementStatusBadge status={announcement.status} />
                </TableCell>
                <TableCell>
                  {format(new Date(announcement.createdAt), 'dd/MM/yyyy', { locale: fr })}
                </TableCell>
                <TableCell>{announcement._count?.views || 0}</TableCell>
                <TableCell>{announcement._count?.deliveries || 0}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">{t('table.openMenu')}</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetails(announcement.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('table.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(announcement.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('table.edit')}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {announcement.status === 'DRAFT' && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(announcement.id, 'ACTIVE')}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {t('table.publish')}
                        </DropdownMenuItem>
                      )}

                      {announcement.status === 'ACTIVE' && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(announcement.id, 'INACTIVE')}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {t('table.deactivate')}
                        </DropdownMenuItem>
                      )}

                      {announcement.status === 'INACTIVE' && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(announcement.id, 'ACTIVE')}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {t('table.activate')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end my-4">
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
