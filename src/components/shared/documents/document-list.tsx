"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentCard } from "@/components/shared/documents/document-card";
import {
  DocumentListProps,
  BaseDocument} from "@/components/shared/documents/document-types";
import { DocumentPreview } from "@/components/shared/documents/document-preview";

/**
 * A reusable component for displaying a list of documents
 */
export function DocumentList({
  documents,
  isLoading = false,
  title = "Documents",
  description = "Liste des documents",
  showStatus = true,
  onView,
  onDelete,
  onDownload,
  onApprove,
  onReject,
  emptyMessage = "Aucun document disponible."}: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<BaseDocument | null>(
    null,
  );

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

        {onApprove && selectedDocument.status === "PENDING" && (
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

        {onReject && selectedDocument.status === "PENDING" && (
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

// Ajout de ProfileDocumentsList pour compatibilité
interface ProfileDocument {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ProfileDocumentsListProps {
  documents: ProfileDocument[];
  onUpload?: () => void;
}

export function ProfileDocumentsList({
  documents,
  onUpload}: ProfileDocumentsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents du profil</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground">Aucun document trouvé</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex justify-between items-center p-2 border rounded"
              >
                <span>{doc.name}</span>
                <span className="text-sm text-muted-foreground">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
