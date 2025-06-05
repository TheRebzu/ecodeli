import {
  FileIcon,
  ImageIcon,
  FileTextIcon,
  FileIcon as FilePdfIcon,
  FileIcon as FileSpreadsheetIcon,
  FileType,
} from 'lucide-react';

/**
 * Formate la taille d'un fichier en unité lisible (KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Détermine l'icône à utiliser en fonction de l'extension du fichier
 */
export function getFileIcon(fileName: string): React.ElementType {
  if (!fileName) return FileIcon;

  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return FilePdfIcon;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return ImageIcon;
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
      return FileTextIcon;
    case 'csv':
    case 'xls':
    case 'xlsx':
      return FileSpreadsheetIcon;
    default:
      return FileIcon;
  }
}

/**
 * Vérifie si le type mime est une image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Vérifie si le type mime est un PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Traduit un type mime en description lisible
 */
export function getMimeTypeDescription(mimeType: string): string {
  if (isImageFile(mimeType)) {
    return 'Image';
  }
  if (isPdfFile(mimeType)) {
    return 'PDF';
  }
  if (mimeType.includes('word') || mimeType.includes('doc')) {
    return 'Document Word';
  }
  if (mimeType.includes('excel') || mimeType.includes('sheet')) {
    return 'Feuille Excel';
  }
  if (mimeType.includes('text')) {
    return 'Fichier texte';
  }
  return 'Fichier';
}

/**
 * Valide un fichier selon les critères donnés
 */
export function validateFile(
  file: File,
  {
    maxSizeInMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  }: { maxSizeInMB?: number; allowedTypes?: string[] } = {}
): { valid: boolean; error?: string } {
  // Vérifier la taille
  if (file.size > maxSizeInMB * 1024 * 1024) {
    return {
      valid: false,
      error: `La taille du fichier dépasse la limite de ${maxSizeInMB} MB`,
    };
  }

  // Vérifier le type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes
        .map(getMimeTypeDescription)
        .join(', ')}`,
    };
  }

  return { valid: true };
}
