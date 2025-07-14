'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  acceptedTypes?: string[]
  maxSize?: number // in MB
  maxFiles?: number
  disabled?: boolean
  uploading?: boolean
  className?: string
}

export function FileUpload({
  onUpload,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxSize = 10, // 10MB default
  maxFiles = 1,
  disabled = false,
  uploading = false,
  className = ''
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || uploading) return

    setError(null)
    setUploadProgress(0)

    try {
      for (const file of acceptedFiles) {
        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`Fichier trop volumineux. Taille maximale: ${maxSize}MB`)
        }

        // Validate file type
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!acceptedTypes.some(type => 
          type.startsWith('.') ? fileExtension === type : file.type === type
        )) {
          throw new Error(`Type de fichier non accepté. Types acceptés: ${acceptedTypes.join(', ')}`)
        }

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 100)

        await onUpload(file)
        
        clearInterval(progressInterval)
        setUploadProgress(100)
        
        toast.success('Fichier téléchargé avec succès')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    }
  }, [onUpload, disabled, uploading, maxSize, acceptedTypes])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      if (type.startsWith('.')) {
        acc[type] = []
      } else {
        acc[type] = []
      }
      return acc
    }, {} as Record<string, string[]>),
    maxFiles,
    disabled: disabled || uploading
  })

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50' : ''}
              ${isDragReject ? 'border-red-500 bg-red-50' : ''}
              ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
            `}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Téléchargement en cours...</p>
                  <Progress value={uploadProgress} className="mt-2" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive 
                      ? isDragReject 
                        ? 'Type de fichier non accepté'
                        : 'Déposez le fichier ici'
                      : 'Glissez-déposez un fichier ici ou cliquez pour sélectionner'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Types acceptés: {acceptedTypes.join(', ')} • Taille max: {maxSize}MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 