'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, Eye, FileText, RefreshCcw, Trash, X } from 'lucide-react';
import { useDocuments } from '@/hooks/use-documents';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';

interface DocumentListProps {
  documents?: any[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  locale?: string;
  userId?: string;
}

export default function DocumentList({
  documents: externalDocuments,
  isLoading: externalLoading,
  onDelete,
  locale = 'fr',
  userId,
}: DocumentListProps) {
  const t = useTranslations('documents');
  const tList = useTranslations('list');
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any | null>(null);

  // Utiliser le hook useDocuments seulement si aucun document n'est passé en prop
  const {
    documents: hookDocuments,
    isLoading: hookLoading,
    deleteDocument,
    refreshDocuments,
  } = !externalDocuments
    ? useDocuments(userId)
    : { documents: [], isLoading: false, deleteDocument: null, refreshDocuments: () => {} };

  // Utiliser les documents passés en prop ou ceux du hook
  const documents = externalDocuments || hookDocuments;
  const isLoading = externalLoading || hookLoading;

  const handleDelete = onDelete || deleteDocument;

  if (isLoading) {
    return <DocumentListSkeleton />;
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
              <h3 className="mt-2 text-lg font-semibold">{tList('emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{tList('emptyDescription')}</p>
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

  const handleDeleteDocument = (document: any) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = () => {
    if (handleDelete && documentToDelete) {
      handleDelete(documentToDelete.id);
    }
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status?.toUpperCase()) {
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

  const downloadDocument = async (document: any) => {
    try {
      // Afficher un message de chargement
      toast({
        title: t('download.preparing'),
        description: t('download.starting'),
      });

      // Utiliser tRPC pour télécharger le document
      const result = await api.document.downloadDocument.fetch({ 
        filePath: document.fileUrl 
      });
      
      // Créer un blob à partir des données base64
      const binaryData = atob(result.fileData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.contentType });
      
      // Créer une URL pour le Blob
      const url = URL.createObjectURL(blob);
      
      // Créer un élément de lien temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', result.fileName);
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: t('download.success'),
        description: t('download.completed'),
      });
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      toast({
        title: t('download.error'),
        description: t('download.failed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('list.title')}</CardTitle>
              <CardDescription>{t('list.description')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDocuments}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <RefreshCcw className="h-4 w-4" />
              {t('list.refresh')}
            </Button>
          </div>
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
                const status = doc.verificationStatus || doc.status;
                const { variant, icon } = getStatusBadgeProps(status);
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{t(`documentTypes.${doc.type}`)}</TableCell>
                    <TableCell>
                      <Badge variant={variant} className="flex w-fit items-center">
                        {icon}
                        {t(`status.${status?.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(doc.uploadedAt || doc.createdAt)}</TableCell>
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc)}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">{t('list.delete')}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('list.delete')}</TooltipContent>
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
                {(selectedDocument.status === 'REJECTED' ||
                  selectedDocument.verificationStatus === 'REJECTED') &&
                  selectedDocument.rejectionReason && (
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
                    src={selectedDocument.fileUrl}
                    alt={t(`documentTypes.${selectedDocument.type}`)}
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted">
                    <a
                      href={selectedDocument.fileUrl}
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
                  <p>
                    {t(
                      `status.${(selectedDocument.verificationStatus || selectedDocument.status)?.toLowerCase()}`
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.submitted')}</p>
                  <p>{formatDate(selectedDocument.uploadedAt || selectedDocument.createdAt)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.expires')}</p>
                  <p>
                    {selectedDocument.expiryDate ? formatDate(selectedDocument.expiryDate) : '-'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.fileName')}</p>
                  <p>{selectedDocument.filename || '-'}</p>
                </div>
              </div>

              {selectedDocument.notes && (
                <div>
                  <p className="font-semibold text-muted-foreground">{t('preview.description')}</p>
                  <p className="mt-1 text-sm">{selectedDocument.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end">
              <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
                {t('preview.close')}
              </Button>
              {selectedDocument && (
                <Button
                  variant="outline"
                  onClick={() => downloadDocument(selectedDocument)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {t('preview.download')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDocument}>
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
