"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PDFDownloadButtonProps {
  type: "invoice" | "delivery" | "monthly-report";
  id: string;
  providerId?: string;
  year?: number;
  month?: number;
  filename?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function PDFDownloadButton({
  type,
  id,
  providerId,
  year,
  month,
  filename,
  variant = "outline",
  size = "sm",
  className,
  children
}: PDFDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const downloadPDF = async () => {
    try {
      setIsLoading(true);

      // Construire l'URL selon le type
      const url = "";
      switch (type) {
        case "invoice":
          url = `/api/pdf/invoice/${id}`;
          break;
        case "delivery":
          url = `/api/pdf/delivery/${id}`;
          break;
        case "monthly-report":
          if (!providerId || !year || !month) {
            throw new Error("Paramètres manquants pour le rapport mensuel");
          }
          url = `/api/pdf/monthly-report/${providerId}/${year}/${month}`;
          break;
        default:
          throw new Error("Type de PDF non supporté");
      }

      // Télécharger le PDF
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors du téléchargement");
      }

      // Créer le blob et déclencher le téléchargement
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      // Essayer d'extraire le nom de fichier de l'en-tête Content-Disposition
      const contentDisposition = response.headers.get("Content-Disposition");
      const extractedFilename = filename;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          extractedFilename = filenameMatch[1];
        }
      }
      
      link.download = extractedFilename || `document-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Nettoyer l'URL objet
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: "Téléchargement réussi",
        description: "Le document PDF a été téléchargé avec succès." });

    } catch (error) {
      console.error("Erreur lors du téléchargement PDF:", error);
      toast({ variant: "destructive",
        title: "Erreur de téléchargement",
        description: error instanceof Error ? error.message : "Impossible de télécharger le document" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={downloadPDF}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {children || (
        <>
          {isLoading ? "Téléchargement..." : "Télécharger PDF"}
        </>
      )}
    </Button>
  );
}

interface PDFViewButtonProps {
  type: "invoice" | "delivery" | "monthly-report";
  id: string;
  providerId?: string;
  year?: number;
  month?: number;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function PDFViewButton({
  type,
  id,
  providerId,
  year,
  month,
  variant = "ghost",
  size = "sm",
  className
}: PDFViewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const viewPDF = async () => {
    try {
      setIsLoading(true);

      // Construire l'URL selon le type
      const url = "";
      switch (type) {
        case "invoice":
          url = `/api/pdf/invoice/${id}`;
          break;
        case "delivery":
          url = `/api/pdf/delivery/${id}`;
          break;
        case "monthly-report":
          if (!providerId || !year || !month) {
            throw new Error("Paramètres manquants pour le rapport mensuel");
          }
          url = `/api/pdf/monthly-report/${providerId}/${year}/${month}`;
          break;
        default:
          throw new Error("Type de PDF non supporté");
      }

      // Ouvrir dans un nouvel onglet
      window.open(url, "blank");

    } catch (error) {
      console.error("Erreur lors de l'ouverture PDF:", error);
      toast({ variant: "destructive",
        title: "Erreur d'affichage",
        description: error instanceof Error ? error.message : "Impossible d'ouvrir le document" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={viewPDF}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Chargement..." : "Voir PDF"}
    </Button>
  );
}