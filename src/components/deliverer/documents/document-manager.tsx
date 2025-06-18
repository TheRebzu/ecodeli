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
  Eye} from "lucide-react";
import DocumentUploadForm from "@/components/shared/documents/document-upload-form";
import { DocumentPreview } from "@/components/shared/documents/document-preview";

const REQUIRED_DOCUMENTS = [
  { type: "IDENTITY", label: "Pièce d'identité", required: true },
  { type: "DRIVING_LICENSE", label: "Permis de conduire", required: true },
  { type: "INSURANCE", label: "Assurance véhicule", required: false },
  { type: "VEHICLE_REGISTRATION", label: "Carte grise", required: false },
  { type: "BACKGROUND_CHECK", label: "Casier judiciaire", required: true }];

interface DocumentStatus {
  id?: string;
  documentType: string;
  type?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt?: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
  documentUrl?: string;
  expiryDate?: Date;
  mimeType?: string;
  fileSize?: number;
  checksum?: string;
  notes?: string;
}

export default function DelivererDocumentManager() {
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentStatus | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState<string | null>(null);

  // Récupérer le statut des documents
  const { data: verificationStatus, refetch } =
    api.deliverer.documents.getAll.useQuery();

  // Upload d'un document via API Route
  const [isUploading, setIsUploading] = useState(false);
  
  // Mapper les types de documents locaux vers les types API
  const mapToApiDocumentType = (type: string): string => {
    const mapping: Record<string, string> = {
      IDENTITY: "ID_CARD",
      DRIVING_LICENSE: "DRIVING_LICENSE",
      VEHICLE_REGISTRATION: "VEHICLE_REGISTRATION",
      INSURANCE: "INSURANCE",
      BACKGROUND_CHECK: "CRIMINAL_RECORD",
      MEDICAL_CERTIFICATE: "QUALIFICATION_CERTIFICATE",
      ADDRESS_PROOF: "PROOF_OF_ADDRESS",
      BANK_DETAILS: "OTHER",
    };
    return mapping[type] || type;
  };
  
  const uploadDocumentApi = async (uploadData: { type: string; file: string; notes?: string; expiryDate?: string }) => {
    setIsUploading(true);
    try {
      console.log("📤 Document Manager - Upload API:", {
        type: uploadData.type,
        fileLength: uploadData.file.length
      });

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(uploadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'upload");
      }

      const result = await response.json();
      console.log("✅ Document Manager - Upload réussi:", result);

      toast({
        title: "Document uploadé",
        description: "Votre document a été envoyé pour vérification",
        variant: "success"
      });
      
      setUploadModalOpen(null);
      refetch();
      
    } catch (error: any) {
      console.error("❌ Document Manager - Erreur upload:", error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getDocumentStatus = (documentType: string): DocumentStatus | null => {
    // Mapper le type local vers le type API pour la recherche
    const mappedType = mapToApiDocumentType(documentType);
    console.log("🔍 getDocumentStatus - recherche pour:", { 
      original: documentType, 
      mapped: mappedType 
    });
    console.log("🔍 verificationStatus data:", verificationStatus);
    
    // Extraire les documents de la réponse tRPC
    let documents = verificationStatus;
    
    // Si c'est un objet avec json/meta (réponse tRPC wrappée), extraire les données
    if (verificationStatus && typeof verificationStatus === 'object' && 'json' in verificationStatus) {
      documents = (verificationStatus as any).json;
      console.log("📦 Extraction depuis verificationStatus.json:", documents);
    }
    
    if (!documents || !Array.isArray(documents)) {
      console.log("❌ documents pas un array ou null:", documents);
      return null;
    }

    const found = documents.find(
      (doc: any) => {
        console.log("🔍 Comparaison doc:", {
          documentType: doc.documentType,
          type: doc.type,
          recherche: mappedType,
          match1: doc.documentType === mappedType,
          match2: doc.type === mappedType
        });
        return doc.documentType === mappedType || doc.type === mappedType;
      }
    );
    
    console.log("🔍 Document trouvé:", found);
    return found || null;
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
    console.log("📤 Document Manager - handleUpload:", {
      documentType,
      file: data.file.name,
      size: data.file.size
    });

    // Convertir le fichier en base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(data.file);
    });

    try {
      const base64File = await base64Promise;
      console.log("✅ Document Manager - Fichier converti en base64:", base64File.length);

      const mappedType = mapToApiDocumentType(documentType);
      console.log("🔄 Mapping de type:", { 
        documentType, 
        mappedType 
      });

      await uploadDocumentApi({
        type: mappedType,
        file: base64File,
        notes: data.notes,
        expiryDate: data.expiryDate
      });
    } catch (error) {
      console.error("❌ Document Manager - Erreur conversion base64:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la conversion du fichier",
        variant: "destructive"
      });
    }
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
                        disabled={isUploading}
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
                        disabled={isUploading}
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
          isLoading={isUploading}
        />
      )}

      {/* Preview Modal */}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDownload={() => {
            if (selectedDocument.documentUrl) {
              window.open(selectedDocument.documentUrl, "blank");
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
