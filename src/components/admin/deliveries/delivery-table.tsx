'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import {
  EllipsisVertical,
  Eye,
  Check,
  X,
  AlertTriangle,
  Truck,
  MapPin,
  MessageSquare,
  ClipboardCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { DeliveryStatus } from '@prisma/client';
import { toast } from 'sonner';

// Types pour les livraisons basées sur le modèle Prisma
interface Delivery {
  id: string;
  status: DeliveryStatus;
  trackingNumber: string;
  estimatedDeliveryDate: Date | null;
  deliveryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  delivererId: string | null;
  announcementId: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  client: {
    id: string;
    name: string;
    image: string | null;
  };
  deliverer: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  announcement: {
    id: string;
    title: string;
  } | null;
}

interface DeliveryTableProps {
  deliveries: Delivery[];
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function DeliveryTable({
  deliveries,
  isLoading,
  totalPages,
  currentPage,
  onPageChange,
}: DeliveryTableProps) {
  const t = useTranslations('admin.deliveries');
  const router = useRouter();
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deliveryToUpdate, setDeliveryToUpdate] = useState<{
    id: string;
    status: DeliveryStatus;
  } | null>(null);

  // Mutation tRPC pour la mise à jour du statut de livraison
  const updateStatusMutation = api.delivery.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t('statusUpdateSuccess'));
      setConfirmDialogOpen(false);
      setDeliveryToUpdate(null);
      // Rafraîchir les données
      router.refresh();
    },
    onError: error => {
      toast.error(t('statusUpdateError', { error: error.message }));
    },
  });

  const handleSelectDelivery = (deliveryId: string) => {
    setSelectedDeliveries(prev => {
      if (prev.includes(deliveryId)) {
        return prev.filter(id => id !== deliveryId);
      } else {
        return [...prev, deliveryId];
      }
    });
  };

  const handleSelectAllDeliveries = () => {
    if (selectedDeliveries.length === deliveries.length) {
      setSelectedDeliveries([]);
    } else {
      setSelectedDeliveries(deliveries.map(d => d.id));
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleView = (id: string) => {
    router.push(`/admin/deliveries/${id}`);
  };

  const handleTrack = (id: string) => {
    router.push(`/admin/deliveries/${id}/track`);
  };

  const handleUpdateStatus = (id: string, status: DeliveryStatus) => {
    setDeliveryToUpdate({ id, status });
    setConfirmDialogOpen(true);
  };

  const confirmUpdateStatus = () => {
    if (deliveryToUpdate) {
      updateStatusMutation.mutate(deliveryToUpdate);
    }
  };

  const handleSendMessage = (id: string) => {
    router.push(`/admin/deliveries/${id}/messages`);
  };

  const renderStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">{t('status.pending')}</Badge>;
      case 'PICKED_UP':
        return <Badge variant="secondary">{t('status.pickedUp')}</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="secondary">{t('status.inTransit')}</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">{t('status.delivered')}</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success">{t('status.confirmed')}</Badge>;
      case 'PROBLEM':
        return <Badge variant="destructive">{t('status.problem')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{t('status.cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t('columns.trackingNumber')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead>{t('columns.client')}</TableHead>
                <TableHead>{t('columns.deliverer')}</TableHead>
                <TableHead>{t('columns.date')}</TableHead>
                <TableHead className="text-right">{t('columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-10 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedDeliveries.length === deliveries.length && deliveries.length > 0}
                  onCheckedChange={handleSelectAllDeliveries}
                  aria-label="Sélectionner toutes les livraisons"
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('trackingNumber')}>
                {t('columns.trackingNumber')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                {t('columns.status')}
              </TableHead>
              <TableHead>{t('columns.client')}</TableHead>
              <TableHead>{t('columns.deliverer')}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                {t('columns.date')}
              </TableHead>
              <TableHead className="text-right">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {t('noDeliveries')}
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map(delivery => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDeliveries.includes(delivery.id)}
                      onCheckedChange={() => handleSelectDelivery(delivery.id)}
                      aria-label={`Sélectionner la livraison ${delivery.trackingNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{delivery.trackingNumber}</TableCell>
                  <TableCell>{renderStatusBadge(delivery.status)}</TableCell>
                  <TableCell>{delivery.client.name}</TableCell>
                  <TableCell>{delivery.deliverer ? delivery.deliverer.name : '-'}</TableCell>
                  <TableCell>
                    {format(new Date(delivery.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <EllipsisVertical className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleView(delivery.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTrack(delivery.id)}>
                          <MapPin className="h-4 w-4 mr-2" />
                          {t('track')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendMessage(delivery.id)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {t('sendMessage')}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel>{t('changeStatus')}</DropdownMenuLabel>

                        {delivery.status === 'PENDING' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(delivery.id, 'PICKED_UP')}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            {t('markAsPickedUp')}
                          </DropdownMenuItem>
                        )}

                        {delivery.status === 'PICKED_UP' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(delivery.id, 'IN_TRANSIT')}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            {t('markAsInTransit')}
                          </DropdownMenuItem>
                        )}

                        {delivery.status === 'IN_TRANSIT' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {t('markAsDelivered')}
                          </DropdownMenuItem>
                        )}

                        {['PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status) && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(delivery.id, 'PROBLEM')}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {t('reportProblem')}
                          </DropdownMenuItem>
                        )}

                        {delivery.status === 'PROBLEM' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(delivery.id, 'IN_TRANSIT')}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {t('markAsResolved')}
                          </DropdownMenuItem>
                        )}

                        {['PENDING', 'PICKED_UP'].includes(delivery.status) && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(delivery.id, 'CANCELLED')}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t('cancel')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmStatusUpdate.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deliveryToUpdate?.status === 'CANCELLED'
                ? t('confirmStatusUpdate.cancelMessage')
                : t('confirmStatusUpdate.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUpdateStatus}
              className={
                deliveryToUpdate?.status === 'CANCELLED'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
