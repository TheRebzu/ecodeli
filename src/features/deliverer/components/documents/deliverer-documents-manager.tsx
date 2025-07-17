"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Check,
  X,
  Clock,
  AlertTriangle,
  Download,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface DelivererDocumentsManagerProps {
  delivererId: string;
}

interface Document {
  id: string;
  type: string;
  name: string;
  filename: string;
  status: "pending" | "approved" | "rejected" | "expired";
  uploadedAt: string;
  validatedAt?: string;
  expiresAt?: string;
  rejectedReason?: string;
  size: number;
  url: string;
}

const REQUIRED_DOCUMENTS = [
  { type: "IDENTITY", name: "Pièce d'identité", required: true },
  { type: "DRIVING_LICENSE", name: "Permis de conduire", required: true },
  { type: "INSURANCE", name: "Attestation d'assurance", required: true },
  { type: "OTHER", name: "Carte grise", required: false },
  {
    type: "CERTIFICATION",
    name: "Certifications professionnelles",
    required: false,
  },
];

export default function DelivererDocumentsManager({
  delivererId,
}: DelivererDocumentsManagerProps) {
  const t = useTranslations("deliverer.documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");

  // Fonction helper pour les traductions avec fallback
  const translate = (key: string, fallback?: string) => {
    try {
      const result = t(key);
      // Si la traduction retourne la clé elle-même, c'est qu'elle n'existe pas
      if (result === key) {
        console.warn(
          `Translation missing for key: ${key}, using fallback: ${fallback}`,
        );
        return fallback || key;
      }
      return result;
    } catch (error) {
      console.warn(
        `Translation error for key: ${key}, using fallback: ${fallback}`,
      );
      return fallback || key;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [delivererId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(
        `/api/deliverer/documents?delivererId=${delivererId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentType: string) => {
    if (!selectedFile) return;

    setUploadingDocument(documentType);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentType", documentType);
      formData.append("delivererId", delivererId);

      const response = await fetch("/api/deliverer/documents", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments();
        setSelectedFile(null);
        setSelectedDocumentType("");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploadingDocument(null);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/deliverer/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const getDocumentStatus = (doc: Document) => {
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
      return {
        status: "expired",
        color: "bg-orange-100 text-orange-800",
        icon: Clock,
      };
    }

    const statusConfig = {
      pending: {
        status: "pending",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      approved: {
        status: "approved",
        color: "bg-green-100 text-green-800",
        icon: Check,
      },
      rejected: {
        status: "rejected",
        color: "bg-red-100 text-red-800",
        icon: X,
      },
      expired: {
        status: "expired",
        color: "bg-orange-100 text-orange-800",
        icon: AlertTriangle,
      },
    };

    const result = statusConfig[doc.status as keyof typeof statusConfig];

    // Si le statut n'est pas reconnu, retourner pending par défaut
    if (!result) {
      console.warn(
        `Unknown document status: ${doc.status}, defaulting to pending`,
      );
      return statusConfig.pending;
    }

    return result;
  };

  const getDocumentByType = (type: string) => {
    return documents.find((doc) => doc.type === type);
  };

  const getCompletionPercentage = () => {
    const requiredDocs = REQUIRED_DOCUMENTS.filter((doc) => doc.required);
    const approvedDocs = requiredDocs.filter((reqDoc) => {
      const doc = getDocumentByType(reqDoc.type);
      return doc && doc.status === "approved";
    });
    return Math.round((approvedDocs.length / requiredDocs.length) * 100);
  };

  const isValidationComplete = () => {
    return getCompletionPercentage() === 100;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("validation_status.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              {t("validation_status.progress")}
            </span>
            <span className="text-sm text-gray-600">
              {getCompletionPercentage()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          {isValidationComplete() ? (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t("validation_status.complete")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t("validation_status.incomplete")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REQUIRED_DOCUMENTS.map((docType) => {
          const document = getDocumentByType(docType.type);
          const statusInfo = document ? getDocumentStatus(document) : null;
          const StatusIcon = statusInfo?.icon || Upload;

          return (
            <Card key={docType.type} className="relative">
              {docType.required && (
                <Badge
                  variant="destructive"
                  className="absolute top-2 right-2 text-xs"
                >
                  {t("required")}
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {docType.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <Badge className={statusInfo?.color}>
                        {statusInfo?.status
                          ? translate(
                              `status.${statusInfo.status}`,
                              statusInfo.status === "approved"
                                ? "Approuvé"
                                : statusInfo.status === "pending"
                                  ? "En attente"
                                  : statusInfo.status === "rejected"
                                    ? "Rejeté"
                                    : statusInfo.status === "expired"
                                      ? "Expiré"
                                      : "Inconnu",
                            )
                          : translate("status.pending", "En attente")}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>
                        {t("uploaded_at")}:{" "}
                        {new Date(document.uploadedAt).toLocaleDateString()}
                      </p>
                      {document.expiresAt && (
                        <p>
                          {t("expires_at")}:{" "}
                          {new Date(document.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {document.rejectedReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          {t("rejected_reason")}: {document.rejectedReason}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {t("actions.view")}
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={document.url} download>
                          <Download className="h-3 w-3 mr-1" />
                          {t("actions.download")}
                        </a>
                      </Button>
                      {document.status !== "approved" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDocumentDelete(document.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          {t("actions.delete")}
                        </Button>
                      )}
                    </div>

                    {(document.status === "rejected" ||
                      document.status === "expired") && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="w-full">
                            <Upload className="h-3 w-3 mr-1" />
                            {t("actions.reupload")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              {t("upload_dialog.title")}
                            </DialogTitle>
                            <DialogDescription>
                              {t("upload_dialog.description", {
                                document: docType.name,
                              })}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="file">
                                {t("upload_dialog.select_file")}
                              </Label>
                              <Input
                                id="file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) =>
                                  setSelectedFile(e.target.files?.[0] || null)
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => handleFileUpload(docType.type)}
                              disabled={
                                !selectedFile ||
                                uploadingDocument === docType.type
                              }
                            >
                              {uploadingDocument === docType.type
                                ? t("uploading")
                                : t("upload")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" />
                        {t("actions.upload")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("upload_dialog.title")}</DialogTitle>
                        <DialogDescription>
                          {t("upload_dialog.description", {
                            document: docType.name,
                          })}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="file">
                            {t("upload_dialog.select_file")}
                          </Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                              setSelectedFile(e.target.files?.[0] || null)
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => handleFileUpload(docType.type)}
                          disabled={
                            !selectedFile || uploadingDocument === docType.type
                          }
                        >
                          {uploadingDocument === docType.type
                            ? t("uploading")
                            : t("upload")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isValidationComplete() && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">
                  {t("incomplete_warning.title")}
                </h3>
                <p className="text-sm text-orange-700">
                  {t("incomplete_warning.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
