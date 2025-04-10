"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { ComponentProps } from "react";

type FileInputProps = {
  label?: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  error?: string;
  preview?: boolean;
  onValueChange?: (files: File[]) => void;
} & ComponentProps<"input">;

export function FileInput({
  className,
  label,
  description,
  accept,
  multiple = false,
  error,
  preview = true,
  onValueChange,
  onChange,
  ref,
  ...props
}: FileInputProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // S'il y a une ref externe, la synchroniser avec notre inputRef
  React.useEffect(() => {
    if (ref && typeof ref === 'object' && 'current' in ref) {
      ref.current = inputRef.current;
    }
  }, [ref]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);
      
      // Générer des URLs pour les aperçus si preview=true
      if (preview) {
        const newPreviews = fileList.map(file => {
          if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file);
          }
          return '';
        });
        setPreviews(newPreviews);
      }
      
      // Appeler les handlers externes si fournis
      if (onValueChange) {
        onValueChange(fileList);
      }
      if (onChange) {
        onChange(e);
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    if (preview) {
      const newPreviews = [...previews];
      if (newPreviews[index]) {
        URL.revokeObjectURL(newPreviews[index]);
      }
      newPreviews.splice(index, 1);
      setPreviews(newPreviews);
    }
    
    if (onValueChange) {
      onValueChange(newFiles);
    }
  };

  // Nettoyer les URLs des aperçus lors du démontage du composant
  React.useEffect(() => {
    return () => {
      previews.forEach(previewUrl => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    };
  }, [previews]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={props.id}>{label}</Label>}
      
      {description && (
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
      )}
      
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-muted/50",
          error ? "border-destructive" : "border-input",
        )}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          {...props}
        />
        
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Cliquez pour {multiple ? 'sélectionner des fichiers' : 'sélectionner un fichier'}
          </p>
          <p className="text-xs text-muted-foreground">
            {accept ? `Formats acceptés: ${accept.replace(/\./g, '')}` : 'Tous les formats acceptés'}
          </p>
        </div>
      </div>
      
      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}
      
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Fichiers sélectionnés ({files.length})</p>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between rounded-lg border bg-background p-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  {preview && previews[index] && file.type.startsWith('image/') && (
                    <div className="h-10 w-10 shrink-0 rounded-md border overflow-hidden">
                      <img 
                        src={previews[index]} 
                        alt={file.name}
                        className="h-full w-full object-cover" 
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Supprimer</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 