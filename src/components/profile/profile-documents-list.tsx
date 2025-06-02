'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfileDocuments } from '@/hooks/use-profile-documents';
import { DocumentType, UserRole, VerificationStatus } from '@prisma/client';
import { useProfile } from '@/hooks/use-profile';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileIcon,
  FileUpIcon,
  FileCheckIcon,
  FilePlusIcon,
  TrashIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useProfileStore } from '@/store/use-profile-store';

// Fonction pour afficher le statut de vérification avec une couleur spécifique
const getVerificationBadge = (status: VerificationStatus) => {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    APPROVED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusLabels = {
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
  };

  return <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>;
};

// Fonction pour afficher un document
const DocumentItem = ({
  document,
  onDelete,
}: {
  document: any;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg mb-2">
      <div className="flex items-center">
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md mr-3">
          <FileIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-medium">{document.filename}</div>
          <div className="text-xs text-muted-foreground flex items-center space-x-2">
            <span>{formatFileSize(document.fileSize)}</span>
            <span className="inline-block h-1 w-1 bg-muted-foreground rounded-full"></span>
            <span>Ajouté le {formatDate(document.uploadedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getVerificationBadge(document.verificationStatus)}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(document.id)}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Import des fonctions partagées depuis document-utils
import { getDocumentTypeName, getRequiredDocumentTypesByRole } from '@/lib/document-utils';

export function ProfileDocumentsList() {
  const [uploadType, setUploadType] = useState<DocumentType | null>(null);
  const { documents, isLoadingDocuments, deleteDocument, hasDocumentOfType, getDocumentsByType } =
    useProfileDocuments();
  const { profile } = useProfile();
  const { selectedDocumentType, setSelectedDocumentType } = useProfileStore();

  // Gérer la suppression d'un document
  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      deleteDocument(id);
    }
  };

  // Démarrer le processus d'upload
  const handleUploadClick = (type: DocumentType) => {
    setUploadType(type);
    setSelectedDocumentType(type);
    // Note: L'upload réel serait géré dans un composant modal ou formulaire
  };

  if (isLoadingDocuments || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-7 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const requiredDocuments = getRequiredDocumentTypes(profile.role);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {requiredDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p>Aucun document requis pour votre profil.</p>
          </div>
        ) : (
          <>
            {requiredDocuments.map(docType => {
              const typeDocuments = getDocumentsByType(docType);
              const hasDocument = typeDocuments.length > 0;

              return (
                <div key={docType} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{getDocumentTypeName(docType)}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUploadClick(docType)}
                      className="flex items-center"
                    >
                      <FilePlusIcon className="h-4 w-4 mr-2" />
                      {hasDocument ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                  </div>

                  {hasDocument ? (
                    typeDocuments.map((doc: any) => (
                      <DocumentItem key={doc.id} document={doc} onDelete={handleDeleteDocument} />
                    ))
                  ) : (
                    <div className="flex items-center p-3 border border-dashed border-border rounded-lg mb-2 text-muted-foreground">
                      <AlertTriangleIcon className="h-5 w-5 mr-2 text-yellow-500" />
                      <span>Document requis non fourni</span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start pt-0">
        <Separator className="mb-4" />
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>Note:</strong> Les documents sont vérifiés par notre équipe avant validation.
          </p>
          <p>Formats acceptés: PDF, JPG, PNG (Max 10MB)</p>
        </div>
      </CardFooter>
    </Card>
  );
}
