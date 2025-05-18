'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
<<<<<<< HEAD
import { UploadIcon } from 'lucide-react';
=======
import { Upload } from 'lucide-react';
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417

type AcceptedFileTypes = {
  [key: string]: string[];
};

type DocumentUploadFormProps = {
<<<<<<< HEAD
  onUpload: (files: File[]) => void;
=======
  onUpload: (fileData: {
    base64: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => void;
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
  isLoading?: boolean;
  label?: string;
  acceptedFileTypes?: AcceptedFileTypes;
  maxFiles?: number;
  maxSize?: number;
};

export default function DocumentUploadForm({
  onUpload,
  isLoading = false,
  label = 'Upload document',
  acceptedFileTypes = { 'application/pdf': ['.pdf'], 'image/*': ['.jpeg', '.jpg', '.png'] },
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB par défaut
}: DocumentUploadFormProps) {
<<<<<<< HEAD
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
=======
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('documents');

  // Construire la chaîne des types MIME acceptés
  const accept = Object.entries(acceptedFileTypes)
    .map(([type, extensions]) => [type, ...extensions])
    .flat()
    .join(',');
<<<<<<< HEAD
=======

  // Fonction pour convertir un fichier en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Échec de conversion du fichier en base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setError(null);

<<<<<<< HEAD
    if (!files || files.length === 0) return;
=======
    if (!files || files.length === 0) {
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417

    // Vérifier le nombre de fichiers
    if (files.length > maxFiles) {
      setError(`Vous ne pouvez télécharger que ${maxFiles} fichier(s) à la fois.`);
      return;
    }

<<<<<<< HEAD
    const fileList = Array.from(files);

    // Vérifier la taille des fichiers
    const oversizedFile = fileList.find(file => file.size > maxSize);
    if (oversizedFile) {
      setError(
        `Le fichier ${oversizedFile.name} dépasse la taille maximum autorisée (${maxSize / 1024 / 1024} MB).`
=======
    const file = files[0];

    // Vérifier la taille des fichiers
    if (file.size > maxSize) {
      setError(
        `Le fichier ${file.name} dépasse la taille maximum autorisée (${maxSize / 1024 / 1024} MB).`
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
      );
      return;
    }

    // Vérifier les types de fichiers
<<<<<<< HEAD
    const invalidFile = fileList.find(file => {
      const fileType = file.type;
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

      // Vérifier si le type MIME ou l'extension est acceptée
      return !Object.entries(acceptedFileTypes).some(
        ([mimeType, extensions]) =>
          (mimeType.endsWith('/*')
            ? fileType.startsWith(mimeType.replace('/*', ''))
            : fileType === mimeType) || extensions.includes(fileExtension)
      );
    });

    if (invalidFile) {
      setError(`Le format du fichier ${invalidFile.name} n'est pas accepté.`);
      return;
    }

    setSelectedFiles(fileList);

    // Créer un aperçu pour les images
    if (fileList[0] && fileList[0].type.startsWith('image/')) {
=======
    const fileType = file.type;
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isValidType = Object.entries(acceptedFileTypes).some(
      ([mimeType, extensions]) =>
        (mimeType.endsWith('/*')
          ? fileType.startsWith(mimeType.replace('/*', ''))
          : fileType === mimeType) || extensions.includes(fileExtension)
    );

    if (!isValidType) {
      setError(`Le format du fichier ${file.name} n'est pas accepté.`);
      return;
    }

    setSelectedFile(file);

    // Créer un aperçu pour les fichiers
    if (file.type.startsWith('image/')) {
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
<<<<<<< HEAD
      reader.readAsDataURL(fileList[0]);
=======
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFilePreview('pdf');
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
    } else {
      setFilePreview(null);
    }
  };

<<<<<<< HEAD
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedFiles.length > 0 && !error) {
      onUpload(selectedFiles);
      // Ne pas réinitialiser les fichiers ici, car nous voulons montrer le chargement
      // et le parent doit gérer le réinitialisation après la réussite du téléchargement
=======
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile || error) return;

    try {
      // Convertir le fichier en base64
      const base64 = await fileToBase64(selectedFile);

      // Appeler la fonction onUpload avec les données du fichier
      onUpload({
        base64,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });
    } catch (err) {
      setError('Erreur lors de la conversion du fichier');
      console.error('Error converting file to base64:', err);
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
    }
  };

  return (
    <Card className="w-full border-dashed">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-primary/20 p-6 w-full">
<<<<<<< HEAD
              <UploadIcon className="h-8 w-8 text-muted-foreground mb-2" />
=======
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('upload.dropFiles')}</p>

              <Input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={isLoading}
                className="cursor-pointer max-w-sm"
<<<<<<< HEAD
                multiple={maxFiles > 1}
=======
                multiple={false}
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
              />

              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>

<<<<<<< HEAD
            {filePreview && (
=======
            {filePreview && filePreview !== 'pdf' && (
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
              <div className="w-full max-w-sm overflow-hidden rounded-lg border">
                <img
                  src={filePreview}
                  alt="Document preview"
                  className="h-auto w-full object-cover"
                />
              </div>
            )}
<<<<<<< HEAD

            {selectedFiles.length > 0 && !filePreview && (
              <div className="w-full max-w-sm">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg border p-2">
                    <div className="text-sm">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(file.size / 1024)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={selectedFiles.length === 0 || isLoading || !!error}
          >
=======

            {filePreview === 'pdf' && (
              <div className="w-full max-w-sm overflow-hidden rounded-lg border">
                <div className="flex items-center justify-center bg-secondary p-6 min-h-[150px]">
                  <span className="font-medium">Document PDF</span>
                </div>
              </div>
            )}

            {selectedFile && !filePreview && (
              <div className="w-full max-w-sm">
                <div className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="text-sm">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!selectedFile || isLoading || !!error}>
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
            {isLoading ? t('form.uploading') : t('form.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
