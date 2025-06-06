'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DocumentPreviewProps } from './document-types';
import { getDocumentTypeName } from '@/utils/document-utils';
import { formatDate } from '@/utils/document-utils';
import { DownloadIcon } from 'lucide-react';

/**
 * Component for previewing document content
 */
export function DocumentPreview({
  document,
  onClose,
  showActions = true,
  actions,
}: DocumentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!document);
  }, [document]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const renderPreview = () => {
    if (!document) return null;

    if (document.mimeType?.startsWith('image/')) {
      return (
        <div className="relative w-full h-[500px]">
          <img
            src={document.fileUrl}
            alt={document.filename || getDocumentTypeName(document.type)}
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
      );
    }

    if (document.mimeType === 'application/pdf') {
      return (
        <iframe
          src={`${document.fileUrl}#toolbar=0`}
          className="w-full h-[500px]"
          title={document.filename || getDocumentTypeName(document.type)}
        />
      );
    }

    // Fallback for non-previewable documents
    return (
      <div className="flex h-40 items-center justify-center bg-muted">
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          <DownloadIcon className="h-5 w-5" />
          Voir le document
        </a>
      </div>
    );
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDocumentTypeName(document.type)}
          </DialogTitle>

          {document.rejectionReason && (
            <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">Motif de rejet:</p>
              <p>{document.rejectionReason}</p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border">{renderPreview()}</div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground">Statut</p>
              <p>{document.status || document.verificationStatus || 'Non vérifié'}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Ajouté le</p>
              <p>{formatDate(document.uploadedAt || document.createdAt)}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Expire le</p>
              <p>{document.expiryDate ? formatDate(document.expiryDate) : '-'}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Nom du fichier</p>
              <p>{document.filename || '-'}</p>
            </div>
          </div>

          {document.notes && (
            <div>
              <p className="font-semibold text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{document.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>

          {showActions && actions}
        </div>
      </DialogContent>
    </Dialog>
  );
}
