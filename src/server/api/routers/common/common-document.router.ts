import { router } from "@/server/api/trpc";
import { documentRouter } from "./document.router";

/**
 * Router pour les documents communs - expose les routes document sous le namespace "common"
 * Utilisé pour maintenir la compatibilité avec les appels clients existants
 */
export const commonDocumentRouter = router({
  uploadDocument: documentRouter.uploadDocument,
  getMyDocuments: documentRouter.getMyDocuments,
  updateDocument: documentRouter.updateDocument,
  deleteDocument: documentRouter.deleteDocument,
  getUserDocuments: documentRouter.getUserDocuments,
  getRequiredDocumentTypes: documentRouter.getRequiredDocumentTypes,
  getPendingDocuments: documentRouter.getPendingDocuments,
  updateDocumentStatus: documentRouter.updateDocumentStatus,
  getDocumentById: documentRouter.getDocumentById,
  downloadDocument: documentRouter.downloadDocument,
}); 