'use client';

import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, Clock, FileText, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { VerificationFilters } from '@/types/verification';
import { Pagination } from '@/components/ui/pagination';

interface PendingVerificationsTabProps {
  filters: VerificationFilters;
  onPageChange: (page: number) => void;
}

export function PendingVerificationsTab({ filters, onPageChange }: PendingVerificationsTabProps) {
  const t = useTranslations('admin.verification');
  const router = useRouter();

  // Utiliser une API mock temporaire pour éviter les erreurs
  // const { data, isLoading, isError } = api.admin.getVerificationRequests.useQuery(filters);
  const isLoading = false;
  const isError = false;
  const data = {
    verificationRequests: [],
    pagination: {
      page: 1,
      totalPages: 1,
      total: 0,
    },
  };

  const handleViewVerification = (id: string) => {
    router.push(`/admin/verifications/${id}`);
  };

  // Fonction pour formater la date de manière sécurisée
  const formatSafeDate = (date: Date | string | number | null | undefined) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'PPP', { locale: fr });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  if (isLoading) {
    return <VerificationsTableSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-2" />
        <h3 className="text-lg font-semibold">{t('error.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('error.description')}</p>
      </div>
    );
  }

  // Vérifier si data existe et a les propriétés nécessaires
  const verificationRequests = data?.verificationRequests || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  if (verificationRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-2" />
        <h3 className="text-lg font-semibold">{t('pending.empty.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('pending.empty.description')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.user')}</TableHead>
            <TableHead>{t('table.role')}</TableHead>
            <TableHead>{t('table.documentType')}</TableHead>
            <TableHead>{t('table.submitted')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {verificationRequests.map(verification => (
            <TableRow key={verification.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{verification.submitter?.name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">
                      {verification.submitter?.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <RoleBadge role={verification.submitter?.role as UserRole} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <div>{t(`documentTypes.${verification.document?.type}`)}</div>
                  <Badge variant="outline" className="ml-2">
                    <Clock className="mr-1 h-3 w-3" />
                    {t('status.PENDING')}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{formatSafeDate(verification.requestedAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewVerification(verification.id)}
                >
                  {t('actions.view')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

interface RoleBadgeProps {
  role: UserRole;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const colors = {
    [UserRole.ADMIN]: 'bg-purple-500',
    [UserRole.CLIENT]: 'bg-blue-500',
    [UserRole.DELIVERER]: 'bg-green-500',
    [UserRole.MERCHANT]: 'bg-orange-500',
    [UserRole.PROVIDER]: 'bg-teal-500',
  };

  const t = useTranslations('admin.verification.roles');

  return <Badge className={colors[role]}>{t(role.toLowerCase())}</Badge>;
}

function VerificationsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-10 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-20 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
