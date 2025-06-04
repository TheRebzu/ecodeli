'use client';

import { useState } from 'react';
import { useVerificationStore } from '@/store/use-verification-store';
import { useVerification } from '@/hooks/use-verification';
import { UserDocument, VerificationStatus } from '@/types/verification';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  File,
  FileText,
  FileIcon,
  FileImage,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatFileSize, getFileIcon } from '@/lib/file-utils';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  title?: string;
  description?: string;
  showStatus?: boolean;
  canDelete?: boolean;
  documents?: UserDocument[];
  className?: string;
  documentStatuses?: Record<string, VerificationStatus>; // Map des statuts par documentId
}

export function DocumentList({
  title = 'Documents téléchargés',
  description = 'Liste des documents soumis pour vérification',
  showStatus = true,
  canDelete = true,
  documents: externalDocuments,
  className,
  documentStatuses,
}: DocumentListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  
  // Utiliser les documents du store si aucun n'est fourni en prop
  const storeDocuments = useVerificationStore((state) => state.pendingDocuments);
  const removeDocument = useVerificationStore((state) => state.removeDocument);
  const documents = externalDocuments || storeDocuments;
  
  const { deleteDocument } = useVerification();
  
  // Gérer la confirmation de suppression
  const handleDelete = async () => {
    if (!selectedDocument) return;
    
    try {
      await deleteDocument(selectedDocument.documentId);
      removeDocument(selectedDocument.documentId);
      setDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };
  
  const confirmDelete = (document: UserDocument) => {
    setSelectedDocument(document);
    setDialogOpen(true);
  };
  
  // Obtenir le bon icône en fonction du type de fichier
  const renderFileIcon = (document: UserDocument) => {
    const fileName = document.fileName || '';
    if (fileName.endsWith('.pdf')) return <FileIcon className="h-5 w-5" />;
    if (/\.(jpg|jpeg|png|gif)$/i.test(fileName)) return <FileImage className="h-5 w-5" />;
    if (fileName.endsWith('.txt') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };
  
  // Formatter le type de document pour l'affichage
  const formatDocumentType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  
  // Rendu du statut de vérification
  const renderStatus = (status?: VerificationStatus) => {
    if (!status || status === VerificationStatus.PENDING) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" /> En attente
        </Badge>
      );
    }
    
    if (status === VerificationStatus.APPROVED) {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" /> Approuvé
        </Badge>
      );
    }
    
    if (status === VerificationStatus.REJECTED) {
      return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> Rejeté
        </Badge>
      );
    }
    
    return null;
  };

  // Debug log for document statuses
  console.debug('[DocumentList] documents:', documents);
  console.debug('[DocumentList] documentStatuses:', documentStatuses);

  if (!documents.length) {
    return (
      <div className={cn("space-y-2", className)}>
        {title && <h3 className="text-sm font-medium">{title}</h3>}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Aucun document</p>
            <p className="text-xs text-muted-foreground mt-1">
              Téléchargez des documents à faire vérifier
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {title && <h3 className="text-sm font-medium">{title}</h3>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      <div className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.documentId}
            className="border rounded-md p-3 bg-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {renderFileIcon(document)}
                <div>
                  <h4 className="text-sm font-medium truncate max-w-[200px]">
                    {document.fileName || formatDocumentType(document.documentType)}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatDocumentType(document.documentType)}
                    {document.fileSize && ` • ${formatFileSize(document.fileSize)}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {showStatus && renderStatus(documentStatuses?.[document.documentId])}
                
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8"
                >
                  <Link href={document.documentUrl} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                    onClick={() => confirmDelete(document)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer ce document ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}