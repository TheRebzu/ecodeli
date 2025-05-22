'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, Eye, FileText, X } from 'lucide-react';

export default function DocumentList() {
  const t = useTranslations('documents');
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const locale = 'fr'; // Set this based on your app's locale state

  const { data: documents, isLoading, isError, refetch } = api.auth.getUserDocuments.useQuery();

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-center">
            <div>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h3 className="mt-2 text-lg font-semibold">{t('list.errorTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('list.errorDescription')}</p>
              <Button onClick={() => refetch()} className="mt-4">
                {t('list.retry')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-center">
            <div>
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-semibold">{t('list.emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('list.emptyDescription')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
  };

  const getStatusBadgeProps = (status: DocumentStatus) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'outline' as const, icon: <Clock className="mr-1 h-3 w-3" /> };
      case 'APPROVED':
        return { variant: 'success' as const, icon: <CheckCircle className="mr-1 h-3 w-3" /> };
      case 'REJECTED':
        return { variant: 'destructive' as const, icon: <X className="mr-1 h-3 w-3" /> };
      case 'EXPIRED':
        return { variant: 'warning' as const, icon: <AlertCircle className="mr-1 h-3 w-3" /> };
      default:
        return { variant: 'outline' as const, icon: null };
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: locale === 'fr' ? fr : enUS,
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.columns.type')}</TableHead>
                <TableHead>{t('list.columns.status')}</TableHead>
                <TableHead>{t('list.columns.submitted')}</TableHead>
                <TableHead>{t('list.columns.expires')}</TableHead>
                <TableHead className="text-right">{t('list.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map(doc => {
                const { variant, icon } = getStatusBadgeProps(doc.status as DocumentStatus);
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{t(`documentTypes.${doc.type}`)}</TableCell>
                    <TableCell>
                      <Badge variant={variant} className="flex w-fit items-center">
                        {icon}
                        {t(`status.${doc.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        formatDate(doc.expiryDate)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">{t('list.view')}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('list.view')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {t('list.totalDocuments', { count: documents.length })}
          </p>
        </CardFooter>
      </Card>

      {/* Document Preview Dialog */}
      {selectedDocument && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t(`documentTypes.${selectedDocument.type}`)}</DialogTitle>
              <DialogDescription>
                {selectedDocument.status === 'REJECTED' && selectedDocument.rejectionReason && (
                  <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm">
                    <p className="font-semibold text-destructive">
                      {t('preview.rejectionReason')}:
                    </p>
                    <p>{selectedDocument.rejectionReason}</p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border">
                {selectedDocument.mimeType?.startsWith('image/') ? (
                  <img
                    src={`/api/documents/${selectedDocument.id}`}
                    alt={t(`documentTypes.${selectedDocument.type}`)}
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted">
                    <a
                      href={`/api/documents/${selectedDocument.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
                    >
                      <FileText className="h-5 w-5" />
                      {t('preview.viewDocument')}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.status')}</p>
                  <p>{t(`status.${selectedDocument.status}`)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.submitted')}</p>
                  <p>{formatDate(selectedDocument.createdAt)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.expires')}</p>
                  <p>
                    {selectedDocument.expiryDate ? formatDate(selectedDocument.expiryDate) : '-'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.fileName')}</p>
                  <p>{selectedDocument.originalName || '-'}</p>
                </div>
              </div>

              {selectedDocument.description && (
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.description')}</p>
                  <p className="mt-1 text-sm">{selectedDocument.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end">
              <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
                {t('preview.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Loading skeleton for document list
function DocumentListSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
