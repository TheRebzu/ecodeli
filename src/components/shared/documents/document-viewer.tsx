"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Download, Eye, FileText, Image, MessageSquare, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";
import { DocumentStatus } from "@prisma/client";

interface DocumentViewerProps {
  documentId: string;
  onClose?: () => void;
  onValidate?: (documentId: string, status: 'approved' | 'rejected', comment?: string) => void;
  canValidate?: boolean;
}

interface DocumentData {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  metadata?: {
    size: number;
    pages?: number;
    dimensions?: { width: number; height: number };
  };
  validationComment?: string;
  validatedAt?: Date;
  validatedBy?: string;
}

export default function DocumentViewer({ 
  documentId, 
  onClose, 
  onValidate, 
  canValidate = false 
}: DocumentViewerProps) {
  const t = useTranslations("documents");
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationComment, setValidationComment] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Utiliser tRPC pour récupérer le document
  const { data: documentData, error: documentError, isLoading } = api.document.getById.useQuery({
    id: documentId
  });

  // Mutation pour valider un document
  const validateDocumentMutation = api.document.validate.useMutation({
    onSuccess: () => {
      toast.success(t("validation.success"));
      // Rafraîchir les données du document
      api.document.getById.invalidate({ id: documentId });
    },
    onError: (error) => {
      toast.error(error.message || t("validation.error"));
    }
  });

  // Charger les données du document
  useEffect(() => {
    if (documentError) {
      setError(t("viewer.errorLoading"));
      console.error("Erreur lors du chargement du document:", documentError);
      return;
    }

    if (documentData) {
      // Transformer les données de l'API en format DocumentData
      const mappedDocument: DocumentData = {
        id: documentData.id,
        fileName: documentData.fileName,
        fileType: documentData.fileType,
        fileUrl: documentData.fileUrl,
        uploadedAt: new Date(documentData.uploadedAt),
        status: mapDocumentStatus(documentData.status),
        description: documentData.description || undefined,
        metadata: {
          size: documentData.fileSize,
          pages: documentData.metadata?.pages,
          dimensions: documentData.metadata?.dimensions ? {
            width: documentData.metadata.dimensions.width,
            height: documentData.metadata.dimensions.height
          } : undefined
        },
        validationComment: documentData.validationComment || undefined,
        validatedAt: documentData.validatedAt ? new Date(documentData.validatedAt) : undefined,
        validatedBy: documentData.validatedBy?.name || undefined
      };
      
      setDocument(mappedDocument);
    }
  }, [documentData, documentError, t]);

  // Fonction pour mapper le statut du document
  const mapDocumentStatus = (status: DocumentStatus): 'pending' | 'approved' | 'rejected' => {
    switch (status) {
      case 'APPROVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'PENDING':
      default:
        return 'pending';
    }
  };

  const handleValidation = async (status: 'approved' | 'rejected') => {
    if (!document || !onValidate) return;
    
    if (status === 'rejected' && !validationComment.trim()) {
      toast.error(t("validation.commentRequired"));
      return;
    }

    try {
      setIsValidating(true);
      
      // Utiliser la mutation tRPC au lieu de la fonction onValidate
      await validateDocumentMutation.mutateAsync({
        documentId: document.id,
        status: status === 'approved' ? 'APPROVED' : 'REJECTED',
        comment: validationComment || undefined
      });
      
      // Appeler onValidate si fourni pour compatibilité
      onValidate(document.id, status, validationComment);
      
      // Mettre à jour le statut local
      setDocument(prev => prev ? {
        ...prev,
        status,
        validationComment,
        validatedAt: new Date()
      } : null);
    } catch (err) {
      // L'erreur est déjà gérée par la mutation
      console.error("Erreur lors de la validation:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownload = () => {
    if (!document) return;
    
    const link = window.document.createElement('a');
    link.href = document.fileUrl;
    link.download = document.fileName;
    link.click();
    
    toast.success(t("viewer.downloadStarted"));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const renderDocumentPreview = () => {
    if (!document) return null;

    const isImage = document.fileType.startsWith('image/');
    const isPDF = document.fileType === 'application/pdf';

    if (isImage) {
      return (
        <div className="relative bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
          <div className="relative" style={{ transform: `scale(${zoom / 100})` }}>
            <img
              src={document.fileUrl}
              alt={document.fileName}
              className="max-w-full max-h-full object-contain"
              onError={() => setError(t("viewer.errorLoadingPreview"))}
            />
          </div>
          
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{t("viewer.pdfPreview")}</p>
            <Button onClick={handleDownload} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              {t("viewer.openInNewTab")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{t("viewer.previewNotAvailable")}</p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t("viewer.download")}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !document) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error || t("viewer.documentNotFound")}</p>
            {onClose && (
              <Button onClick={onClose} variant="outline" className="mt-4">
                {t("common.close")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {document.fileName}
            </CardTitle>
            {document.description && (
              <p className="text-sm text-gray-600 mt-1">{document.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("flex items-center gap-1", getStatusColor(document.status))}>
              {getStatusIcon(document.status)}
              {t(`status.${document.status}`)}
            </Badge>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{formatFileSize(document.metadata?.size || 0)}</span>
          {document.metadata?.pages && (
            <span>{document.metadata.pages} {t("viewer.pages")}</span>
          )}
          <span>{format(document.uploadedAt, "PPP", { locale: fr })}</span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Prévisualisation du document */}
        {renderDocumentPreview()}

        {/* Actions de téléchargement */}
        <div className="flex justify-center mt-4">
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t("viewer.download")}
          </Button>
        </div>

        {/* Section de validation (si autorisée) */}
        {canValidate && document.status === 'pending' && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("validation.title")}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="validation-comment">{t("validation.comment")}</Label>
                <Textarea
                  id="validation-comment"
                  placeholder={t("validation.commentPlaceholder")}
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleValidation('approved')}
                  disabled={isValidating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("validation.approve")}
                </Button>
                <Button
                  onClick={() => handleValidation('rejected')}
                  disabled={isValidating}
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("validation.reject")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Commentaire de validation existant */}
        {document.validationComment && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{t("validation.previousComment")}</h4>
            <p className="text-blue-800">{document.validationComment}</p>
            {document.validatedAt && (
              <p className="text-sm text-blue-600 mt-2">
                {format(document.validatedAt, "PPP à HH:mm", { locale: fr })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
