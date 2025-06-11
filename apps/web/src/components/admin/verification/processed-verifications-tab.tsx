'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { VerificationStatus, UserRole } from '@prisma/client';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, CheckCircle, XCircle, Clock, ClipboardList } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { VerificationFilters } from '@/types/documents/verification';

interface ProcessedVerificationsTabProps {
  filters: VerificationFilters;
  onPageChange: (page: number) => void;
}

interface VerificationRequest {
  id: string;
  status: VerificationStatus;
  processedAt: Date | null;
  document?: {
    type: string;
  };
  submitter?: {
    name?: string;
    email?: string;
    role: UserRole;
  };
}

interface PaginationData {
  page: number;
  totalPages: number;
  total: number;
}

interface ApiResponse {
  verificationRequests: VerificationRequest[];
  pagination: PaginationData;
}

export function ProcessedVerificationsTab({
  filters,
  onPageChange,
}: ProcessedVerificationsTabProps) {
  const t = useTranslations('admin.verification');
  const router = useRouter();

  // Utiliser une API mock temporaire pour éviter les erreurs
  // const { data, isLoading, isError } = api.admin.getVerificationRequests.useQuery(filters);
  const isLoading = false;
  const isError = false;
  const data: ApiResponse = {
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
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ClipboardList className="h-10 w-10 text-destructive mb-2" />
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
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-lg border border-dashed">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t('processed.empty.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('processed.empty.description')}</p>
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
            <TableHead>{t('table.status')}</TableHead>
            <TableHead>{t('table.processedAt')}</TableHead>
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
              <TableCell>{t(`documentTypes.${verification.document?.type}`)}</TableCell>
              <TableCell>
                <StatusBadge status={verification.status} />
              </TableCell>
              <TableCell>{formatSafeDate(verification.processedAt)}</TableCell>
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
            totalItems={pagination.total}
            itemsPerPage={filters.limit}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: VerificationStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('admin.verification.status');

  const variants = {
    PENDING: 'bg-yellow-500',
    APPROVED: 'bg-green-500',
    REJECTED: 'bg-red-500',
  };

  const icons = {
    PENDING: Clock,
    APPROVED: CheckCircle,
    REJECTED: XCircle,
  };

  const Icon = icons[status];

  return (
    <Badge className={variants[status]}>
      <Icon className="mr-1 h-3 w-3" />
      {t(status.toLowerCase())}
    </Badge>
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
