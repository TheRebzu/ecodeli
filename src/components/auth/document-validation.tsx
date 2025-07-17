"use client";

import { useState, useEffect } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle, Clock, Upload } from "lucide-react";
import { UserRole } from "@prisma/client";

interface DocumentRequirement {
  type: string;
  label: string;
  description: string;
  required: boolean;
  acceptedTypes: string[];
}

interface Document {
  id: string;
  type: string;
  filename: string;
  originalName: string;
  validationStatus: string;
  uploadedAt: string;
  url: string;
}

interface DocumentValidationProps {
  userRole: UserRole;
  userId: string;
  onDocumentsChange?: (documents: Document[]) => void;
}

const DOCUMENT_REQUIREMENTS: Record<UserRole, DocumentRequirement[]> = {
  CLIENT: [],
  ADMIN: [],
  DELIVERER: [
    {
      type: "IDENTITY",
      label: "Pièce d'identité",
      description: "Carte d'identité ou passeport valide",
      required: true,
      acceptedTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    },
    {
      type: "DRIVING_LICENSE",
      label: "Permis de conduire",
      description: "Permis de conduire valide (si véhicule motorisé)",
      required: false,
      acceptedTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    },
    {
      type: "INSURANCE",
      label: "Assurance responsabilité civile",
      description: "Attestation d'assurance responsabilité civile",
      required: true,
      acceptedTypes: [".pdf"],
    },
    {
      type: "CERTIFICATION",
      label: "Certification véhicule",
      description: "Carte grise ou certificat d'immatriculation",
      required: false,
      acceptedTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    },
  ],
  PROVIDER: [
    {
      type: "IDENTITY",
      label: "Pièce d'identité",
      description: "Carte d'identité ou passeport valide",
      required: true,
      acceptedTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    },
    {
      type: "CERTIFICATION",
      label: "Statut autoentrepreneur",
      description: "Attestation URSSAF ou extrait KBIS",
      required: true,
      acceptedTypes: [".pdf"],
    },
    {
      type: "INSURANCE",
      label: "Assurance responsabilité civile",
      description: "Attestation d'assurance responsabilité civile professionnelle",
      required: true,
      acceptedTypes: [".pdf"],
    },
    {
      type: "OTHER",
      label: "Diplômes/Certifications",
      description: "Diplômes ou certifications professionnelles (optionnel)",
      required: false,
      acceptedTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    },
  ],
  MERCHANT: [
    {
      type: "IDENTITY",
      label: "Pièce d'identité",
      description: "Carte d'identité ou passeport du représentant légal",
      required: true,
      acceptedTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    },
    {
      type: "CERTIFICATION",
      label: "Extrait KBIS",
      description: "Extrait KBIS de moins de 3 mois",
      required: true,
      acceptedTypes: [".pdf"],
    },
    {
      type: "INSURANCE",
      label: "Assurance responsabilité civile",
      description: "Attestation d'assurance responsabilité civile professionnelle",
      required: true,
      acceptedTypes: [".pdf"],
    },
  ],
};

export function DocumentValidation({ userRole, userId, onDocumentsChange }: DocumentValidationProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirements = DOCUMENT_REQUIREMENTS[userRole] || [];

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/upload");
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
        onDocumentsChange?.(data.documents);
      }
    } catch (err) {
      setError("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    try {
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", documentType);
      formData.append("category", "document");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      if (data.success) {
        await loadDocuments(); // Recharger la liste des documents
      }
    } catch (err) {
      throw err; // Rethrow pour que FileUpload puisse gérer l'erreur
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "REJECTED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "PENDING":
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Validé";
      case "REJECTED":
        return "Rejeté";
      case "PENDING":
      default:
        return "En attente";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "default";
      case "REJECTED":
        return "destructive";
      case "PENDING":
      default:
        return "secondary";
    }
  };

  if (requirements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Documents de validation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pour finaliser votre inscription, vous devez télécharger les documents suivants. 
              Votre compte sera activé après validation par nos équipes.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {requirements.map((requirement) => {
              const existingDocument = documents.find(doc => doc.type === requirement.type);
              
              return (
                <div key={requirement.type} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium flex items-center space-x-2">
                        <span>{requirement.label}</span>
                        {requirement.required && <span className="text-red-500">*</span>}
                      </h3>
                      <p className="text-sm text-gray-600">{requirement.description}</p>
                    </div>
                    {existingDocument && (
                      <Badge variant={getStatusVariant(existingDocument.validationStatus)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(existingDocument.validationStatus)}
                          <span>{getStatusText(existingDocument.validationStatus)}</span>
                        </div>
                      </Badge>
                    )}
                  </div>

                  {existingDocument ? (
                    <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{existingDocument.originalName}</p>
                          <p className="text-xs text-gray-500">
                            Téléchargé le {new Date(existingDocument.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Remplacer le document existant
                          const fileInput = document.createElement("input");
                          fileInput.type = "file";
                          fileInput.accept = requirement.acceptedTypes.join(",");
                          fileInput.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              await handleFileUpload(file, requirement.type);
                            }
                          };
                          fileInput.click();
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Remplacer
                      </Button>
                    </div>
                  ) : (
                    <FileUpload
                      onUpload={(file) => handleFileUpload(file, requirement.type)}
                      acceptedTypes={requirement.acceptedTypes}
                      maxSize={10}
                      uploading={loading}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}