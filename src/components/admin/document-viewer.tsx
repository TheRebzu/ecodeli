"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  FileText,
  AlertCircle
} from "lucide-react";

interface Document {
  id: string;
  type: string;
  filename: string;
  originalName: string;
  url: string;
  validationStatus: string;
  createdAt: string;
  rejectionReason?: string;
  user: {
    id: string;
    email: string;
    role: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface DocumentViewerProps {
  document: Document;
  onValidate: (documentId: string, action: "APPROVED" | "REJECTED", reason?: string) => Promise<void>;
  isValidating: boolean;
}

export function DocumentViewer({ document, onValidate, isValidating }: DocumentViewerProps) {
  const [open, setOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  // Générer l'URL d'accès au document via l'API
  const getDocumentUrl = (download: boolean = false) => {
    const baseUrl = `/api/deliverer/recruitment/documents/${document.id}/download`;
    return download ? `${baseUrl}?download=true` : baseUrl;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IDENTITY: "Pièce d'identité",
      DRIVING_LICENSE: "Permis de conduire",
      INSURANCE: "Assurance responsabilité civile",
      CERTIFICATION: "Certification/KBIS",
      CONTRACT: "Contrat",
      OTHER: "Autre document",
    };
    return labels[type] || type;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DELIVERER: "Livreur",
      PROVIDER: "Prestataire",
      MERCHANT: "Commerçant",
      CLIENT: "Client",
    };
    return labels[role] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800">Validé</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const handleApprove = async () => {
    await onValidate(document.id, "APPROVED");
    setOpen(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Veuillez préciser la raison du rejet");
      return;
    }
    await onValidate(document.id, "REJECTED", rejectionReason);
    setOpen(false);
    setShowRejectionForm(false);
    setRejectionReason("");
  };

  const isImage = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const isPDF = (filename: string) => {
    return /\.pdf$/i.test(filename);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Examiner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Validation du document</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Document Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold mb-2">Informations du document</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Type:</span>
                  <span>{getDocumentTypeLabel(document.type)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Nom:</span>
                  <span>{document.originalName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Statut:</span>
                  {getStatusBadge(document.validationStatus)}
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Téléchargé le {new Date(document.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Informations utilisateur</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{document.user.profile?.firstName} {document.user.profile?.lastName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Email:</span>
                  <span>{document.user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Rôle:</span>
                  <span>{getRoleLabel(document.user.role)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection Reason (if any) */}
          {document.rejectionReason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Raison du rejet précédent:</strong> {document.rejectionReason}
              </AlertDescription>
            </Alert>
          )}

          {/* Document Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Aperçu du document</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getDocumentUrl(true), "_blank")}
              >
                <Download className="h-4 w-4 mr-1" />
                Télécharger
              </Button>
            </div>
            
            <div className="border rounded-lg p-4">
              {isImage(document.originalName) ? (
                <img 
                  src={getDocumentUrl()} 
                  alt={document.originalName}
                  className="max-w-full h-auto max-h-96 mx-auto"
                />
              ) : isPDF(document.originalName) ? (
                <iframe 
                  src={getDocumentUrl()}
                  className="w-full h-96 border rounded"
                  title={document.originalName}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Aperçu non disponible</p>
                  <p className="text-sm text-gray-500">
                    Cliquez sur "Télécharger" pour voir le document
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Validation Actions */}
          {document.validationStatus === "PENDING" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Actions de validation</h3>
              </div>
              
              {!showRejectionForm ? (
                <div className="flex space-x-4">
                  <Button
                    onClick={handleApprove}
                    disabled={isValidating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider le document
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectionForm(true)}
                    disabled={isValidating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter le document
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="rejection-reason">Raison du rejet *</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Expliquez pourquoi ce document est rejeté..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isValidating || !rejectionReason.trim()}
                    >
                      Confirmer le rejet
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectionForm(false);
                        setRejectionReason("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}