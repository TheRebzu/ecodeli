'use client';

import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentCard } from './document-card';
import { DocumentListProps, BaseDocument } from './document-types';
import { DocumentPreview } from './document-preview';

/**
 * A reusable component for displaying a list of documents
 */
export function DocumentList({
  documents,
  isLoading = false,
  title = 'Documents',
  description = 'Liste des documents',
  showStatus = true,
  onView,
  onDelete,
  onDownload,
  onApprove,
  onReject,
  emptyMessage = "Aucun document disponible.",
}: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<BaseDocument | null>(null);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-[180px] mb-2" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle viewing a document
  const handleViewDocument = (document: BaseDocument) => {
    setSelectedDocument(document);
  };

  // Generate actions for document preview
  const renderPreviewActions = () => {
    if (!selectedDocument) return null;
    
    return (
      <div className="flex gap-2">
        {onDownload && (
          <Button 
            variant="outline"
            onClick={() => onDownload(selectedDocument)}
          >
            Télécharger
          </Button>
        )}
        
        {onApprove && selectedDocument.status === 'PENDING' && (
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              onApprove(selectedDocument.id);
              setSelectedDocument(null);
            }}
          >
            Approuver
          </Button>
        )}
        
        {onReject && selectedDocument.status === 'PENDING' && (
          <Button 
            variant="destructive"
            onClick={() => {
              onReject(selectedDocument.id, "");
              setSelectedDocument(null);
            }}
          >
            Rejeter
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                showStatus={showStatus}
                onView={onView || handleViewDocument}
                onDelete={onDelete}
                onDownload={onDownload}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
        
        {/* Document Preview Dialog */}
        <DocumentPreview 
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          actions={renderPreviewActions()}
        />
      </CardContent>
    </Card>
  );
}
