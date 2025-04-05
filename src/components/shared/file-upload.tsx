"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Modifié pour éviter le conflit de type avec l'attribut onChange de React.HTMLAttributes
interface FileUploadProps {
  endpoint: string;
  onChange: (url: string) => void;
  accept?: string;
  maxSize?: number; // en Mo
  className?: string;
}

export function FileUpload({
  endpoint,
  onChange,
  className,
  accept = "image/*, application/pdf",
  maxSize = 5, // 5 Mo par défaut
  ...props
}: FileUploadProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    await uploadFile(e.target.files[0]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    // Vérifier la taille du fichier
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Le fichier est trop volumineux. Taille maximale: ${maxSize} Mo`);
      return;
    }

    setIsUploading(true);

    try {
      // Dans un environnement réel, vous implémenteriez ici l'upload vers votre service
      // Exemple avec FormData et fetch :
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/upload/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement");
      }
      
      const data = await response.json();
      onChange(data.url);
      toast.success("Fichier téléchargé avec succès");
    } catch (error) {
      console.error("Erreur d'upload:", error);
      toast.error("Erreur lors du téléchargement");
      
      // Pour simulation en développement, on génère une URL fictive
      if (process.env.NODE_ENV === "development") {
        const fileType = file.type.startsWith("image/") ? "image" : "document";
        const mockUrl = `https://placehold.co/400x300?text=${fileType}`;
        onChange(mockUrl);
        toast.success("Simulation de téléchargement en mode développement");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-md border-2 border-dashed p-4 transition-colors",
        dragActive ? "border-primary" : "border-muted-foreground/25",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      {...props}
    >
      <Input
        id={`file-upload-${endpoint}`}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />
      <Label
        htmlFor={`file-upload-${endpoint}`}
        className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center p-4"
      >
        {isUploading ? (
          <Icons.spinner className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Icons.upload className="h-6 w-6 text-muted-foreground" />
        )}
        <div className="text-sm font-medium">
          {isUploading ? (
            "Téléchargement en cours..."
          ) : (
            <>
              <span className="text-primary">Cliquez pour télécharger</span> ou glissez-déposez
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Formats acceptés: {accept.replace("image/*", "images").replace("application/pdf", "PDF")}
        </div>
        <div className="text-xs text-muted-foreground">
          Taille maximale: {maxSize} Mo
        </div>
      </Label>
    </div>
  );
} 