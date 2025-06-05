'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Delivery } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, ArrowUpDown, MoreHorizontal, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface DeliveryWithDetails extends Delivery {
  deliverer?: {
    name: string;
    rating?: number;
  };
  announcement?: {
    title: string;
  };
  client?: {
    name: string;
  };
}

interface DeliveryTableProps {
  deliveries: DeliveryWithDetails[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onSortChange?: (column: string) => void;
}

export function DeliveryTable({
  deliveries = [],
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  isLoading = false,
  onPageChange,
  onSortChange,
}: DeliveryTableProps) {
  const t = useTranslations('merchant.deliveries');
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort order if same column
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder);
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortOrder('asc');
    }

    if (onSortChange) {
      onSortChange(`${column}:${sortOrder}`);
    }
  };

  const handleViewDelivery = (id: string) => {
    router.push(`/merchant/deliveries/${id}`);
  };

  // Helper function to render the delivery status badge
  const renderStatusBadge = (status: string) => {
    const variant = 'outline';

    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            En attente
          </Badge>
        );
      case 'ASSIGNED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Assignée
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            En cours
          </Badge>
        );
      case 'DELIVERED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Livrée
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Terminée
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Annulée
          </Badge>
        );
      case 'PROBLEM':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Problème
          </Badge>
        );
      default:
        return <Badge variant={variant}>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
          <p className="mt-2 text-lg font-medium">{t('noDeliveries')}</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {t('noDeliveriesDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('id')}
                >
                  {t('columns.id')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('title')}
                >
                  {t('columns.title')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('status')}
                >
                  {t('columns.status')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('deliverer')}
                >
                  {t('columns.deliverer')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('date')}
                >
                  {t('columns.date')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('price')}
                >
                  {t('columns.price')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map(delivery => (
              <TableRow
                key={delivery.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewDelivery(delivery.id)}
              >
                <TableCell className="font-medium">#{delivery.id.substring(0, 8)}</TableCell>
                <TableCell>{delivery.announcement?.title || t('untitled')}</TableCell>
                <TableCell>{renderStatusBadge(delivery.status)}</TableCell>
                <TableCell>{delivery.deliverer?.name || t('notAssigned')}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {delivery.createdAt
                    ? format(new Date(delivery.createdAt), 'PPP', { locale: fr })
                    : ''}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatCurrency(delivery.price || 0)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t('openMenu')}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDelivery(delivery.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('view')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <Button
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                </PaginationItem>
              );
            })}
            {totalPages > 5 && <span className="px-2">...</span>}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
