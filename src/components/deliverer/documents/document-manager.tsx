"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
} from "lucide-react";
import DocumentUploadForm from "@/components/shared/documents/document-upload-form";
import { DocumentPreview } from "@/components/shared/documents/document-preview";

const REQUIRED_DOCUMENTS = [
  { type: "IDENTITY", label: "Pièce d'identité", required: true },
  { type: "DRIVING_LICENSE", label: "Permis de conduire", required: true },
  { type: "INSURANCE", label: "Assurance véhicule", required: false },
  { type: "VEHICLE_REGISTRATION", label: "Carte grise", required: false },
  { type: "BACKGROUND_CHECK", label: "Casier judiciaire", required: true },
];

interface DocumentStatus {
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt?: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
  documentUrl?: string;
  expiryDate?: Date;
}

export default function DelivererDocumentManager() {
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentStatus | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState<string | null>(null);

  // Récupérer le statut des documents
  const { data: verificationStatus, refetch } =
    api.deliverer.documents.getAll.useQuery();

  // Upload d'un document
  const uploadMutation = api.deliverer.documents.upload.useMutation({
    onSuccess: () => {
      toast({
        title: "Document uploadé",
        description: "Votre document a été envoyé pour vérification",
        variant: "success",
      });
      setUploadModalOpen(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDocumentStatus = (documentType: string): DocumentStatus | null => {
    if (!verificationStatus?.documents) return null;

    return (
      verificationStatus.documents.find(
        (doc: any) => doc.documentType === documentType,
      ) || null
    );
  };

  const getStatusIcon = (status?: string) => {
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Approuvé</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejeté</Badge>;
      case "PENDING":
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="outline">Non uploadé</Badge>;
    }
  };

  const calculateProgress = () => {
    const totalRequired = REQUIRED_DOCUMENTS.filter(
      (doc) => doc.required,
    ).length;
    const approvedRequired = REQUIRED_DOCUMENTS.filter((doc) => {
      const status = getDocumentStatus(doc.type);
      return doc.required && status?.status === "APPROVED";
    }).length;

    return (approvedRequired / totalRequired) * 100;
  };

  const handleUpload = async (
    documentType: string,
    data: { file: File; expiryDate?: string; notes?: string },
  ) => {
    // Simuler l'upload du fichier (en réalité, cela passerait par un service d'upload)
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("documentType", documentType);
    if (data.expiryDate) formData.append("expiryDate", data.expiryDate);
    if (data.notes) formData.append("notes", data.notes);

    const newDocument: Document = {
      id: `temp-${Date.now()}`,
      name: data.file.name,
      type: data.type,
      status: "UPLOADING",
      uploadedAt: new Date(),
      documentUrl: "", // URL sera mise à jour après l'upload réel
      size: data.file.size,
      mimeType: data.file.type,
    };

    await uploadMutation.mutateAsync({
      documentType,
      documentUrl: newDocument.documentUrl,
      mimeType: data.file.type,
      fileSize: data.file.size,
      expiryDate: data.expiryDate,
      notes: data.notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vérification des documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progression</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(calculateProgress())}% complété
                </span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {
                    REQUIRED_DOCUMENTS.filter(
                      (doc) =>
                        getDocumentStatus(doc.type)?.status === "APPROVED",
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">Approuvés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {
                    REQUIRED_DOCUMENTS.filter(
                      (doc) =>
                        getDocumentStatus(doc.type)?.status === "PENDING",
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {
                    REQUIRED_DOCUMENTS.filter(
                      (doc) =>
                        getDocumentStatus(doc.type)?.status === "REJECTED",
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">Rejetés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {
                    REQUIRED_DOCUMENTS.filter(
                      (doc) => !getDocumentStatus(doc.type),
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">Manquants</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Tabs defaultValue="required" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="required">Documents requis</TabsTrigger>
          <TabsTrigger value="optional">Documents optionnels</TabsTrigger>
        </TabsList>

        <TabsContent value="required" className="space-y-4">
          {REQUIRED_DOCUMENTS.filter((doc) => doc.required).map((document) => {
            const status = getDocumentStatus(document.type);
            return (
              <Card key={document.type}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status?.status)}
                      <div>
                        <h3 className="font-medium">{document.label}</h3>
                        {status?.uploadedAt && (
                          <p className="text-sm text-muted-foreground">
                            Uploadé le{" "}
                            {new Date(status.uploadedAt).toLocaleDateString()}
                          </p>
                        )}
                        {status?.rejectionReason && (
                          <p className="text-sm text-red-600">
                            Raison du rejet: {status.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(status?.status)}

                      {status?.documentUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocument(status)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant={
                          status?.status === "REJECTED" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setUploadModalOpen(document.type)}
                        disabled={uploadMutation.isPending}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {status?.status === "REJECTED" ? "Remplacer" : "Upload"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="optional" className="space-y-4">
          {REQUIRED_DOCUMENTS.filter((doc) => !doc.required).map((document) => {
            const status = getDocumentStatus(document.type);
            return (
              <Card key={document.type}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status?.status)}
                      <div>
                        <h3 className="font-medium">{document.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          Document optionnel
                        </p>
                        {status?.uploadedAt && (
                          <p className="text-sm text-muted-foreground">
                            Uploadé le{" "}
                            {new Date(status.uploadedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status && getStatusBadge(status.status)}

                      {status?.documentUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocument(status)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadModalOpen(document.type)}
                        disabled={uploadMutation.isPending}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <DocumentUploadForm
          documentType={uploadModalOpen}
          open={!!uploadModalOpen}
          onOpenChange={(open) => !open && setUploadModalOpen(null)}
          onSubmit={(data) => handleUpload(uploadModalOpen, data)}
          isLoading={uploadMutation.isPending}
        />
      )}

      {/* Preview Modal */}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDownload={() => {
            if (selectedDocument.documentUrl) {
              window.open(selectedDocument.documentUrl, "_blank");
            }
          }}
          onReplace={() => {
            setUploadModalOpen(selectedDocument.type);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
}
