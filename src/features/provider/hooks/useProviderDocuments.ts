import { useState, useEffect } from "react";
import { useApi } from "@/hooks/use-api";
import type { ProviderDocument, ProviderDocumentSummary } from "../types";

export function useProviderDocuments() {
  const { request, loading, error } = useApi();
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [summary, setSummary] = useState<ProviderDocumentSummary | null>(null);

  const fetchDocuments = async () => {
    try {
      const data = await request("/api/provider/documents");
      setDocuments(data.documents || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Erreur lors du chargement des documents:", err);
    }
  };

  const uploadDocument = async (formData: FormData) => {
    try {
      const data = await request("/api/upload", {
        method: "POST",
        data: formData,
        // Remove the headers - let the browser set Content-Type with boundary for FormData
      });
      await fetchDocuments(); // Refresh après upload
      return data;
    } catch (err) {
      console.error("Erreur lors de l'upload:", err);
      throw err;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await request(`/api/provider/documents/${documentId}`, {
        method: "DELETE",
      });
      await fetchDocuments(); // Refresh après suppression
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    summary,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}
