import { join } from "path";

/**
 * Convertit une URL de document stockée en base de données en chemin système
 * Gère les deux systèmes d'upload de l'application
 * @param documentUrl - URL du document en base (ex: /api/uploads/documents/file.pdf)
 * @returns Chemin système absolu du fichier
 */
export function getDocumentSystemPath(documentUrl: string): string {
  if (documentUrl.startsWith('/api/storage/recruitment/')) {
    // Système recruitment: /api/storage/recruitment/userId/filename → storage/recruitment/userId/filename
    const urlPath = documentUrl.replace('/api/storage/', '');
    return join(process.cwd(), 'storage', ...urlPath.split('/').slice(1));
  } else if (documentUrl.startsWith('/api/uploads/documents/')) {
    // Système documents: /api/uploads/documents/filename → uploads/documents/filename
    const filename = documentUrl.split('/').pop() || '';
    return join(process.cwd(), 'uploads', 'documents', filename);
  } else {
    // Fallback : essayer de déduire le chemin
    return join(process.cwd(), documentUrl.replace('/api/', ''));
  }
} 