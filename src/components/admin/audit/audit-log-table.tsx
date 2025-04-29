import { useState } from 'react';
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
import { ChevronLeft, ChevronRight, Eye, Filter, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogDetails } from './audit-log-details';

// Type pour les logs d'audit
interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  changes: Record<string, any> | null;
  createdAt: Date;
  performedBy: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface AuditLogTableProps {
  logs: AuditLog[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

export function AuditLogTable({
  logs,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
}: AuditLogTableProps) {
  const t = useTranslations('admin.audit');
  const router = useRouter();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Formater l'action du log
  const formatAction = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { label: t('actions.create'), variant: 'success' as const };
      case 'UPDATE':
        return { label: t('actions.update'), variant: 'warning' as const };
      case 'DELETE':
        return { label: t('actions.delete'), variant: 'destructive' as const };
      case 'STATUS_CHANGED':
        return { label: t('actions.statusChanged'), variant: 'info' as const };
      case 'APPLICATION_ADDED':
        return { label: t('actions.applicationAdded'), variant: 'info' as const };
      case 'APPLICATION_STATUS_UPDATED':
        return { label: t('actions.applicationStatusUpdated'), variant: 'warning' as const };
      default:
        return { label: action, variant: 'default' as const };
    }
  };

  // Formater le type d'entité
  const formatEntityType = (type: string) => {
    switch (type) {
      case 'announcement':
        return t('entityTypes.announcement');
      case 'user':
        return t('entityTypes.user');
      case 'delivery':
        return t('entityTypes.delivery');
      default:
        return type;
    }
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil(totalCount / pageSize);

  // Afficher les détails d'un log
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
  };

  // Naviguer vers l'entité concernée
  const handleNavigateToEntity = (log: AuditLog) => {
    if (log.entityType === 'announcement') {
      router.push(`/admin/announcements/${log.entityId}`);
    } else if (log.entityType === 'user') {
      router.push(`/admin/users/${log.entityId}`);
    }
    // Ajouter d'autres types d'entités selon les besoins
  };

  // Fermer la modale de détails
  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  // Afficher un placeholder pendant le chargement
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('title')}</CardTitle>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('filter')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.action')}</TableHead>
                  <TableHead>{t('columns.entityType')}</TableHead>
                  <TableHead>{t('columns.performedBy')}</TableHead>
                  <TableHead>{t('columns.date')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t('noLogs')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => {
                    const { label, variant } = formatAction(log.action);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant={variant}>{label}</Badge>
                        </TableCell>
                        <TableCell>{formatEntityType(log.entityType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.performedBy.image && (
                              <img
                                src={log.performedBy.image}
                                alt={log.performedBy.name}
                                className="h-8 w-8 rounded-full"
                              />
                            )}
                            <div>
                              <div className="font-medium">{log.performedBy.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {log.performedBy.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.createdAt), 'PPp', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t('actions.open')}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(log)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('actions.viewDetails')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleNavigateToEntity(log)}>
                                {t('actions.goToEntity')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('previous')}
              </Button>
              <div className="text-sm">
                {t('pagination', {
                  current: currentPage,
                  total: totalPages,
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                {t('next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLog && <AuditLogDetails log={selectedLog} onClose={handleCloseDetails} />}
    </>
  );
}
