'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UploadIcon } from 'lucide-react';

type AcceptedFileTypes = {
  [key: string]: string[];
};

type DocumentUploadFormProps = {
  onUpload: (files: File[]) => void;
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('documents');

  // Construire la chaîne des types MIME acceptés
  const accept = Object.entries(acceptedFileTypes)
    .map(([type, extensions]) => [type, ...extensions])
    .flat()
    .join(',');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setError(null);

    if (!files || files.length === 0) return;

    // Vérifier le nombre de fichiers
    if (files.length > maxFiles) {
      setError(`Vous ne pouvez télécharger que ${maxFiles} fichier(s) à la fois.`);
      return;
    }

    const fileList = Array.from(files);

    // Vérifier la taille des fichiers
    const oversizedFile = fileList.find(file => file.size > maxSize);
    if (oversizedFile) {
      setError(
        `Le fichier ${oversizedFile.name} dépasse la taille maximum autorisée (${maxSize / 1024 / 1024} MB).`
      );
      return;
    }

    // Vérifier les types de fichiers
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(fileList[0]);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedFiles.length > 0 && !error) {
      onUpload(selectedFiles);
      // Ne pas réinitialiser les fichiers ici, car nous voulons montrer le chargement
      // et le parent doit gérer le réinitialisation après la réussite du téléchargement
    }
  };

  return (
    <Card className="w-full border-dashed">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-primary/20 p-6 w-full">
              <UploadIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('upload.dropFiles')}</p>

              <Input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={isLoading}
                className="cursor-pointer max-w-sm"
                multiple={maxFiles > 1}
              />

              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>

            {filePreview && (
              <div className="w-full max-w-sm overflow-hidden rounded-lg border">
                <img
                  src={filePreview}
                  alt="Document preview"
                  className="h-auto w-full object-cover"
                />
              </div>
            )}

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
            {isLoading ? t('form.uploading') : t('form.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
