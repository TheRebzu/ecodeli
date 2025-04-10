"use client";

import * as React from "react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

type FileUploaderProps = {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  className?: string;
  isDisabled?: boolean;
  label?: string;
};

export function FileUploader({
  onFilesSelected,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  },
  className,
  isDisabled = false,
  label = "Glissez-déposez vos fichiers ici ou cliquez pour sélectionner",
}: FileUploaderProps): React.ReactElement {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
    disabled: isDisabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed p-6",
        isDragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25",
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="h-10 w-10 text-muted-foreground/50" />
      <p className="mt-2 text-center text-sm text-muted-foreground">{label}</p>
      <Button 
        type="button" 
        variant="secondary" 
        className="mt-2" 
        disabled={isDisabled}
      >
        Sélectionner des fichiers
      </Button>
    </div>
  );
} 