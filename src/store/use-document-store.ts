import { create } from 'zustand';

interface DocumentState {
  documents: any[];
  setDocuments: (documents: any[]) => void;
  addDocument: (document: any) => void;
  updateDocumentStatus: (id: string, status: string) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document]
  })),
  updateDocumentStatus: (id, status) => set((state) => ({
    documents: state.documents.map(doc => 
      doc.id === id ? { ...doc, status } : doc
    )
  })),
}));