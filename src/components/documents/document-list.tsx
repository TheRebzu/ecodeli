'use client';

import { useDocuments } from '@/hooks/use-documents';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileIcon, Trash2, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function DocumentList() {
  const t = useTranslations('Documents.List');
  const { userDocuments, isLoadingUserDocs, deleteDocument, isDeleting } = useDocuments();

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
  };

  if (isLoadingUserDocs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userDocuments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <FileIcon className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{t('empty')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PENDING:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('status.pending')}
          </Badge>
        );
      case DocumentStatus.APPROVED:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('status.approved')}
          </Badge>
        );
      case DocumentStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {t('status.rejected')}
          </Badge>
        );
    }
  };

  const getDocumentTypeName = (type: DocumentType) => {
    return t(`types.${type.toLowerCase()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {userDocuments.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-md">
              <div className="flex items-center space-x-4">
                <FileIcon className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-medium">{doc.name}</h4>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{getDocumentTypeName(doc.type)}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(doc.uploadedAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(doc.status)}

                    {doc.status === DocumentStatus.REJECTED && doc.rejectionReason && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="ml-2 text-xs underline cursor-help">
                              {t('rejectionReason')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{doc.rejectionReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">{t('view')}</span>
                  </a>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="sr-only">{t('delete')}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteDialog.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        {t('deleteDialog.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
