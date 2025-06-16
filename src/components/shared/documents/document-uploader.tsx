"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
  Image} from "lucide-react";
import { DocumentType, UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

interface DocumentFile {
  id: string;
  file: File;
  type: DocumentType;
  description?: string;
  status: "uploading" | "success" | "error";
  progress: number;
  errorMessage?: string;
  url?: string;
}

interface DocumentUploaderProps {
  userId: string;
  userRole: UserRole;
  acceptedDocumentTypes?: DocumentType[];
  maxFiles?: number;
  maxSize?: number;
  onUploadComplete?: (documents: any[]) => void;
  showPreview?: boolean;
  multiple?: boolean;
  className?: string;
}

const _DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = { ID_CARD: "Carte d'identité",
  PASSPORT: "Passeport", DRIVERS_LICENSE: "Permis de conduire", PROOF_OF_ADDRESS: "Justificatif de domicile", VEHICLE_INSURANCE: "Assurance véhicule", VEHICLE_REGISTRATION: "Carte grise", BUSINESS_LICENSE: "Licence commerciale", INSURANCE_CERTIFICATE: "Certificat d'assurance", QUALIFICATION_CERTIFICATE: "Certificat de qualification", TAX_CERTIFICATE: "Certificat fiscal", BANK_STATEMENT: "Relevé bancaire",
  OTHER: "Autre document"};

export default function DocumentUploader({
  userId,
  userRole,
  acceptedDocumentTypes = Object.values(DocumentType),
  maxFiles = 5,
  maxSize = 10,
  onUploadComplete,
  showPreview = true,
  multiple = true,
  className}: DocumentUploaderProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);

  // Mutation pour l'upload de documents
  const uploadDocumentMutation =
    api.auth.verification.uploadDocument.useMutation({
      onSuccess: (data, variables) => {
        setFiles((prev) =>
          prev.map((file) =>
            file.id === variables.fileId
              ? {
                  ...file,
                  status: "success",
                  progress: 100,
                  url: data.document.fileUrl}
              : file,
          ),
        );

        toast({ title: "Document téléchargé",
          description: "Le document a été téléchargé avec succès." });
      },
      onError: (error, variables) => {
        setFiles((prev) =>
          prev.map((file) =>
            file.id === variables.fileId
              ? {
                  ...file,
                  status: "error",
                  progress: 0,
                  errorMessage: error.message}
              : file,
          ),
        );

        toast({ title: "Erreur de téléchargement",
          description: error.message,
          variant: "destructive" });
      }});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: DocumentFile[] = acceptedFiles.map((file) => ({ id: Math.random().toString(36).substr(2, 9),
      file,
      type: DocumentType.OTHER,
      status: "uploading" as const,
      progress: 0 }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"]},
    maxSize: maxSize * 1024 * 1024,
    multiple});

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const updateFileType = (fileId: string, type: DocumentType) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, type } : file)),
    );
  };

  const uploadFile = async (documentFile: DocumentFile) => {
    try {
      await uploadDocumentMutation.mutateAsync({ userId,
        type: documentFile.type,
        file: documentFile.file,
        userRole,
        description: documentFile.description,
        fileId: documentFile.id });
    } catch (error) {
      console.error("Erreur upload:", error);
    }
  };

  const uploadAllFiles = () => {
    files
      .filter((file) => file.status === "uploading" && file.progress === 0)
      .forEach(uploadFile);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Téléchargement de documents
        </CardTitle>
        <CardDescription>
          Téléchargez vos documents de vérification. Formats acceptés : JPG,
          PNG, PDF (max {maxSize}MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Zone de drop */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400",
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            <Upload
              className={cn(
                "h-12 w-12",
                isDragActive ? "text-blue-500" : "text-gray-400",
              )}
            />

            <div>
              <p className="text-lg font-medium">
                {isDragActive
                  ? "Déposez les fichiers ici"
                  : "Glissez-déposez vos fichiers ici"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ou cliquez pour sélectionner des fichiers
              </p>
            </div>

            <Button type="button" variant="outline">
              Sélectionner des fichiers
            </Button>
          </div>
        </div>

        {/* Liste des fichiers */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Documents sélectionnés ({ files.length })
              </h4>
              <Button onClick={uploadAllFiles} size="sm">
                Télécharger tout
              </Button>
            </div>

            <div className="space-y-3">
              {files.map((documentFile) => (
                <div key={documentFile.id} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center space-x-3 flex-1">
                      {documentFile.file.type.startsWith("image/") ? (
                        <Image className="h-8 w-8 text-blue-500" />
                      ) : (
                        <FileText className="h-8 w-8 text-red-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {documentFile.file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(documentFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFile(documentFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3">
                    <Label>Type de document *</Label>
                    <Select
                      value={documentFile.type}
                      onValueChange={(value) =>
                        updateFileType(documentFile.id, value as DocumentType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        {acceptedDocumentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {DOCUMENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {documentFile.status === "uploading" &&
                    documentFile.progress > 0 && (
                      <div className="mt-3">
                        <Progress
                          value={documentFile.progress}
                          className="h-2"
                        />
                      </div>
                    )}

                  {documentFile.status === "error" && (
                    <Alert className="mt-3" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {documentFile.errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {documentFile.status === "success" && (
                    <Alert className="mt-3">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Document téléchargé avec succès
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
