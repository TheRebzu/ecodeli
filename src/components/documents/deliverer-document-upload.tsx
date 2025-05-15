'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import DocumentUploadForm from '@/components/documents/document-upload-form';
import DocumentList from '@/components/documents/document-list';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDocuments } from '@/hooks/use-documents';
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

interface DelivererDocumentUploadProps {
  userId: string;
  locale: string;
}

export default function DelivererDocumentUpload({ userId, locale }: DelivererDocumentUploadProps) {
  const t = useTranslations('documents');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('id');
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Utiliser le hook personnalisé pour gérer les documents
  const { documents, isLoading, uploadDocument, deleteDocument, refreshDocuments } =
    useDocuments(userId);

  // Filtrer les documents par type
  const idDocuments = documents.filter(doc => doc.type === 'ID_CARD');
  const selfieDocuments = documents.filter(doc => doc.type === 'SELFIE');
  const drivingLicenseDocuments = documents.filter(doc => doc.type === 'DRIVING_LICENSE');

  // Vérifier si tous les documents requis ont été soumis
  const hasIdCard = idDocuments.length > 0;
  const hasSelfie = selfieDocuments.length > 0;
  const hasDrivingLicense = drivingLicenseDocuments.length > 0;
  const allDocumentsSubmitted = hasIdCard && hasSelfie && hasDrivingLicense;

  // Gestionnaire d'upload pour chaque type de document
  const handleUpload = async (
    fileData: { base64: string; fileName: string; fileType: string; fileSize: number },
    type: 'ID_CARD' | 'SELFIE' | 'DRIVING_LICENSE',
    notes?: string
  ) => {
    try {
      // Créer un objet File à partir des données reçues
      const fileBlob = await fetch(fileData.base64).then(r => r.blob());
      const file = new File([fileBlob], fileData.fileName, { type: fileData.fileType });

      // Simply pass the SELFIE type directly, the backend handles the conversion
      await uploadDocument(file, type, notes);

      // Message de succès
      toast({
        title: t('upload.success.title'),
        description: t('upload.success.description'),
      });

      // Rafraîchir la liste des documents
      refreshDocuments();
    } catch (error) {
      // Message d'erreur
      console.error('Upload error:', error);
      toast({
        title: t('upload.error.title'),
        description: t('upload.error.description'),
        variant: 'destructive',
      });
    }
  };

  // Gestionnaire de suppression de document
  const handleDelete = async (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        await deleteDocument(documentToDelete);

        // Message de succès
        toast({
          title: t('deleteConfirmation.success.title', { defaultValue: 'Document supprimé' }),
          description: t('deleteConfirmation.success.description', {
            defaultValue: 'Le document a été supprimé avec succès',
          }),
        });

        // Rafraîchir la liste des documents
        refreshDocuments();

        // Reset state
        setDocumentToDelete(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        // Message d'erreur
        console.error('Delete error:', error);
        toast({
          title: t('deleteConfirmation.error.title', { defaultValue: 'Erreur' }),
          description: t('deleteConfirmation.error.description', {
            defaultValue: 'Impossible de supprimer le document',
          }),
          variant: 'destructive',
        });
      }
    }
  };

  // Fonction pour obtenir le statut d'un document
  const getDocumentStatus = (documents: any[]) => {
    if (documents.length === 0) return 'missing';

    const latestDocument = documents[0];
    return latestDocument.verificationStatus.toLowerCase();
  };

  // Fonctions pour rendre les badges de statut
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge
            variant="default"
            className="flex items-center gap-1 ml-2 bg-green-500 hover:bg-green-600"
          >
            <CheckCircle className="w-3 h-3" />
            {t('status.approved')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 ml-2">
            <AlertCircle className="w-3 h-3" />
            {t('status.rejected')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="flex items-center gap-1 ml-2">
            <Clock className="w-3 h-3" />
            {t('status.pending')}
          </Badge>
        );
      case 'missing':
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1 ml-2">
            {t('status.missing')}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {allDocumentsSubmitted && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 text-green-600 dark:text-green-400" />
              {t('allDocumentsSubmitted.title')}
            </CardTitle>
            <CardDescription>{t('allDocumentsSubmitted.description')}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="id" className="relative">
            {t('idCard.tab')}
            {renderStatusBadge(getDocumentStatus(idDocuments))}
          </TabsTrigger>
          <TabsTrigger value="selfie" className="relative">
            {t('selfie.tab')}
            {renderStatusBadge(getDocumentStatus(selfieDocuments))}
          </TabsTrigger>
          <TabsTrigger value="license" className="relative">
            {t('drivingLicense.tab')}
            {renderStatusBadge(getDocumentStatus(drivingLicenseDocuments))}
          </TabsTrigger>
        </TabsList>

        {/* Onglet Carte d'identité */}
        <TabsContent value="id">
          <Card>
            <CardHeader>
              <CardTitle>{t('idCard.title')}</CardTitle>
              <CardDescription>{t('idCard.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {idDocuments.length > 0 ? (
                <DocumentList
                  documents={idDocuments}
                  onDelete={handleDelete}
                  isLoading={isLoading}
                  locale={locale}
                />
              ) : (
                <DocumentUploadForm
                  onUpload={fileData => handleUpload(fileData, 'ID_CARD')}
                  isLoading={isLoading}
                  label={t('idCard.uploadLabel')}
                  acceptedFileTypes={{ 'image/*': ['.jpeg', '.jpg', '.png'] }}
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              )}
            </CardContent>
            {idDocuments.length > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Permettre de remplacer le document si nécessaire
                    if (idDocuments[0].verificationStatus === 'REJECTED') {
                      handleDelete(idDocuments[0].id);
                    }
                  }}
                  disabled={idDocuments[0].verificationStatus !== 'REJECTED'}
                >
                  {idDocuments[0].verificationStatus === 'REJECTED'
                    ? t('documents.replaceRejected')
                    : t('documents.alreadySubmitted')}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Onglet Selfie */}
        <TabsContent value="selfie">
          <Card>
            <CardHeader>
              <CardTitle>{t('selfie.title')}</CardTitle>
              <CardDescription>{t('selfie.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {selfieDocuments.length > 0 ? (
                <DocumentList
                  documents={selfieDocuments}
                  onDelete={handleDelete}
                  isLoading={isLoading}
                  locale={locale}
                />
              ) : (
                <DocumentUploadForm
                  onUpload={fileData => handleUpload(fileData, 'SELFIE')}
                  isLoading={isLoading}
                  label={t('selfie.uploadLabel')}
                  acceptedFileTypes={{ 'image/*': ['.jpeg', '.jpg', '.png'] }}
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              )}
            </CardContent>
            {selfieDocuments.length > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selfieDocuments[0].verificationStatus === 'REJECTED') {
                      handleDelete(selfieDocuments[0].id);
                    }
                  }}
                  disabled={selfieDocuments[0].verificationStatus !== 'REJECTED'}
                >
                  {selfieDocuments[0].verificationStatus === 'REJECTED'
                    ? t('documents.replaceRejected')
                    : t('documents.alreadySubmitted')}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Onglet Permis de conduire */}
        <TabsContent value="license">
          <Card>
            <CardHeader>
              <CardTitle>{t('drivingLicense.title')}</CardTitle>
              <CardDescription>{t('drivingLicense.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {drivingLicenseDocuments.length > 0 ? (
                <DocumentList
                  documents={drivingLicenseDocuments}
                  onDelete={handleDelete}
                  isLoading={isLoading}
                  locale={locale}
                />
              ) : (
                <DocumentUploadForm
                  onUpload={fileData => handleUpload(fileData, 'DRIVING_LICENSE')}
                  isLoading={isLoading}
                  label={t('drivingLicense.uploadLabel')}
                  acceptedFileTypes={{ 'image/*': ['.jpeg', '.jpg', '.png'] }}
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              )}
            </CardContent>
            {drivingLicenseDocuments.length > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (drivingLicenseDocuments[0].verificationStatus === 'REJECTED') {
                      handleDelete(drivingLicenseDocuments[0].id);
                    }
                  }}
                  disabled={drivingLicenseDocuments[0].verificationStatus !== 'REJECTED'}
                >
                  {drivingLicenseDocuments[0].verificationStatus === 'REJECTED'
                    ? t('documents.replaceRejected')
                    : t('documents.alreadySubmitted')}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmation.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmation.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteConfirmation.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('deleteConfirmation.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
