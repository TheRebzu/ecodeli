"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  Eye, 
  Download, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface DocumentManagerProps {
  delivererId: string;
}

interface Document {
  id: string;
  type: string;
  name: string;
  filename: string;
  status: string;
  uploadedAt: string;
  validatedAt?: string;
  expiresAt?: string;
  rejectedReason?: string;
  size: number;
  url: string;
}

interface DocumentType {
  id: string;
  name: string;
  required: boolean;
  description: string;
  allowedFormats: string[];
  maxSize: number;
}

export default function DocumentManager({ delivererId }: DocumentManagerProps) {
  const t = useTranslations("deliverer.documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliverer/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setDocumentTypes(data.documentTypes || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, typeId: string) => {
    try {
      console.log("Starting upload for file:", file.name, "type:", typeId);
      setUploading(typeId);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("typeId", typeId);

      console.log("Sending request to /api/deliverer/documents/upload");
      const response = await fetch("/api/deliverer/documents/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Upload response status:", response.status);
      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);
        toast.success(t("success.document_uploaded"));
        fetchDocuments();
      } else {
        const errorData = await response.text();
        console.error("Upload failed with status:", response.status, "error:", errorData);
        toast.error(t("error.upload_failed"));
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(t("error.upload_failed"));
    } finally {
      console.log("Upload process finished for type:", typeId);
      setUploading(null);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/deliverer/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("success.document_deleted"));
        fetchDocuments();
      } else {
        toast.error(t("error.delete_failed"));
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(t("error.delete_failed"));
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [delivererId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: t("status.validated") },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: t("status.pending") },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: t("status.rejected") },
      expired: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, label: t("status.expired") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentForType = (typeId: string) => {
    return documents.find(doc => doc.type === typeId);
  };

  const isDocumentExpired = (document: Document) => {
    if (!document.expiresAt) return false;
    return new Date(document.expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.validated")}</p>
                <p className="text-xl font-bold">
                  {documents.filter(d => d.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.pending")}</p>
                <p className="text-xl font-bold">
                  {documents.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.rejected")}</p>
                <p className="text-xl font-bold">
                  {documents.filter(d => d.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.expired")}</p>
                <p className="text-xl font-bold">
                  {documents.filter(d => d.status === 'expired').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {documentTypes.map((type) => {
          const document = getDocumentForType(type.id);
          const expired = document && isDocumentExpired(document);
          
          return (
            <Card key={type.id} className={type.required ? 'border-blue-200' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>{type.name}</span>
                    {type.required && (
                      <Badge variant="outline" className="text-xs">
                        {t("required")}
                      </Badge>
                    )}
                  </div>
                  {document && getStatusBadge(expired ? 'expired' : document.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{type.description}</p>
                
                <div className="text-xs text-gray-500">
                  <p>{t("allowed_formats")}: {type.allowedFormats.join(", ")}</p>
                  <p>{t("max_size")}: {formatFileSize(type.maxSize)}</p>
                </div>

                {document ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{document.name}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{formatFileSize(document.size)}</span>
                          <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
                          {document.expiresAt && (
                            <span className={expired ? 'text-red-600' : ''}>
                              {t("expires")}: {new Date(document.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(document.url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(document.url + '?download=true', '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDocument(document.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {document.status === 'rejected' && document.rejectedReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <strong>{t("rejection_reason")}:</strong> {document.rejectedReason}
                        </p>
                      </div>
                    )}

                    {(expired || document.status === 'rejected') && (
                      <div className="flex justify-center">
                        <div>
                          <input
                            ref={(el) => { fileInputRefs.current[`replace-${type.id}`] = el; }}
                            type="file"
                            className="hidden"
                            accept={type.allowedFormats.map(f => `.${f}`).join(",")}
                            onChange={(e) => {
                              console.log("Replace file input onChange triggered", e.target.files);
                              const file = e.target.files?.[0];
                              if (file) {
                                console.log("Replace file selected:", file.name, file.size);
                                if (file.size > type.maxSize) {
                                  console.log("Replace file too large:", file.size, "max:", type.maxSize);
                                  toast.error(t("error.file_too_large"));
                                  return;
                                }
                                console.log("Calling uploadDocument for replace with:", file.name, type.id);
                                uploadDocument(file, type.id);
                              }
                            }}
                            disabled={uploading === type.id}
                          />
                          <Button
                            size="sm"
                            disabled={uploading === type.id}
                            className="w-full"
                            onClick={() => {
                              console.log("Replace button clicked for type:", type.id);
                              const fileInput = fileInputRefs.current[`replace-${type.id}`];
                              console.log("Replace file input element:", fileInput);
                              fileInput?.click();
                              console.log("Replace file input click triggered");
                            }}
                          >
                            {uploading === type.id ? (
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {t("replace_document")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div>
                      <input
                        ref={(el) => { fileInputRefs.current[type.id] = el; }}
                        type="file"
                        className="hidden"
                        accept={type.allowedFormats.map(f => `.${f}`).join(",")}
                        onChange={(e) => {
                          console.log("File input onChange triggered", e.target.files);
                          const file = e.target.files?.[0];
                          if (file) {
                            console.log("File selected:", file.name, file.size);
                            if (file.size > type.maxSize) {
                              console.log("File too large:", file.size, "max:", type.maxSize);
                              toast.error(t("error.file_too_large"));
                              return;
                            }
                            console.log("Calling uploadDocument with:", file.name, type.id);
                            uploadDocument(file, type.id);
                          }
                        }}
                        disabled={uploading === type.id}
                      />
                      <Button
                        size="sm"
                        disabled={uploading === type.id}
                        className="w-full"
                        onClick={() => {
                          console.log("Upload button clicked for type:", type.id);
                          const fileInput = fileInputRefs.current[type.id];
                          console.log("File input element:", fileInput);
                          fileInput?.click();
                          console.log("File input click triggered");
                        }}
                      >
                        {uploading === type.id ? (
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        {t("upload_document")}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 