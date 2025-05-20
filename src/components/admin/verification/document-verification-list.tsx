'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { format } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

export default function DocumentVerificationList() {
  const t = useTranslations('Admin.verification');
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<DocumentStatus>('PENDING');
  const locale = 'fr'; // Set this based on your app's locale state

  // Query documents with filters for status
  const {
    data: documents,
    isLoading,
    isError,
    refetch,
  } = api.admin.getPendingDocuments.useQuery({
    status: activeTab,
  });

  // Mutation for verifying documents
  const verifyDocument = api.auth.verifyDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('documents.verifySuccess.title'),
        description: t('documents.verifySuccess.description'),
        variant: 'default',
      });
      setVerificationOpen(false);
      refetch();
    },
    onError: error => {
      toast({
        title: t('documents.verifyError.title'),
        description: error.message || t('documents.verifyError.description'),
        variant: 'destructive',
      });
    },
  });

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
  };

  const handleOpenVerification = (document: any, action: 'approve' | 'reject') => {
    setSelectedDocument(document);
    setRejectionReason('');
    setVerificationOpen(true);
  };

  const handleVerify = async (approved: boolean) => {
    if (!selectedDocument) return;

    try {
      await verifyDocument.mutate({
        documentId: selectedDocument.id,
        status: approved ? 'APPROVED' : 'REJECTED',
        notes: approved ? undefined : rejectionReason,
      });
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'PPP', {
      locale: locale === 'fr' ? fr : enUS,
    });
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

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('documents.title')}</CardTitle>
          <CardDescription>{t('documents.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-center">
            <div>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h3 className="mt-2 text-lg font-semibold">{t('documents.errorTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('documents.errorDescription')}</p>
              <Button onClick={() => refetch()} className="mt-4">
                {t('documents.retry')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('documents.title')}</CardTitle>
          <CardDescription>{t('documents.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="PENDING"
            value={activeTab}
            onValueChange={value => setActiveTab(value as DocumentStatus)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="PENDING">
                {t('documents.tabs.pending')}{' '}
                {documents?.filter(doc => doc.status === 'PENDING').length > 0 && (
                  <Badge className="ml-2">
                    {documents?.filter(doc => doc.status === 'PENDING').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="APPROVED">{t('documents.tabs.approved')}</TabsTrigger>
              <TabsTrigger value="REJECTED">{t('documents.tabs.rejected')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {documents && documents.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-center">
                  <div>
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">
                      {t(`documents.empty.${activeTab.toLowerCase()}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`documents.empty.${activeTab.toLowerCase()}.description`)}
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('documents.columns.user')}</TableHead>
                      <TableHead>{t('documents.columns.type')}</TableHead>
                      <TableHead>{t('documents.columns.submitted')}</TableHead>
                      <TableHead>{t('documents.columns.expires')}</TableHead>
                      <TableHead className="text-right">{t('documents.columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents?.map(doc => {
                      const { variant, icon } = getStatusBadgeProps(doc.status as DocumentStatus);
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {doc.user?.name || '-'}
                            <div className="text-xs text-muted-foreground">{doc.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span>{t(`documentTypes.${doc.type}`)}</span>
                              <Badge variant={variant} className="flex w-fit items-center">
                                {icon}
                                {t(`status.${doc.status}`)}
                              </Badge>
                            </div>
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
                                      <span className="sr-only">{t('documents.view')}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('documents.view')}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {doc.status === 'PENDING' && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-green-600"
                                          onClick={() => handleOpenVerification(doc, 'approve')}
                                        >
                                          <ThumbsUp className="h-4 w-4" />
                                          <span className="sr-only">{t('documents.approve')}</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('documents.approve')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive"
                                          onClick={() => handleOpenVerification(doc, 'reject')}
                                        >
                                          <ThumbsDown className="h-4 w-4" />
                                          <span className="sr-only">{t('documents.reject')}</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('documents.reject')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {documents ? t('documents.totalDocuments', { count: documents.length }) : ''}
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
                      {t('documents.preview.rejectionReason')}:
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
                      {t('documents.preview.viewDocument')}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">
                    {t('documents.preview.user')}
                  </p>
                  <p>{selectedDocument.user?.name || '-'}</p>
                  <p className="text-xs text-muted-foreground">{selectedDocument.user?.email}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">
                    {t('documents.preview.status')}
                  </p>
                  <p>{t(`status.${selectedDocument.status}`)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">
                    {t('documents.preview.submitted')}
                  </p>
                  <p>{formatDate(selectedDocument.createdAt)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">
                    {t('documents.preview.expires')}
                  </p>
                  <p>
                    {selectedDocument.expiryDate ? formatDate(selectedDocument.expiryDate) : '-'}
                  </p>
                </div>
              </div>

              {selectedDocument.description && (
                <div>
                  <p className="font-semibold text-muted-foreground">
                    {t('documents.preview.description')}
                  </p>
                  <p className="mt-1 text-sm">{selectedDocument.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end">
              {selectedDocument.status === 'PENDING' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setPreviewOpen(false);
                      handleOpenVerification(selectedDocument, 'reject');
                    }}
                    className="mr-2"
                  >
                    {t('documents.reject')}
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setPreviewOpen(false);
                      handleVerify(true);
                    }}
                  >
                    {t('documents.approve')}
                  </Button>
                </>
              )}
              {selectedDocument.status !== 'PENDING' && (
                <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
                  {t('documents.preview.close')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Verification Dialog */}
      {selectedDocument && (
        <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('documents.verification.title')}</DialogTitle>
              <DialogDescription>{t('documents.verification.description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="font-medium">{t('documents.verification.documentDetails')}:</p>
                <p className="text-sm">
                  <span className="font-semibold">{t('documents.columns.type')}:</span>{' '}
                  {t(`documentTypes.${selectedDocument.type}`)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">{t('documents.columns.user')}:</span>{' '}
                  {selectedDocument.user?.name} ({selectedDocument.user?.email})
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  {t('documents.verification.rejectionReason')}
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder={t('documents.verification.rejectionReasonPlaceholder')}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="h-20"
                />
                <p className="text-xs text-muted-foreground">
                  {t('documents.verification.rejectionReasonHelp')}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVerificationOpen(false)}>
                {t('documents.verification.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleVerify(false)}
                disabled={verifyDocument.isLoading}
              >
                {verifyDocument.isLoading
                  ? t('documents.verification.processing')
                  : t('documents.verification.reject')}
              </Button>
              <Button
                variant="default"
                onClick={() => handleVerify(true)}
                disabled={verifyDocument.isLoading}
              >
                {verifyDocument.isLoading
                  ? t('documents.verification.processing')
                  : t('documents.verification.approve')}
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
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
