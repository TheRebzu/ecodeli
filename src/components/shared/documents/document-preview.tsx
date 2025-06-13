"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Eye,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Building,
  Hash,
  Scale,
  Scan,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils/common";

interface DocumentPreviewProps {
  document: {
    id: string;
    documentType: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    documentUrl?: string;
    mimeType?: string;
    fileSize?: number;
    checksum?: string;
    version?: number;
    uploadedAt?: Date;
    verifiedAt?: Date;
    expiryDate?: Date;
    rejectionReason?: string;
    autoValidated?: boolean;
    validationScore?: number;
    notes?: string;
  };
  onClose: () => void;
  onDownload?: () => void;
  onReplace?: () => void;
}

// Configuration des types de documents
const DOCUMENT_LABELS: Record<string, string> = {
  IDENTITY: "Pièce d'identité",
  DRIVING_LICENSE: "Permis de conduire",
  INSURANCE: "Attestation d'assurance",
  VEHICLE_REGISTRATION: "Carte grise",
  BACKGROUND_CHECK: "Extrait de casier judiciaire",
  MEDICAL_CERTIFICATE: "Certificat médical",
  BANK_DETAILS: "RIB",
  ADDRESS_PROOF: "Justificatif de domicile",
};

export default function DocumentPreview({
  document,
  onClose,
  onDownload,
  onReplace,
}: DocumentPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approuvé
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const isDocumentExpiring = (expiryDate?: Date) => {
    if (!expiryDate) return false;
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 30); // 30 jours avant expiration
    return expiryDate <= warningDate && expiryDate > now;
  };

  const isDocumentExpired = (expiryDate?: Date) => {
    if (!expiryDate) return false;
    return expiryDate <= new Date();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const documentLabel =
    DOCUMENT_LABELS[document.documentType] || document.documentType;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {documentLabel}
            {document.version && (
              <span className="text-sm text-muted-foreground">
                v{document.version}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Prévisualisation et détails du document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut et actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(document.status)}
              {getStatusBadge(document.status)}

              {document.autoValidated && (
                <Badge
                  variant="outline"
                  className="text-blue-600 border-blue-200"
                >
                  <Scan className="h-3 w-3 mr-1" />
                  Auto-validé
                </Badge>
              )}

              {isDocumentExpired(document.expiryDate) && (
                <Badge variant="destructive">
                  <Calendar className="h-3 w-3 mr-1" />
                  Expiré
                </Badge>
              )}

              {isDocumentExpiring(document.expiryDate) &&
                !isDocumentExpired(document.expiryDate) && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    <Calendar className="h-3 w-3 mr-1" />
                    Expire bientôt
                  </Badge>
                )}
            </div>

            <div className="flex items-center gap-2">
              {document.documentUrl && onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              )}

              {onReplace &&
                (document.status === "REJECTED" ||
                  isDocumentExpired(document.expiryDate)) && (
                  <Button variant="default" size="sm" onClick={onReplace}>
                    Remplacer
                  </Button>
                )}
            </div>
          </div>

          {/* Alertes */}
          {document.status === "REJECTED" && document.rejectionReason && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">
                      Document rejeté
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      {document.rejectionReason}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isDocumentExpired(document.expiryDate) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">
                      Document expiré
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Ce document a expiré le{" "}
                      {format(document.expiryDate!, "dd/MM/yyyy", {
                        locale: fr,
                      })}
                      . Veuillez télécharger une version mise à jour.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isDocumentExpiring(document.expiryDate) &&
            !isDocumentExpired(document.expiryDate) && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-800">
                        Document expire bientôt
                      </h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Ce document expire le{" "}
                        {format(document.expiryDate!, "dd/MM/yyyy", {
                          locale: fr,
                        })}
                        . Pensez à le renouveler.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Prévisualisation du document */}
          {document.documentUrl && (
            <Card>
              <CardContent className="p-0">
                <div className="bg-muted/25 border-b p-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Prévisualisation
                  </h3>
                </div>

                <div className="p-4">
                  {document.mimeType?.startsWith("image/") ? (
                    <div className="text-center">
                      {!imageError ? (
                        <img
                          src={document.documentUrl}
                          alt={`Document ${documentLabel}`}
                          className="max-w-full h-auto max-h-96 mx-auto rounded border shadow-sm"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                          <AlertTriangle className="h-12 w-12 mb-2" />
                          <p>Impossible de charger l'image</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              window.open(document.documentUrl, "_blank")
                            }
                          >
                            Ouvrir dans un nouvel onglet
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : document.mimeType?.includes("pdf") ? (
                    <div className="text-center">
                      <iframe
                        src={document.documentUrl}
                        className="w-full h-96 rounded border"
                        title={`Document ${documentLabel}`}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <FileText className="h-12 w-12 mb-2" />
                      <p>Prévisualisation non disponible</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          window.open(document.documentUrl, "_blank")
                        }
                      >
                        Ouvrir le document
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations détaillées */}
          <Card>
            <CardContent className="p-0">
              <div className="bg-muted/25 border-b p-4">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informations du document
                </h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Type:</span>
                      <span>{documentLabel}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Version:</span>
                      <span>{document.version || 1}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Format:</span>
                      <span>{document.mimeType || "N/A"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Taille:</span>
                      <span>{formatFileSize(document.fileSize)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {document.uploadedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Uploadé le:</span>
                        <span>
                          {format(document.uploadedAt, "dd/MM/yyyy à HH:mm", {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    )}

                    {document.verifiedAt && document.status === "APPROVED" && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Approuvé le:</span>
                        <span className="text-green-600">
                          {format(document.verifiedAt, "dd/MM/yyyy à HH:mm", {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    )}

                    {document.expiryDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar
                          className={cn(
                            "h-4 w-4",
                            isDocumentExpired(document.expiryDate)
                              ? "text-red-500"
                              : isDocumentExpiring(document.expiryDate)
                                ? "text-orange-500"
                                : "text-muted-foreground",
                          )}
                        />
                        <span className="font-medium">Expire le:</span>
                        <span
                          className={cn(
                            isDocumentExpired(document.expiryDate)
                              ? "text-red-600"
                              : isDocumentExpiring(document.expiryDate)
                                ? "text-orange-600"
                                : "",
                          )}
                        >
                          {format(document.expiryDate, "dd/MM/yyyy", {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    )}

                    {document.checksum && (
                      <div className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="font-medium">Checksum:</span>
                        <span className="font-mono text-xs break-all">
                          {document.checksum}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation automatique */}
                {document.autoValidated && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Scan className="h-4 w-4" />
                        Validation automatique
                      </h4>
                      <div className="text-sm text-muted-foreground">
                        Ce document a été validé automatiquement avec un score
                        de confiance de{" "}
                        <span className="font-medium text-blue-600">
                          {Math.round(document.validationScore || 0)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                {document.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {document.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
