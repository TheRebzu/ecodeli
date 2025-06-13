"use client";

import { formatDate, formatFileSize } from "@/utils/document-utils";
import { Button } from "@/components/ui/button";
import { TrashIcon, EyeIcon, DownloadIcon } from "lucide-react";
import { getDocumentTypeName } from "@/utils/document-utils";
import { DocumentStatusBadge } from "@/components/shared/documents/document-status-badge";
import { DocumentTypeIcon } from "@/components/shared/documents/document-type-icon";
import { DocumentCardProps } from "@/components/shared/documents/document-types";

/**
 * A reusable card component for displaying document information
 */
export function DocumentCard({
  document,
  onView,
  onDelete,
  onDownload,
  showActions = true,
  showStatus = true,
  compact = false,
}: DocumentCardProps) {
  if (!document) return null;

  const status = document.verificationStatus || document.status;

  // Compact view for more condensed UI
  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 border border-border rounded-lg mb-1">
        <div className="flex items-center">
          <DocumentTypeIcon type={document.type} size={4} />
          <div className="ml-2">
            <div className="font-medium text-sm">
              {getDocumentTypeName(document.type)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showStatus && status && (
            <DocumentStatusBadge status={status} variant="compact" />
          )}
          {showActions && (
            <>
              {onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onView(document)}
                >
                  <EyeIcon className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onDelete(document.id)}
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Standard view
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg mb-2">
      <div className="flex items-center">
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md mr-3">
          <DocumentTypeIcon type={document.type} />
        </div>
        <div>
          <div className="font-medium">
            {document.filename || getDocumentTypeName(document.type)}
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-2">
            {document.fileSize && (
              <>
                <span>{formatFileSize(document.fileSize)}</span>
                <span className="inline-block h-1 w-1 bg-muted-foreground rounded-full"></span>
              </>
            )}
            <span>
              Ajouté le {formatDate(document.uploadedAt || document.createdAt)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showStatus && status && <DocumentStatusBadge status={status} />}

        {showActions && (
          <>
            {onView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onView(document)}
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
            )}

            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDownload(document)}
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(document.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
