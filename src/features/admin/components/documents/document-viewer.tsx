"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  Download,
  ExternalLink,
  User,
  Calendar,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { downloadFile, openFileInNewTab } from "@/lib/utils/download";

interface DocumentViewerProps {
  document: any;
  onClose: () => void;
  onValidate: (
    id: string,
    status: "APPROVED" | "REJECTED",
    notes?: string,
  ) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getDocumentTypeLabel: (type: string) => string;
}

export function DocumentViewer({
  document,
  onClose,
  onValidate,
  getStatusBadge,
  getDocumentTypeLabel,
}: DocumentViewerProps) {
  const [validationNotes, setValidationNotes] = useState("");
  const [validating, setValidating] = useState(false);

  // Générer l'URL d'accès au document via l'API
  const getDocumentUrl = (download: boolean = false) => {
    const baseUrl = `/api/deliverer/recruitment/documents/${document.id}/download`;
    return download ? `${baseUrl}?download=true` : baseUrl;
  };

  const handleValidation = async (status: "APPROVED" | "REJECTED") => {
    setValidating(true);
    try {
      await onValidate(document.id, status, validationNotes);
      onClose();
    } catch (error) {
      console.error("Erreur validation:", error);
    } finally {
      setValidating(false);
    }
  };

  const getUserDisplayName = (user: any) => {
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user.email;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DELIVERER: "Livreur",
      PROVIDER: "Prestataire",
      MERCHANT: "Commerçant",
      CLIENT: "Client",
      ADMIN: "Administrateur",
    };
    return labels[role] || role;
  };

  const isImage = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const isPdf = (filename: string) => {
    return /\.pdf$/i.test(filename);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto w-[95vw] sm:w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Validation de document</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Informations du document */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informations du document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nom du fichier
                  </label>
                  <p className="font-medium">{document.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Type
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {getDocumentTypeLabel(document.type)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Statut actuel
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(document.validationStatus)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Soumis
                  </label>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(document.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>

                {document.size && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Taille
                    </label>
                    <p className="text-sm">
                      {Math.round(document.size / 1024)} KB
                    </p>
                  </div>
                )}

                {document.validatedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Validé le
                    </label>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(document.validatedAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                )}

                {document.validator && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Validé par
                    </label>
                    <p className="text-sm">
                      {document.validator.user.profile?.firstName}{" "}
                      {document.validator.user.profile?.lastName}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations utilisateur */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nom
                  </label>
                  <p className="font-medium">
                    {getUserDisplayName(document.user)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-sm">{document.user.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Rôle
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {getRoleLabel(document.user.role)}
                    </Badge>
                  </div>
                </div>

                {document.user.deliverer && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Statut livreur
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          document.user.deliverer.validationStatus ===
                          "APPROVED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {document.user.deliverer.validationStatus}
                      </Badge>
                    </div>
                  </div>
                )}

                {document.user.provider && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Statut prestataire
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          document.user.provider.validationStatus === "APPROVED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {document.user.provider.validationStatus}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions de validation */}
            {document.validationStatus === "PENDING" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Notes de validation (optionnel)
                    </label>
                    <Textarea
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      placeholder="Ajouter des commentaires sur la validation..."
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleValidation("APPROVED")}
                      disabled={validating}
                      className="flex-1"
                      variant="default"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      onClick={() => handleValidation("REJECTED")}
                      disabled={validating}
                      className="flex-1"
                      variant="destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes de validation existantes */}
            {document.validationNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Notes de validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {document.validationNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Prévisualisation du document */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>Aperçu du document</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openFileInNewTab(getDocumentUrl())}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Ouvrir</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(getDocumentUrl(true), document.name)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Télécharger</span>
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="border rounded-lg overflow-hidden bg-gray-50 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] max-h-[600px] flex items-center justify-center">
                  {isImage(document.name) ? (
                    <img
                      src={getDocumentUrl()}
                      alt={document.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement)
                          .parentElement!;
                        parent.innerHTML = `
                          <div class="text-center p-8">
                            <FileText class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p class="text-muted-foreground">Impossible de charger l'aperçu</p>
                            <p class="text-sm text-muted-foreground">Cliquez sur "Ouvrir" pour voir le document</p>
                          </div>
                        `;
                      }}
                    />
                  ) : isPdf(document.name) ? (
                    <div className="w-full h-[500px] relative">
                      <iframe
                        src={getDocumentUrl()}
                        className="w-full h-full border-0 rounded"
                        title={document.name}
                        onError={(e) => {
                          console.error('Erreur chargement PDF:', e);
                          const fallbackDiv = document.createElement('div');
                          fallbackDiv.className = 'text-center p-8 flex flex-col items-center justify-center h-full';
                          fallbackDiv.innerHTML = `
                            <div class="text-center p-8">
                              <div class="w-12 h-12 text-muted-foreground mx-auto mb-4">📄</div>
                              <p class="text-muted-foreground mb-2">
                                Impossible d'afficher le PDF
                              </p>
                              <p class="text-sm text-muted-foreground mb-4">
                                ${document.name}
                              </p>
                              <div class="flex flex-col sm:flex-row gap-2 justify-center">
                                <button onclick="window.open('${getDocumentUrl()}', '_blank')" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                  Ouvrir dans un nouvel onglet
                                </button>
                                <button onclick="window.open('${getDocumentUrl(true)}', '_blank')" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                                  Télécharger
                                </button>
                              </div>
                            </div>
                          `;
                          if (e.target.parentElement) {
                            e.target.parentElement.appendChild(fallbackDiv);
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                      {/* Fallback pour les navigateurs qui ne supportent pas les iframes PDF */}
                      <noscript>
                        <div className="text-center p-8">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground mb-2">
                            JavaScript requis pour afficher le PDF
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {document.name}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Button
                              onClick={() => openFileInNewTab(getDocumentUrl())}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Ouvrir le PDF</span>
                              <span className="sm:hidden">Ouvrir</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => downloadFile(getDocumentUrl(true), document.name)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </Button>
                          </div>
                        </div>
                      </noscript>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">
                        Aperçu non disponible
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Type de fichier: {document.mimeType || "Inconnu"}
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => openFileInNewTab(getDocumentUrl())}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ouvrir le document
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
