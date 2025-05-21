import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDocument } from '@/types/verification';
import { VerificationStatus } from '@/types/verification';

interface DocumentUploadProgress {
  documentId: string;
  progress: number;
  fileName: string;
  documentType: string;
  status: 'uploading' | 'success' | 'error';
}

interface VerificationState {
  // État pour la vérification côté client
  pendingDocuments: UserDocument[];
  uploadProgress: DocumentUploadProgress[];
  currentStep: number;
  isSubmitting: boolean;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  requiredDocuments: string[];
  rejectionReason?: string;
  rejectionNotes?: string;

  // Actions
  addDocument: (document: UserDocument) => void;
  removeDocument: (documentId: string) => void;
  updateUploadProgress: (documentId: string, progress: number) => void;
  setUploadStatus: (documentId: string, status: 'uploading' | 'success' | 'error') => void;
  setCurrentStep: (step: number) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setVerificationStatus: (status: VerificationStatus | undefined) => void;
  setRequiredDocuments: (documents: string[]) => void;
  setRejectionInfo: (reason?: string, notes?: string) => void;
  reset: () => void;
}

// État initial
const initialState = {
  pendingDocuments: [],
  uploadProgress: [],
  currentStep: 0,
  isSubmitting: false,
  isVerified: false,
  requiredDocuments: [],
};

export const useVerificationStore = create<VerificationState>()(
  persist(
    (set) => ({
      ...initialState,

      // Actions pour gérer les documents
      addDocument: (document) =>
        set((state) => ({
          pendingDocuments: [...state.pendingDocuments, document],
          uploadProgress: [
            ...state.uploadProgress,
            {
              documentId: document.documentId,
              progress: 100, // Document déjà uploadé
              fileName: document.fileName || 'Document',
              documentType: document.documentType,
              status: 'success',
            },
          ],
        })),

      removeDocument: (documentId) =>
        set((state) => ({
          pendingDocuments: state.pendingDocuments.filter(
            (doc) => doc.documentId !== documentId
          ),
          uploadProgress: state.uploadProgress.filter(
            (progress) => progress.documentId !== documentId
          ),
        })),

      // Actions pour gérer le progrès d'upload
      updateUploadProgress: (documentId, progress) =>
        set((state) => ({
          uploadProgress: state.uploadProgress.map((item) =>
            item.documentId === documentId ? { ...item, progress } : item
          ),
        })),

      setUploadStatus: (documentId, status) =>
        set((state) => ({
          uploadProgress: state.uploadProgress.map((item) =>
            item.documentId === documentId ? { ...item, status } : item
          ),
        })),

      // Actions pour gérer les étapes et l'état de la vérification
      setCurrentStep: (step) => set({ currentStep: step }),
      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
      setVerificationStatus: (status) =>
        set({
          verificationStatus: status,
          isVerified: status === VerificationStatus.APPROVED,
        }),
      setRequiredDocuments: (documents) => set({ requiredDocuments: documents }),
      setRejectionInfo: (reason, notes) =>
        set({ rejectionReason: reason, rejectionNotes: notes }),

      // Réinitialiser l'état
      reset: () => set(initialState),
    }),
    {
      name: 'verification-storage',
      partialize: (state) => ({
        pendingDocuments: state.pendingDocuments,
        verificationStatus: state.verificationStatus,
        isVerified: state.isVerified,
        requiredDocuments: state.requiredDocuments,
      }),
    }
  )
); 