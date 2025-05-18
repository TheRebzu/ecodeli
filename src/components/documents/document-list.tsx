'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
<<<<<<< HEAD
import { DocumentStatus, DocumentType } from '@prisma/client';
=======
import { DocumentStatus } from '@prisma/client';
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
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
import { AlertCircle, CheckCircle, Clock, Eye, FileText, Trash, X } from 'lucide-react';
<<<<<<< HEAD
import { useDocuments } from '@/hooks/use-documents';
import { useToast } from '@/components/ui/use-toast';

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
=======
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

interface DocumentListProps {
  documents: any[];
  onDelete: (documentId: string) => Promise<void>;
  isLoading: boolean;
  locale: string;
}

export default function DocumentList({
  documents,
  onDelete,
  isLoading,
  locale,
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
}: DocumentListProps) {
  const t = useTranslations('documents');
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
<<<<<<< HEAD
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
=======
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('list.emptyTitle')}</CardTitle>
          <CardDescription>{t('list.emptyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-center">
            <div>
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{t('list.noDocumentsUploaded')}</p>
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

<<<<<<< HEAD
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
=======
  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        await onDelete(documentToDelete);
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const getStatusBadgeProps = (status: DocumentStatus) => {
    switch (status) {
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
      case 'PENDING':
        return { variant: 'outline' as const, icon: <Clock className="mr-1 h-3 w-3" /> };
      case 'APPROVED':
        return {
          variant: 'default' as const,
          icon: <CheckCircle className="mr-1 h-3 w-3 text-green-500" />,
        };
      case 'REJECTED':
        return { variant: 'destructive' as const, icon: <X className="mr-1 h-3 w-3" /> };
      case 'EXPIRED':
        return { variant: 'secondary' as const, icon: <AlertCircle className="mr-1 h-3 w-3" /> };
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

      // Utiliser la nouvelle API de téléchargement avec le bon type MIME
      const downloadUrl = `/api/download?path=${encodeURIComponent(document.fileUrl)}&download=true`;

      // Créer un élément de lien temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Définir le nom du fichier à télécharger
      const fileName =
        document.filename ||
        `document-${document.type.toLowerCase()}.${document.mimeType?.split('/').pop() || 'file'}`;
      link.setAttribute('download', fileName);

      // Cliquer sur le lien pour déclencher le téléchargement
      document.body.appendChild(link);
      link.click();

      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(link);
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
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.columns.status')}</TableHead>
                <TableHead>{t('list.columns.submitted')}</TableHead>
                <TableHead className="text-right">{t('list.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map(doc => {
<<<<<<< HEAD
                const status = doc.verificationStatus || doc.status;
                const { variant, icon } = getStatusBadgeProps(status);
=======
                const { variant, icon } = getStatusBadgeProps(
                  doc.verificationStatus as DocumentStatus
                );
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant={variant} className="flex w-fit items-center">
                        {icon}
<<<<<<< HEAD
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
=======
                        {t(`status.${doc.verificationStatus.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                                onClick={() => handleDeleteClick(doc.id)}
                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">{t('list.delete')}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('list.delete')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      {selectedDocument && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t(`documentTypes.${selectedDocument.type}`)}</DialogTitle>
              <DialogDescription>
<<<<<<< HEAD
                {(selectedDocument.status === 'REJECTED' ||
                  selectedDocument.verificationStatus === 'REJECTED') &&
=======
                {selectedDocument.verificationStatus === 'REJECTED' &&
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
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
<<<<<<< HEAD

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
=======
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
            </div>

            <DialogFooter className="sm:justify-end">
              <Button
                variant="destructive"
                onClick={() => {
                  setPreviewOpen(false);
                  handleDeleteClick(selectedDocument.id);
                }}
              >
                {t('preview.delete')}
              </Button>
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
<<<<<<< HEAD
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDocument}>
              {t('deleteDialog.confirm')}
=======
            <AlertDialogTitle>{t('deleteConfirmation.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmation.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteConfirmation.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('deleteConfirmation.confirm')}
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
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
      <CardContent className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
