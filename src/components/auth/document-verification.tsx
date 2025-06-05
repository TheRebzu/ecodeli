'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDocumentUpload } from '@/hooks/use-document-upload';
import { DocumentType } from '@prisma/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  UploadCloud,
  AlertTriangle,
  FileText,
  File,
  FileIcon,
  FileImage,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/hooks/use-trpc';
import Image from 'next/image';

// Import de la fonction partagée pour afficher le nom du type de document
import { getDocumentTypeName } from '@/lib/document-utils';

export function DocumentVerification() {
  const { user, role } = useAuth();
  const { files, addFile, removeFile, uploadAllFiles, clearFiles, isUploading, progress, error } =
    useDocumentUpload();
  const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.ID_CARD);

  // Récupérer les documents de l'utilisateur
  const { data: userDocuments, isLoading: isLoadingDocuments } = api.auth.getUserDocuments.useQuery(
    undefined,
    {
      enabled: !!user,
      refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
    }
  );

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      clearFiles();
    };
  }, [clearFiles]);

  // Gérer le changement de type de document
  const handleTypeChange = (value: string) => {
    setDocumentType(value as DocumentType);
  };

  // Gérer le téléchargement de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFile(e.target.files[0], documentType);
    }
  };

  // Déterminer les types de documents requis en fonction du rôle
  const getRequiredDocuments = () => {
    switch (role) {
      case 'DELIVERER':
        return [
          DocumentType.ID_CARD,
          DocumentType.DRIVER_LICENSE,
          DocumentType.VEHICLE_REGISTRATION,
          DocumentType.INSURANCE,
        ];
      case 'PROVIDER':
        return [
          DocumentType.ID_CARD,
          DocumentType.QUALIFICATION_CERTIFICATE,
          DocumentType.INSURANCE,
          DocumentType.PROOF_OF_ADDRESS,
        ];
      default:
        return [DocumentType.ID_CARD];
    }
  };

  // Vérifier si un type de document est déjà téléchargé
  const isDocumentUploaded = (type: DocumentType) => {
    return userDocuments?.some(doc => doc.type === type);
  };

  // Rendre l'icône appropriée pour un type de fichier
  const renderFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-6 w-6 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileIcon className="h-6 w-6 text-red-500" />;
    } else {
      return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vérification des documents</CardTitle>
          <CardDescription>
            Téléchargez les documents nécessaires pour valider votre compte.
            {role === 'DELIVERER' &&
              " En tant que livreur, vous devez fournir une pièce d'identité, votre permis de conduire, votre carte grise et votre attestation d'assurance."}
            {role === 'PROVIDER' &&
              " En tant que prestataire, vous devez fournir une pièce d'identité et vos certifications professionnelles."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Type de document</Label>
                <Select
                  value={documentType}
                  onValueChange={handleTypeChange}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Fichier</Label>
                <div className="flex items-center">
                  <Input
                    id="file"
                    type="file"
                    accept="image/jpeg,image/png,image/heic,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file')?.click()}
                    disabled={isUploading || isDocumentUploaded(documentType)}
                    className="w-full"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isDocumentUploaded(documentType)
                      ? 'Document déjà téléchargé'
                      : 'Sélectionner un fichier'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: JPEG, PNG, HEIC, PDF (max 5MB)
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Fichiers à télécharger</Label>
                <div className="border rounded-md p-2 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        {file.file.type.startsWith('image/') ? (
                          <div className="h-10 w-10 relative overflow-hidden rounded-md">
                            <Image
                              src={file.preview}
                              alt="Aperçu"
                              layout="fill"
                              objectFit="cover"
                            />
                          </div>
                        ) : (
                          <FileText className="h-10 w-10 text-blue-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {documentTypeLabels[file.type]}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {isUploading && (
                  <div className="space-y-1">
                    <Progress value={progress} />
                    <p className="text-xs text-center">{progress}% téléchargé</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={clearFiles} disabled={isUploading}>
                    Annuler
                  </Button>
                  <Button onClick={uploadAllFiles} disabled={isUploading}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Télécharger
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents téléchargés */}
      <Card>
        <CardHeader>
          <CardTitle>Documents soumis</CardTitle>
          <CardDescription>
            Liste des documents que vous avez soumis pour vérification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDocuments ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userDocuments && userDocuments.length > 0 ? (
            <div className="space-y-2">
              {userDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    {renderFileIcon(doc.mimeType)}
                    <div>
                      <p className="font-medium">{documentTypeLabels[doc.type as DocumentType]}</p>
                      <p className="text-sm text-muted-foreground">
                        Téléchargé le {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {doc.status === 'PENDING' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        En attente
                      </span>
                    )}
                    {doc.status === 'APPROVED' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approuvé
                      </span>
                    )}
                    {doc.status === 'REJECTED' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center">
                        <X className="mr-1 h-3 w-3" />
                        Rejeté
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>Aucun document téléchargé</p>
              <p className="text-sm">Veuillez télécharger les documents requis pour votre compte</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-between">
          <div>
            <p className="text-sm font-medium">Statut de vérification</p>
            <p className="text-xs text-muted-foreground">
              Une fois tous vos documents approuvés, votre compte sera activé
            </p>
          </div>
          {/* Résumé de l'état de vérification du compte */}
          <div className="flex items-center space-x-2">
            {getRequiredDocuments().every(type => {
              const doc = userDocuments?.find(d => d.type === type);
              return doc && doc.status === 'APPROVED';
            }) ? (
              <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
                Vérifié
              </span>
            ) : userDocuments && userDocuments.some(doc => doc.status === 'REJECTED') ? (
              <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800">Rejeté</span>
            ) : (
              <span className="px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800">
                En attente
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
