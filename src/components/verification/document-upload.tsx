'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UseFormReturn } from 'react-hook-form';
import { useVerification } from '@/hooks/use-verification';
import { useVerificationStore } from '@/store/use-verification-store';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Upload, CheckCircle, AlertTriangle, File } from 'lucide-react';

interface DocumentUploadProps {
  userId: string;
  documentType: string;
  maxSize?: number; // En MB
  allowedTypes?: string[];
  label?: string;
  description?: string;
  form?: UseFormReturn<any>;
  fieldName?: string;
}

export function DocumentUpload({
  userId,
  documentType,
  maxSize = 5, // 5MB par défaut
  allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  label = 'Télécharger un document',
  description = 'Formats acceptés: JPG, PNG, PDF',
  form,
  fieldName,
}: DocumentUploadProps) {
  const { uploadDocument } = useVerification();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  // Accéder au store de vérification pour gérer l'état global
  const addDocument = useVerificationStore((state) => state.addDocument);
  const updateUploadProgress = useVerificationStore((state) => state.updateUploadProgress);
  const setUploadStatus = useVerificationStore((state) => state.setUploadStatus);
  
  // Gérer le drop de fichier
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      
      const selectedFile = acceptedFiles[0];
      
      // Vérifier la taille du fichier
      if (selectedFile.size > maxSize * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: `Fichier trop volumineux. Taille maximale: ${maxSize}MB`,
        });
        return;
      }
      
      // Générer un ID temporaire pour suivre le progrès
      const tempDocId = `temp_${Date.now()}`;
      
      // Initialiser le progrès d'upload
      updateUploadProgress(tempDocId, 0);
      setUploadStatus(tempDocId, 'uploading');
      
      setFile(selectedFile);
      setIsUploading(true);
      
      try {
        // Uploader le fichier
        const result = await uploadDocument(selectedFile, userId, documentType);
        
        if (result) {
          // Ajout du document avec succès
          setUploadStatus(tempDocId, 'success');
          updateUploadProgress(tempDocId, 100);
          
          // Ajouter le document à l'état global
          addDocument({
            documentId: result.documentId,
            documentUrl: result.documentUrl,
            documentType: documentType,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            uploadedAt: new Date(),
          });
          
          // Mettre à jour le formulaire si nécessaire
          if (form && fieldName) {
            form.setValue(fieldName, result.documentUrl);
          }
          
          toast({
            title: "Succès",
            description: "Document téléchargé avec succès",
          });
        } else {
          setUploadStatus(tempDocId, 'error');
          throw new Error('Échec de l\'upload');
        }
      } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du téléchargement",
        });
        setUploadStatus(tempDocId, 'error');
      } finally {
        setIsUploading(false);
      }
    },
    [userId, documentType, maxSize, uploadDocument, toast, addDocument, updateUploadProgress, setUploadStatus, form, fieldName]
  );
  
  // Configuration de react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((obj, type) => ({ ...obj, [type]: [] }), {}),
    maxFiles: 1,
    disabled: isUploading,
  });
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{label}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      
      <Card
        {...getRootProps()}
        className={`border-dashed cursor-pointer hover:bg-muted/30 transition-colors ${
          isDragActive ? 'bg-muted/50 border-primary' : ''
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {isDragActive
              ? "Déposez le fichier ici"
              : "Glissez-déposez un fichier, ou cliquez pour sélectionner"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {`Taille maximale: ${maxSize}MB`}
          </p>
          
          {isUploading && (
            <div className="w-full mt-4">
              <Progress value={50} className="h-1" />
              <p className="text-xs text-center mt-1">Téléchargement en cours...</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {file && !isUploading && (
        <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-[180px]">{file.name}</span>
          </div>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      )}
    </div>
  );
} 